from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Student, Department, AuditLog
from app.schemas.schemas import (
    StudentResponse, AdminStudentCreate, AdminStudentUpdate
)
from app.api.deps import RoleChecker
from app.core.security import get_password_hash
from typing import List

router = APIRouter(prefix="/admins/students", tags=["Admin Student Management"])


@router.get("", response_model=List[StudentResponse])
def list_students(
    department_id: int = None,
    division: str = None,
    year: int = None,
    face_status: str = None,
    current_user: User = Depends(RoleChecker(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    """List all students with optional filters."""
    query = db.query(Student)

    if department_id:
        query = query.filter(Student.department_id == department_id)
    if division:
        query = query.filter(Student.division == division)
    if year:
        query = query.filter(Student.year == year)
    if face_status == "registered":
        query = query.filter(Student.face_registered == True)
    elif face_status == "not_registered":
        query = query.filter(Student.face_registered == False)

    return query.order_by(Student.id.desc()).all()


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: AdminStudentCreate,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    """Create a new student account (Admin only)."""
    # Validate passwords match
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Check duplicate email
    existing_email = db.query(User).filter(User.email == payload.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Check duplicate roll number
    existing_roll = db.query(Student).filter(Student.roll_number == payload.roll_number).first()
    if existing_roll:
        raise HTTPException(status_code=400, detail="Roll number already exists.")

    # Validate department if provided
    if payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Department not found.")

    # Create User record
    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role="student",
        name=payload.full_name,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create Student profile
    student = Student(
        user_id=user.id,
        roll_number=payload.roll_number,
        department_id=payload.department_id,
        division=payload.division,
        year=payload.year,
        phone=payload.phone,
        face_registered=False
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Create Student",
        details=f"Created student account: {payload.full_name} (Roll: {payload.roll_number})"
    )
    db.add(audit)
    db.commit()

    return student


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    current_user: User = Depends(RoleChecker(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    """Get a specific student's details."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    payload: AdminStudentUpdate,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    """Update a student's information."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    user = student.user

    # Update user fields
    if payload.full_name is not None:
        user.name = payload.full_name
    if payload.email is not None:
        # Check duplicate
        existing = db.query(User).filter(User.email == payload.email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered.")
        user.email = payload.email
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    # Update student fields
    if payload.roll_number is not None and payload.roll_number != student.roll_number:
        existing_roll = db.query(Student).filter(Student.roll_number == payload.roll_number, Student.id != student.id).first()
        if existing_roll:
            raise HTTPException(status_code=400, detail="Roll number already exists.")
        student.roll_number = payload.roll_number
    if payload.phone is not None:
        student.phone = payload.phone
    if payload.department_id is not None:
        if payload.department_id > 0:
            dept = db.query(Department).filter(Department.id == payload.department_id).first()
            if not dept:
                raise HTTPException(status_code=400, detail="Department not found.")
        student.department_id = payload.department_id if payload.department_id > 0 else None
    if payload.division is not None:
        student.division = payload.division
    if payload.year is not None:
        student.year = payload.year

    db.commit()
    db.refresh(student)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Update Student",
        details=f"Updated student: {user.name} (ID: {student.id})"
    )
    db.add(audit)
    db.commit()

    return student


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Real student deletion (Admin only):
    1. Removes face embeddings & face images.
    2. Deletes face image files on disk.
    3. Deletes attendance records for this student.
    4. Deletes student profile.
    5. Deletes student's login account (User).
    6. Logs audit trail.
    """
    import os
    import shutil
    from app.models.models import FaceEmbedding, FaceImage, Attendance, Notification

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student_name = student.user.name if student.user else "Unknown"
    student_roll = student.roll_number
    user_id = student.user_id

    # 1. Remove files on disk
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "students", str(student_id))
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir, ignore_errors=True)

    static_profile = os.path.join("static", "profiles", f"{student_roll}.jpg")
    if os.path.exists(static_profile):
        try:
            os.remove(static_profile)
        except OSError:
            pass

    # 2. Delete database records
    db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id).delete()
    db.query(FaceImage).filter(FaceImage.student_id == student_id).delete()
    db.query(Attendance).filter(Attendance.student_id == student_id).delete()

    # Delete student profile
    db.delete(student)
    db.commit()

    # 3. Delete associated user account
    if user_id:
        db.query(Notification).filter(Notification.user_id == user_id).delete()
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
            db.commit()

    # 4. Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Delete Student",
        details=f"Deleted student {student_name} (Roll: {student_roll}, ID: {student_id}) and associated accounts/biometrics."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Student {student_name} ({student_roll}) deleted successfully.",
        "student_id": student_id
    }
