from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Application, Scheme
from app.schemas.schemas import ApplicationCreate, ApplicationResponse, ApplicationUpdate
from app.api.deps import get_current_active_user
import random
import string

router = APIRouter(prefix="/applications", tags=["Applications Tracker"])

def generate_tracking_number() -> str:
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    digits = ''.join(random.choices(string.digits, k=6))
    return f"AGRI-{letters}-{digits}"

@router.post("/", response_model=ApplicationResponse)
def submit_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check scheme existence
    scheme = db.query(Scheme).filter(Scheme.id == payload.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
        
    # Check if already applied
    existing = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.scheme_id == payload.scheme_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted an application for this scheme")

    tracking = generate_tracking_number()
    app = Application(
        user_id=current_user.id,
        scheme_id=payload.scheme_id,
        status="Submitted",
        tracking_number=tracking,
        remarks="कागदपत्रे तपासणी प्रक्रिया सुरू आहे."
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app

@router.get("/", response_model=list[ApplicationResponse])
def get_my_applications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Application).filter(Application.user_id == current_user.id).all()

@router.get("/{tracking_number}", response_model=ApplicationResponse)
def track_application(
    tracking_number: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.tracking_number == tracking_number).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application tracking record not found")
    # Verify owner or admin
    if app.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to track this application")
    return app
