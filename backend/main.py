from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from routers import upload, generate, history, download, spaces, video, tools, auth, voice, adgenius, chat, imageedit, avatar, translate, profile, shopify, teams, lipsync, cinema

app = FastAPI(title="Creative Variants Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(upload.router)
app.include_router(generate.router)
app.include_router(history.router)
app.include_router(download.router)
app.include_router(spaces.router)
app.include_router(video.router)
app.include_router(tools.router)
app.include_router(auth.router)
app.include_router(voice.router)
app.include_router(adgenius.router)
app.include_router(chat.router)
app.include_router(imageedit.router)
app.include_router(avatar.router)
app.include_router(translate.router)
app.include_router(profile.router)
app.include_router(shopify.router)
app.include_router(teams.router)
app.include_router(lipsync.router)
app.include_router(cinema.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Creative Variants Generator"}
