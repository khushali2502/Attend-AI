import cv2
import time
import threading
import os
from typing import Dict, Optional, Callable
from app.db.session import SessionLocal
from app.models.models import Camera, LectureSession
from app.services.ai_service import process_surveillance_frame

class RTSPStreamWorker:
    """
    Background worker thread that connects to an RTSP stream,
    automatically reconnects upon dropout with exponential backoff,
    samples keyframes every N seconds for SCRFD+ArcFace attendance processing,
    and maintains camera health telemetry (FPS, drop count, latency).
    """
    def __init__(self, camera_id: int, rtsp_url: str, lecture_session_id: int, sample_interval_sec: float = 3.0):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.lecture_session_id = lecture_session_id
        self.sample_interval = sample_interval_sec
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.last_frame_bytes: Optional[bytes] = None
        self.fps = 0.0
        self.latency_ms = 0
        self.drop_count = 0
        self.status = "Offline"

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._run, daemon=True)
            self.thread.start()

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
        self.status = "Offline"
        self._update_camera_status("Offline")

    def _update_camera_status(self, status: str, fps: float = 0.0, latency_ms: int = 0):
        db = SessionLocal()
        try:
            cam = db.query(Camera).filter(Camera.id == self.camera_id).first()
            if cam:
                cam.status = status
                cam.fps = fps
                cam.inference_latency_ms = latency_ms
                cam.frame_drop_count = self.drop_count
                db.commit()
        except Exception:
            pass
        finally:
            db.close()

    def _run(self):
        retry_delay = 1.0
        max_retry_delay = 30.0

        while self.running:
            print(f"[RTSPWorker] Connecting to Camera #{self.camera_id} at {self.rtsp_url}...")
            self._update_camera_status("Reconnecting")
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)

            if not cap.isOpened():
                print(f"[RTSPWorker] Failed to open stream: {self.rtsp_url}. Retrying in {retry_delay}s...")
                self.drop_count += 1
                self._update_camera_status("Degraded")
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, max_retry_delay)
                continue

            # Connected successfully
            retry_delay = 1.0
            self.status = "Online"
            self._update_camera_status("Online")
            print(f"[RTSPWorker] Stream connected: Camera #{self.camera_id}")

            last_sample_time = 0.0
            frame_count = 0
            fps_start_time = time.time()

            while self.running:
                ret, frame = cap.read()
                if not ret or frame is None:
                    print(f"[RTSPWorker] Frame read failed from Camera #{self.camera_id}")
                    self.drop_count += 1
                    self.status = "Degraded"
                    break

                now = time.time()
                frame_count += 1
                if now - fps_start_time >= 1.0:
                    self.fps = round(frame_count / (now - fps_start_time), 1)
                    frame_count = 0
                    fps_start_time = now

                # Keyframe sampling interval
                if now - last_sample_time >= self.sample_interval:
                    last_sample_time = now
                    # Encode frame to JPEG
                    ret_enc, buffer = cv2.imencode(".jpg", frame)
                    if ret_enc:
                        frame_bytes = buffer.tobytes()
                        self.last_frame_bytes = frame_bytes

                        # Process attendance in background db session
                        db = SessionLocal()
                        try:
                            t0 = time.time()
                            result = process_surveillance_frame(
                                image_bytes=frame_bytes,
                                db=db,
                                lecture_session_id=self.lecture_session_id,
                                camera_id=self.camera_id
                            )
                            self.latency_ms = int((time.time() - t0) * 1000)
                        except Exception as e:
                            print(f"[RTSPWorker] Processing error: {e}")
                        finally:
                            db.close()

                # Sleep a tiny bit to avoid spinning
                time.sleep(0.01)

            cap.release()
            if self.running:
                time.sleep(1.0)


class StreamManager:
    """Singleton stream manager for all active classroom RTSP sessions."""
    _instance = None
    _workers: Dict[int, RTSPStreamWorker] = {}  # session_id -> RTSPStreamWorker

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = StreamManager()
        return cls._instance

    def start_session_stream(self, session_id: int, camera_id: int, rtsp_url: str) -> RTSPStreamWorker:
        self.stop_session_stream(session_id)
        worker = RTSPStreamWorker(
            camera_id=camera_id,
            rtsp_url=rtsp_url,
            lecture_session_id=session_id
        )
        worker.start()
        self._workers[session_id] = worker
        return worker

    def stop_session_stream(self, session_id: int):
        if session_id in self._workers:
            worker = self._workers.pop(session_id)
            worker.stop()

    def get_worker(self, session_id: int) -> Optional[RTSPStreamWorker]:
        return self._workers.get(session_id)

    def get_all_active_streams(self) -> Dict[int, Dict[str, Any]]:
        return {
            sess_id: {
                "camera_id": w.camera_id,
                "status": w.status,
                "fps": w.fps,
                "latency_ms": w.latency_ms,
                "drop_count": w.drop_count
            }
            for sess_id, w in self._workers.items()
        }
