"""
Main FastAPI app entry point for Spotify Smart Playlist Generator backend.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from src.backend.api.routes import router as api_router
import starlette.middleware.base as base

app = FastAPI(title="Spotify Smart Playlist Generator")

# 1. Deployment-Ready CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000", 
        "http://127.0.0.1:8000", 
        "http://localhost:3000",
        "https://*.vercel.app" # Allows any Vercel deployment
    ],
    allow_origin_regex="https://.*\.vercel\.app", # For wildcard support
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# 2. Security Headers Middleware (Production Grade)
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.include_router(api_router, prefix="/api")

# Serve the entire frontend directory
app.mount("/html", StaticFiles(directory="src/frontend/html", html=True), name="html")
app.mount("/js", StaticFiles(directory="src/frontend/js"), name="js")
app.mount("/css", StaticFiles(directory="src/frontend/css"), name="css")

@app.get("/")
async def root():
    return RedirectResponse(url="/html/index.html")

@app.get("/callback.html")
async def callback_redirect():
    return RedirectResponse(url="/html/callback.html")

# Add custom error handlers, logging, and middleware here
