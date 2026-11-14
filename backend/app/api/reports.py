from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Attendance, User, Student, LectureSession
from app.api.deps import RoleChecker
from typing import Optional
from datetime import datetime
import io
import pandas as pd

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/excel")
def export_excel(
    student_id: Optional[int] = None,
    lecture_session_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["teacher", "admin", "student"])),
    db: Session = Depends(get_db)
):
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        student_id = student.id

    query = db.query(Attendance)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if lecture_session_id:
        query = query.filter(Attendance.lecture_session_id == lecture_session_id)
    if subject_id:
        query = query.join(LectureSession).filter(LectureSession.subject_id == subject_id)
    if start_date:
        try:
            query = query.filter(Attendance.created_at >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(Attendance.created_at <= datetime.fromisoformat(end_date))
        except ValueError:
            pass
            
    records = query.order_by(Attendance.created_at.desc()).all()
    
    data = []
    for r in records:
        subj_name = r.lecture_session.subject.name if r.lecture_session and r.lecture_session.subject else "N/A"
        subj_code = r.lecture_session.subject.code if r.lecture_session and r.lecture_session.subject else "N/A"
        sess_date = str(r.lecture_session.date) if r.lecture_session else r.created_at.strftime("%Y-%m-%d")

        data.append({
            "Attendance ID": r.id,
            "Student Name": r.student.user.name,
            "Roll Number": r.student.roll_number,
            "Division": r.student.division or "A",
            "Subject": subj_name,
            "Subject Code": subj_code,
            "Date": sess_date,
            "Status": r.status,
            "Intervals Observed": r.intervals_observed,
            "Presence Ratio": f"{r.presence_ratio*100:.1f}%",
            "Verification": r.verification_method,
            "Correction Reason": r.correction_reason or "N/A"
        })
        
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Attendance Log")
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="attendance_report.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@router.get("/pdf")
def export_pdf(
    student_id: Optional[int] = None,
    lecture_session_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["teacher", "admin", "student"])),
    db: Session = Depends(get_db)
):
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        student_id = student.id

    query = db.query(Attendance)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if lecture_session_id:
        query = query.filter(Attendance.lecture_session_id == lecture_session_id)
    if subject_id:
        query = query.join(LectureSession).filter(LectureSession.subject_id == subject_id)
    if start_date:
        try:
            query = query.filter(Attendance.created_at >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(Attendance.created_at <= datetime.fromisoformat(end_date))
        except ValueError:
            pass
            
    records = query.order_by(Attendance.created_at.desc()).all()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=20
    )
    
    story.append(Paragraph("AttendAI - Lecture Attendance Official Sheet", title_style))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", subtitle_style))
    
    table_data = [["Roll No", "Student Name", "Subject", "Date", "Status", "Presence %", "Method"]]
    for r in records:
        subj_code = r.lecture_session.subject.code if r.lecture_session and r.lecture_session.subject else "N/A"
        sess_date = str(r.lecture_session.date) if r.lecture_session else r.created_at.strftime("%Y-%m-%d")
        table_data.append([
            r.student.roll_number,
            r.student.user.name,
            subj_code,
            sess_date,
            r.status,
            f"{r.presence_ratio*100:.0f}%",
            r.verification_method
        ])
        
    t = Table(table_data, colWidths=[55, 130, 65, 80, 55, 65, 90])
    
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4F46E5')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F8FAFC')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    
    story.append(t)
    doc.build(story)
    
    buffer.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="attendance_report.pdf"'
    }
    return StreamingResponse(buffer, headers=headers, media_type="application/pdf")
