from datetime import datetime
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Tests, TestQuestions, UserAnswers, Users, Notes
from dotenv import load_dotenv
import os
import json
from PyPDF2 import PdfReader
import io
import base64
from docx import Document
from PIL import Image
from google import genai
from google.genai import types

router = APIRouter(
    prefix="/tests",
    tags=["tests"]
)

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None

if not GEMINI_API_KEY:
    print("[WARNING] Brak GEMINI_API_KEY. Dodaj go do pliku .env")
else:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        print("[SUCCESS] Gemini client initialized for tests router (google-genai v1)")
    except Exception as e:
        print(f"[ERROR] Błąd inicjalizacji klienta Gemini w tests router: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

class TestGenerateRequest(BaseModel):
    user_id: int
    notebook_id: int
    title: str
    topic: str
    num_questions: int = 5
    question_type: str = "multiple_choice"
    note_id: Optional[int] = None
    folder_id: Optional[int] = None

class QuestionOut(BaseModel):
    id: int
    test_id: int
    question: str
    question_type: str
    correct_answer: str
    other_options: str

    class Config:
        from_attributes = True

class TestOut(BaseModel):
    id: int
    user_id: int
    notebook_id: int
    folder_id: Optional[int] = None
    title: str
    topic: Optional[str] = None
    note_id: Optional[int]
    source_type: str = "manual"
    grid_position: Optional[int] = None
    is_pinned: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class TestWithQuestions(BaseModel):
    id: int
    user_id: int
    notebook_id: int
    title: str
    topic: Optional[str] = None
    note_id: Optional[int]
    created_at: datetime
    questions: List[QuestionOut]

    class Config:
        from_attributes = True

class AnswerSubmit(BaseModel):
    user_id: int
    test_question_id: int
    selected_answer: str

class TestResultOut(BaseModel):
    test_id: int
    total_questions: int
    correct_answers: int
    score_percentage: float
    answers: List[dict]


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
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            return file_content.decode('latin-1')

    elif file_extension in [".jpg", ".jpeg", ".png", ".webp"]:
        return f"[IMAGE_FILE:{filename}]"

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Nieobsługiwany typ pliku: {file_extension}"
        )

