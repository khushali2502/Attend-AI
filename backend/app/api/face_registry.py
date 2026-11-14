from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.models import Student, FaceEmbedding, User
from app.schemas.schemas import StudentResponse
from app.api.deps import RoleChecker

router = APIRouter(prefix="/face-registry", tags=["Face Registry"])


@router.get("", response_model=List[StudentResponse])
def get_registered_faces(
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Teacher & Admin Face Registry:
    Returns ONLY students whose face is actually registered in PostgreSQL with a valid biometric record in face_embeddings.
    Unregistered students are strictly excluded at the database level.
    """
    registered_student_ids = db.query(FaceEmbedding.student_id).distinct()
    students = (
        db.query(Student)
        .filter(
            Student.id.in_(registered_student_ids),
            Student.face_registered == True
        )
        .order_by(Student.id.asc())
        .all()
    )
    return students


@router.get("/stats")
def get_face_registry_stats(
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Returns dynamic face registration counts:
    - total_enrolled: total students enrolled
    - biometrics_verified: count of students with verified biometric records
    - pending_biometrics: count of students awaiting face registration
    """
    total_enrolled = db.query(Student).count()
    registered_student_ids = db.query(FaceEmbedding.student_id).distinct()
    verified_count = (
        db.query(Student)
        .filter(
            Student.id.in_(registered_student_ids),
            Student.face_registered == True
        )
        .count()
    )
    pending_count = max(0, total_enrolled - verified_count)

    return {
        "total_enrolled": total_enrolled,
        "biometrics_verified": verified_count,
        "pending_biometrics": pending_count
    }
