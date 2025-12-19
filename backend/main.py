from click import group
from fastapi import FastAPI, Request, status
from models import Base
from database import engine
from routers import contact, auth, index, admin, users, ai, notebooks, notes, tests, flashcards, folders
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import podcasts

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/healthy")
def health_check():
    return {'status': 'Healthy'}

app.include_router(auth.router)
app.include_router(index.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(ai.router)
app.include_router(notebooks.router)
app.include_router(notes.router)
app.include_router(tests.router)
app.include_router(contact.router)
app.include_router(flashcards.router)
app.include_router(folders.router)
app.include_router(podcasts.router)
