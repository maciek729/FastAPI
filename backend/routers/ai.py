from fastapi import APIRouter, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import io
import pdfplumber
from PIL import Image
import requests
import numpy as np

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
    responses={404: {"description": "Not found"}},
)

TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions"
DEFAULT_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"

uploaded_documents: list[dict] = []

try:
    import easyocr
    reader = easyocr.Reader(['pl', 'en'], gpu=False)
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("EasyOCR nie jest zainstalowany. Obsługa tekstu na obrazach będzie ograniczona.")
except Exception as e:
    OCR_AVAILABLE = False
    print(f"Błąd inicjalizacji EasyOCR: {e}")

class ChatMessage(BaseModel):
    message: str
    conversation: list[dict] = []

def extract_text_from_pdf(content: bytes) -> str:
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(x_tolerance=1, y_tolerance=1)
                if page_text:
                    cleaned_text = ' '.join(page_text.replace('\n', ' ').split())
                    text += cleaned_text + ' '
        if not text.strip():
            raise ValueError("Nie udało się wyodrębnić tekstu z pliku PDF.")
        return text.strip()
    except Exception as e:
        raise ValueError(f"Błąd podczas przetwarzania PDF: {str(e)}")

def extract_text_from_image(content: bytes) -> str:
    try:
        if not OCR_AVAILABLE:
            return "[OCR nie jest dostępny. Zainstaluj: pip install easyocr]"
        image = Image.open(io.BytesIO(content))
        image_np = np.array(image)
        results = reader.readtext(image_np, paragraph=True)
        if not results:
            return "[Nie znaleziono tekstu na obrazie]"
        extracted_text = " ".join([result[1] for result in results])
        return extracted_text
    except Exception as e:
        return f"[Błąd OCR: {str(e)}]"

def get_together_response(messages: list, max_tokens: int = 1000) -> str:
    if not TOGETHER_API_KEY:
        return "Brak konfiguracji TogetherAI API. Dodaj klucz TOGETHER_API_KEY do pliku .env"
    
    headers = {
        "Authorization": f"Bearer {TOGETHER_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": max_tokens,
        "stop": ["<|eot_id|>", "<|eom_id|>"],
        "repetition_penalty": 1.1
    }

    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        error_msg = f"Błąd połączenia z TogetherAI: {str(e)}"
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_msg = f"TogetherAI API error: {error_detail}"
            except:
                error_msg = f"TogetherAI API error: {e.response.text}"
        return error_msg
    except Exception as e:
        return f"Nieoczekiwany błąd: {str(e)}"

def get_fallback_response(prompt: str) -> str:
    return "Witaj! Jestem asystentem AI. Aby korzystać z pełnych funkcji, skonfiguruj klucz TogetherAI API."

@router.post("/uploadfile", response_class=JSONResponse)
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = ""

        if file.filename.endswith(".txt"):
            text = content.decode("utf-8")
        elif file.filename.endswith(".pdf"):
            text = extract_text_from_pdf(content)
        elif file.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            text = extract_text_from_image(content)
        else:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "error": "Obsługiwany jest tylko plik PDF, TXT, JPG, JPEG, PNG lub WEBP."}
            )

        uploaded_documents.append({
            "filename": file.filename,
            "text": text
        })

        return {
            "status": "success",
            "message": f"Plik {file.filename} został pomyślnie wczytany. Możesz teraz zadawać pytania o jego zawartość.",
            "content_preview": text[:200] + "..." if len(text) > 200 else text
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": f"Błąd przy wczytywaniu pliku: {str(e)}"}
        )

@router.post("/clear_document", response_class=JSONResponse)
async def clear_document():
    uploaded_documents.clear()
    return {"status": "success", "message": "Pamięć dokumentów wyczyszczona."}

@router.post("/chat", response_class=JSONResponse)
async def chat_endpoint(chat_data: ChatMessage):
    try:
        messages = []

        if uploaded_documents:
            combined_text = "\n\n".join(
                f"--- {doc['filename']} ---\n{doc['text']}" for doc in uploaded_documents
            )
            messages.append({
                "role": "system",
                "content": (
                    "Jesteś asystentem AI, który odpowiada na pytania użytkownika w oparciu o przesłane dokumenty. "
                    "Odpowiadaj precyzyjnie i zwięźle. Odpowiadaj w języku polskim, chyba że użytkownik poprosi o inny język. "
                    f"Oto zawartość dokumentów:\n\n{combined_text[:3000]}"
                )
            })
        else:
            messages.append({
                "role": "system",
                "content": (
                    "Jesteś pomocnym asystentem AI. Odpowiadaj na pytania użytkownika najlepiej jak potrafisz. "
                    "Odpowiadasz w języku polskim, chyba że użytkownik poprosi o inny język. "
                    "Jeśli użytkownik załaduje plik, będziesz korzystać z jego treści."
                )
            })

        for msg in chat_data.conversation:
            messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": chat_data.message})

        if TOGETHER_API_KEY:
            response_text = get_together_response(messages)
        else:
            response_text = get_fallback_response(chat_data.message)

        updated_conversation = chat_data.conversation + [
            {"role": "user", "content": chat_data.message},
            {"role": "assistant", "content": response_text}
        ]

        return {
            "status": "success",
            "response": response_text,
            "conversation": updated_conversation
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd podczas przetwarzania żądania: {str(e)}")

@router.get("/api_status")
async def api_status():
    return {
        "status": "active",
        "together_configured": bool(TOGETHER_API_KEY),
        "ocr_available": OCR_AVAILABLE,
        "has_document": bool(uploaded_documents),
        "model": DEFAULT_MODEL,
        "documents_count": len(uploaded_documents)
    }
