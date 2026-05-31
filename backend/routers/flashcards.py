from datetime import datetime
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal
from models import FlashcardSets, Flashcards, FlashcardReviews, Notes
import json
from routers.ai import get_gemini_response
from PyPDF2 import PdfReader
import io
from docx import Document
import re
from json import JSONDecodeError
from quota import preflight_quota_check, commit_quota_charge, log_quota_failure

router = APIRouter(
    prefix="/flashcards",
    tags=["flashcards"]
)


def _try_loads(s: str):
    """Robust json.loads that attempts to fix single backslashes often present in LaTeX."""
    try:
        return json.loads(s)
    except JSONDecodeError:
        try:
            fixed = re.sub(r'(?<!\\)\\(?!\\)', r'\\\\', s)
            return json.loads(fixed)
        except JSONDecodeError:
            return None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]


# ============================================
# MODELE PYDANTIC
# ============================================

class FlashcardGenerateRequest(BaseModel):
    user_id: int
    notebook_id: int
    title: str
    description: Optional[str] = None
    difficulty: str = "średni"
    count: int = 10
    source_type: str = "manual" 
    source_note_ids: List[int] = []


class UpdateSetRequest(BaseModel):
    title: str
    description: Optional[str] = None


class UpdateCardRequest(BaseModel):
    question: str
    answer: str


class CreateCardRequest(BaseModel):
    flashcard_set_id: int
    question: str
    answer: str


class ReorderRequest(BaseModel):
    set_id: int
    card_positions: List[dict]


class FlashcardOut(BaseModel):
    id: int
    question: str
    answer: str
    position: int
    created_at: datetime

    class Config:
        from_attributes = True


class FlashcardSetOut(BaseModel):
    id: int
    note_id: int
    user_id: int
    notebook_id: int
    folder_id: Optional[int] = None
    title: str
    description: Optional[str]
    difficulty: str
    total_cards: int
    source_notes: Optional[str]
    source_files: Optional[str]
    grid_position: Optional[int] = None
    is_pinned: bool = False
    created_at: datetime
    updated_at: datetime
    flashcards: List[FlashcardOut] = []

    class Config:
        from_attributes = True


class FlashcardReviewRequest(BaseModel):
    flashcard_id: int
    user_id: int
    quality: str


class FlashcardReviewOut(BaseModel):
    id: int
    flashcard_id: int
    user_id: int
    status: str
    repetitions: int
    interval: int
    last_review: Optional[datetime]
    next_review: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================
# FUNKCJE POMOCNICZE
# ============================================

def truncate_flashcard_text(text: str, max_length: int) -> str:
    """Przycinanie tekstu fiszki do maksymalnej długości"""
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + "..."


