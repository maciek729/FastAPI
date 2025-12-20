from fastapi import APIRouter, HTTPException, Depends, status, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Annotated
import os
import uuid
from datetime import datetime
from database import SessionLocal
from models import Podcasts, Notes, PodcastFolders
import google.generativeai as genai
from google.generativeai import types
import wave
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/podcasts",
    tags=["podcasts"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

UPLOAD_DIR = "static/podcasts"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- MODELS Pydantic ---
class PodcastCreateRequest(BaseModel):
    notebook_id: int
    user_id: int
    topic: str
    note_ids: Optional[List[int]] = [] 
    parent_folder_id: Optional[int] = None

class FolderCreateRequest(BaseModel):
    notebook_id: int
    user_id: int
    name: str
    parent_folder_id: Optional[int] = None

class RenameRequest(BaseModel):
    name: str

class PositionUpdate(BaseModel):
    grid_position: int

class PinUpdate(BaseModel):
    is_pinned: bool

class MoveItemRequest(BaseModel):
    item_id: int
    folder_id: Optional[int] = None

class MoveFolderRequest(BaseModel):
    parent_folder_id: Optional[int] = None

class PodcastResponse(BaseModel):
    id: int
    title: str
    file_url: str
    created_at: datetime
    script_content: Optional[str] = None
    folder_id: Optional[int] = None
    is_pinned: bool = False
    grid_position: Optional[int] = 0

class FolderResponse(BaseModel):
    id: int
    name: str
    parent_folder_id: Optional[int]
    grid_position: Optional[int]
    created_at: datetime

# --- EXISTING LOGIC (Helpers) ---
def create_script(topic: str, context_text: str, api_key: str):
    client = genai.Client(api_key=api_key)
    reference_section = ""
    if context_text.strip():
        reference_section = f"Here is the reference material (notes) you MUST base the discussion on:\n{context_text}"
    else:
        reference_section = "No specific reference notes provided. Base the discussion on general knowledge about the topic."

    prompt = f"""
    Write a short, engaging podcast dialogue between two hosts: Joe and Jane.
    The topic of the discussion is: {topic}.
    {reference_section}
    Rules:
    1. Keep it natural and conversational.
    2. The output must ONLY contain the dialogue in this exact format:
       Joe: [text]
       Jane: [text]
    3. Do not add narration, scene descriptions, or asterisks. just the lines.
    4. Speak in Polish unless the topic suggests otherwise.
    """
    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    return response.text

def create_audio(script_text: str, output_path: str, api_key: str):
    client = genai.Client(api_key=api_key)
    prompt = f"TTS the following conversation:\n{script_text}"
    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                    speaker_voice_configs=[
                        types.SpeakerVoiceConfig(speaker='Joe', voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='Kore'))),
                        types.SpeakerVoiceConfig(speaker='Jane', voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='Puck'))),
                    ]
                )
            )
        )
    )
    pcm_data = response.candidates[0].content.parts[0].inline_data.data
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(pcm_data)

# --- ENDPOINTS ---

@router.post("/generate", response_model=PodcastResponse, status_code=status.HTTP_201_CREATED)
async def generate_podcast(request: PodcastCreateRequest, db: db_dependency):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Brak klucza API Gemini")

    context_text = ""
    if request.note_ids:
        notes = db.query(Notes).filter(Notes.id.in_(request.note_ids)).all()
        if notes:
            context_text = "\n\n".join([f"Note Title: {n.title}\nContent: {n.content}" for n in notes])
    
    try:
        script = create_script(request.topic, context_text, api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd generowania scenariusza (AI): {str(e)}")

    filename = f"{uuid.uuid4()}.wav"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        create_audio(script, file_path, api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd generowania audio (TTS): {str(e)}")

    file_url = f"http://localhost:8000/static/podcasts/{filename}" 
    
    new_podcast = Podcasts(
        notebook_id=request.notebook_id,
        user_id=request.user_id,
        title=request.topic,
        script_content=script,
        file_path=file_path,
        file_url=file_url,
        folder_id=request.parent_folder_id
    )
    
    db.add(new_podcast)
    db.commit()
    db.refresh(new_podcast)
    return new_podcast

@router.get("/list", response_model=List[PodcastResponse])
async def list_podcasts(notebook_id: int, db: db_dependency):
    return db.query(Podcasts).filter(Podcasts.notebook_id == notebook_id).all()

@router.delete("/{podcast_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_podcast(podcast_id: int, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == podcast_id).first()
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast nie znaleziony")
    
    if os.path.exists(podcast.file_path):
        try:
            os.remove(podcast.file_path)
        except OSError:
            pass
        
    db.delete(podcast)
    db.commit()
    return {"message": "Usunięto pomyślnie"}

# --- FOLDER & MANAGEMENT ENDPOINTS ---

@router.post("/folders/create", response_model=FolderResponse)
async def create_podcast_folder(request: FolderCreateRequest, db: db_dependency):
    new_folder = PodcastFolders(
        notebook_id=request.notebook_id,
        user_id=request.user_id,
        name=request.name,
        parent_folder_id=request.parent_folder_id
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@router.get("/folders/list", response_model=List[FolderResponse])
async def list_podcast_folders(notebook_id: int, db: db_dependency):
    return db.query(PodcastFolders).filter(PodcastFolders.notebook_id == notebook_id).all()

@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_podcast_folder(folder_id: int, db: db_dependency):
    folder = db.query(PodcastFolders).filter(PodcastFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    podcasts_in_folder = db.query(Podcasts).filter(Podcasts.folder_id == folder_id).all()
    for p in podcasts_in_folder:
        p.folder_id = None
        
    db.delete(folder)
    db.commit()

@router.patch("/{podcast_id}/rename")
async def rename_podcast(podcast_id: int, request: RenameRequest, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == podcast_id).first()
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    podcast.title = request.name
    db.commit()
    return {"message": "Updated"}

@router.patch("/{podcast_id}/pin")
async def pin_podcast(podcast_id: int, request: PinUpdate, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == podcast_id).first()
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    podcast.is_pinned = request.is_pinned
    db.commit()
    return {"message": "Updated"}

@router.patch("/{podcast_id}/position")
async def update_podcast_position(podcast_id: int, request: PositionUpdate, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == podcast_id).first()
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    podcast.grid_position = request.grid_position
    db.commit()
    return {"message": "Updated"}

@router.post("/folders/move-item")
async def move_podcast_to_folder(request: MoveItemRequest, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == request.item_id).first()
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    podcast.folder_id = request.folder_id
    db.commit()
    return {"id": podcast.id, "folder_id": podcast.folder_id}

@router.patch("/folders/{folder_id}/rename")
async def rename_folder(folder_id: int, request: RenameRequest, db: db_dependency):
    folder = db.query(PodcastFolders).filter(PodcastFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder.name = request.name
    db.commit()
    return {"message": "Updated"}

@router.patch("/folders/{folder_id}/position")
async def update_folder_position(folder_id: int, request: PositionUpdate, db: db_dependency):
    folder = db.query(PodcastFolders).filter(PodcastFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder.grid_position = request.grid_position
    db.commit()
    return {"message": "Updated"}

@router.patch("/folders/{folder_id}/move")
async def move_folder(folder_id: int, request: MoveFolderRequest, db: db_dependency):
    folder = db.query(PodcastFolders).filter(PodcastFolders.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder.parent_folder_id = request.parent_folder_id
    db.commit()
    return {"message": "Updated"}