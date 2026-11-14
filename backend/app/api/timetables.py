from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.db.session import get_db
from app.models.models import (
    Timetable, Classroom, LectureSession, Teacher, Subject, Department,
    Camera, User, AuditLog, Notification, Student
)
from app.schemas.schemas import (
    TimetableResponse, TimetableCreate,
    ClassroomResponse, ClassroomCreate, ClassroomUpdate,
    LectureSessionResponse, LectureSessionCreate, LectureSessionUpdate
)
from app.api.deps import RoleChecker, get_current_user
from typing import List, Optional
from datetime import datetime, date

router = APIRouter(prefix="/timetables", tags=["Timetables & Sessions"])


def time_to_minutes(time_str: str) -> int:
    """Convert 'HH:MM' string to minutes since midnight."""
    try:
        parts = time_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0


def check_timetable_conflict(
    db: Session,
    classroom_id: int,
    teacher_id: int,
    day_of_week: int,
    start_time: str,
    end_time: str,
    exclude_id: Optional[int] = None
) -> Optional[str]:
    """
    Check if either the classroom or teacher is already occupied at the given time.
    """
    new_start = time_to_minutes(start_time)
    new_end = time_to_minutes(end_time)

    if new_start >= new_end:
        return "Start time must be strictly earlier than end time."

    existing_lectures = db.query(Timetable).filter(
        Timetable.day_of_week == day_of_week,
        Timetable.is_active == True
    )
    if exclude_id:
        existing_lectures = existing_lectures.filter(Timetable.id != exclude_id)

    for entry in existing_lectures.all():
        e_start = time_to_minutes(entry.start_time)
        e_end = time_to_minutes(entry.end_time)

        # Overlap condition: max(start1, start2) < min(end1, end2)
        if max(new_start, e_start) < min(new_end, e_end):
            if entry.classroom_id == classroom_id:
                return f"Classroom Conflict: {entry.classroom.name} is already booked for {entry.subject.name} from {entry.start_time} to {entry.end_time}."
            if entry.teacher_id == teacher_id:
                return f"Teacher Conflict: {entry.teacher.user.name} is already assigned to another lecture ({entry.subject.name}) from {entry.start_time} to {entry.end_time}."

    return None


# --- Classroom Management ---
@router.get("/classrooms", response_model=List[ClassroomResponse])
def get_classrooms(db: Session = Depends(get_db)):
    return db.query(Classroom).filter(Classroom.is_active == True).all()


@router.post("/classrooms", response_model=ClassroomResponse)
def create_classroom(
    data: ClassroomCreate,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Classroom).filter(Classroom.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Classroom with this name already exists")

    classroom = Classroom(**data.dict())
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


# --- Timetable CRUD ---
@router.get("", response_model=List[TimetableResponse])
def list_timetables(
    department_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    division: Optional[str] = None,
    year_of_study: Optional[int] = None,
    day_of_week: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Timetable).filter(Timetable.is_active == True)
    if department_id:
        query = query.filter(Timetable.department_id == department_id)
    if teacher_id:
        query = query.filter(Timetable.teacher_id == teacher_id)
    if division:
        query = query.filter(Timetable.division == division)
    if year_of_study:
        query = query.filter(Timetable.year_of_study == year_of_study)
    if day_of_week is not None:
        query = query.filter(Timetable.day_of_week == day_of_week)

    return query.order_by(Timetable.day_of_week, Timetable.start_time).all()


@router.post("", response_model=TimetableResponse)
def create_timetable_entry(
    data: TimetableCreate,
    current_user: User = Depends(RoleChecker(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    conflict_err = check_timetable_conflict(
        db=db,
        classroom_id=data.classroom_id,
        teacher_id=data.teacher_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time
    )
    if conflict_err:
        raise HTTPException(status_code=409, detail=conflict_err)

    tt = Timetable(**data.dict())
    db.add(tt)
    db.commit()
    db.refresh(tt)

    db.add(AuditLog(
        user_id=current_user.id,
        action="TIMETABLE_CREATE",
        details=f"Created Timetable entry #{tt.id} for Subject {tt.subject_id} in Classroom {tt.classroom_id}."
    ))
    db.commit()
    return tt


@router.delete("/{timetable_id}")
def delete_timetable_entry(
    timetable_id: int,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    tt = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    db.delete(tt)
    db.commit()
    return {"message": "Timetable entry deleted successfully"}


# --- Lecture Sessions ---
@router.get("/sessions/today", response_model=List[LectureSessionResponse])
def get_today_sessions(
    teacher_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active or scheduled sessions for today."""
    today = date.today()
    query = db.query(LectureSession).filter(LectureSession.date == today)

    if current_user.role == "teacher":
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if teacher:
            query = query.filter(LectureSession.teacher_id == teacher.id)
    elif teacher_id:
        query = query.filter(LectureSession.teacher_id == teacher_id)

    sessions = query.order_by(LectureSession.scheduled_start).all()

    # If no sessions exist for today, automatically generate from Timetable!
    if not sessions:
        weekday = today.weekday()  # 0=Monday, 6=Sunday
        tts = db.query(Timetable).filter(Timetable.day_of_week == weekday, Timetable.is_active == True).all()
        for tt in tts:
            cam = db.query(Camera).filter(Camera.classroom_id == tt.classroom_id).first()
            if not cam:
                cam = db.query(Camera).first()
            new_session = LectureSession(
                timetable_id=tt.id,
                subject_id=tt.subject_id,
                teacher_id=tt.teacher_id,
                classroom_id=tt.classroom_id,
                camera_id=cam.id if cam else None,
                date=today,
                scheduled_start=tt.start_time,
                scheduled_end=tt.end_time,
                status="Scheduled",
                total_eligible_intervals=10,
                interval_duration_sec=300
            )
            db.add(new_session)
        db.commit()
        sessions = query.order_by(LectureSession.scheduled_start).all()

    return sessions


@router.post("/sessions", response_model=LectureSessionResponse)
def create_lecture_session(
    data: LectureSessionCreate,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    session = LectureSession(
        timetable_id=data.timetable_id,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        classroom_id=data.classroom_id,
        camera_id=data.camera_id,
        date=data.date or date.today(),
        scheduled_start=data.scheduled_start,
        scheduled_end=data.scheduled_end,
        status="Scheduled",
        interval_duration_sec=data.interval_duration_sec or 300,
        min_presence_ratio=data.min_presence_ratio or 0.50,
        grace_period_mins=data.grace_period_mins or 15
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/sessions/{session_id}/status", response_model=LectureSessionResponse)
def update_session_status(
    session_id: int,
    data: LectureSessionUpdate,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Lecture session not found")

    if data.status:
        session.status = data.status
        now = datetime.utcnow()
        if data.status == "Active" and not session.actual_start:
            session.actual_start = now
        elif data.status == "Completed":
            session.actual_end = now
    if data.camera_id:
        session.camera_id = data.camera_id

    db.commit()
    db.refresh(session)
    return session