def extract_flashcards_from_ai_response(ai_response: str, max_question_len: int = 100, max_answer_len: int = 150) -> List[dict]:
    """Parsowanie odpowiedzi AI do listy fiszek - z obsługą uciętych odpowiedzi i walidacją długości"""

    def clean_text(text: str) -> str:
        """Usuwa HTML entities i tagi z tekstu"""
        import re
        # Usuń HTML tagi
        text = re.sub(r'<[^>]+>', '', text)
        # Zamień HTML entities
        text = text.replace('&ne;', '≠').replace('&lt;', '<').replace('&gt;', '>')
        text = text.replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'")
        text = text.replace('&le;', '≤').replace('&ge;', '≥')
        return text.strip()

    def validate_and_trim_flashcards(flashcards: List[dict]) -> List[dict]:
        """Walidacja i przycinanie fiszek do maksymalnej długości"""
        valid_flashcards = []
        for card in flashcards:
            if "question" in card and "answer" in card:
                question = clean_text(str(card["question"]))
                answer = clean_text(str(card["answer"]))

                # Przytnij jeśli za długie
                question = truncate_flashcard_text(question, max_question_len)
                answer = truncate_flashcard_text(answer, max_answer_len)

                if question and answer:
                    valid_flashcards.append({
                        "question": question,
                        "answer": answer
                    })
        return valid_flashcards

    # Usuń markdown code blocks
    ai_response = ai_response.replace('```json', '').replace('```', '').strip()

    try:
        # Próba 1: Pełny poprawny JSON
        if ai_response.strip().startswith('['):
            flashcards = _try_loads(ai_response)
            if flashcards is not None:
                return validate_and_trim_flashcards(flashcards)

        # Próba 2: Znajdź tablicę JSON w odpowiedzi
        start = ai_response.find('[')
        end = ai_response.rfind(']') + 1
        if start != -1 and end > start:
            json_str = ai_response[start:end]
            flashcards = _try_loads(json_str)
            if flashcards is not None:
                return validate_and_trim_flashcards(flashcards)

        # Próba 3: Napraw ucięty JSON - znajdź ostatni kompletny obiekt
        if start != -1:
            json_str = ai_response[start:]
            last_complete = json_str.rfind('},')
            if last_complete == -1:
                last_complete = json_str.rfind('}]')

            if last_complete != -1:
                if json_str[last_complete:last_complete+2] == '},':
                    json_str = json_str[:last_complete+1] + ']'
                else:
                    json_str = json_str[:last_complete+2]

                flashcards = _try_loads(json_str)
                if flashcards is not None and len(flashcards) > 0:
                    print(f"DEBUG: Naprawiono ucięty JSON, odzyskano {len(flashcards)} fiszek")
                    return validate_and_trim_flashcards(flashcards)

        # Próba 4: Znajdź pojedynczy obiekt
        start = ai_response.find('{')
        end = ai_response.rfind('}') + 1
        if start != -1 and end > start:
            json_str = ai_response[start:end]
            data = _try_loads(json_str)
            if data is not None:
                if "flashcards" in data:
                    return validate_and_trim_flashcards(data["flashcards"])
                return validate_and_trim_flashcards([data])

        # Próba 5: Użyj JSONDecoder aby wyciągnąć kolejne poprawne obiekty/struktury JSON
        try:
            from json import JSONDecoder, JSONDecodeError
            decoder = JSONDecoder()
            objs = []
            idx = 0
            length = len(ai_response)
            # Find likely start positions for JSON structures
            import re
            starts = [m.start() for m in re.finditer(r"[\{\[]", ai_response)]
            for start_pos in starts:
                try:
                    obj, end = decoder.raw_decode(ai_response, start_pos)
                    objs.append(obj)
                except JSONDecodeError:
                    continue

            # If we decoded any objects, pick the first list or collect objects
            if objs:
                # If first object is a list, use it
                if isinstance(objs[0], list):
                    return validate_and_trim_flashcards(objs[0])
                # Otherwise, if we have multiple objects, flatten them
                flattened = []
                for o in objs:
                    if isinstance(o, list):
                        flattened.extend(o)
                    elif isinstance(o, dict):
                        flattened.append(o)
                if flattened:
                    return validate_and_trim_flashcards(flattened)
        except Exception:
            pass

        return []
    except Exception as e:
        print(f"DEBUG: Błąd parsowania JSON: {e}")
        print(f"DEBUG: Odpowiedź AI (pierwsze 500 znaków): {ai_response[:500]}")
        return []


def calculate_next_review(quality: str, repetitions: int, interval: int = 0) -> tuple:
    """Prosty system umiem/nie_umiem bez dat powtórek"""

    if quality == "nie_umiem":
        new_interval = 0
        new_repetitions = repetitions + 1
        new_status = "learning"
    elif quality == "umiem":
        new_interval = 0
        new_repetitions = repetitions + 1
        new_status = "mastered"
    else:
        new_interval = 0
        new_repetitions = repetitions + 1
        new_status = "learning"

    next_review_date = None

    return new_status, new_repetitions, new_interval, next_review_date


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract text from various file types"""
    file_extension = "." + filename.split(".")[-1].lower()

    if file_extension == ".pdf":
        pdf_reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text

    elif file_extension in [".docx", ".doc"]:
        doc = Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text

    elif file_extension == ".txt":
        return file_content.decode('utf-8')

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Nieobsługiwany typ pliku: {file_extension}. Obsługiwane: PDF, DOCX, TXT"
        )


# ============================================
# ENDPOINTY
# ============================================

@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_flashcards(
    request: FlashcardGenerateRequest,
    db: db_dependency
):
    """Generuje fiszki przez AI na podstawie notatek lub ręcznego opisu (JSON)"""

    print(f"DEBUG: Received request - source_type: {request.source_type}")
    print(f"DEBUG: description: {request.description}")
    print(f"DEBUG: source_note_ids: {request.source_note_ids}")

    quota_context = preflight_quota_check(db, request.user_id, "flashcards", "/flashcards/generate")

    combined_content = ""

    if request.description and request.description.strip():
        combined_content = request.description
        print(f"DEBUG: Added description to combined_content, length: {len(combined_content)}")

    if request.source_note_ids:
        notes = db.query(Notes).filter(Notes.id.in_(request.source_note_ids)).all()
        print(f"DEBUG: Found {len(notes)} notes")
        for note in notes:
            combined_content += f"\n\n=== {note.title} ===\n{note.content}\n"

    print(f"DEBUG: Final combined_content length: {len(combined_content)}")

    if not combined_content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brak materiałów źródłowych do generowania fiszek"
        )
    
    is_language_learning = any(word in combined_content.lower() for word in
        ['tłumaczenie', 'słówka', 'vocabulary', 'translation', 'angielski', 'niemiecki', 'francuski', 'hiszpański', 'włoski'])

    if is_language_learning:
        difficulty_vocab_hints = {
            "łatwy": """POZIOM A1-A2 (PODSTAWOWY):
