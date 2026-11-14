from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
from datetime import date, datetime

from app.db.session import engine, SessionLocal, Base
from app.models.models import (
    User, Student, Teacher, Department, Subject, Timetable, Classroom,
    Camera, Attendance, Notification, FaceImage, FaceEmbedding,
    LectureSession, SystemSetting, AuditLog
)
from app.core.security import get_password_hash

# Import API Routers
from app.api.auth import router as auth_router
from app.api.students import router as students_router
from app.api.teachers import router as teachers_router
from app.api.admins import router as admins_router
from app.api.admin_students import router as admin_students_router
from app.api.face_registration import router as face_registration_router
from app.api.face_registry import router as face_registry_router
from app.api.cameras import router as cameras_router
from app.api.attendance import router as attendance_router
from app.api.timetables import router as timetables_router
from app.api.reports import router as reports_router
from app.api.notifications import router as notifications_router
from app.api.websocket import router as websocket_router
from app.api.surveillance import router as surveillance_router

app = FastAPI(
    title="AttendAI - AI-Based Attendance Surveillance API",
    description="Layered backend architecture utilizing PostgreSQL, OpenCV, SCRFD, ArcFace, and NPU/GPU/CPU auto-detection.",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(auth_router, prefix="/api")
app.include_router(students_router, prefix="/api")
app.include_router(teachers_router, prefix="/api")
app.include_router(admins_router, prefix="/api")
app.include_router(admin_students_router, prefix="/api")
app.include_router(face_registration_router, prefix="/api")
app.include_router(face_registry_router, prefix="/api")
app.include_router(cameras_router, prefix="/api")
app.include_router(attendance_router, prefix="/api")
app.include_router(timetables_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(websocket_router, prefix="/api")
app.include_router(surveillance_router, prefix="/api")

# Serve static profiles directory
os.makedirs("static/profiles", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve uploads directory for face images
os.makedirs("uploads/students", exist_ok=True)
os.makedirs("uploads/uncertain", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


def seed_database(db: Session):
    # Check if we already seeded database
    if db.query(User).first():
        return

    print("Seeding database with default AttendAI records...")
    
    # 1. Create Default System Settings
    settings = [
        SystemSetting(key="threshold_confident", value="0.55", description="Cosine similarity threshold for automatic Present identification"),
        SystemSetting(key="threshold_review", value="0.40", description="Cosine similarity threshold for teacher review queue"),
        SystemSetting(key="threshold_liveness", value="0.60", description="Minimum liveness score to prevent photo/screen spoofing"),
        SystemSetting(key="min_presence_ratio", value="0.50", description="Minimum ratio of lecture intervals to be marked Present"),
        SystemSetting(key="interval_duration_sec", value="300", description="Duration of each presence check interval in seconds")
    ]
    db.add_all(settings)
    db.commit()

    # 2. Create Departments
    cse = Department(name="Computer Science & Engineering", code="CSE")
    ee = Department(name="Electrical Engineering", code="EE")
    me = Department(name="Mechanical Engineering", code="ME")
    inft = Department(name="Information Technology", code="INFT")
    db.add_all([cse, ee, me, inft])
    db.commit()
    db.refresh(cse)
    db.refresh(ee)
    db.refresh(me)
    db.refresh(inft)

    # 3. Create Classrooms
    cr1 = Classroom(name="Room 302", building="Engineering Block A", capacity=60)
    cr2 = Classroom(name="CSE Lab 1", building="IT Wing", capacity=40)
    cr3 = Classroom(name="Auditorium 1", building="Central Block", capacity=150)
    db.add_all([cr1, cr2, cr3])
    db.commit()
    db.refresh(cr1)
    db.refresh(cr2)
    db.refresh(cr3)

    # 4. Create Users (Admin, Teacher, Students)
    admin_user = User(
        email="admin@attendai.com",
        hashed_password=get_password_hash("admin123"),
        role="admin",
        name="System Administrator"
    )
    teacher_user = User(
        email="teacher@attendai.com",
        hashed_password=get_password_hash("teacher123"),
        role="teacher",
        name="Dr. Ramesh Kumar"
    )
    student_user1 = User(
        email="arjun@attendai.com",
        hashed_password=get_password_hash("student123"),
        role="student",
        name="Arjun Sharma"
    )
    student_user2 = User(
        email="priya@attendai.com",
        hashed_password=get_password_hash("student123"),
        role="student",
        name="Priya Patel"
    )
    student_user3 = User(
        email="rohit@attendai.com",
        hashed_password=get_password_hash("student123"),
        role="student",
        name="Rohit Verma"
    )
    db.add_all([admin_user, teacher_user, student_user1, student_user2, student_user3])
    db.commit()
    db.refresh(admin_user)
    db.refresh(teacher_user)
    db.refresh(student_user1)
    db.refresh(student_user2)
    db.refresh(student_user3)

    # 5. Create Teacher & Student profiles
    teacher_profile = Teacher(
        user_id=teacher_user.id,
        employee_id="EMP901",
        department_id=cse.id
    )
    db.add(teacher_profile)
    
    student_profile1 = Student(
        user_id=student_user1.id,
        roll_number="STU101",
        department_id=cse.id,
        division="A",
        year=3,
        face_registered=True
    )
    student_profile2 = Student(
        user_id=student_user2.id,
        roll_number="STU102",
        department_id=cse.id,
        division="A",
        year=3,
        face_registered=True
    )
    student_profile3 = Student(
        user_id=student_user3.id,
        roll_number="STU103",
        department_id=cse.id,
        division="A",
        year=3,
        face_registered=False
    )
    db.add_all([student_profile1, student_profile2, student_profile3])
    db.commit()
    db.refresh(teacher_profile)
    db.refresh(student_profile1)
    db.refresh(student_profile2)
    db.refresh(student_profile3)

    # 6. Create Subjects
    subj1 = Subject(name="Artificial Intelligence", code="CS401", department_id=cse.id)
    subj2 = Subject(name="Machine Learning", code="CS402", department_id=cse.id)
    subj3 = Subject(name="Database Management", code="CS303", department_id=cse.id)
    db.add_all([subj1, subj2, subj3])
    db.commit()
    db.refresh(subj1)
    db.refresh(subj2)
    db.refresh(subj3)

    # 7. Create Timetables
    tt1 = Timetable(
        department_id=cse.id,
        subject_id=subj1.id,
        teacher_id=teacher_profile.id,
        classroom_id=cr1.id,
        academic_year=2026,
        year_of_study=3,
        division="A",
        day_of_week=0,  # Monday
        start_time="09:00",
        end_time="10:30"
    )
    tt2 = Timetable(
        department_id=cse.id,
        subject_id=subj2.id,
        teacher_id=teacher_profile.id,
        classroom_id=cr2.id,
        academic_year=2026,
        year_of_study=3,
        division="A",
        day_of_week=2,  # Wednesday
        start_time="11:00",
        end_time="12:30"
    )
    db.add_all([tt1, tt2])
    db.commit()
    db.refresh(tt1)
    db.refresh(tt2)

    # 8. Create Cameras
    cam_webcam = Camera(
        name="Laptop Webcam (Demo)",
        location="Local Surveillance Feed",
        classroom_id=cr1.id,
        rtsp_url=None,
        status="Online"
    )
    cam_cctv = Camera(
        name="Room 302 Ceiling CCTV",
        location="Engineering Block A, Room 302",
        classroom_id=cr1.id,
        rtsp_url="rtsp://192.168.1.100:554/live/ch0",
        status="Online"
    )
    db.add_all([cam_webcam, cam_cctv])
    db.commit()
    db.refresh(cam_webcam)
    db.refresh(cam_cctv)

    # 9. Create Active Demo Lecture Session for Today
    today_session = LectureSession(
        timetable_id=tt1.id,
        subject_id=subj1.id,
        teacher_id=teacher_profile.id,
        classroom_id=cr1.id,
        camera_id=cam_webcam.id,
        date=date.today(),
        scheduled_start="09:00",
        scheduled_end="10:30",
        actual_start=datetime.utcnow(),
        status="Active",
        interval_duration_sec=300,
        total_eligible_intervals=10,
        min_presence_ratio=0.50
    )
    db.add(today_session)
    db.commit()
    db.refresh(today_session)

    # 10. Create Initial Attendance Records for Session
    att1 = Attendance(
        lecture_session_id=today_session.id,
        student_id=student_profile1.id,
        status="Present",
        intervals_observed=8,
        total_eligible_intervals=10,
        presence_ratio=0.80,
        first_seen_at=datetime.utcnow(),
        last_seen_at=datetime.utcnow(),
        confidence_score=0.96,
        verification_method="AI_Auto"
    )
    att2 = Attendance(
        lecture_session_id=today_session.id,
        student_id=student_profile2.id,
        status="Present",
        intervals_observed=7,
        total_eligible_intervals=10,
        presence_ratio=0.70,
        first_seen_at=datetime.utcnow(),
        last_seen_at=datetime.utcnow(),
        confidence_score=0.92,
        verification_method="AI_Auto"
    )
    att3 = Attendance(
        lecture_session_id=today_session.id,
        student_id=student_profile3.id,
        status="Absent",
        intervals_observed=0,
        total_eligible_intervals=10,
        presence_ratio=0.0,
        confidence_score=0.0,
        verification_method="AI_Auto"
    )
    db.add_all([att1, att2, att3])
    db.commit()
    
    print("AttendAI database seeding completed successfully.")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/")
def read_root():
    return {
        "platform": "AttendAI",
        "description": "AI-Based Classroom Attendance Platform",
        "version": "2.0.0",
        "status": "Operational"
    }
