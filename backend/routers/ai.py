from fastapi import APIRouter, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import base64
from dotenv import load_dotenv
from google import genai
from google.genai import types
from datetime import datetime
from .notes import markdown_to_html

load_dotenv()

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODELS = [
    "gemini-2.5-flash",
]

STYLE_INSTRUCTIONS = {
    "brief": "Odpowiadaj BARDZO KRÓTKO i ZWIĘŹLE. Maksymalnie 2-3 zdania. Bądź konkretny bez zbędnych szczegółów. Używaj formatowania LaTeX do wzorów matematycznych (np. $\\sin(x)$, $\\int$).",
    "balanced": "Odpowiadaj w sposób zrównoważony. Udziel wyczerpującej odpowiedzi, ale bez przesadnej długości. Używaj formatowania LaTeX do wzorów matematycznych (np. $\\sin(x)$, $\\int$, $\\sum$).",
    "detailed": "Odpowiadaj DŁUGO i SZCZEGÓŁOWO. Rozwiń temat, podaj przykłady, omów różne aspekty. Używaj formatowania LaTeX do wzorów matematycznych. Stosuj bloki kodu tam gdzie to zasadne."
}

last_used_model = GEMINI_MODELS[0]
last_model_switch_date = datetime.now().date()

client = None
if not GEMINI_API_KEY:
    print("[WARNING] Brak GEMINI_API_KEY. Dodaj go do pliku .env")
else:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        print("[SUCCESS] Gemini client initialized successfully (google-genai v1)")
    except Exception as e:
        print(f"[ERROR] Błąd inicjalizacji klienta Gemini: {e}")

class ChatMessage(BaseModel):
    message: str
    conversation: list[dict] = []
    api_key: Optional[str] = None
    response_style: Optional[str] = "balanced"

def get_gemini_response(messages: list, files: list = None, tmp_client=None, response_style: str = "balanced") -> dict:    
    global last_used_model, last_model_switch_date
    
    use_client = tmp_client or client
    if not use_client:
        return {
            "status": "error",
            "response": "Gemini nie jest skonfigurowany",
            "model_used": None
        }
    
    if datetime.now().date() != last_model_switch_date:
        last_used_model = GEMINI_MODELS[0]
        last_model_switch_date = datetime.now().date()
        print(f"[INFO] Nowy dzień - reset do modelu {last_used_model}")
    
    conversation_text = ""
    for msg in messages:
        role = "Użytkownik" if msg["role"] == "user" else "Asystent"
        conversation_text += f"{role}: {msg['content']}\n"
    
    style_instruction = STYLE_INSTRUCTIONS.get(response_style, STYLE_INSTRUCTIONS["balanced"])
    
    final_prompt = f"""
    Jesteś asystentem AI, który odpowiada na pytania użytkownika. 
    {style_instruction}
    
    WAŻNE: Nie witaj się za każdym razem. Jeśli kontynuujesz rozmowę, odpowiadaj bezpośrednio bez powitań.
    
    ZASADA JĘZYKOWA: Odpowiadaj zawsze w tym samym języku w którym użytkownik pisze do Ciebie. 
    Jeśli użytkownik pisze po angielsku - odpowiadaj po angielsku.
    Jeśli użytkownik pisze po polsku - odpowiadaj po polsku.
    Jeśli użytkownik pisze w innym języku - odpowiadaj w tym języku.
    
    Historia konwersacji:
    {conversation_text}

    Odpowiedz na ostatnią wiadomość użytkownika.
    """
    
    contents = [final_prompt]
    
    if files:
        for file_info in files:
            file_content_base64 = file_info["content"] 
            mime_type = file_info["mime_type"]
            
            file_bytes = base64.b64decode(file_content_base64)
            
            file_part = types.Part.from_bytes(
                data=file_bytes,
                mime_type=mime_type
            )
            contents.append(file_part)
    
    start_idx = GEMINI_MODELS.index(last_used_model)
    models_to_try = GEMINI_MODELS[start_idx:] + GEMINI_MODELS[:start_idx]
    
    last_error = None
    for model in models_to_try:
        try:
            print(f"[INFO] Próbuję model: {model} (styl: {response_style})")
            response = use_client.models.generate_content(
                model=model,
                contents=contents
            )

            last_used_model = model
            print(f"[SUCCESS] Model {model} zwrócił odpowiedź")

            return {
                "status": "success",
                "response": response.text,
                "model_used": model,
                "response_style": response_style  
            }

        except Exception as model_error:
            error_str = str(model_error)
            error_lower = error_str.lower()
            last_error = model_error

            quota_indicators = ["429", "resource_exhausted", "quota exceeded", "rate_limit", "quota_failure"]
            is_quota_error = any(indicator in error_lower for indicator in quota_indicators)

            if is_quota_error:
                print(f"[WARNING] Model {model} osiągnął limit - przechodzę do następnego")
                print(f"[DEBUG] Błąd: {error_str[:150]}")
                continue
            else:
                print(f"[ERROR] Model {model} zwrócił nieznany błąd: {error_str[:150]}")
                continue
    
    error_msg = f"Wszystkie modele Gemini są niedostępne."
    print(f"[ERROR] {error_msg} Ostatni błąd: {str(last_error)[:200]}")
    return {
        "status": "error",
        "response": error_msg,
        "model_used": None,
        "response_style": response_style 
    }