- Najprostsze, codzienne słowa (dom, kot, pies, jedzenie, woda)
- Liczby, kolory, dni tygodnia
- Podstawowe czasowniki (być, mieć, iść, jeść)
- Członkowie rodziny, części ciała
- Proste rzeczowniki i przymiotniki używane na co dzień""",
            "średni": """POZIOM B1-B2 (ŚREDNIOZAAWANSOWANY):
- Bardziej złożone słownictwo (osiągnąć, despite, accomplish)
- Słowa abstrakcyjne (freedom, justice, opportunity)
- Czasowniki frazowe (give up, look forward to)
- Słownictwo zawodowe i akademickie
- Idiomy i wyrażenia potoczne""",
            "trudny": """POZIOM C1 (ZAAWANSOWANY):
- Rzadko używane, formalne słownictwo (unprecedented, mitigate, intricate)
- Niuanse znaczeniowe i synonimy
- Terminy specjalistyczne i naukowe
- Słowa z subtelnym znaczeniem (nuance, ephemeral, paradigm)
- Zaawansowane wyrażenia idiomatyczne"""
        }

        prompt = f"""Stwórz dokładnie {request.count} fiszek do nauki języka obcego o poziomie trudności: {request.difficulty}.

    INSTRUKCJA/TEMAT OD UŻYTKOWNIKA:
    {combined_content[:12000]}

POZIOM TRUDNOŚCI - {request.difficulty.upper()}:
{difficulty_vocab_hints.get(request.difficulty, 'standardowy')}

ZASADY OBOWIĄZKOWE - PRZECZYTAJ UWAŻNIE:

1. Jeśli materiał zawiera KONKRETNE SŁÓWKA (np. lista "dog - pies, cat - kot"):
   - Użyj TYLKO tych słówek z materiału
   - NIE dodawaj słówek spoza listy

2. Jeśli materiał zawiera TYLKO TEMAT/OPIS (np. "słówka o kotach", "na temat kotów"):
   - Wygeneruj słówka ściśle związane z TYM TEMATEM
   - NIE generuj losowych słówek niezwiązanych z tematem

   PRZYKŁADY TEMATYCZNE:
   - Temat "koty" → cat (kot), kitten (kotek), meow (miauczeć), whiskers (wąsy), paw (łapa), tail (ogon), fur (futro)
   - Temat "jedzenie" → food (jedzenie), bread (chleb), milk (mleko), apple (jabłko), water (woda)
   - Temat "szkoła" → school (szkoła), teacher (nauczyciel), book (książka), lesson (lekcja)

FORMAT FISZEK:
- Pytanie = słowo w jednym języku (MAX 100 znaków)
- Odpowiedź = tłumaczenie w drugim języku (MAX 150 znaków)
- PROSTE tłumaczenie 1:1 (np. "cat" → "kot")
- NIE twórz zdań ani pytań opisowych
- Tylko pojedyncze słówka lub krótkie frazy (max 3-4 słowa)
- KONIECZNIE dostosuj ZAAWANSOWANIE SŁÓWEK do poziomu {request.difficulty}!
- Dla poziomu "łatwy": tylko podstawowe słówka A1-A2
- Dla poziomu "średni": słówka B1-B2
- Dla poziomu "trudny": zaawansowane słówka C1
- Format JSON: [{{"question": "słowo1", "answer": "tłumaczenie1"}}, ...]
- Zwróć TYLKO tablicę JSON, bez dodatkowego tekstu, bez markdown
- Dokładnie {request.count} fiszek

Wygeneruj fiszki:"""
    else:
        difficulty_hints = {
            "łatwy": "poziom językowy A1-A2 (podstawowy) - proste słownictwo, podstawowe definicje, elementarne fakty",
            "średni": "poziom językowy B1-B2 (średniozaawansowany) - zrozumienie koncepcji, zastosowanie wiedzy, bardziej złożone słownictwo",
            "trudny": "poziom językowy C1 (zaawansowany) - analiza, synteza, krytyczne myślenie, zaawansowane słownictwo i koncepcje"
        }

        prompt = f"""Stwórz dokładnie {request.count} fiszek edukacyjnych o poziomie trudności: {request.difficulty}.

    MATERIAŁ ŹRÓDŁOWY/TEMAT:
    {combined_content[:12000]}

ZASADY OBOWIĄZKOWE:

1. Jeśli materiał zawiera KONKRETNE INFORMACJE (tekst, fakty, definicje):
   - Fiszki MUSZĄ być oparte WYŁĄCZNIE na treści z materiału
   - NIE dodawaj informacji spoza podanego materiału

2. Jeśli materiał zawiera TYLKO TEMAT (np. "historia Polski", "matematyka - całki"):
   - Wygeneruj fiszki ściśle związane z podanym tematem
   - NIE generuj ogólnej wiedzy niezwiązanej z tematem

KRYTYCZNE WYMAGANIA DŁUGOŚCI (NIEPRZEKRACZALNE):
- Pytanie: MAX 80 znaków (krótkie, konkretne)
- Odpowiedź: MAX 120 znaków (zwięzła, bez rozbudowanych wyjaśnień)
- NIE pisz długich wyjaśnień, wzorów ani definicji
- Odpowiedzi muszą być BARDZO KRÓTKIE