def generate_test_with_gemini(topic: str, num_questions: int, question_type: str = "multiple_choice", context_text: str = None, image_data: bytes = None, image_mime: str = None) -> List[dict]:
    """Generate test questions using Gemini AI (New Library)"""
    
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Gemini AI is not configured. Please add GEMINI_API_KEY to .env file"
        )

    try:
        topic_with_context = topic
        if context_text:
            if context_text.startswith("[IMAGE_FILE:"):
                topic_with_context = f"{topic}\n\n(Na podstawie załączonego obrazu)"
            else:
                topic_with_context = f"{topic}\n\nKontekst/Materiał do nauki:\n{context_text[:8000]}" # Increased limit for Flash models

        if question_type == "true_false":
            prompt = f"""
            Wygeneruj test typu prawda/fałsz na temat: "{topic_with_context}".
            Wymagania:
            - Liczba pytań: {num_questions}
            - Każde pytanie to stwierdzenie, które może być prawdziwe lub fałszywe
            - Odpowiedzi w języku polskim
            - Dla pytań matematycznych użyj notacji LaTeX w podwójnych dolarach: $$formula$$

            Zwróć wynik w formacie JSON jako listę obiektów:
            [
                {{
                    "question": "Treść stwierdzenia",
                    "correct_answer": ["Prawda"],
                    "type": "true_false"
                }}
            ]
            Zwróć TYLKO czysty JSON.
            """
        elif question_type == "multiple_answers":
            prompt = f"""
            Wygeneruj test wielokrotnego wyboru z wieloma poprawnymi odpowiedziami na temat: "{topic_with_context}".
            Wymagania:
            - Liczba pytań: {num_questions}
            - Każde pytanie ma 4-6 opcji odpowiedzi
            - 2-3 odpowiedzi są prawidłowe (zaznacz wszystkie poprawne)
            - Odpowiedzi w języku polskim
            - Dla pytań matematycznych użyj notacji LaTeX w podwójnych dolarach: $$formula$$

            Zwróć wynik w formacie JSON jako listę obiektów:
            [
                {{
                    "question": "Treść pytania?",
                    "correct_answer": ["A", "C"],
                    "options": {{
                        "A": "Pierwsza opcja (poprawna)",
                        "B": "Druga opcja",
                        "C": "Trzecia opcja (poprawna)",
                        "D": "Czwarta opcja"
                    }},
                    "type": "multiple_answers"
                }}
            ]
            Zwróć TYLKO czysty JSON.
            """
        elif question_type == "mixed":
            prompt = f"""
            Wygeneruj test mieszany (różne typy pytań) na temat: "{topic_with_context}".
            Wymagania:
            - Liczba pytań: {num_questions}
            - Używaj różnych typów pytań: wielokrotny wybór, prawda/fałsz, wiele poprawnych odpowiedzi
            - Odpowiedzi w języku polskim
            - Dla pytań matematycznych użyj notacji LaTeX w podwójnych dolarach: $$formula$$

            Zwróć wynik w formacie JSON jako listę obiektów:
            [
                {{
                    "question": "Treść pytania?",
                    "correct_answer": ["A"] lub ["Prawda"] lub ["A", "C"],
                    "options": {{"A": "...", "B": "..."}},
                    "type": "multiple_choice" lub "true_false" lub "multiple_answers"
                }}
            ]
            Zwróć TYLKO czysty JSON.
            """
        else: 
            prompt = f"""
            Wygeneruj test wielokrotnego wyboru na temat: "{topic_with_context}".
            Wymagania:
            - Liczba pytań: {num_questions}
            - Każde pytanie ma 4 opcje odpowiedzi (A, B, C, D)
            - Tylko jedna odpowiedź jest prawidłowa
            - Odpowiedzi w języku polskim
            - Dla pytań matematycznych użyj notacji LaTeX w podwójnych dolarach: $$formula$$

            Zwróć wynik w formacie JSON jako listę obiektów:
            [
                {{
                    "question": "Treść pytania?",
                    "correct_answer": ["A"],
                    "options": {{
                        "A": "Pierwsza opcja",
                        "B": "Druga opcja",
                        "C": "Trzecia opcja",
                        "D": "Czwarta opcja"
                    }},
                    "type": "multiple_choice"
                }}
            ]
            Zwróć TYLKO czysty JSON.
            """
        
        contents = [prompt]
        
        if image_data and image_mime:
            image_part = types.Part.from_bytes(
                data=image_data,
                mime_type=image_mime
            )
            contents.append(image_part)

        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=contents
        )

        response_text = response.text.strip()

        if response_text.startswith("```"):
            lines = response_text.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            response_text = "\n".join(lines).strip()

        questions_data = json.loads(response_text)

        formatted_questions = []
        for q in questions_data:
            if "question" not in q or "correct_answer" not in q:
                continue

            q_type = q.get("type", "multiple_choice")

            if q_type == "true_false":
                formatted_questions.append({
                    "question": q["question"],
                    "question_type": "true_false",
                    "correct_answer": json.dumps(q["correct_answer"]), 
                    "other_options": json.dumps({"Prawda": "Prawda", "Fałsz": "Fałsz"})
                })
            elif q_type == "multiple_answers":
                if "options" in q:
                    formatted_questions.append({
                        "question": q["question"],
                        "question_type": "multiple_answers",
                        "correct_answer": json.dumps(q["correct_answer"]), 
                        "other_options": json.dumps(q["options"])
                    })
            else:
                if "options" in q:
                    formatted_questions.append({
                        "question": q["question"],
                        "question_type": "multiple_choice",
                        "correct_answer": json.dumps(q["correct_answer"]), 
                        "other_options": json.dumps(q["options"])
                    })

        if len(formatted_questions) == 0:
             raise ValueError("AI nie wygenerowało poprawnych pytań. Spróbuj zmienić temat.")

        return formatted_questions[:num_questions]

    except json.JSONDecodeError as e:
        print(f"JSON Error content: {response_text}")
        raise HTTPException(
            status_code=500,
            detail=f"Błąd parsowania odpowiedzi AI (JSON): {str(e)}"
        )
    except Exception as e:
        print(f"Gemini Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Błąd generowania testu z Gemini: {str(e)}"
        )

