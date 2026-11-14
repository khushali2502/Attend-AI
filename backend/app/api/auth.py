from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Student, Teacher
from app.schemas.schemas import Token, UserLogin, UserCreate, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=UserResponse)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role,
        name=user_in.name
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if user.role == "student":
        roll_num = user_in.roll_number or f"STU{user.id:03d}"
        profile = Student(
            user_id=user.id,
            roll_number=roll_num,
            department_id=user_in.department_id,
            face_registered=False
        )
        db.add(profile)
        db.commit()
    elif user.role == "teacher":
        emp_id = user_in.employee_id or f"EMP{user.id:03d}"
        profile = Teacher(
            user_id=user.id,
            employee_id=emp_id,
            department_id=user_in.department_id
        )
        db.add(profile)
        db.commit()
        
    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email or roll number + password.
    - If 'identifier' is provided, it can be either email or roll number.
    - If 'email' is provided (backward compatibility), it's used as email.
    - Roll number lookup: find Student by roll_number -> get User by user_id.
    """
    user = None
    login_id = credentials.identifier or credentials.email

    if not login_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an email or roll number."
        )

    # Try email first (contains @)
    if "@" in login_id:
        user = db.query(User).filter(User.email == login_id).first()
    else:
        # Try as roll number
        student = db.query(Student).filter(Student.roll_number == login_id).first()
        if student:
            user = db.query(User).filter(User.id == student.user_id).first()

    # If still not found, try as email anyway (in case of username-style emails)
    if not user:
        user = db.query(User).filter(User.email == login_id).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials. Please check your email/roll number and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id)
    
    user.refresh_token = refresh_token
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "user_name": user.name
    }


@router.post("/refresh")
def refresh(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or user.refresh_token != refresh_token:
        raise HTTPException(status_code=400, detail="Invalid or expired refresh token")
        
    access_token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user