PRZYKŁADY DOBRYCH FISZEK:
{{"question": "Wzór na całkę z $x^n$", "answer": "$\\frac{{x^{{n+1}}}}{{n+1}} + C$"}}
{{"question": "Kiedy była bitwa pod Grunwaldem?", "answer": "15 lipca 1410"}}
{{"question": "Stolica Francji?", "answer": "Paryż"}}
{{"question": "Wzór na pole koła", "answer": "$\\pi r^2$"}}
{{"question": "Pochodna $\\sin(x)$", "answer": "$\\cos(x)$"}}

FORMATOWANIE WZORÓW MATEMATYCZNYCH:
- Wzory matematyczne otaczaj znakami dolara: $wzór$
- Ułamki: $\\frac{{licznik}}{{mianownik}}$
- Potęgi: $x^2$ lub $x^{{n+1}}$
- Pierwiastki: $\\sqrt{{x}}$
- Indeksy: $x_1$ lub $x_{{12}}$
- Całki: $\\int x dx$
- Greckie litery: $\\pi$, $\\alpha$, $\\beta$

PRZYKŁADY ZŁYCH FISZEK (ZA DŁUGIE):
{{"question": "Co oznacza litera C w całkach nieoznaczonych?", "answer": "Litera C oznacza stałą całkowania, która jest dodawana..."}} ❌ ZA DŁUGIE!

FORMAT:
- Poziom {request.difficulty}: {difficulty_hints.get(request.difficulty, 'standardowy')}
- Format JSON: [{{"question": "...", "answer": "..."}}, ...]
- Zwróć TYLKO tablicę JSON, bez markdown
- Pytania i odpowiedzi w języku polskim
- Dokładnie {request.count} fiszek