def get_fallback_response(prompt: str) -> dict:
    return {
        "status": "fallback",
        "response": "Witaj! Jestem asystentem AI. Aby korzystać z pełnych funkcji, skonfiguruj klucz GEMINI_API_KEY w pliku .env",
        "model_used": None,
        "response_style": "balanced"  
    }

current_session_files = []

@router.post("/upload", response_class=JSONResponse)
async def upload_file(file: UploadFile = File(...)):
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
    current_session_files.clear()
    return {
        "status": "success", 
        "message": "Pliki wyczyszczone."
    }

@router.post("/chat", response_class=JSONResponse)
async def chat_endpoint(chat_data: ChatMessage):
    messages = chat_data.conversation.copy()
    messages.append({"role": "user", "content": chat_data.message})
    
    response_style = chat_data.response_style or "balanced"

    local_client = None
    if chat_data.api_key:
        try:
            local_client = genai.Client(api_key=chat_data.api_key)
            print(f"[INFO] Using per-request Gemini API key (styl: {response_style})")
        except Exception as e:
            print(f"[ERROR] Failed to initialize local Gemini client from provided key: {e}")
            return JSONResponse(status_code=400, content={"status": "error", "response": "Invalid API key provided."})

    use_client = local_client or client
    if use_client:
        response_data = get_gemini_response(
            messages, 
            current_session_files, 
            tmp_client=use_client,
            response_style=response_style
        )
        response_text = response_data.get("response", "")
        model_used = response_data.get("model_used", "unknown")
        response_style_used = response_data.get("response_style", response_style)
    else:
        response_data = get_fallback_response(chat_data.message)
        response_text = response_data.get("response", "")
        model_used = "fallback"
        response_style_used = response_style

    # response_text = markdown_to_html(response_text)

    updated_conversation = chat_data.conversation + [
        {"role": "user", "content": chat_data.message},
        {"role": "assistant", "content": response_text}
    ]

    return {
        "status": "success",
        "response": response_text,
        "conversation": updated_conversation,
        "files_used": len(current_session_files) > 0,
        "model_used": model_used,
        "response_style": response_style_used 
    }

@router.post("/reset_session", response_class=JSONResponse)
async def reset_session():
    current_session_files.clear()
    return {
        "status": "success", 
        "message": "Sesja zresetowana. Wszystkie pliki zostały usunięte."
    }

@router.get("/api_status")
async def api_status():
    return {
        "status": "active",
        "gemini_configured": bool(GEMINI_API_KEY and client),
        "has_files": bool(current_session_files),
        "files_count": len(current_session_files),
        "model": "gemini-2.5-flash",
        "available_styles": list(STYLE_INSTRUCTIONS.keys()) 
    }

@router.get("/files")
async def get_files():
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