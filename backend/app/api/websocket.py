from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import Student, Camera, Subject, Attendance, Notification, User, FaceEmbedding
from app.services.ai_service import process_surveillance_frame
from datetime import datetime, timedelta
import asyncio
import random
import base64
import json

router = APIRouter(prefix="/ws", tags=["WebSockets"])

@router.websocket("/surveillance")
async def websocket_surveillance(
    websocket: WebSocket,
    camera_id: str = Query("webcam", alias="camera_id")
):
    await websocket.accept()
    
    db = SessionLocal()
    
    try:
        # Determine if this is a temporary laptop webcam or physical CCTV/IP camera
        is_webcam = False
        cam_int_id = None

        if camera_id in ["webcam", "0", "laptop"]:
            is_webcam = True
            webcam_cam = db.query(Camera).filter(Camera.name.ilike("%Webcam%")).first()
            cam_int_id = webcam_cam.id if webcam_cam else None
        else:
            try:
                cam_int_id = int(camera_id)
                camera = db.query(Camera).filter(Camera.id == cam_int_id).first()
                if camera and "webcam" in camera.name.lower():
                    is_webcam = True
                elif not camera:
                    await websocket.send_json({"error": "Camera not found"})
                    await websocket.close()
                    return
            except ValueError:
                is_webcam = True

        if is_webcam:
            # =========================================================================
            # REAL WEBCAM STREAM PROCESSING PATH
            # Receives live frames from the browser via WebSocket, runs InsightFace
            # face recognition against registered PostgreSQL embeddings, marks
            # attendance, and returns real bounding boxes and confidence scores.
            # =========================================================================
            await websocket.send_json({
                "status": "ready",
                "mode": "webcam",
                "message": "Webcam AI recognition stream active. Send frames for processing."
            })

            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                except Exception:
                    continue

                action = payload.get("action", "frame")
                if action == "ping":
                    await websocket.send_json({"action": "pong", "time": datetime.utcnow().isoformat()})
                    continue

                raw_image = payload.get("image") or payload.get("frame")
                if not raw_image:
                    continue

                if "," in raw_image:
                    raw_image = raw_image.split(",", 1)[1]

                try:
                    image_bytes = base64.b64decode(raw_image)
                    result = process_surveillance_frame(image_bytes, db, camera_id=cam_int_id)
                    result["camera_source"] = "webcam"
                    result["camera_id"] = "webcam"
                    await websocket.send_json(result)
                except Exception as ex:
                    await websocket.send_json({
                        "error": str(ex),
                        "fps": 0,
                        "latency_ms": 0,
                        "persons_detected": 0,
                        "detections": [],
                        "unknown_persons": []
                    })
        else:
            # =========================================================================
            # EXISTING CCTV / IP CAMERA PATH (PRESERVED)
            # Retains original simulated/RTSP streaming loop for physical classroom cams.
            # =========================================================================
            camera = db.query(Camera).filter(Camera.id == cam_int_id).first()
            subject = db.query(Subject).first()
            if not subject:
                await websocket.send_json({"error": "No subject found in database"})
                await websocket.close()
                return

            while True:
                camera = db.query(Camera).filter(Camera.id == cam_int_id).first()
                if camera and camera.status == "Inactive":
                    await asyncio.sleep(2)
                    continue
                    
                fps = round(28.0 + random.random() * 2, 1)
                latency = random.randint(15, 25)
                
                registered_student_ids = db.query(FaceEmbedding.student_id).distinct()
                students = (
                    db.query(Student)
                    .filter(
                        Student.id.in_(registered_student_ids),
                        Student.face_registered == True
                    )
                    .all()
                )
                
                detections = []
                unknown_persons = []
                
                if students:
                    detected_students = random.sample(students, min(len(students), random.randint(1, 3)))
                    
                    for student in detected_students:
                        x = random.randint(50, 450)
                        y = random.randint(50, 300)
                        w = random.randint(80, 150)
                        h = random.randint(100, 200)
                        
                        confidence = round(0.85 + random.random() * 0.14, 2)
                        
                        detections.append({
                            "name": student.user.name,
                            "roll_number": student.roll_number,
                            "confidence": confidence,
                            "box": [x, y, w, h]
                        })
                        
                        # Log Attendance (Duplicate Prevention: check last 1 hour)
                        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
                        existing_log = db.query(Attendance).filter(
                            Attendance.student_id == student.id,
                            Attendance.subject_id == subject.id,
                            Attendance.timestamp >= one_hour_ago
                        ).first()
                        
                        if not existing_log:
                            new_log = Attendance(
                                student_id=student.id,
                                subject_id=subject.id,
                                camera_id=cam_int_id,
                                status="Present",
                                confidence_score=confidence,
                                verification_method="AI"
                            )
                            db.add(new_log)
                            db.commit()
                            db.refresh(new_log)
                            
                            # Add notification
                            notif = Notification(
                                user_id=student.user_id,
                                title="Attendance Logged",
                                message=f"Your attendance for {subject.name} was logged automatically via AI Camera '{camera.name}'.",
                                is_read=False,
                                type="system"
                            )
                            db.add(notif)
                            db.commit()
                
                if random.random() < 0.15:
                    x = random.randint(50, 450)
                    y = random.randint(50, 300)
                    w = random.randint(80, 150)
                    h = random.randint(100, 200)
                    conf = round(0.50 + random.random() * 0.20, 2)
                    
                    unknown_persons.append({
                        "box": [x, y, w, h],
                        "confidence": conf
                    })
                    
                payload = {
                    "camera_id": cam_int_id,
                    "fps": fps,
                    "latency_ms": latency,
                    "detections": detections,
                    "unknown_persons": unknown_persons
                }
                
                await websocket.send_json(payload)
                await asyncio.sleep(1.5)
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        db.close()