Wygeneruj fiszki:"""

    messages = [
        {"role": "user", "content": prompt}
    ]

    ai_response = get_gemini_response(messages)
    response_text = ai_response.get("response", "") if isinstance(ai_response, dict) else ai_response
    flashcards_data = extract_flashcards_from_ai_response(response_text)

    # If parsing failed, try once more with a strict prompt asking for ONLY a JSON array
    if not flashcards_data or len(flashcards_data) == 0:
        print("DEBUG: Initial flashcard parsing failed — logging full AI response for debugging:")
        print(response_text)

        # Build a strict recovery prompt asking the model to return only a JSON array
        recovery_prompt = (
            "Twoja poprzednia odpowiedź nie zawierała poprawnego JSON-a. "
            "Proszę odpowiedzieć TYLKO PRZEZ TABLICĘ JSON w postaci: ````json [ {\"question\": \"...\", \"answer\": \"...\"}, ... ] ````. "
            "Nic poza tym (bez komentarzy ani markdown). Każde pole: 'question' i 'answer'. "
            "Zachowaj format matematyczny dokładnie tak, jak proszono wcześniej (używaj LaTeXa w $...$ dla wzorów)."
        )

        recovery_messages = [
            {"role": "user", "content": recovery_prompt},
        ]

        retry_response = get_gemini_response(recovery_messages)
        retry_text = retry_response.get("response", "") if isinstance(retry_response, dict) else retry_response
        print("DEBUG: Retry AI response:")
        print(retry_text)

        flashcards_data = extract_flashcards_from_ai_response(retry_text)

        if not flashcards_data or len(flashcards_data) == 0:
            log_quota_failure(db, quota_context, "Flashcard AI response parse failed")
            # Final failure — include more of AI response in error for debugging
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI nie wygenerowało poprawnych fiszek. Odpowiedź (pierwsze 1000 znaków): {response_text[:1000]}"
            )

    new_note = Notes(
        user_id=request.user_id,
        notebook_id=request.notebook_id,
        title=request.title,
        content=f"Zestaw {len(flashcards_data)} fiszek wygenerowany przez AI\n\nOpis: {request.description or 'Brak opisu'}",
        type="Fiszki",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        is_shared=False
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    flashcard_set = FlashcardSets(
        note_id=new_note.id,
        user_id=request.user_id,
        notebook_id=request.notebook_id,
        title=request.title,
        description=request.description,
        difficulty=request.difficulty,
        total_cards=len(flashcards_data),
        source_notes=json.dumps(request.source_note_ids) if request.source_note_ids else None,
        source_files=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(flashcard_set)
    db.commit()
    db.refresh(flashcard_set)
    
    for idx, card_data in enumerate(flashcards_data):
        flashcard = Flashcards(
            flashcard_set_id=flashcard_set.id,
            question=card_data.get("question", ""),
            answer=card_data.get("answer", ""),
            position=idx,
            created_at=datetime.utcnow()
        )
        db.add(flashcard)
    
    db.commit()
    quota_state = commit_quota_charge(db, quota_context)
    
    return {
        "status": "success",
        "message": f"Wygenerowano {len(flashcards_data)} fiszek",
        "flashcard_set_id": flashcard_set.id,
        "note_id": new_note.id,
        "total_cards": len(flashcards_data),
        "quota": quota_state,
    }


@router.post("/generate-from-file", status_code=status.HTTP_201_CREATED)
async def generate_flashcards_from_file(
    user_id: int = Form(...),
    notebook_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    difficulty: str = Form("średni"),
    count: int = Form(10),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Generuje fiszki z przesłanego pliku"""
    quota_context = preflight_quota_check(db, user_id, "flashcards", "/flashcards/generate-from-file")

    try:
        file_content = await file.read()

        combined_content = extract_text_from_file(file_content, file.filename)

        if not combined_content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plik jest pusty lub nie udało się wyodrębnić tekstu"
            )

        is_language_learning = any(word in combined_content.lower() for word in
            ['tłumaczenie', 'słówka', 'vocabulary', 'translation', 'angielski', 'niemiecki', 'francuski', 'hiszpański', 'włoski'])

        if is_language_learning:
            prompt = f"""Stwórz dokładnie {count} fiszek do nauki języka obcego.

        INSTRUKCJA/TEMAT OD UŻYTKOWNIKA:
        {combined_content[:12000]}

        ZASADY OBOWIĄZKOWE:

1. Jeśli materiał zawiera KONKRETNE SŁÓWKA (np. lista "dog - pies, cat - kot"):
   - Użyj TYLKO tych słówek z materiału
   - NIE dodawaj słówek spoza listy

2. Jeśli materiał zawiera TYLKO TEMAT/OPIS (np. "słówka o kotach"):
   - Wygeneruj słówka ściśle związane z TYM TEMATEM
   - NIE generuj losowych słówek niezwiązanych z tematem

   PRZYKŁADY TEMATYCZNE:
   - Temat "koty" → cat (kot), kitten (kotek), meow (miauczeć), whiskers (wąsy), paw (łapa)
   - Temat "jedzenie" → food (jedzenie), bread (chleb), milk (mleko), apple (jabłko)

WYMAGANIA:
- Format fiszek: pytanie = słowo/fraza w jednym języku, odpowiedź = tłumaczenie w drugim języku
- Każda fiszka to PROSTE tłumaczenie (np. "dog" → "pies", "kot" → "cat")
- NIE twórz pytań opisowych ani zdań
- Tylko słówka lub krótkie frazy (max 3-4 słowa)
- LIMIT ZNAKÓW: pytanie MAX 100 znaków, odpowiedź MAX 150 znaków
- Format JSON: [{{"question": "słowo1", "answer": "tłumaczenie1"}}, ...]
- Zwróć TYLKO tablicę JSON, bez dodatkowego tekstu, bez markdown
- Dokładnie {count} fiszek

Wygeneruj fiszki:"""
        else:
            difficulty_hints = {
                "łatwy": "poziom językowy A1-A2 (podstawowy) - proste słownictwo, podstawowe definicje, elementarne fakty",
                "średni": "poziom językowy B1-B2 (średniozaawansowany) - zrozumienie koncepcji, zastosowanie wiedzy, bardziej złożone słownictwo",
                "trudny": "poziom językowy C1 (zaawansowany) - analiza, synteza, krytyczne myślenie, zaawansowane słownictwo i koncepcje"
            }

            prompt = f"""Stwórz dokładnie {count} fiszek edukacyjnych o poziomie trudności: {difficulty}.

MATERIAŁ ŹRÓDŁOWY/TEMAT:
{combined_content[:12000]}

ZASADY OBOWIĄZKOWE:

1. Jeśli materiał zawiera KONKRETNE INFORMACJE:
   - Fiszki oparte WYŁĄCZNIE na materiale

2. Jeśli materiał zawiera TYLKO TEMAT:
   - Wygeneruj fiszki związane z tematem

KRYTYCZNE WYMAGANIA DŁUGOŚCI:
- Pytanie: MAX 80 znaków
- Odpowiedź: MAX 120 znaków
- Odpowiedzi BARDZO KRÓTKIE, bez rozbudowanych wyjaśnień

PRZYKŁADY DOBRYCH FISZEK:
{{"question": "Wzór na całkę z $x^n$", "answer": "$\\frac{{x^{{n+1}}}}{{n+1}} + C$"}}
{{"question": "Stolica Francji?", "answer": "Paryż"}}
{{"question": "Wzór na pole koła", "answer": "$\\pi r^2$"}}

WZORY MATEMATYCZNE - otaczaj znakami $:
$\\frac{{a}}{{b}}$ (ułamek), $x^2$ (potęga), $\\sqrt{{x}}$ (pierwiastek), $\\pi$ (pi)

FORMAT:
- Poziom {difficulty}: {difficulty_hints.get(difficulty, 'standardowy')}
- Format JSON: [{{"question": "...", "answer": "..."}}, ...]
- TYLKO tablica JSON
- Dokładnie {count} fiszek

Wygeneruj fiszki:"""

        messages = [{"role": "user", "content": prompt}]
        ai_response = get_gemini_response(messages)
        response_text = ai_response.get("response", "") if isinstance(ai_response, dict) else ai_response
        flashcards_data = extract_flashcards_from_ai_response(response_text)

        if not flashcards_data or len(flashcards_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI nie wygenerowało poprawnych fiszek. Odpowiedź: {response_text[:200] if response_text else 'brak'}"
            )

        new_note = Notes(
            user_id=user_id,
            notebook_id=notebook_id,
            title=title,
            content=f"Zestaw {len(flashcards_data)} fiszek wygenerowany z pliku: {file.filename}\n\nOpis: {description or 'Brak opisu'}",
            type="Fiszki",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_shared=False
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)

        flashcard_set = FlashcardSets(
            note_id=new_note.id,
            user_id=user_id,
            notebook_id=notebook_id,
            title=title,
            description=description,
            difficulty=difficulty,
            total_cards=len(flashcards_data),
            source_notes=None,
            source_files=json.dumps([file.filename]),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(flashcard_set)
        db.commit()
        db.refresh(flashcard_set)

        for idx, card_data in enumerate(flashcards_data):
            flashcard = Flashcards(
                flashcard_set_id=flashcard_set.id,
                question=card_data.get("question", ""),
                answer=card_data.get("answer", ""),
                position=idx,
                created_at=datetime.utcnow()
            )
            db.add(flashcard)

        db.commit()

        quota_state = commit_quota_charge(db, quota_context)

        return {
            "status": "success",
            "message": f"Wygenerowano {len(flashcards_data)} fiszek z pliku",
            "flashcard_set_id": flashcard_set.id,
            "note_id": new_note.id,
            "total_cards": len(flashcards_data),
            "quota": quota_state,
        }

    except HTTPException:
        log_quota_failure(db, quota_context, "Flashcard generation from file failed")
        raise
    except Exception as e:
        log_quota_failure(db, quota_context, f"Flashcard generation from file error: {str(e)[:160]}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Błąd podczas generowania fiszek z pliku: {str(e)}"
        )


@router.get("/sets/{notebook_id}", response_model=List[FlashcardSetOut])
def get_flashcard_sets(notebook_id: int, db: db_dependency):
    """Pobiera wszystkie zestawy fiszek z notatnika"""
    sets = db.query(FlashcardSets).filter(
        FlashcardSets.notebook_id == notebook_id
    ).all()
    return sets


@router.get("/set/{set_id}", response_model=FlashcardSetOut)
def get_flashcard_set(set_id: int, db: db_dependency):
    """Pobiera szczegóły zestawu fiszek + wszystkie fiszki"""
    flashcard_set = db.query(FlashcardSets).filter(
        FlashcardSets.id == set_id
    ).first()
    
    if not flashcard_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zestaw fiszek nie znaleziony"
        )
    
    return flashcard_set


