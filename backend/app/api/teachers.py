from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Teacher, Student, Attendance
from app.schemas.schemas import TeacherResponse, StudentResponse, AttendanceResponse
from app.api.deps import get_current_active_user, RoleChecker
from typing import List

router = APIRouter(prefix="/teachers", tags=["Teachers"])

@router.get("/me/profile", response_model=TeacherResponse)
def get_teacher_profile(
    current_user: User = Depends(RoleChecker(["teacher"])),
    db: Session = Depends(get_db)
):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher


@router.get("/students", response_model=List[StudentResponse])
def get_teacher_students(
    department_id: int = None,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if department_id:
        query = query.filter(Student.department_id == department_id)
    return query.order_by(Student.id.asc()).all()


@router.put("/attendance/{record_id}", response_model=AttendanceResponse)
def correct_attendance(
    record_id: int,
    status_update: dict,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
        
    status = status_update.get("status")
    if not status or status not in ["Present", "Absent", "Late"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
        
    record.status = status
    record.verification_method = "Manual"
    record.corrected_by = current_user.id
    
    db.commit()
    db.refresh(record)
    return record


@router.post("/students/{student_id}/register-face")
async def register_student_face(
    student_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty image file.")
        
    from app.services.ai_service import validate_face_image, generate_face_embedding
    from app.models.models import FaceImage, FaceEmbedding, AuditLog
    import os

    # Real face validation
    is_valid, msg, face_obj = validate_face_image(contents)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
        
    # Save face image to uploads and static
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "students", str(student_id))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, "face_01.jpg")
    with open(file_path, "wb") as f:
        f.write(contents)
        
    os.makedirs("static/profiles", exist_ok=True)
    static_path = f"static/profiles/{student.roll_number}.jpg"
    with open(static_path, "wb") as f:
        f.write(contents)
        
    relative_path = f"/uploads/students/{student_id}/face_01.jpg"
    
    # Generate real InsightFace embedding
    embedding = generate_face_embedding(contents)
    
    # Save FaceImage & FaceEmbedding in PostgreSQL
    face_img = FaceImage(student_id=student_id, file_path=relative_path)
    db.add(face_img)
    
    face_emb = FaceEmbedding(
        student_id=student_id,
        embedding=embedding,
        image_path=relative_path,
        model_name="insightface_buffalo_l"
    )
    db.add(face_emb)
    
    student.face_registered = True
    student.face_embedding = embedding
    student.profile_image_url = relative_path
    
    audit = AuditLog(
        user_id=current_user.id,
        action="Face Registration",
        details=f"Teacher registered face for {student.user.name} (Roll: {student.roll_number})."
    )
    db.add(audit)
    db.commit()
    db.refresh(student)
    
    print(f"Processing face registration for student_id={student_id}")
    print(f"Face detected")
    print(f"Embedding generated")
    print(f"Embedding dimension = {len(embedding)}")
    print(f"Saving face profile")
    print(f"Registration successful")
    
    return {
        "success": True,
        "student_id": student.id,
        "face_registered": True,
        "message": "Face registered successfully"
    }
