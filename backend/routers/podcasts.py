from fastapi import APIRouter, HTTPException, Depends, status, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Annotated
import os
import uuid
from datetime import datetime
from database import SessionLocal
from models import Podcasts, Notes, PodcastFolders
import wave
import io
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

load_dotenv()

router = APIRouter(
    prefix="/podcasts",
    tags=["podcasts"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("OSTRZEŻENIE: Brak konfiguracji Supabase. Upload plików nie zadziała.")
    supabase = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

class PodcastCreateRequest(BaseModel):
    notebook_id: int
    user_id: int
    title: str
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

class CopyPodcastRequest(BaseModel):
    target_notebook_id: int
    user_id: int

class PodcastResponse(BaseModel):
    id: int
    title: str
    file_url: str
    created_at: datetime
    script_content: Optional[str] = None
    folder_id: Optional[int] = None
    is_pinned: bool = False
    grid_position: Optional[int] = 0

    class Config:
        from_attributes = True

class FolderResponse(BaseModel):
    id: int
    name: str
    parent_folder_id: Optional[int]
    grid_position: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

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
    4. Speak in provided language unless the topic or reference section suggests otherwise.
    """
    
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite", 
        contents=prompt
    )
    return response.text

def generate_and_upload_audio(script_text: str, api_key: str) -> str:
    if not supabase:
        raise Exception("Supabase client not initialized")

    client = genai.Client(
        api_key=api_key)
    
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
    
    try:
        pcm_data = response.candidates[0].content.parts[0].inline_data.data
    except (AttributeError, IndexError):
        raise Exception("Model AI nie zwrócił danych audio.")

    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(pcm_data)
    
    wav_buffer.seek(0)
    
    filename = f"{uuid.uuid4()}.wav"
    storage_path = f"generated/{filename}" 

    try:
        supabase.storage.from_("podcasts").upload(
            path=storage_path,
            file=wav_buffer.getvalue(),
            file_options={"content-type": "audio/wav"}
        )
        
        public_url = supabase.storage.from_("podcasts").get_public_url(storage_path)
        
        return public_url, storage_path

    except Exception as e:
        print(f"Supabase Upload Error: {e}")
        raise Exception(f"Błąd wysyłania pliku do Supabase: {e}")

# --- ENDPOINTS ---

@router.post("/generate", response_model=PodcastResponse, status_code=status.HTTP_201_CREATED)
async def generate_podcast(request: PodcastCreateRequest, db: db_dependency):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Brak klucza API Gemini")

    context_text = ""
    # tutaj wiki to dodałem, bo wcześniej mi nie działało, gdy nie załączałem notatek
    if request.note_ids and len(request.note_ids) > 0:
        notes = db.query(Notes).filter(Notes.id.in_(request.note_ids), Notes.type.in_(["Notatka", "Chat AI"])).all()
        if notes:
            context_text = "\n\n".join([f"Note Title: {n.title}\nContent: {n.content}" for n in notes])
    
    try:
        script = create_script(request.topic, context_text, api_key)
    except Exception as e:
        print(f"Error Script: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd AI (Scenariusz): {str(e)}")

    try:
        file_url, storage_path = generate_and_upload_audio(script, api_key)
        
    except Exception as e:
        print(f"Error Audio/Upload: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd generowania/uploadu audio: {str(e)}")

    new_podcast = Podcasts(
        notebook_id=request.notebook_id,
        user_id=request.user_id,
        title=request.title,
        script_content=script,
        file_path=storage_path,
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
    
    if podcast.file_url:
        path_to_delete = podcast.file_url.split("/podcasts/")[-1] 
        try: supabase.storage.from_("podcasts").remove([path_to_delete])
        except: pass

    db.delete(podcast)
    db.commit()
    return {"message": "Usunięto pomyślnie"}

@router.post("/folders/create", response_model=FolderResponse)
async def create_podcast_folder(request: FolderCreateRequest, db: db_dependency):
    new_folder = PodcastFolders(notebook_id=request.notebook_id, user_id=request.user_id, name=request.name, parent_folder_id=request.parent_folder_id)
    db.add(new_folder); db.commit(); db.refresh(new_folder)
    return new_folder

@router.get("/folders/list", response_model=List[FolderResponse])
async def list_podcast_folders(notebook_id: int, db: db_dependency):
    return db.query(PodcastFolders).filter(PodcastFolders.notebook_id == notebook_id).all()

@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_podcast_folder(folder_id: int, db: db_dependency):
    folder = db.query(PodcastFolders).filter(PodcastFolders.id == folder_id).first()
    if not folder: raise HTTPException(status_code=404, detail="Folder not found")
    podcasts_in_folder = db.query(Podcasts).filter(Podcasts.folder_id == folder_id).all()
    for p in podcasts_in_folder: p.folder_id = None
    db.delete(folder); db.commit()

@router.patch("/{podcast_id}/rename")
async def rename_podcast(podcast_id: int, request: RenameRequest, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == podcast_id).first()
    if not podcast: raise HTTPException(status_code=404, detail="Podcast not found")
    podcast.title = request.name; db.commit()
    return {"message": "Updated"}

@router.patch("/{podcast_id}/pin")
async def pin_podcast(podcast_id: int, request: PinUpdate, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == podcast_id).first()
    if not podcast: raise HTTPException(status_code=404, detail="Podcast not found")
    podcast.is_pinned = request.is_pinned; db.commit()
    return {"message": "Updated"}

@router.patch("/{podcast_id}/position")
async def update_podcast_position(podcast_id: int, request: PositionUpdate, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == podcast_id).first()
    if not podcast: raise HTTPException(status_code=404, detail="Podcast not found")
    podcast.grid_position = request.grid_position
    db.commit()
    db.refresh(podcast)
    return {"message": "Position updated successfully", "grid_position": podcast.grid_position}

@router.post("/folders/move-item")
async def move_podcast_to_folder(request: MoveItemRequest, db: db_dependency):
    podcast = db.query(Podcasts).filter(Podcasts.id == request.item_id).first()
    if not podcast: raise HTTPException(status_code=404, detail="Podcast not found")
    podcast.folder_id = request.folder_id; db.commit()
    return {"id": podcast.id, "folder_id": podcast.folder_id}

@router.patch("/folders/{folder_id}/rename")
async def rename_folder(folder_id: int, request: RenameRequest, db: db_dependency):
    folder = db.query(PodcastFolders).filter(PodcastFolders.id == folder_id).first()
    if not folder: raise HTTPException(status_code=404, detail="Folder not found")
    folder.name = request.name; db.commit()
    return {"message": "Updated"}

@router.patch("/folders/{folder_id}/position")
async def update_folder_position(folder_id: int, request: PositionUpdate, db: db_dependency):
    folder = db.query(PodcastFolders).filter(PodcastFolders.id == folder_id).first()
    if not folder: raise HTTPException(status_code=404, detail="Folder not found")
    folder.grid_position = request.grid_position
    db.commit()
    db.refresh(folder)
    return {"message": "Position updated successfully", "grid_position": folder.grid_position}

@router.patch("/folders/{folder_id}/move")
async def move_folder(folder_id: int, request: MoveFolderRequest, db: db_dependency):
    folder = db.query(PodcastFolders).filter(PodcastFolders.id == folder_id).first()
    if not folder: raise HTTPException(status_code=404, detail="Folder not found")
    folder.parent_folder_id = request.parent_folder_id; db.commit()
    return {"message": "Updated"}

@router.post("/{podcast_id}/copy", response_model=PodcastResponse, status_code=status.HTTP_201_CREATED)
async def copy_podcast_to_notebook(podcast_id: int, request: CopyPodcastRequest, db: db_dependency):
    original_podcast = db.query(Podcasts).filter(Podcasts.id == podcast_id).first()
    if not original_podcast: raise HTTPException(status_code=404, detail="Podcast not found")

    new_podcast = Podcasts(
        user_id=request.user_id,
        notebook_id=request.target_notebook_id,
        title=original_podcast.title,
        script_content=original_podcast.script_content,
        file_path=original_podcast.file_path,
        file_url=original_podcast.file_url,
        folder_id=None,
        grid_position=None,
        is_pinned=False,
        created_at=datetime.now()
    )
    db.add(new_podcast)
    db.commit()
    db.refresh(new_podcast)
    return new_podcast