@router.get("/set/{set_id}/cards", response_model=List[FlashcardOut])
def get_flashcards_in_set(set_id: int, db: db_dependency):
    """Pobiera wszystkie fiszki z zestawu, posortowane po position"""
    flashcards = db.query(Flashcards).filter(
        Flashcards.flashcard_set_id == set_id
    ).order_by(Flashcards.position).all()
    
    return flashcards


@router.post("/review", response_model=FlashcardReviewOut)
def submit_flashcard_review(review: FlashcardReviewRequest, db: db_dependency):
    """Zapisuje wynik powtórki fiszki i oblicza następną datę powtórki"""

    print(f"\n=== REVIEW SUBMISSION ===")
    print(f"Flashcard ID: {review.flashcard_id}, User ID: {review.user_id}, Quality: {review.quality}")

    flashcard = db.query(Flashcards).filter(Flashcards.id == review.flashcard_id).first()
    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fiszka nie znaleziona"
        )

    flashcard_review = db.query(FlashcardReviews).filter(
        FlashcardReviews.flashcard_id == review.flashcard_id,
        FlashcardReviews.user_id == review.user_id
    ).first()

    if not flashcard_review:
        print(f"Creating new review record")
        flashcard_review = FlashcardReviews(
            flashcard_id=review.flashcard_id,
            user_id=review.user_id,
            status="new",
            repetitions=0,
            interval=0,
            created_at=datetime.utcnow()
        )
        db.add(flashcard_review)
    else:
        print(f"Existing review: status={flashcard_review.status}, repetitions={flashcard_review.repetitions}")

    new_status, new_repetitions, new_interval, next_review_date = calculate_next_review(
        review.quality,
        flashcard_review.repetitions,
        flashcard_review.interval
    )

    print(f"New values: status={new_status}, repetitions={new_repetitions}, interval={new_interval}")

    flashcard_review.status = new_status
    flashcard_review.repetitions = new_repetitions
    flashcard_review.interval = new_interval
    flashcard_review.last_review = datetime.utcnow()
    flashcard_review.next_review = next_review_date
    flashcard_review.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(flashcard_review)

    print(f"Review saved successfully")
    print(f"========================\n")

    return flashcard_review


