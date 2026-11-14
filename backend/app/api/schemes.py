from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Scheme, SavedScheme, FarmerProfile
from app.schemas.schemas import SchemeResponse, EligibilityCheckerResult
from app.api.deps import get_current_active_user
from typing import List, Optional

router = APIRouter(prefix="/schemes", tags=["Government Schemes"])

@router.get("/", response_model=List[SchemeResponse])
def get_schemes(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Scheme).filter(Scheme.is_active == True)
    
    if category and category != "All":
        query = query.filter(Scheme.category == category)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Scheme.title_mr.like(search_filter)) |
            (Scheme.title_hi.like(search_filter)) |
            (Scheme.title_en.like(search_filter)) |
            (Scheme.description_mr.like(search_filter)) |
            (Scheme.description_hi.like(search_filter)) |
            (Scheme.description_en.like(search_filter))
        )
        
    return query.all()

@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Scheme.category).distinct().all()
    return ["All"] + [c[0] for c in categories if c[0]]

@router.get("/saved", response_model=List[SchemeResponse])
def get_saved_schemes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    saved = db.query(SavedScheme).filter(SavedScheme.user_id == current_user.id).all()
    scheme_ids = [s.scheme_id for s in saved]
    return db.query(Scheme).filter(Scheme.id.in_(scheme_ids)).all() if scheme_ids else []

@router.post("/{scheme_id}/bookmark")
def toggle_bookmark(
    scheme_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
        
    existing = db.query(SavedScheme).filter(
        SavedScheme.user_id == current_user.id,
        SavedScheme.scheme_id == scheme_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"bookmarked": False, "message": "Scheme removed from bookmarks"}
    else:
        new_bookmark = SavedScheme(user_id=current_user.id, scheme_id=scheme_id)
        db.add(new_bookmark)
        db.commit()
        return {"bookmarked": True, "message": "Scheme added to bookmarks"}

@router.get("/{scheme_id}/check-eligibility", response_model=EligibilityCheckerResult)
def check_scheme_eligibility(
    scheme_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
        
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Farmer profile not set up")
        
    criteria = scheme.eligibility_criteria
    reasons_eligible = []
    reasons_ineligible = []
    eligible = True
    
    # 1. Land size check
    max_land = criteria.get("max_land_size")
    if max_land is not None:
        if profile.land_size <= max_land:
            reasons_eligible.append(
                f"तुमची जमीन ({profile.land_size} एकर) या योजनेच्या मर्यादेपेक्षा ({max_land} एकर) कमी किंवा बरोबर आहे."
            )
        else:
            eligible = False
            reasons_ineligible.append(
                f"तुमची जमीन ({profile.land_size} एकर) या योजनेच्या कमाल मर्यादेपेक्षा ({max_land} एकर) जास्त आहे."
            )
            
    # 2. Categories check
    allowed_categories = criteria.get("allowed_categories")
    if allowed_categories:
        if profile.category in allowed_categories:
            reasons_eligible.append(
                f"तुमची प्रवर्ग श्रेणी ({profile.category}) या योजनेसाठी पात्र आहे."
            )
        else:
            eligible = False
            reasons_ineligible.append(
                f"तुमचा प्रवर्ग ({profile.category}) या योजनेच्या पात्र प्रवर्गात ({', '.join(allowed_categories)}) येत नाही."
            )
            
    # 3. Crops check
    allowed_crops = criteria.get("allowed_crops")
    if allowed_crops and profile.crop_types:
        common_crops = set(profile.crop_types).intersection(set(allowed_crops))
        if common_crops:
            reasons_eligible.append(
                f"तुमची पिके ({', '.join(common_crops)}) या योजनेसाठी पात्र आहेत."
            )
        else:
            eligible = False
            reasons_ineligible.append(
                f"तुमची पिके ({', '.join(profile.crop_types)}) या योजनेच्या पात्र पिकांमध्ये ({', '.join(allowed_crops)}) समाविष्ट नाहीत."
            )
            
    # 4. Loan status check
    required_loans = criteria.get("requires_active_loans")
    if required_loans is not None:
        if profile.active_loans == required_loans:
            status_text = "सक्रिय कर्ज आहे" if profile.active_loans else "कोणतेही कर्ज थकलेले नाही"
            reasons_eligible.append(f"तुमची कर्ज स्थिती ({status_text}) पात्रतेच्या नियमांची पूर्तता करते.")
        else:
            eligible = False
            status_text = "सक्रिय कर्ज आहे" if profile.active_loans else "सक्रिय कर्ज नाही"
            reasons_ineligible.append(f"तुमची कर्ज स्थिती ({status_text}) या योजनेच्या नियमांशी जुळत नाही.")

    # Generate missing docs
    missing_documents = scheme.required_documents
    
    # Recommended actions
    next_steps = []
    if eligible:
        next_steps.append("योजनेसाठी ऑनलाईन अर्ज भरा.")
        next_steps.append(f"आवश्यक कागदपत्रे गोळा करा: {', '.join(scheme.required_documents)}")
        if scheme.official_url:
            next_steps.append(f"अधिकृत संकेतस्थळाला भेट द्या: {scheme.official_url}")
    else:
        next_steps.append("तुमच्या प्रोफाईल तपशीलाची पडताळणी करा किंवा स्थानिक मदत केंद्राशी (CSC) संपर्क साधा.")

    # Return structure matching schemas.py
    title = current_user.preferred_language == "mr" and scheme.title_mr or (current_user.preferred_language == "hi" and scheme.title_hi or scheme.title_en)
    
    return {
        "eligible": eligible,
        "scheme_id": scheme.id,
        "scheme_title": title,
        "reasons_eligible": reasons_eligible,
        "reasons_ineligible": reasons_ineligible,
        "missing_documents": missing_documents,
        "next_steps": next_steps
    }
