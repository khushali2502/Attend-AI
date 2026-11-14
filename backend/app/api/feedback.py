from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Feedback
from app.schemas.schemas import FeedbackCreate, FeedbackResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("/", response_model=FeedbackResponse)
def submit_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    feedback = Feedback(
        user_id=current_user.id,
        rating=payload.rating,
        comments=payload.comments
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