@router.get("/due/{user_id}")
def get_due_flashcards(user_id: int, db: db_dependency):
    """Pobiera fiszki do powtórki dla użytkownika"""
    now = datetime.utcnow()
    
    reviews = db.query(FlashcardReviews).filter(
        FlashcardReviews.user_id == user_id,
        FlashcardReviews.next_review <= now
    ).all()
    
    flashcard_ids = [r.flashcard_id for r in reviews]
    
    if not flashcard_ids:
        return {
            "count": 0,
            "flashcards": []
        }
    
    flashcards = db.query(Flashcards).filter(
        Flashcards.id.in_(flashcard_ids)
    ).all()
    
    return {
        "count": len(flashcards),
        "flashcards": flashcards
    }


@router.get("/progress/{user_id}/{set_id}")
def get_user_progress(user_id: int, set_id: int, db: db_dependency):
    """Pobiera statystyki postępu użytkownika w danym zestawie"""

    flashcards = db.query(Flashcards).filter(
        Flashcards.flashcard_set_id == set_id
    ).all()

    flashcard_ids = [f.id for f in flashcards]

    if not flashcard_ids:
        reviews = []
    else:
        reviews = db.query(FlashcardReviews).filter(
            FlashcardReviews.user_id == user_id,
            FlashcardReviews.flashcard_id.in_(flashcard_ids)
        ).all()

    total = len(flashcards)
    new_count = total - len(reviews)
    learning_count = sum(1 for r in reviews if r.status == "learning")
    mastered_count = sum(1 for r in reviews if r.status == "mastered")

    progress_percentage = int((mastered_count / total * 100)) if total > 0 else 0

    result = {
        "total": total,
        "new": new_count,
        "learning": learning_count,
        "mastered": mastered_count,
        "progress_percentage": progress_percentage
    }

    return result


@router.delete("/set/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flashcard_set(set_id: int, db: db_dependency):
    """Usuwa zestaw fiszek"""
    flashcard_set = db.query(FlashcardSets).filter(
        FlashcardSets.id == set_id
    ).first()
    
    if not flashcard_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zestaw fiszek nie znaleziony"
        )
    
    if flashcard_set.note_id:
        note = db.query(Notes).filter(Notes.id == flashcard_set.note_id).first()
        if note:
            db.delete(note)
    
    db.delete(flashcard_set)
    db.commit()
    
    return {"message": "Zestaw fiszek usunięty"}


@router.get("/set/{set_id}/sources")
def get_flashcard_sources(set_id: int, db: db_dependency):
    """Pobiera źródła użyte do stworzenia zestawu"""
    flashcard_set = db.query(FlashcardSets).filter(
        FlashcardSets.id == set_id
    ).first()
    
    if not flashcard_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zestaw fiszek nie znaleziony"
        )
    
    source_notes = []
    if flashcard_set.source_notes:
        note_ids = json.loads(flashcard_set.source_notes)
        notes = db.query(Notes).filter(Notes.id.in_(note_ids)).all()
        source_notes = [{"id": n.id, "title": n.title} for n in notes]
    
    source_files = []
    if flashcard_set.source_files:
        source_files = json.loads(flashcard_set.source_files)
    
    return {
        "notes": source_notes,
        "files": source_files
    }


@router.put("/set/{set_id}")
def update_flashcard_set(set_id: int, request: UpdateSetRequest, db: db_dependency):
    """Aktualizuje tytuł i opis zestawu fiszek"""
    flashcard_set = db.query(FlashcardSets).filter(FlashcardSets.id == set_id).first()

    if not flashcard_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zestaw fiszek nie znaleziony"
        )

    flashcard_set.title = request.title
    flashcard_set.description = request.description
    flashcard_set.updated_at = datetime.utcnow()

    if flashcard_set.note_id:
        note = db.query(Notes).filter(Notes.id == flashcard_set.note_id).first()
        if note:
            note.title = request.title
            note.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(flashcard_set)

    return {"message": "Zestaw zaktualizowany", "set": flashcard_set}


@router.post("/card", response_model=FlashcardOut)
def create_flashcard(request: CreateCardRequest, db: db_dependency):
    """Dodaje nową fiszkę do zestawu"""
    flashcard_set = db.query(FlashcardSets).filter(FlashcardSets.id == request.flashcard_set_id).first()

    if not flashcard_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zestaw fiszek nie znaleziony"
        )

    max_position = db.query(func.max(Flashcards.position)).filter(
        Flashcards.flashcard_set_id == request.flashcard_set_id
    ).scalar() or -1

    new_flashcard = Flashcards(
        flashcard_set_id=request.flashcard_set_id,
        question=request.question,
        answer=request.answer,
        position=max_position + 1,
        created_at=datetime.utcnow()
    )

    db.add(new_flashcard)

    flashcard_set.total_cards = flashcard_set.total_cards + 1
    flashcard_set.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(new_flashcard)

    return new_flashcard


