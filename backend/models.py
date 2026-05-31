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

    avatar_url = Column(String, nullable=True)

    is_archived = Column(Boolean, default=False, nullable=True)

    has_completed_tutorial = Column(Boolean, default=False, nullable=True)

    monthly_quota_credits = Column(Integer, default=300, nullable=False)
    monthly_credits_used = Column(Integer, default=0, nullable=False)
    quota_reset_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_quota_warning_pct = Column(Integer, nullable=True)

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

    notebook = relationship("Notebooks", back_populates="notes")

class NoteFolders(Base):
    __tablename__ = "note_folders"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    parent_folder_id = Column(Integer, ForeignKey("note_folders.id"), nullable=True)
    grid_position = Column(Integer, nullable=True)
    created_at = Column(DateTime)

class TestFolders(Base):
    __tablename__ = "test_folders"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    parent_folder_id = Column(Integer, ForeignKey("test_folders.id"), nullable=True)
    grid_position = Column(Integer, nullable=True)
    created_at = Column(DateTime)

class Tests(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    folder_id = Column(Integer, ForeignKey("test_folders.id"), nullable=True)
    title = Column(String)
    topic = Column(String, nullable=True)
    note_id = Column(Integer, ForeignKey("notes.id"))
    source_type = Column(String, default="manual")
    grid_position = Column(Integer, nullable=True)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime)

class TestQuestions(Base):
    __tablename__ = "test_questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"))
    question = Column(String)
    question_type = Column(String, default="multiple_choice")
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
    parent_folder_id = Column(Integer, ForeignKey("flashcard_set_folders.id"), nullable=True) 
    grid_position = Column(Integer, nullable=True)
    created_at = Column(DateTime)


class FlashcardSets(Base):
    __tablename__ = "flashcard_sets"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), index=True)
    folder_id = Column(Integer, ForeignKey("flashcard_set_folders.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String, default="średni")
    total_cards = Column(Integer, default=0)

    source_notes = Column(Text, nullable=True)
    source_files = Column(Text, nullable=True)

    grid_position = Column(Integer, nullable=True)
    is_pinned = Column(Boolean, default=False)

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

class PodcastFolders(Base):
    __tablename__ = "podcast_folders"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    parent_folder_id = Column(Integer, ForeignKey("podcast_folders.id"), nullable=True)
    grid_position = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Podcasts(Base):
    __tablename__ = "podcasts"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    folder_id = Column(Integer, ForeignKey("podcast_folders.id"), nullable=True)

    title = Column(String)
    script_content = Column(Text)
    file_path = Column(String)
    file_url = Column(String)
    
    grid_position = Column(Integer, nullable=True)
    is_pinned = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class NotebookMessages(Base):
    __tablename__ = 'notebook_messages'

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    type = Column(String, default="text") # 'text', 'resource_share', 'image'
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("Users")
    notebook = relationship("Notebooks")
    is_edited = Column(Boolean, default=False, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=True)
    is_pinned = Column(Boolean, default=False, nullable=True)

class Notifications(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    content = Column(Text, nullable=False)
    type = Column(String(50))
    
    redirect_type = Column(String(50)) 
    
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), nullable=True)
    tab_target = Column(String(50), nullable=True)
    
    item_id = Column(Integer, nullable=True) 

    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("Users", foreign_keys=[user_id])
    sender = relationship("Users", foreign_keys=[sender_id])
    notebook = relationship("Notebooks")

class StudyFiles(Base):
    __tablename__ = "study_files"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    folder_id = Column(Integer, ForeignKey("note_folders.id"), nullable=True)
    
    file_name = Column(String)
    file_path = Column(String)
    file_url = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    
    grid_position = Column(Integer, nullable=True)
    is_pinned = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    notebook = relationship("Notebooks")
    user = relationship("Users")

class ChatReadStatus(Base):
    __tablename__ = "chat_read_status"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), index=True)
    last_viewed_at = Column(DateTime, default=datetime.utcnow)


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    action_type = Column(String(50), nullable=False)
    endpoint = Column(String(100), nullable=False)
    cost_credits = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    message = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)