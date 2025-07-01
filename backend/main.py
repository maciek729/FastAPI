from fastapi import FastAPI, Request, status
from models import Base
from database import engine
from routers import auth, index, admin, users, ai, spaces
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthy")
def health_check():
    return {'status': 'Healthy'}

app.include_router(auth.router)
app.include_router(index.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(ai.router)
app.include_router(spaces.router)