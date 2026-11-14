from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Student, Teacher, Camera, Department, Subject, AuditLog
from app.schemas.schemas import AdminStats, DepartmentResponse, DepartmentCreate, SubjectResponse, SubjectCreate, AuditLogResponse
from app.api.deps import get_current_active_user, RoleChecker
from typing import List

router = APIRouter(prefix="/admins", tags=["Admins"])

@router.get("/stats", response_model=AdminStats)
def get_admin_stats(
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    from app.models.models import Classroom, LectureSession
    students = db.query(Student).count()
    teachers = db.query(Teacher).count()
    cameras = db.query(Camera).count()
    departments = db.query(Department).count()
    subjects = db.query(Subject).count()
    classrooms = db.query(Classroom).count()
    face_registered = db.query(Student).filter(Student.face_registered == True).count()
    active_cameras = db.query(Camera).filter(Camera.status.in_(["Active", "Online"])).count()
    active_sessions = db.query(LectureSession).filter(LectureSession.status == "Active").count()

    return {
        "students": students,
        "teachers": teachers,
        "cameras": cameras,
        "departments": departments,
        "subjects": subjects,
        "classrooms": classrooms,
        "face_registered": face_registered,
        "active_cameras": active_cameras,
        "active_sessions": active_sessions
    }


@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    current_user: User = Depends(RoleChecker(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    return db.query(Department).all()


@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    payload: DepartmentCreate,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    db_dept = db.query(Department).filter(Department.code == payload.code).first()
    if db_dept:
        raise HTTPException(status_code=400, detail="Department code already exists")
        
    dept = Department(
        name=payload.name,
        code=payload.code
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Create Department",
        details=f"Created department {payload.code} - {payload.name}"
    )
    db.add(audit)
    db.commit()
    
    return dept


@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(
    current_user: User = Depends(RoleChecker(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    return db.query(Subject).all()


@router.post("/subjects", response_model=SubjectResponse)
def create_subject(
    payload: SubjectCreate,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    db_subj = db.query(Subject).filter(Subject.code == payload.code).first()
    if db_subj:
        raise HTTPException(status_code=400, detail="Subject code already exists")
        
    subj = Subject(
        name=payload.name,
        code=payload.code,
        department_id=payload.department_id
    )
    db.add(subj)
    db.commit()
    db.refresh(subj)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Create Subject",
        details=f"Created course subject {payload.code} - {payload.name}"
    )
    db.add(audit)
    db.commit()
    
    return subj


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()


@router.get("/teachers")
def get_teachers(
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    teachers = db.query(Teacher).all()
    return [
        {
            "id": t.id,
            "employee_id": t.employee_id,
            "name": t.user.name if t.user else "Unknown",
            "email": t.user.email if t.user else "",
            "department": t.department.name if t.department else "—",
            "department_code": t.department.code if t.department else "—",
            "is_active": t.user.is_active if t.user else True
        }
        for t in teachers
    ]