@router.put("/card/{card_id}")
def update_flashcard(card_id: int, request: UpdateCardRequest, db: db_dependency):
    """Aktualizuje pytanie i odpowiedź fiszki"""
    flashcard = db.query(Flashcards).filter(Flashcards.id == card_id).first()

    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fiszka nie znaleziona"
        )

    flashcard.question = request.question
    flashcard.answer = request.answer

    db.commit()
    db.refresh(flashcard)

    return {"message": "Fiszka zaktualizowana", "card": flashcard}


@router.delete("/card/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flashcard(card_id: int, db: db_dependency):
    """Usuwa pojedynczą fiszkę"""
    flashcard = db.query(Flashcards).filter(Flashcards.id == card_id).first()

    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fiszka nie znaleziona"
        )

    flashcard_set = db.query(FlashcardSets).filter(FlashcardSets.id == flashcard.flashcard_set_id).first()
    if flashcard_set:
        flashcard_set.total_cards = flashcard_set.total_cards - 1
        flashcard_set.updated_at = datetime.utcnow()

    db.delete(flashcard)
    db.commit()

    return {"message": "Fiszka usunięta"}


@router.post("/reorder")
def reorder_flashcards(request: ReorderRequest, db: db_dependency):
    """Zmienia kolejność fiszek w zestawie"""
    try:
        for item in request.card_positions:
            flashcard = db.query(Flashcards).filter(Flashcards.id == item['card_id']).first()
            if flashcard:
                flashcard.position = item['position']

        db.commit()
        return {"message": "Kolejność fiszek zaktualizowana"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Błąd podczas zmiany kolejności: {str(e)}"
        )


class UpdatePinRequest(BaseModel):
    is_pinned: bool


class UpdatePositionRequest(BaseModel):
    grid_position: int


@router.patch("/set/{set_id}/pin")
async def update_flashcard_set_pin(set_id: int, request: UpdatePinRequest, db: db_dependency):
    """Toggle pin status for flashcard set"""
    flashcard_set = db.query(FlashcardSets).filter(FlashcardSets.id == set_id).first()
    if not flashcard_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")

    flashcard_set.is_pinned = request.is_pinned
    db.commit()
    db.refresh(flashcard_set)

    return {"message": "Pin status updated successfully", "is_pinned": flashcard_set.is_pinned}


@router.patch("/set/{set_id}/position")
async def update_flashcard_set_position(set_id: int, request: UpdatePositionRequest, db: db_dependency):
    """Update grid position for flashcard set"""
    flashcard_set = db.query(FlashcardSets).filter(FlashcardSets.id == set_id).first()
    if not flashcard_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")

    flashcard_set.grid_position = request.grid_position
    db.commit()
    db.refresh(flashcard_set)

    return {"message": "Position updated successfully", "grid_position": flashcard_set.grid_position}


class CopyFlashcardSetRequest(BaseModel):
    target_notebook_id: int
    user_id: int


@router.post("/set/{set_id}/copy", response_model=FlashcardSetOut, status_code=status.HTTP_201_CREATED)
async def copy_flashcard_set_to_notebook(set_id: int, request: CopyFlashcardSetRequest, db: db_dependency):
    """Copy flashcard set to another notebook"""
    original_set = db.query(FlashcardSets).filter(FlashcardSets.id == set_id).first()
    if not original_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")

    # Create a new note for the copied flashcard set
    new_note = Notes(
        user_id=request.user_id,
        notebook_id=request.target_notebook_id,
        title=original_set.title,
        content=f"Zestaw {original_set.total_cards} fiszek (kopia)",
        type="Fiszki",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        is_shared=False
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    # Create new flashcard set
    new_set = FlashcardSets(
        note_id=new_note.id,
        user_id=request.user_id,
        notebook_id=request.target_notebook_id,
        title=original_set.title,
        description=original_set.description,
        difficulty=original_set.difficulty,
        total_cards=original_set.total_cards,
        source_notes=original_set.source_notes,
        source_files=original_set.source_files,
        grid_position=None,
        is_pinned=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_set)
    db.commit()
    db.refresh(new_set)

    # Copy all flashcards from original set
    original_flashcards = db.query(Flashcards).filter(
        Flashcards.flashcard_set_id == set_id
    ).order_by(Flashcards.position).all()

    for flashcard in original_flashcards:
        new_flashcard = Flashcards(
            flashcard_set_id=new_set.id,
            question=flashcard.question,
            answer=flashcard.answer,
            position=flashcard.position,
            created_at=datetime.utcnow()
        )
        db.add(new_flashcard)

    db.commit()
    db.refresh(new_set)

    return new_set