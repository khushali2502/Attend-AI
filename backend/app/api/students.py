from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Student, Attendance, Timetable, Subject, LectureSession
from app.schemas.schemas import StudentResponse, AttendanceResponse, TimetableResponse
from app.api.deps import get_current_active_user, RoleChecker
from typing import List, Dict, Any
import math

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me/profile", response_model=StudentResponse)
def get_student_profile(
    current_user: User = Depends(RoleChecker(["student"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/me/attendance", response_model=List[AttendanceResponse])
def get_student_attendance(
    current_user: User = Depends(RoleChecker(["student"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return db.query(Attendance).filter(Attendance.student_id == student.id).order_by(Attendance.created_at.desc()).all()


@router.get("/me/attendance/stats")
def get_student_stats(
    current_user: User = Depends(RoleChecker(["student"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    attendances = db.query(Attendance).filter(Attendance.student_id == student.id).all()

    total_classes = len(attendances)
    present_count = sum(1 for a in attendances if a.status == "Present")
    absent_count = sum(1 for a in attendances if a.status == "Absent")
    late_count = sum(1 for a in attendances if a.status == "Late")

    attended_count = present_count + late_count
    attendance_rate = (attended_count / total_classes * 100) if total_classes > 0 else 100.0

    # Deficit calculation to reach 75%
    lectures_needed = 0
    if attendance_rate < 75.0 and total_classes > 0:
        # (attended + x) / (total + x) >= 0.75 => x >= (0.75*total - attended) / 0.25
        needed = (0.75 * total_classes - attended_count) / 0.25
        lectures_needed = max(0, math.ceil(needed))

    # Subject-wise breakdown
    subject_map: Dict[int, Dict[str, Any]] = {}
    for a in attendances:
        sess = a.lecture_session
        if not sess or not sess.subject:
            continue
        subj = sess.subject
        if subj.id not in subject_map:
            subject_map[subj.id] = {
                "subject_id": subj.id,
                "name": subj.name,
                "code": subj.code,
                "total": 0,
                "present": 0,
                "absent": 0,
                "late": 0,
                "percentage": 0.0
            }
        subject_map[subj.id]["total"] += 1
        if a.status == "Present":
            subject_map[subj.id]["present"] += 1
        elif a.status == "Late":
            subject_map[subj.id]["late"] += 1
        else:
            subject_map[subj.id]["absent"] += 1

    for s_id, s_data in subject_map.items():
        s_att = s_data["present"] + s_data["late"]
        s_data["percentage"] = round((s_att / s_data["total"] * 100), 1) if s_data["total"] > 0 else 100.0

    return {
        "total_classes": total_classes,
        "present_count": present_count,
        "absent_count": absent_count,
        "late_count": late_count,
        "attendance_rate": round(attendance_rate, 2),
        "is_low_attendance": attendance_rate < 75.0,
        "lectures_needed_for_75": lectures_needed,
        "subject_wise": list(subject_map.values())
    }


@router.get("/me/timetable", response_model=List[TimetableResponse])
def get_student_timetable(
    current_user: User = Depends(RoleChecker(["student"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student or not student.department_id:
        return []

    query = db.query(Timetable).filter(
        Timetable.department_id == student.department_id,
        Timetable.is_active == True
    )
    if student.division:
        query = query.filter(Timetable.division == student.division)
    if student.year:
        query = query.filter(Timetable.year_of_study == student.year)

    return query.order_by(Timetable.day_of_week, Timetable.start_time).all()
