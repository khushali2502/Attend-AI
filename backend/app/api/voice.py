from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Conversation, Message
from app.schemas.schemas import VoiceAssistRequest, VoiceAssistResponse, TTSRequest, STTResponse
from app.services.ai_service import query_assistant
from app.api.deps import get_current_active_user
import random

router = APIRouter(prefix="/voice", tags=["Voice Assistant"])

@router.post("/speech-to-text", response_model=STTResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    # Simulated transcription. In the web app, Web Speech API does this in the browser client
    # but we support file upload backend parsing for native apps too.
    return {
        "text": "पीएम किसान योजनेचे हफ्ते कधी मिळतात?",
        "confidence": 0.96
    }

@router.post("/query-assistant", response_model=VoiceAssistResponse)
def voice_query_assistant(
    payload: VoiceAssistRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query_text = payload.text_query
    if not query_text:
        raise HTTPException(status_code=400, detail="Text query is required")

    lang = payload.language or current_user.preferred_language or "mr"
    
    # Resolve or create conversation
    conv_id = payload.conversation_id
    conversation = None
    if conv_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == conv_id,
            Conversation.user_id == current_user.id
        ).first()
        
    if not conversation:
        conversation = Conversation(
            user_id=current_user.id,
            title=query_text[:40] + "...",
            preferred_language=lang
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
    # Gather historical context for the model
    db_history = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at.asc()).all()
    history = [{"role": msg.sender, "content": msg.text} for msg in db_history]

    # Call RAG AI gateway
    response_text, citations, resolved_lang = query_assistant(query_text, history, lang)

    # Save farmer query message
    user_msg = Message(
        conversation_id=conversation.id,
        sender="user",
        text=query_text,
        language=lang
    )
    db.add(user_msg)

    # Save assistant response message
    assistant_msg = Message(
        conversation_id=conversation.id,
        sender="assistant",
        text=response_text,
        language=resolved_lang,
        citations=citations
    )
    db.add(assistant_msg)
    db.commit()

    # Generate static fallback audio link or return signal to browser
    # We will trigger speech synthesis directly in Next.js via browser API,
    # and provide a simulated URL parameter for native audio.
    audio_path = f"/api/voice/text-to-speech?text={response_text[:60]}&language={resolved_lang}"

    return {
        "response_text": response_text,
        "audio_url": audio_path,
        "conversation_id": conversation.id,
        "citations": citations,
        "detected_language": resolved_lang
    }

@router.get("/text-to-speech")
def text_to_speech(text: str, language: str = "mr"):
    # Return sound file info or redirect. The frontend uses the browser HTML5 SpeechSynthesis
    # which sounds much better and doesn't load files. But we provide the endpoint.
    return {"message": "TTS streaming ready", "text": text, "language": language}
