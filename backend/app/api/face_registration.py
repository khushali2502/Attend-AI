from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Student, FaceImage, FaceEmbedding, AuditLog
from app.schemas.schemas import FaceRegistrationStatusResponse, FaceImageResponse
from app.api.deps import get_current_active_user, RoleChecker
from app.services.ai_service import validate_face_image, generate_face_embedding, compute_average_embedding
from typing import List
import os
import shutil
import uuid

UPLOAD_BASE = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "students")

router = APIRouter(prefix="/students", tags=["Face Registration"])


def _get_student_upload_dir(student_id: int) -> str:
    """Get or create the upload directory for a student."""
    upload_dir = os.path.join(UPLOAD_BASE, str(student_id))
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


@router.post("/{student_id}/face-registration")
async def register_face(
    student_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(RoleChecker(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    """
    Register a student's face using 1-10 images.
    Each image is validated for exactly one face, then InsightFace generates an embedding.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if student.face_registered:
        raise HTTPException(
            status_code=400,
            detail="Face already registered. Use the update endpoint to replace it."
        )

    if len(files) < 1:
        raise HTTPException(status_code=400, detail="Please upload at least 1 face image.")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed.")

    upload_dir = _get_student_upload_dir(student_id)
    valid_embeddings = []
    saved_images = []
    validation_results = []

    # Pre-fetch existing registered student embeddings for duplicate check
    other_students = db.query(Student).filter(Student.face_registered == True, Student.id != student_id).all()
    existing_embs = {s.id: s.face_embedding for s in other_students if s.face_embedding}

    for idx, file in enumerate(files):
        # Read file content
        contents = await file.read()

        if not contents:
            validation_results.append({
                "image_index": idx + 1,
                "filename": file.filename,
                "valid": False,
                "message": "Empty file."
            })
            continue

        # Validate enrollment image: single face, blur, illumination, duplicate cross-check
        from app.services.ai_service import validate_enrollment_image
        is_valid, message, embedding, face_crop = validate_enrollment_image(
            contents,
            existing_student_embeddings=existing_embs,
            current_student_id=student_id
        )

        if not is_valid:
            validation_results.append({
                "image_index": idx + 1,
                "filename": file.filename,
                "valid": False,
                "message": message
            })
            continue

        # Save image file
        ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
        filename = f"face_{idx + 1:02d}{ext}"
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, "wb") as f:
            f.write(contents)

        # Store relative path for DB
        relative_path = f"/uploads/students/{student_id}/{filename}"

        # Save to database
        face_image = FaceImage(
            student_id=student_id,
            file_path=relative_path,
            pose_label=f"sample_{idx+1}"
        )
        db.add(face_image)

        face_emb = FaceEmbedding(
            student_id=student_id,
            embedding=embedding,
            image_path=relative_path,
            model_name="insightface_buffalo_l"
        )
        db.add(face_emb)

        valid_embeddings.append(embedding)
        saved_images.append(relative_path)

        validation_results.append({
            "image_index": idx + 1,
            "filename": file.filename,
            "valid": True,
            "message": "Face detected and embedding generated successfully."
        })

    if not valid_embeddings:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No valid face images provided. All images failed validation.",
                "results": validation_results
            }
        )

    # Compute average embedding
    avg_embedding = compute_average_embedding(valid_embeddings)

    print(f"Processing face registration for student_id={student_id}")
    print(f"Face detected")
    print(f"Embedding generated")
    print(f"Embedding dimension = {len(avg_embedding)}")
    print(f"Saving face profile")

    # Update student record
    student.face_registered = True
    student.face_embedding = avg_embedding
    student.profile_image_url = saved_images[0] if saved_images else None

    db.commit()
    db.refresh(student)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Face Registration",
        details=f"Registered face for {student.user.name} (Roll: {student.roll_number}). {len(valid_embeddings)} valid images processed."
    )
    db.add(audit)
    db.commit()

    print(f"Registration successful")

    return {
        "success": True,
        "student_id": student_id,
        "face_registered": True,
        "message": f"Face registered successfully with {len(valid_embeddings)} images.",
        "valid_images": len(valid_embeddings),
        "total_uploaded": len(files),
        "profile_image_url": student.profile_image_url,
        "validation_results": validation_results
    }


@router.get("/{student_id}/face", response_model=FaceRegistrationStatusResponse)
def get_face_status(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get face registration status for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Students can only view their own face status
    if current_user.role == "student":
        if not student.user_id == current_user.id:
            raise HTTPException(status_code=403, detail="Access denied. You can only view your own face status.")

    face_images = db.query(FaceImage).filter(FaceImage.student_id == student_id).order_by(FaceImage.created_at.desc()).all()

    registered_at = None
    if face_images:
        registered_at = face_images[-1].created_at  # earliest image

    return FaceRegistrationStatusResponse(
        student_id=student_id,
        face_registered=student.face_registered,
        profile_image_url=student.profile_image_url,
        image_count=len(face_images),
        images=[FaceImageResponse(id=fi.id, file_path=fi.file_path, created_at=fi.created_at) for fi in face_images],
        registered_at=registered_at
    )


@router.put("/{student_id}/face")
async def update_face(
    student_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(RoleChecker(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    """Update a student's face registration (replace existing)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if len(files) < 1:
        raise HTTPException(status_code=400, detail="Please upload at least 1 face image.")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed.")

    # Remove old face data
    _remove_face_data(student_id, db)

    upload_dir = _get_student_upload_dir(student_id)
    valid_embeddings = []
    saved_images = []
    validation_results = []

    for idx, file in enumerate(files):
        contents = await file.read()

        if not contents:
            validation_results.append({
                "image_index": idx + 1,
                "filename": file.filename,
                "valid": False,
                "message": "Empty file."
            })
            continue

        is_valid, message, face_obj = validate_face_image(contents)

        if not is_valid:
            validation_results.append({
                "image_index": idx + 1,
                "filename": file.filename,
                "valid": False,
                "message": message
            })
            continue

        embedding = generate_face_embedding(contents)

        ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
        filename = f"face_{idx + 1:02d}{ext}"
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, "wb") as f:
            f.write(contents)

        relative_path = f"/uploads/students/{student_id}/{filename}"

        face_image = FaceImage(student_id=student_id, file_path=relative_path)
        db.add(face_image)

        face_emb = FaceEmbedding(
            student_id=student_id,
            embedding=embedding,
            image_path=relative_path,
            model_name="insightface_buffalo_l"
        )
        db.add(face_emb)

        valid_embeddings.append(embedding)
        saved_images.append(relative_path)

        validation_results.append({
            "image_index": idx + 1,
            "filename": file.filename,
            "valid": True,
            "message": "Face detected and embedding generated successfully."
        })

    if not valid_embeddings:
        # If no valid images, keep face as unregistered
        student.face_registered = False
        student.face_embedding = None
        student.profile_image_url = None
        db.commit()
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No valid face images provided. Face registration has been cleared.",
                "results": validation_results
            }
        )

    avg_embedding = compute_average_embedding(valid_embeddings)
    student.face_registered = True
    student.face_embedding = avg_embedding
    student.profile_image_url = saved_images[0] if saved_images else None

    db.commit()
    db.refresh(student)

    audit = AuditLog(
        user_id=current_user.id,
        action="Face Update",
        details=f"Updated face for {student.user.name} (Roll: {student.roll_number}). {len(valid_embeddings)} valid images."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "student_id": student_id,
        "face_registered": True,
        "message": f"Face updated successfully with {len(valid_embeddings)} images.",
        "valid_images": len(valid_embeddings),
        "total_uploaded": len(files),
        "profile_image_url": student.profile_image_url,
        "validation_results": validation_results
    }


@router.delete("/{student_id}/face")
def remove_face(
    student_id: int,
    current_user: User = Depends(RoleChecker(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    """Remove a student's face registration. Keeps the student account and attendance."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if not student.face_registered:
        raise HTTPException(status_code=400, detail="Student has no face registration to remove.")

    _remove_face_data(student_id, db)

    student.face_registered = False
    student.face_embedding = None
    student.profile_image_url = None

    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="Face Removal",
        details=f"Removed face for {student.user.name} (Roll: {student.roll_number})."
    )
    db.add(audit)
    db.commit()

    print(f"Face registration removed for student_id={student_id}")

    return {
        "success": True,
        "student_id": student_id,
        "face_registered": False,
        "message": "Face registration removed successfully. Student account and attendance records preserved."
    }


def _remove_face_data(student_id: int, db: Session):
    """Remove all face images and embeddings for a student."""
    # Delete database records
    db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id).delete()
    db.query(FaceImage).filter(FaceImage.student_id == student_id).delete()
    db.commit()

    # Remove files from disk
    upload_dir = os.path.join(UPLOAD_BASE, str(student_id))
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir, ignore_errors=True)
