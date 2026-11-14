from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Camera, LectureSession, User
from app.services.ai_service import process_surveillance_frame, get_hardware_status
from app.services.stream_manager import StreamManager
from app.api.deps import get_current_user, RoleChecker
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import base64

router = APIRouter(prefix="/surveillance", tags=["Surveillance"])


class FrameProcessRequest(BaseModel):
    image: str  # Base64 encoded JPEG/PNG or data URL
    camera_id: Optional[int] = None
    lecture_session_id: Optional[int] = None


class RTSPStartRequest(BaseModel):
    camera_id: int
    lecture_session_id: int


@router.get("/hardware-status")
def hardware_status():
    """Returns dynamic hardware execution telemetry (NPU / GPU / CPU selection)."""
    return get_hardware_status()


@router.get("/camera-sources")
def get_camera_sources(db: Session = Depends(get_db)):
    """Returns all camera sources including laptop webcam and classroom IP cameras."""
    cameras = db.query(Camera).all()

    sources = [
        {
            "id": "webcam",
            "name": "Laptop Webcam (Demo)",
            "type": "webcam",
            "location": "Local Laptop Feed",
            "status": "Online",
            "is_default": True
        }
    ]

    for cam in cameras:
        if "webcam" in cam.name.lower():
            continue
        sources.append({
            "id": str(cam.id),
            "camera_id": cam.id,
            "name": cam.name,
            "type": "ip_camera" if cam.rtsp_url else "webcam",
            "location": cam.location,
            "status": cam.status,
            "fps": cam.fps,
            "latency_ms": cam.inference_latency_ms,
            "is_default": False
        })

    return sources


@router.get("/active-streams")
def get_active_rtsp_streams(
    current_user: User = Depends(RoleChecker(["teacher", "admin"]))
):
    """Get status of all currently active background RTSP streaming workers."""
    mgr = StreamManager.get_instance()
    return mgr.get_all_active_streams()


@router.post("/sessions/start-rtsp")
def start_rtsp_stream(
    req: RTSPStartRequest,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """Start background RTSP frame sampling worker for a lecture session."""
    cam = db.query(Camera).filter(Camera.id == req.camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    if not cam.rtsp_url:
        raise HTTPException(status_code=400, detail="Camera does not have an RTSP URL configured. Use webcam mode.")

    session = db.query(LectureSession).filter(LectureSession.id == req.lecture_session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Lecture session not found")

    mgr = StreamManager.get_instance()
    worker = mgr.start_session_stream(
        session_id=session.id,
        camera_id=cam.id,
        rtsp_url=cam.rtsp_url
    )
    return {
        "success": True,
        "message": f"RTSP stream worker started for Camera {cam.name}",
        "session_id": session.id,
        "status": worker.status
    }


@router.post("/sessions/{session_id}/stop-rtsp")
def stop_rtsp_stream(
    session_id: int,
    current_user: User = Depends(RoleChecker(["teacher", "admin"]))
):
    """Stop background RTSP worker for a lecture session."""
    mgr = StreamManager.get_instance()
    mgr.stop_session_stream(session_id)
    return {"success": True, "message": f"RTSP worker stopped for Session {session_id}"}


@router.post("/process-frame")
async def process_frame(
    request: FrameProcessRequest,
    db: Session = Depends(get_db)
):
    """
    Processes a live video frame from the laptop webcam or IP camera preview.
    Uses SCRFD face detection + 5-point alignment + ArcFace embeddings on NPU/GPU/CPU.
    """
    raw_data = request.image
    if "," in raw_data:
        raw_data = raw_data.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")

    result = process_surveillance_frame(
        image_bytes=image_bytes,
        db=db,
        lecture_session_id=request.lecture_session_id,
        camera_id=request.camera_id
    )
    return result
