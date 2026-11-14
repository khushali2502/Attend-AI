from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Grievance
from app.schemas.schemas import GrievanceCreate, GrievanceResponse
from app.api.deps import get_current_active_user
from datetime import datetime

router = APIRouter(prefix="/grievances", tags=["Grievances Desk"])

@router.post("/", response_model=GrievanceResponse)
def file_grievance(
    payload: GrievanceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    grievance = Grievance(
        user_id=current_user.id,
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
        status="Pending"
    )
    db.add(grievance)
    db.commit()
    db.refresh(grievance)
    return grievance

@router.get("/", response_model=list[GrievanceResponse])
def get_my_grievances(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Grievance).filter(Grievance.user_id == current_user.id).order_by(Grievance.created_at.desc()).all()
