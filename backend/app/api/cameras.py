from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Camera, User
from app.schemas.schemas import CameraResponse, CameraCreate, CameraUpdate
from app.api.deps import RoleChecker
from typing import List

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("", response_model=List[CameraResponse])
def get_cameras(
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    return db.query(Camera).all()

@router.post("", response_model=CameraResponse)
def create_camera(
    camera_in: CameraCreate,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    camera = Camera(
        name=camera_in.name,
        location=camera_in.location,
        rtsp_url=camera_in.rtsp_url,
        status=camera_in.status or "Active"
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera

@router.put("/{camera_id}", response_model=CameraResponse)
def update_camera(
    camera_id: int,
    camera_in: CameraUpdate,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    for field, val in camera_in.model_dump(exclude_unset=True).items():
        setattr(camera, field, val)
        
    db.commit()
    db.refresh(camera)
    return camera

@router.delete("/{camera_id}")
def delete_camera(
    camera_id: int,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    db.delete(camera)
    db.commit()
    return {"message": "Camera deleted successfully"}
