# Spotify Smart Playlist Engine 🚀

An advanced library curation tool that uses machine learning to group your Spotify tracks into cohesive, themed playlists ("Smart Mixes").

## Features
- **Intelligent Clustering**: Uses K-Means, HDBSCAN, and Spectral clustering to find hidden "vibes" in your library.
- **Musical DNA**: Semantic fallback engine that estimates audio features (Energy, Danceability, Valence) based on genre tags.
- **Harmonic Flow**: DJ-style sorting using the Camelot Wheel for seamless transitions.
- **Real-time Sync**: High-speed library synchronization with Last.fm tag enrichment.
- **Premium UI**: Modern, glassmorphic dashboard built with Next.js and Tailwind.

## Architecture
- **Backend**: FastAPI (Python)
- **Frontend**: Next.js (React/TypeScript)
- **ML Stack**: Scikit-Learn, NumPy, HDBSCAN
- **API Integration**: Spotify Web API (PKCE Auth), Last.fm API

## Setup
### 1. Backend
```powershell
cd src/backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn src.backend.main:app --port 8001 --reload
```

### 2. Frontend
```powershell
cd src/web
npm install
npm run dev
```

## Environment Variables
Create a `.env.local` in `src/web` and a `.env` in `src/backend` with:
- `SPOTIFY_CLIENT_ID`: Your Spotify Application Client ID
- `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`: e.g., http://localhost:8000/callback