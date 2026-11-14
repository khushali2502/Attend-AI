from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Scheme, Application, Grievance, Feedback, FarmerProfile, RagKnowledgeBase
from app.schemas.schemas import AdminAnalytics, SchemeResponse, SchemeCreate, UserResponse, GrievanceResponse, GrievanceUpdate, FeedbackResponse, RagUploadResponse
from app.api.deps import get_current_active_user, RoleChecker
from app.services.ai_service import extract_text_from_pdf, chunk_text, get_embeddings, pinecone_service
from datetime import datetime, timedelta
import json
import uuid

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"], dependencies=[Depends(RoleChecker(["admin"]))])

@router.get("/analytics", response_model=AdminAnalytics)
def get_analytics(db: Session = Depends(get_db)):
    total_farmers = db.query(User).filter(User.role == "farmer").count()
    total_schemes = db.query(Scheme).count()
    total_applications = db.query(Application).count()
    pending_grievances = db.query(Grievance).filter(Grievance.status == "Pending").count()

    # Preferred Language Distribution
    languages = db.query(User.preferred_language).filter(User.role == "farmer").all()
    lang_dist = {"mr": 0, "hi": 0, "en": 0, "kok": 0, "ahr": 0}
    for l in languages:
        lang = l[0] or "mr"
        if lang in lang_dist:
            lang_dist[lang] += 1
        else:
            lang_dist[lang] = 1

    # Scheme Categories Distribution
    categories = db.query(Scheme.category).all()
    cat_dist = {}
    for c in categories:
        cat = c[0]
        cat_dist[cat] = cat_dist.get(cat, 0) + 1

    # Activity by month (mocked timeline)
    today = datetime.now()
    monthly_activity = []
    for i in range(5, -1, -1):
        month_date = today - timedelta(days=i*30)
        month_name = month_date.strftime("%B")
        monthly_activity.append({
            "month": month_name,
            "queries": 150 + i * 45,
            "registrations": 10 + i * 4,
            "applications": 5 + i * 3
        })

    return {
        "total_farmers": total_farmers,
        "total_schemes": total_schemes,
        "total_applications": total_applications,
        "pending_grievances": pending_grievances,
        "language_distribution": lang_dist,
        "category_distribution": cat_dist,
        "monthly_activity": monthly_activity
    }

@router.post("/rag/upload", response_model=RagUploadResponse)
async def upload_rag_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF file format supported.")
        
    file_bytes = await file.read()
    
    # Save base entry
    db_doc = RagKnowledgeBase(
        filename=file.filename,
        content_length=len(file_bytes),
        status="Processing"
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    try:
        # Extract plain text
        raw_text = extract_text_from_pdf(file_bytes)
        if not raw_text or raw_text.startswith("Failed") or raw_text.startswith("PDF extractor"):
            raise Exception(raw_text)
            
        # Recursive splitter
        chunks = chunk_text(raw_text, chunk_size=400, chunk_overlap=80)
        db_doc.chunk_count = len(chunks)
        
        # Prepare records for vector storage
        vectors_to_upsert = []
        for i, text_chunk in enumerate(chunks):
            # Generate Gemini embedding (offline compatible fallback)
            vector = get_embeddings(text_chunk)
            vectors_to_upsert.append({
                "id": f"doc_{db_doc.id}_chunk_{i}_{str(uuid.uuid4())[:8]}",
                "vector": vector,
                "text": text_chunk,
                "metadata": {
                    "source": file.filename,
                    "document_id": db_doc.id,
                    "page": (i // 2) + 1  # Simulated page estimation
                }
            })
            
        # Write to Vector Database (Pinecone with fallback to numpy cache)
        pinecone_service.upsert_chunks(vectors_to_upsert)
        
        db_doc.status = "Ready"
        db.commit()
    except Exception as e:
        print(f"RAG upload index failure: {e}")
        db_doc.status = "Failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to process RAG file: {str(e)}")
        
    return db_doc

@router.get("/rag/documents", response_model=list[RagUploadResponse])
def list_rag_documents(db: Session = Depends(get_db)):
    return db.query(RagKnowledgeBase).order_by(RagKnowledgeBase.uploaded_at.desc()).all()


# --- Government Scheme CRUD ---
@router.post("/schemes", response_model=SchemeResponse)
def create_scheme(payload: SchemeCreate, db: Session = Depends(get_db)):
    scheme = Scheme(
        title_mr=payload.title_mr,
        title_hi=payload.title_hi,
        title_en=payload.title_en,
        title_other=payload.title_other,
        category=payload.category,
        description_mr=payload.description_mr,
        description_hi=payload.description_hi,
        description_en=payload.description_en,
        description_other=payload.description_other,
        benefits_mr=payload.benefits_mr,
        benefits_hi=payload.benefits_hi,
        benefits_en=payload.benefits_en,
        benefits_other=payload.benefits_other,
        eligibility_criteria=payload.eligibility_criteria,
        required_documents=payload.required_documents,
        official_url=payload.official_url,
        pdf_url=payload.pdf_url
    )
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme

@router.put("/schemes/{scheme_id}", response_model=SchemeResponse)
def update_scheme(scheme_id: int, payload: SchemeCreate, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
        
    for field, value in payload.model_dump().items():
        setattr(scheme, field, value)
        
    db.commit()
    db.refresh(scheme)
    return scheme

@router.delete("/schemes/{scheme_id}")
def delete_scheme(scheme_id: int, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    db.delete(scheme)
    db.commit()
    return {"message": "Scheme deleted successfully", "id": scheme_id}


# --- User list & Management ---
@router.get("/users", response_model=list[UserResponse])
def get_farmers_list(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == "farmer").order_by(User.created_at.desc()).all()


# --- Support Grievance Portal ---
@router.get("/grievances", response_model=list[GrievanceResponse])
def list_all_grievances(db: Session = Depends(get_db)):
    return db.query(Grievance).order_by(Grievance.created_at.desc()).all()

@router.put("/grievances/{grievance_id}", response_model=GrievanceResponse)
def resolve_grievance(
    grievance_id: int,
    payload: GrievanceUpdate,
    db: Session = Depends(get_db)
):
    grievance = db.query(Grievance).filter(Grievance.id == grievance_id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")
        
    grievance.status = payload.status
    grievance.response_text = payload.response_text
    grievance.resolved_at = datetime.now()
    db.commit()
    db.refresh(grievance)
    return grievance

@router.get("/feedback", response_model=list[FeedbackResponse])
def view_ratings_feedback(db: Session = Depends(get_db)):
    return db.query(Feedback).order_by(Feedback.created_at.desc()).all()
