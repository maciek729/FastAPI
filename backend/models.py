from datetime import datetime

from database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship

class Users(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String)

    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)

    reset_password_token = Column(String, nullable=True)
    reset_password_token_expires = Column(DateTime, nullable=True)

class Groups(Base):
    __tablename__ = 'groups'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime)

class GroupMembers(Base):
    __tablename__ = 'group_members'

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime)

class Messages(Base):
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    sent_at = Column(DateTime)


class Notebooks(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime)
    space_type = Column(String, default="personal")
    is_shared = Column(Boolean, default=False)

    notes = relationship("Notes", back_populates="notebook", cascade="all, delete-orphan")
    collaborators = relationship("NotebookCollaborator", back_populates="notebook", cascade="all, delete")

class NotebookCollaborator(Base):
    __tablename__ = "notebook_collaborators"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    notebook = relationship("Notebooks", back_populates="collaborators")
    user = relationship("Users")

class Notes(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    folder_id = Column(Integer, ForeignKey("note_folders.id"), nullable=True)
    title = Column(String)
    content = Column(String)
    type = Column(String(50), default="Notatka")
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    is_shared = Column(Boolean, default=False)
    grid_position = Column(Integer, nullable=True)
    is_pinned = Column(Boolean, default=False)

    # 🔼 RELACJA DO NOTEBOOKA
    notebook = relationship("Notebooks", back_populates="notes")

class NoteFolders(Base):
    __tablename__ = "note_folders"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    parent_folder_id = Column(Integer, ForeignKey("note_folders.id"), nullable=True)  # for nested folders
    grid_position = Column(Integer, nullable=True)
    created_at = Column(DateTime)

class TestFolders(Base):
    __tablename__ = "test_folders"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    parent_folder_id = Column(Integer, ForeignKey("test_folders.id"), nullable=True)  # for nested folders
    grid_position = Column(Integer, nullable=True)
    created_at = Column(DateTime)

class Tests(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    folder_id = Column(Integer, ForeignKey("test_folders.id"), nullable=True)  # parent folder
    title = Column(String)
    topic = Column(String, nullable=True)  # Description/topic of the test
    note_id = Column(Integer, ForeignKey("notes.id"))
    source_type = Column(String, default="manual")  # manual, file, note
    grid_position = Column(Integer, nullable=True)  # for drag-and-drop ordering
    is_pinned = Column(Boolean, default=False)  # whether test is pinned to top
    created_at = Column(DateTime)

class TestQuestions(Base):
    __tablename__ = "test_questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"))
    question = Column(String)
    question_type = Column(String, default="multiple_choice")  # multiple_choice, multiple_answers, true_false
    correct_answer = Column(String)
    other_options = Column(String)

class UserAnswers(Base):
    __tablename__ = "user_answers"

    id = Column(Integer, primary_key=True, index=True)
    test_question_id = Column(Integer, ForeignKey("test_questions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    selected_answer = Column(String)
    is_correct = Column(Boolean)
    answered_at = Column(DateTime)
    
class FlashcardSetFolders(Base):
    __tablename__ = "flashcard_set_folders"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    parent_folder_id = Column(Integer, ForeignKey("flashcard_set_folders.id"), nullable=True)  # for nested folders
    grid_position = Column(Integer, nullable=True)
    created_at = Column(DateTime)


class FlashcardSets(Base):
    __tablename__ = "flashcard_sets"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), index=True)
    folder_id = Column(Integer, ForeignKey("flashcard_set_folders.id"), nullable=True)  # parent folder

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String, default="średni")
    total_cards = Column(Integer, default=0)

    source_notes = Column(Text, nullable=True)
    source_files = Column(Text, nullable=True)

    grid_position = Column(Integer, nullable=True)  # for drag-and-drop ordering
    is_pinned = Column(Boolean, default=False)  # whether flashcard set is pinned to top

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    flashcards = relationship("Flashcards", back_populates="flashcard_set", cascade="all, delete-orphan")
    note = relationship("Notes")


class Flashcards(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    flashcard_set_id = Column(Integer, ForeignKey("flashcard_sets.id"), index=True, nullable=False)
    
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    position = Column(Integer, default=0, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    flashcard_set = relationship("FlashcardSets", back_populates="flashcards")
    reviews = relationship("FlashcardReviews", back_populates="flashcard", cascade="all, delete-orphan")


class FlashcardReviews(Base):
    __tablename__ = "flashcard_reviews"

    id = Column(Integer, primary_key=True, index=True)
    flashcard_id = Column(Integer, ForeignKey("flashcards.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    
    status = Column(String, default="new")
    repetitions = Column(Integer, default=0)
    interval = Column(Integer, default=0)
    
    last_review = Column(DateTime, nullable=True)
    next_review = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    flashcard = relationship("Flashcards", back_populates="reviews")



class PDFUploads(Base):
    __tablename__ = "pdf_uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_name = Column(String)
    file_path = Column(String)
    upload_date = Column(DateTime)
    ai_extracted_text = Column(String)

class Podcasts(Base):
    __tablename__ = "podcasts"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    title = Column(String)
    script_content = Column(Text)
    file_path = Column(String)
    file_url = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)