from fastapi import APIRouter, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import requests
import os
import io
import pdfplumber

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
    responses={404: {"description": "Not found"}},
)

TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions"
API_KEY = os.getenv("TOGETHER_API_KEY", "your-api-key-here")

document_text_memory = ""

class ChatMessage(BaseModel):
    message: str
    conversation: list[dict] = []

def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF using pdfplumber with improved formatting."""
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

@router.post("/uploadfile", response_class=JSONResponse)
async def upload_file(file: UploadFile = File(...)):
    global document_text_memory
    try:
        content = await file.read()

        if file.filename.endswith(".txt"):
            text = content.decode("utf-8")
        elif file.filename.endswith(".pdf"):
            text = extract_text_from_pdf(content)
        else:
            return {"status": "error", "error": "Obsługiwany jest tylko plik PDF lub TXT."}

        document_text_memory = text  

        return {"status": "success", "content": text}

    except Exception as e:
        return {"status": "error", "error": f"Błąd przy wczytywaniu pliku: {str(e)}"}

def get_together_response(messages: list[dict]) -> str:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000
    }

    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        print("Together.ai API error:", e)
        return "Przepraszam, wystąpił błąd po stronie Together.ai."

@router.post("/chat", response_class=JSONResponse)
async def chat_endpoint(chat_data: ChatMessage):
    global document_text_memory
    try:
        conversation = [msg for msg in chat_data.conversation if msg["role"] != "system"]

        system_prompt = {
            "role": "system",
            "content": (
                "Jesteś asystentem AI, który odpowiada na pytania użytkownika w oparciu o przesłany dokument. "
                "Odpowiadaj precyzyjnie i zwięźle. Oto zawartość dokumentu:\n\n"
                + document_text_memory[:4000]  
            )
        }

        messages_to_send = [system_prompt] + conversation
        messages_to_send.append({"role": "user", "content": chat_data.message})

        assistant_response = get_together_response(messages_to_send)

        conversation.append({"role": "user", "content": chat_data.message})
        conversation.append({"role": "assistant", "content": assistant_response})

        return {
            "status": "success",
            "response": assistant_response,
            "conversation": conversation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
