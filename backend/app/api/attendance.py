from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import (
    Attendance, User, LectureSession, Student, UncertainDetection,
    AttendanceDispute, AuditLog, Notification
)
from app.schemas.schemas import (
    AttendanceResponse, AttendanceCreate, AttendanceUpdate,
    UncertainDetectionResponse, UncertainDetectionReview,
    AttendanceDisputeCreate, AttendanceDisputeResponse, AttendanceDisputeReview
)
from app.api.deps import RoleChecker, get_current_user
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("", response_model=List[AttendanceResponse])
def get_attendance_history(
    student_id: Optional[int] = None,
    lecture_session_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["student", "teacher", "admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(Attendance)

    # Restrict students to their own attendance
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            return []
        query = query.filter(Attendance.student_id == student.id)
    elif student_id:
        query = query.filter(Attendance.student_id == student_id)

    if lecture_session_id:
        query = query.filter(Attendance.lecture_session_id == lecture_session_id)
    if subject_id:
        query = query.join(LectureSession).filter(LectureSession.subject_id == subject_id)
    if status:
        query = query.filter(Attendance.status == status)

    return query.order_by(Attendance.created_at.desc()).all()


@router.get("/session/{session_id}", response_model=List[AttendanceResponse])
def get_session_roster_attendance(
    session_id: int,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """Retrieve full attendance list for a specific lecture session."""
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Lecture session not found")

    attendances = db.query(Attendance).filter(Attendance.lecture_session_id == session_id).all()
    return attendances


@router.post("/session/{session_id}/mark", response_model=AttendanceResponse)
def manual_mark_student_attendance(
    session_id: int,
    data: AttendanceCreate,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """Teacher/Admin manually marks student attendance with audit reason."""
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Lecture session not found")

    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    att = db.query(Attendance).filter(
        Attendance.lecture_session_id == session_id,
        Attendance.student_id == data.student_id
    ).first()

    now = datetime.utcnow()
    action_desc = f"Manual {data.status} attendance marked by {current_user.name}"
    if data.correction_reason:
        action_desc += f": {data.correction_reason}"

    if not att:
        att = Attendance(
            lecture_session_id=session_id,
            student_id=data.student_id,
            status=data.status,
            intervals_observed=session.total_eligible_intervals if data.status == "Present" else 0,
            total_eligible_intervals=session.total_eligible_intervals,
            presence_ratio=1.0 if data.status == "Present" else 0.0,
            first_seen_at=now,
            last_seen_at=now,
            confidence_score=1.0,
            verification_method=data.verification_method or "Manual_Teacher",
            corrected_by=current_user.id,
            correction_reason=data.correction_reason or "Teacher manual mark",
            corrected_at=now
        )
        db.add(att)
    else:
        att.status = data.status
        att.corrected_by = current_user.id
        att.correction_reason = data.correction_reason or "Teacher manual update"
        att.corrected_at = now
        att.verification_method = "Manual_Teacher" if current_user.role == "teacher" else "Manual_Admin"
        if data.status == "Present":
            att.intervals_observed = max(att.intervals_observed, int(session.total_eligible_intervals * session.min_presence_ratio))
            att.presence_ratio = round(att.intervals_observed / max(session.total_eligible_intervals, 1), 3)

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="ATTENDANCE_MANUAL_MARK",
        details=f"Session {session_id}, Student {student.roll_number} -> {data.status}. Reason: {data.correction_reason}"
    ))

    db.commit()
    db.refresh(att)
    return att


@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance_status(
    attendance_id: int,
    update_data: AttendanceUpdate,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """Correct or update attendance record with mandatory reason."""
    att = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_status = att.status
    att.status = update_data.status
    att.corrected_by = current_user.id
    att.correction_reason = update_data.correction_reason
    att.corrected_at = datetime.utcnow()
    att.verification_method = "Manual_Teacher" if current_user.role == "teacher" else "Manual_Admin"

    # Log audit
    db.add(AuditLog(
        user_id=current_user.id,
        action="ATTENDANCE_CORRECTION",
        details=f"Record {attendance_id}: changed status from {old_status} to {update_data.status}. Reason: {update_data.correction_reason}"
    ))

    # Send notification to student
    student = db.query(Student).filter(Student.id == att.student_id).first()
    if student:
        db.add(Notification(
            user_id=student.user_id,
            title="Attendance Status Updated",
            message=f"Your attendance for lecture on {att.created_at.strftime('%Y-%m-%d')} was changed to {update_data.status} by {current_user.name}.",
            type="attendance"
        ))

    db.commit()
    db.refresh(att)
    return att


# --- Uncertain Detections Review Queue ---
@router.get("/uncertain/queue", response_model=List[UncertainDetectionResponse])
def get_uncertain_detections_queue(
    session_id: Optional[int] = None,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """Retrieve pending borderline detections (0.40 - 0.54 similarity) for teacher verification."""
    query = db.query(UncertainDetection).filter(UncertainDetection.status == "Pending")
    if session_id:
        query = query.filter(UncertainDetection.lecture_session_id == session_id)
    return query.order_by(UncertainDetection.timestamp.desc()).all()


@router.post("/uncertain/{detection_id}/review", response_model=UncertainDetectionResponse)
def review_uncertain_detection(
    detection_id: int,
    review: UncertainDetectionReview,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """Teacher confirms or rejects an uncertain face detection."""
    detection = db.query(UncertainDetection).filter(UncertainDetection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Uncertain detection record not found")

    detection.status = review.status  # 'Approved' or 'Rejected'
    detection.reviewed_by = current_user.id
    detection.reviewed_at = datetime.utcnow()

    # If approved, award presence in official Attendance
    student_id = review.student_id or detection.predicted_student_id
    if review.status == "Approved" and student_id:
        session = db.query(LectureSession).filter(LectureSession.id == detection.lecture_session_id).first()
        if session:
            att = db.query(Attendance).filter(
                Attendance.lecture_session_id == session.id,
                Attendance.student_id == student_id
            ).first()

            now = datetime.utcnow()
            if not att:
                att = Attendance(
                    lecture_session_id=session.id,
                    student_id=student_id,
                    status="Present",
                    intervals_observed=1,
                    total_eligible_intervals=session.total_eligible_intervals,
                    presence_ratio=round(1.0 / max(session.total_eligible_intervals, 1), 3),
                    first_seen_at=now,
                    last_seen_at=now,
                    confidence_score=detection.confidence_score,
                    verification_method="AI_Verified",
                    corrected_by=current_user.id,
                    correction_reason="Teacher verified borderline detection",
                    corrected_at=now
                )
                db.add(att)
            else:
                att.intervals_observed = (att.intervals_observed or 0) + 1
                att.presence_ratio = round(att.intervals_observed / max(session.total_eligible_intervals, 1), 3)
                if att.presence_ratio >= session.min_presence_ratio:
                    att.status = "Present"
                att.verification_method = "AI_Verified"

    db.commit()
    db.refresh(detection)
    return detection


# --- Attendance Disputes Workflow ---
@router.post("/disputes", response_model=AttendanceDisputeResponse)
def raise_attendance_dispute(
    data: AttendanceDisputeCreate,
    current_user: User = Depends(RoleChecker(["student"])),
    db: Session = Depends(get_db)
):
    """Student files a formal attendance correction request."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=403, detail="Student profile not found")

    attendance = db.query(Attendance).filter(Attendance.id == data.attendance_id).first()
    if not attendance or attendance.student_id != student.id:
        raise HTTPException(status_code=404, detail="Invalid attendance record")

    dispute = AttendanceDispute(
        attendance_id=data.attendance_id,
        student_id=student.id,
        reason=data.reason,
        proof_document_url=data.proof_document_url,
        status="Pending"
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)

    # Notify teacher if session is assigned
    session = attendance.lecture_session
    if session and session.teacher:
        db.add(Notification(
            user_id=session.teacher.user_id,
            title="New Attendance Dispute",
            message=f"Student {student.roll_number} raised a dispute for lecture on {session.date}. Reason: {data.reason}",
            type="dispute"
        ))
        db.commit()

    return dispute


@router.get("/disputes", response_model=List[AttendanceDisputeResponse])
def get_attendance_disputes(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List disputes based on user role."""
    query = db.query(AttendanceDispute)
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            return []
        query = query.filter(AttendanceDispute.student_id == student.id)
    elif status:
        query = query.filter(AttendanceDispute.status == status)

    return query.order_by(AttendanceDispute.created_at.desc()).all()


@router.post("/disputes/{dispute_id}/review", response_model=AttendanceDisputeResponse)
def review_attendance_dispute(
    dispute_id: int,
    review: AttendanceDisputeReview,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    """Teacher or Admin approves or rejects an attendance dispute."""
    dispute = db.query(AttendanceDispute).filter(AttendanceDispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    dispute.status = review.status  # 'Approved' or 'Rejected'
    dispute.reviewed_by = current_user.id
    dispute.reviewer_notes = review.reviewer_notes
    dispute.updated_at = datetime.utcnow()

    # If approved, flip attendance to Present
    if review.status == "Approved":
        att = dispute.attendance
        if att:
            att.status = "Present"
            att.corrected_by = current_user.id
            att.correction_reason = f"Dispute #{dispute.id} Approved: {review.reviewer_notes or 'Valid justification'}"
            att.corrected_at = datetime.utcnow()
            att.verification_method = "Manual_Teacher" if current_user.role == "teacher" else "Manual_Admin"

    # Send notification to student
    db.add(Notification(
        user_id=dispute.student.user_id,
        title=f"Attendance Dispute {review.status}",
        message=f"Your dispute has been {review.status.lower()} by {current_user.name}. Note: {review.reviewer_notes or 'No remarks'}",
        type="dispute"
    ))

    db.add(AuditLog(
        user_id=current_user.id,
        action=f"DISPUTE_{review.status.upper()}",
        details=f"Dispute {dispute_id} for Student {dispute.student.roll_number} {review.status.lower()} by {current_user.name}."
    ))

    db.commit()
    db.refresh(dispute)
    return dispute
