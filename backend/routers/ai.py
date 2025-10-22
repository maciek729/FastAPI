from fastapi import APIRouter, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import base64
import google.generativeai as genai

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ Brak GEMINI_API_KEY. Dodaj go do pliku .env")
    model = None
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        print("✅ Gemini client initialized successfully")
    except Exception as e:
        print(f"Błąd inicjalizacji klienta Gemini: {e}")
        model = None

class ChatMessage(BaseModel):
    message: str
    conversation: list[dict] = []

def get_gemini_response(messages: list, files: list = None) -> str:    
    try:
        if not model:
            return "Gemini nie jest skonfigurowany"
        
        conversation_text = ""
        for msg in messages:
            role = "Użytkownik" if msg["role"] == "user" else "Asystent"
            conversation_text += f"{role}: {msg['content']}\n"
        
        final_prompt = f"""
        Jesteś asystentem AI, który odpowiada na pytania użytkownika. 
        Odpowiadaj precyzyjnie i zwięźle. Odpowiadaj w języku polskim, 
        chyba że użytkownik poprosi o inny język.

        Historia konwersacji:
        {conversation_text}

        Odpowiedz na ostatnią wiadomość użytkownika.
        """
        
        contents = [final_prompt]
        
        if files:
            for file_info in files:
                file_content = file_info["content"]
                mime_type = file_info["mime_type"]
                
                file_data = base64.b64decode(file_content)
                file_part = {
                    'mime_type': mime_type,
                    'data': file_data
                }
                contents.append(file_part)
        
        response = model.generate_content(contents)
        return response.text
        
    except Exception as e:
        return f"Błąd Gemini API: {str(e)}"

def get_fallback_response(prompt: str) -> str:
    return "Witaj! Jestem asystentem AI. Aby korzystać z pełnych funkcji, skonfiguruj klucz GEMINI_API_KEY w pliku .env"

current_session_files = []

@router.post("/upload", response_class=JSONResponse)
async def upload_file(file: UploadFile = File(...)):
    """Endpoint do przesyłania plików - tylko dla aktualnej sesji"""
    try:
        content = await file.read()
        
        mime_types = {
            ".pdf": "application/pdf",
            ".txt": "text/plain", 
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp"
        }
        
        file_extension = "." + file.filename.split(".")[-1].lower()
        mime_type = mime_types.get(file_extension)
        
        if not mime_type:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "error": "Nieobsługiwany typ pliku."}
            )
        
        file_content_base64 = base64.b64encode(content).decode('utf-8')
        
        current_session_files.append({
            "filename": file.filename,
            "mime_type": mime_type,
            "content": file_content_base64,
            "size": len(content)
        })

        return {
            "status": "success",
            "message": f"Plik {file.filename} został pomyślnie wczytany.",
            "file_type": mime_type,
            "file_size": len(content)
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": f"Błąd przy wczytywaniu pliku: {str(e)}"}
        )

@router.post("/clear_files", response_class=JSONResponse)
async def clear_files():
    """Endpoint do czyszczenia plików"""
    current_session_files.clear()
    return {
        "status": "success", 
        "message": "Pliki wyczyszczone."
    }

@router.post("/chat", response_class=JSONResponse)
async def chat_endpoint(chat_data: ChatMessage):
    """Główny endpoint czatu - używa tylko aktualnej sesji"""
    try:
        messages = chat_data.conversation.copy()
        messages.append({"role": "user", "content": chat_data.message})

        if model:
            response_text = get_gemini_response(messages, current_session_files)
        else:
            response_text = get_fallback_response(chat_data.message)

        updated_conversation = chat_data.conversation + [
            {"role": "user", "content": chat_data.message},
            {"role": "assistant", "content": response_text}
        ]

        return {
            "status": "success",
            "response": response_text,
            "conversation": updated_conversation,
            "files_used": len(current_session_files) > 0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd podczas przetwarzania żądania: {str(e)}")

@router.post("/reset_session", response_class=JSONResponse)
async def reset_session():
    """Resetuje całą sesję - tworzy nową pustą"""
    current_session_files.clear()
    return {
        "status": "success", 
        "message": "Sesja zresetowana. Wszystkie pliki zostały usunięte."
    }

@router.get("/api_status")
async def api_status():
    """Endpoint sprawdzający status API"""
    return {
        "status": "active",
        "gemini_configured": bool(GEMINI_API_KEY and model),
        "has_files": bool(current_session_files),
        "files_count": len(current_session_files),
        "model": "gemini-2.0-flash-exp"
    }

@router.get("/files")
async def get_files():
    """Endpoint zwracający listę przesłanych plików"""
    return {
        "files": [
            {
                "filename": file["filename"],
                "type": file["mime_type"],
                "size": file["size"]
            }
            for file in current_session_files
        ]
    }