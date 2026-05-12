# Spotify Smart Playlist Engine

An advanced music library analysis and automated curation platform built with Next.js and FastAPI. This application utilizes machine learning clustering algorithms to discover hidden musical communities within a user's library and generate optimized, harmonically-sequenced playlists.

## Technical Architecture

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS with a custom high-fidelity dark theme
- **State Management**: React Context API for real-time synchronization tracking
- **Authentication**: OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure client-side authorization

### Backend
- **Framework**: FastAPI (Python 3.14+)
- **Processing**: Asynchronous task management for high-volume library scanning
- **Intelligence**: Scikit-learn and HDBSCAN for multidimensional clustering
- **Visualization**: Matplotlib PCA (Principal Component Analysis) for real-time musical DNA mapping

## Key Features

### Multi-Algorithmic Clustering
The engine supports four distinct approaches to library organization:
- **K-Means (AI Clusters)**: Mathematical partitioning for balanced, evenly-sized mixes.
- **HDBSCAN (Natural Vibe)**: Density-based community discovery that filters out statistical noise to find organic 'vibes'.
- **Spectral Clustering**: Graph-based analysis for identifying niche genre connections and hidden musical relationships.
- **Harmonic Flow**: BPM and Camelot Wheel sequencing for DJ-ready continuous mixes.

### Semantic Metadata Enrichment
To overcome standard API limitations, the engine performs secondary metadata fetching:
- **Spotify Artist API**: Deep genre extraction and popularity metrics.
- **Last.fm API Integration**: Semantic tag retrieval for niche genre identification.
- **Audio Profile Estimation**: Fallback heuristics for tracks missing raw audio features.

### Real-Time Intelligence Dashboard
- **Musical DNA Map**: A live PCA projection of the music library based on 8 unique audio dimensions.
- **Library Analytics**: Statistical breakdown of danceability, energy, valence, and acousticness.
- **Live Sync Monitor**: Real-time progress tracking during multi-thousand track library scans.

## Deployment and Infrastructure
The project is architected for cloud-native deployment:
- **Frontend**: Hosted on Vercel with automated CI/CD pipelines.
- **Backend**: Deployed on Render using Uvicorn for high-performance ASGI serving.
- **Environment Management**: Robust cross-origin resource sharing (CORS) configuration for secure inter-service communication.

## Installation and Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Spotify Developer Account

### Backend Configuration
1. Navigate to `src/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Configure `.env` with `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REDIRECT_URI`.
4. Run the server: `uvicorn main:app --reload`.

### Frontend Configuration
1. Navigate to `src/web`.
2. Install dependencies: `npm install`.
3. Configure `.env.local` with `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`.
4. Run the development server: `npm run dev`.

## License
This project is licensed under the MIT License.