# --- ENDPOINTS ---

@router.post("/generate-from-file", response_model=TestWithQuestions, status_code=status.HTTP_201_CREATED)
async def generate_test_from_file(
    user_id: int = Form(...),
    notebook_id: int = Form(...),
    title: str = Form(...),
    topic: str = Form(...),
    num_questions: int = Form(...),
    question_type: str = Form(...),
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        file_content = await file.read()
        file_extension = "." + file.filename.split(".")[-1].lower()

        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".pdf": "application/pdf"
        }

        is_image = file_extension in [".jpg", ".jpeg", ".png", ".webp"]
        
        if is_image:
            file_mime = mime_types[file_extension]
            questions_data = generate_test_with_gemini(
                topic,
                num_questions,
                question_type,
                context_text=None,
                image_data=file_content,
                image_mime=file_mime
            )
        else:
            extracted_text = extract_text_from_file(file_content, file.filename)

            if not extracted_text.strip():
                raise HTTPException(status_code=400, detail="Nie można wyodrębnić tekstu z pliku")

            questions_data = generate_test_with_gemini(topic, num_questions, question_type, extracted_text)

        new_test = Tests(
            user_id=user_id,
            notebook_id=notebook_id,
            folder_id=folder_id,
            title=title,
            topic=topic,
            source_type="file",
            created_at=datetime.now()
        )
        db.add(new_test)
        db.commit()
        db.refresh(new_test)

        questions_out = []
        for q_data in questions_data:
            new_question = TestQuestions(
                test_id=new_test.id,
                question=q_data["question"],
                question_type=q_data["question_type"],
                correct_answer=q_data["correct_answer"],
                other_options=q_data["other_options"]
            )
            db.add(new_question)
            db.commit()
            db.refresh(new_question)
            questions_out.append(new_question)

        return TestWithQuestions(
            id=new_test.id,
            user_id=new_test.user_id,
            notebook_id=new_test.notebook_id,
            title=new_test.title,
            topic=new_test.topic,
            note_id=None,
            created_at=new_test.created_at,
            questions=[QuestionOut.model_validate(q) for q in questions_out]
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd generowania testu z pliku: {str(e)}")

@router.post("/generate", response_model=TestWithQuestions, status_code=status.HTTP_201_CREATED)
async def generate_test(request: TestGenerateRequest, db: db_dependency):
    try:
        context_text = None
        source_type = "manual"
        if request.note_id:
            note = db.query(Notes).filter(Notes.id == request.note_id).first()
            if note:
                context_text = note.content
                source_type = "note"

        questions_data = generate_test_with_gemini(request.topic, request.num_questions, request.question_type, context_text)

        new_test = Tests(
            user_id=request.user_id,
            notebook_id=request.notebook_id,
            folder_id=request.folder_id,
            title=request.title,
            topic=request.topic,
            note_id=request.note_id,
            source_type=source_type,
            created_at=datetime.now()
        )
        db.add(new_test)
        db.commit()
        db.refresh(new_test)

        questions_out = []
        for q_data in questions_data:
            new_question = TestQuestions(
                test_id=new_test.id,
                question=q_data["question"],
                question_type=q_data["question_type"],
                correct_answer=q_data["correct_answer"],
                other_options=q_data["other_options"]
            )
            db.add(new_question)
            db.commit()
            db.refresh(new_question)
            questions_out.append(new_question)

        return TestWithQuestions(
            id=new_test.id,
            user_id=new_test.user_id,
            notebook_id=new_test.notebook_id,
            title=new_test.title,
            topic=new_test.topic,
            note_id=new_test.note_id,
            created_at=new_test.created_at,
            questions=[QuestionOut.model_validate(q) for q in questions_out]
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating test: {str(e)}"
        )


@router.get("/list", response_model=List[TestOut])
async def list_tests(user_id: int, notebook_id: int, db: db_dependency):
    tests = db.query(Tests).filter(
        Tests.user_id == user_id,
        Tests.notebook_id == notebook_id
    ).order_by(Tests.created_at.desc()).all()
    return tests

@router.get("/{test_id}", response_model=TestWithQuestions)
async def get_test(test_id: int, db: db_dependency):
    test = db.query(Tests).filter(Tests.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    questions = db.query(TestQuestions).filter(TestQuestions.test_id == test_id).all()
    return TestWithQuestions(
        id=test.id,
        user_id=test.user_id,
        notebook_id=test.notebook_id,
        title=test.title,
        topic=test.topic,
        note_id=test.note_id,
        created_at=test.created_at,
        questions=[QuestionOut.model_validate(q) for q in questions]
    )

@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(test_id: int, user_id: int, db: db_dependency):
    test = db.query(Tests).filter(Tests.id == test_id, Tests.user_id == user_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    question_ids = [q.id for q in db.query(TestQuestions).filter(TestQuestions.test_id == test_id).all()]
    if question_ids:
        db.query(UserAnswers).filter(UserAnswers.test_question_id.in_(question_ids)).delete(synchronize_session=False)
    db.query(TestQuestions).filter(TestQuestions.test_id == test_id).delete()
    db.delete(test)
    db.commit()
    return {"message": "Test deleted successfully"}

@router.post("/submit-answer", status_code=status.HTTP_201_CREATED)
async def submit_answer(answer: AnswerSubmit, db: db_dependency):
    question = db.query(TestQuestions).filter(TestQuestions.id == answer.test_question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    existing_answer = db.query(UserAnswers).filter(
        UserAnswers.test_question_id == answer.test_question_id,
        UserAnswers.user_id == answer.user_id
    ).first()
    try: correct_answers = json.loads(question.correct_answer)
    except: correct_answers = [question.correct_answer]
    try: 
        user_answers = json.loads(answer.selected_answer)
        if not isinstance(user_answers, list): user_answers = [user_answers]
    except: user_answers = [answer.selected_answer]
    is_correct = sorted(user_answers) == sorted(correct_answers)
    if existing_answer:
        existing_answer.selected_answer = answer.selected_answer
        existing_answer.is_correct = is_correct
        existing_answer.answered_at = datetime.now()
    else:
        new_answer = UserAnswers(
            test_question_id=answer.test_question_id,
            user_id=answer.user_id,
            selected_answer=answer.selected_answer,
            is_correct=is_correct,
            answered_at=datetime.now()
        )
        db.add(new_answer)
    db.commit()
    return {"status": "success", "is_correct": is_correct, "correct_answer": question.correct_answer}

@router.get("/results/{test_id}", response_model=TestResultOut)
async def get_test_results(test_id: int, user_id: int, db: db_dependency):
    test = db.query(Tests).filter(Tests.id == test_id).first()
    if not test: raise HTTPException(status_code=404, detail="Test not found")
    questions = db.query(TestQuestions).filter(TestQuestions.test_id == test_id).all()
    total_questions = len(questions)
    if total_questions == 0: raise HTTPException(status_code=404, detail="No questions found for this test")
    question_ids = [q.id for q in questions]
    user_answers = db.query(UserAnswers).filter(
        UserAnswers.test_question_id.in_(question_ids),
        UserAnswers.user_id == user_id
    ).all()
    answers_dict = {ans.test_question_id: ans for ans in user_answers}
    answers_detail = []
    correct_count = 0
    for question in questions:
        user_answer = answers_dict.get(question.id)
        try: correct_answers_array = json.loads(question.correct_answer)
        except: correct_answers_array = [question.correct_answer]
        if len(correct_answers_array) > 1: correct_answer_text = ", ".join(correct_answers_array)
        else: correct_answer_text = correct_answers_array[0] if correct_answers_array else question.correct_answer
        if user_answer:
            if user_answer.is_correct: correct_count += 1
            try: user_answers_array = json.loads(user_answer.selected_answer)
            except: user_answers_array = [user_answer.selected_answer]
            if len(user_answers_array) > 1: user_answer_text = ", ".join(user_answers_array)
            else: user_answer_text = user_answers_array[0] if user_answers_array else user_answer.selected_answer
            answers_detail.append({
                "question_id": question.id, "question": question.question,
                "user_answer": user_answer_text, "correct_answer": correct_answer_text,
                "is_correct": user_answer.is_correct, "all_options": json.loads(question.other_options)
            })
        else:
            answers_detail.append({
                "question_id": question.id, "question": question.question,
                "user_answer": None, "correct_answer": correct_answer_text,
                "is_correct": False, "all_options": json.loads(question.other_options)
            })
    score_percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
    return TestResultOut(
        test_id=test_id, total_questions=total_questions, correct_answers=correct_count,
        score_percentage=round(score_percentage, 2), answers=answers_detail
    )

@router.get("/check-answers/{test_id}")
async def check_if_answered(test_id: int, user_id: int, db: db_dependency):
    questions = db.query(TestQuestions).filter(TestQuestions.test_id == test_id).all()
    question_ids = [q.id for q in questions]
    if not question_ids: return {"has_answers": False, "answered_count": 0, "total_questions": 0}
    answers = db.query(UserAnswers).filter(
        UserAnswers.test_question_id.in_(question_ids),
        UserAnswers.user_id == user_id
    ).all()
    return {"has_answers": len(answers) > 0, "answered_count": len(answers), "total_questions": len(questions)}

class UpdatePositionRequest(BaseModel):
    grid_position: int

@router.patch("/{test_id}/position")
async def update_test_position(test_id: int, request: UpdatePositionRequest, db: db_dependency):
    test = db.query(Tests).filter(Tests.id == test_id).first()
    if not test: raise HTTPException(status_code=404, detail="Test not found")
    test.grid_position = request.grid_position
    db.commit()
    db.refresh(test)
    return {"message": "Position updated successfully", "grid_position": test.grid_position}

class UpdatePinRequest(BaseModel):
    is_pinned: bool

@router.patch("/{test_id}/pin")
async def update_test_pin(test_id: int, request: UpdatePinRequest, db: db_dependency):
    test = db.query(Tests).filter(Tests.id == test_id).first()
    if not test: raise HTTPException(status_code=404, detail="Test not found")
    test.is_pinned = request.is_pinned
    db.commit()
    db.refresh(test)
    return {"message": "Pin status updated successfully", "is_pinned": test.is_pinned}

class CopyTestRequest(BaseModel):
    target_notebook_id: int
    user_id: int

@router.post("/{test_id}/copy", response_model=TestWithQuestions, status_code=status.HTTP_201_CREATED)
async def copy_test_to_notebook(test_id: int, request: CopyTestRequest, db: db_dependency):
    original_test = db.query(Tests).filter(Tests.id == test_id).first()
    if not original_test: raise HTTPException(status_code=404, detail="Test not found")
    original_questions = db.query(TestQuestions).filter(TestQuestions.test_id == test_id).all()
    new_test = Tests(
        user_id=request.user_id, notebook_id=request.target_notebook_id,
        title=original_test.title, topic=original_test.topic,
        note_id=None, source_type=original_test.source_type,
        grid_position=None, is_pinned=False, created_at=datetime.now()
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)
    copied_questions = []
    for original_question in original_questions:
        new_question = TestQuestions(
            test_id=new_test.id, question=original_question.question,
            question_type=original_question.question_type, correct_answer=original_question.correct_answer,
            other_options=original_question.other_options
        )
        db.add(new_question)
        db.commit()
        db.refresh(new_question)
        copied_questions.append(new_question)
    return TestWithQuestions(
        id=new_test.id, user_id=new_test.user_id, notebook_id=new_test.notebook_id,
        title=new_test.title, topic=new_test.topic, note_id=new_test.note_id,
        created_at=new_test.created_at, questions=[QuestionOut.model_validate(q) for q in copied_questions]
    )