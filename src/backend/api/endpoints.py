"""
API endpoints for playlist creation, clustering, analytics, feedback, user data, export/delete, etc.
"""
from fastapi import APIRouter, Body, BackgroundTasks, HTTPException
import requests
import os
import json
import spotipy
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
from src.backend.playlist_engine import PlaylistEngine
from src.backend.clustering.kmeans import kmeans_cluster
from src.backend.clustering.hdbscan import hdbscan_cluster
from src.backend.clustering.spectral import spectral_cluster
from src.backend.clustering.deep_embeddings import deep_embedding_cluster
from src.backend.analytics.quality import analyze_quality
from src.backend.feedback.reinforcement import update_recommendation

from src.backend.utils.spotify_api import SpotifyAPI
from src.backend.utils.library_sync import LibrarySyncManager

from src.backend.utils.activity import log_activity, get_activities
from src.backend.utils.algorithms import sort_harmonically, generate_semantic_name

router = APIRouter()
active_syncs = {}

class GenerateRequest(BaseModel):
    tracks: List[Dict[str, Any]]
    num_playlists: int = 5
    min_size: int = 10
    max_tracks: int = 50
    algorithm: str = "kmeans"

@router.get("/sync_status/ping")
async def ping():
    return {"status": "ok"}

@router.get("/library/all_tracks")
async def get_all_library_tracks():
    data_path = "data/output/auto_synced_library.json"
    if os.path.exists(data_path):
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"tracks": []}

@router.get("/library/summary")
async def get_library_summary():
    # Try to load stats from various possible data files
    summary = {
        "total_tracks": 0,
        "total_genres": 0,
        "total_artists": 0,
        "profile_cohesion": "0%"
    }
    
    data_files = [
        "data/output/auto_synced_library.json",
        "data/output/current_library_enriched.json",
        "data/output/real_enriched_data.json"
    ]
    
    for file_path in data_files:
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    tracks = data.get("tracks", [])
                    if tracks:
                        summary["total_tracks"] = len(tracks)
                        genres = set()
                        artists = set()
                        for t in tracks:
                            # Handle different data structures
                            if isinstance(t, dict):
                                artist = t.get("artist") or t.get("original_data", {}).get("artist")
                                if artist: artists.add(artist)
                                
                                track_genres = t.get("genres") or []
                                for g in track_genres: genres.add(g)
                                
                        summary["total_genres"] = len(genres)
                        summary["total_artists"] = len(artists)
                        summary["profile_cohesion"] = "92%" # Placeholder for now
                        break
            except Exception:
                continue
                
    return summary

@router.get("/library/features")
async def get_library_features():
    data_path = "data/output/auto_synced_library.json"
    if not os.path.exists(data_path):
        return {"danceability": 0, "energy": 0, "acousticness": 0, "valence": 0}
        
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            tracks = data.get("tracks", [])
            if not tracks:
                return {"danceability": 0, "energy": 0, "acousticness": 0, "valence": 0}
            
            # Semantic Mapping for when Spotify Audio Features are restricted (403)
            GENRE_WEIGHTS = {
                "danceability": ["pop", "dance", "disco", "house", "hip hop", "funk", "r&b"],
                "energy": ["rock", "metal", "techno", "punk", "edm", "hardcore", "dance"],
                "acousticness": ["folk", "acoustic", "classical", "jazz", "blues", "singer-songwriter"],
                "valence": ["happy", "pop", "disco", "sunny", "feel good", "funk"]
            }
            
            totals = {"danceability": 0, "energy": 0, "acousticness": 0, "valence": 0}
            valid_tracks_count = 0
            
            for t in tracks:
                feats = t.get("audio_features")
                genres = [g.lower() for g in t.get("genres", [])]
                
                # We consider a track "valid" if it has real features OR at least one genre tag
                if (feats and feats.get("energy")) or genres:
                    valid_tracks_count += 1
                    
                    if feats and feats.get("energy"):
                        for k in totals:
                            totals[k] += feats.get(k, 0.5)
                    else:
                        # Fallback to Semantic Estimation based on Genres
                        for attr, keywords in GENRE_WEIGHTS.items():
                            score = 0.4 
                            for kw in keywords:
                                if kw in genres:
                                    score += 0.2
                            totals[attr] += min(score, 1.0)
            
            if valid_tracks_count == 0:
                return {"danceability": 0, "energy": 0, "acousticness": 0, "valence": 0}
                
            return {k: round((v / valid_tracks_count) * 100) for k, v in totals.items()}
    except Exception as e:
        print(f"Error in features: {e}")
        return {"danceability": 0, "energy": 0, "acousticness": 0, "valence": 0}

@router.get("/library/map_image")
async def get_library_map():
    """Generates a dynamic PCA map of the library."""
    import matplotlib.pyplot as plt
    import io
    from fastapi.responses import Response
    from sklearn.decomposition import PCA
    import numpy as np

    data_path = "data/output/auto_synced_library.json"
    if not os.path.exists(data_path):
        # Return a blank placeholder if no data
        plt.figure(figsize=(8, 6))
        plt.text(0.5, 0.5, "Please Sync Library to Generate Map", ha='center')
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        return Response(content=buf.getvalue(), media_type="image/png")

    with open(data_path, "r") as f:
        data = json.load(f)
        tracks = data.get("tracks", [])

    if not tracks:
        return Response(content=b"", media_type="image/png")

    # Extract features for PCA
    features = []
    for t in tracks:
        f = t.get("audio_features", {})
        features.append([
            f.get("danceability", 0.5),
            f.get("energy", 0.5),
            f.get("valence", 0.5),
            f.get("acousticness", 0.5)
        ])
    
    X = np.array(features)
    pca = PCA(n_components=2)
    components = pca.fit_transform(X)

    plt.figure(figsize=(10, 7), facecolor='none')
    plt.scatter(components[:, 0], components[:, 1], alpha=0.6, c=np.arange(len(tracks)), cmap='viridis')
    plt.title("Musical DNA Map (Live)", color='white')
    plt.axis('off')
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True)
    plt.close()
    return Response(content=buf.getvalue(), media_type="image/png")

@router.get("/library/genres")
async def get_library_genres(min_count: int = 5, limit: int = 12): 
    data_path = "data/output/auto_synced_library.json"
    if not os.path.exists(data_path):
        return {"genres": []}
        
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            tracks = data.get("tracks", [])
            
            genre_map = {}
            for t in tracks:
                genres = [g.lower() for g in t.get("genres", [])]
                for g in genres:
                    # Skip non-musical generic tags
                    if g in ['seen live', 'favorites', 'awesome', '2024', '2023']: continue
                    
                    if g not in genre_map:
                        display_name = " ".join([word.capitalize() for word in g.split(" ")])
                        genre_map[g] = {"name": display_name, "track_ids": [], "count": 0}
                    genre_map[g]["track_ids"].append(t["id"])
                    genre_map[g]["count"] += 1
                    
            popular_genres = [
                v for k, v in genre_map.items() 
                if v["count"] >= min_count
            ]
            popular_genres.sort(key=lambda x: x["count"], reverse=True)
            
            return {"genres": popular_genres[:limit]}
    except Exception as e:
        print(f"Genre Vault Error: {e}")
        return {"genres": []}

@router.get("/library/algorithm_insights")
async def get_algorithm_insights():
    """Run all clustering algorithms on the synced library and return comparative metrics."""
    data_path = "data/output/auto_synced_library.json"
    if not os.path.exists(data_path):
        return {"error": "Library not synced yet.", "algorithms": []}

    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            tracks = data.get("tracks", [])

        if not tracks:
            return {"error": "Library is empty.", "algorithms": []}

        ALGORITHMS = [
            {"id": "kmeans",   "name": "AI Clusters",   "description": "Balanced, evenly-sized playlists using K-Means"},
            {"id": "hdbscan",  "name": "Natural Vibe",  "description": "Organic, density-based community discovery"},
            {"id": "spectral", "name": "Spectral",      "description": "Deep-math graph partitioning for hidden niches"},
            {"id": "harmonic", "name": "DJ Flow",        "description": "Camelot-Wheel harmonic key sequencing"},
        ]

        async def run_algo(algo, tracks):
            try:
                # Use to_thread for CPU-bound clustering tasks
                if algo["id"] == "hdbscan":
                    labels = await asyncio.to_thread(hdbscan_cluster, tracks, 10)
                elif algo["id"] == "spectral":
                    labels = await asyncio.to_thread(spectral_cluster, tracks, 8)
                else:
                    labels = await asyncio.to_thread(kmeans_cluster, tracks, 8)

                clusters_map = {}
                for i, label in enumerate(labels):
                    if label not in clusters_map: clusters_map[label] = []
                    clusters_map[label].append(tracks[i])

                valid_clusters = [c for lbl, c in clusters_map.items() if lbl != -1 and len(c) >= 10]
                if not valid_clusters:
                    return {**algo, "cluster_count": 0, "avg_cohesion": 0, "avg_purity": 0, "avg_energy": 0, "avg_danceability": 0, "avg_valence": 0, "top_genres": []}

                all_quality = await asyncio.gather(*[asyncio.to_thread(analyze_quality, c) for c in valid_clusters])
                n = len(all_quality)

                return {
                    **algo,
                    "cluster_count": n,
                    "avg_cohesion": round(sum(q["cohesion"] for q in all_quality) / n, 3),
                    "avg_purity": round(sum(q["genre_purity"] for q in all_quality) / n, 3),
                    "avg_energy": round(sum(q["avg_energy"] for q in all_quality) / n, 3),
                    "avg_danceability": round(sum(q["avg_danceability"] for q in all_quality) / n, 3),
                    "avg_valence": round(sum(q["avg_valence"] for q in all_quality) / n, 3),
                    "top_genres": list({g for q in all_quality for g in q["top_genres"]})[:5],
                }
            except Exception as e:
                print(f"Algorithm {algo['id']} error: {e}")
                return {**algo, "cluster_count": 0, "avg_cohesion": 0, "avg_purity": 0, "error": str(e)}

        results = await asyncio.gather(*[run_algo(algo, tracks) for algo in ALGORITHMS])
        return {"algorithms": results, "total_tracks": len(tracks)}

    except Exception as e:
        print(f"Algorithm Insights Error: {e}")
        return {"error": str(e), "algorithms": []}

@router.get("/activity")
async def get_activity_log():
    return {"activities": get_activities()}

@router.post("/exchange_token")
async def exchange_token(
    code: str = Body(...), 
    code_verifier: str = Body(...), 
    redirect_uri: str = Body(...)
):
    # CLIENT_ID loaded from .env
    
    token_url = 'https://accounts.spotify.com/api/token'
    payload = {
        'client_id': CLIENT_ID,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect_uri,
        'code_verifier': code_verifier,
    }
    
    try:
        response = requests.post(token_url, data=payload, timeout=10)
        if response.status_code != 200:
            # Safely handle non-JSON error responses from Spotify
            try:
                error_detail = response.json()
            except Exception:
                error_detail = {"error": "spotify_error", "message": response.text}
            raise HTTPException(status_code=response.status_code, detail=error_detail)
        
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Spotify Service Unavailable: {str(e)}")

@router.post("/refresh_token")
async def refresh_token(refresh_token: str = Body(..., embed=True)):
    # CLIENT_ID loaded from .env
    # In a real app, client_secret would be needed here if not using PKCE for refresh
    # But for Spotify PKCE, we only need client_id and refresh_token
    
    token_url = 'https://accounts.spotify.com/api/token'
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': CLIENT_ID,
    }
    
    response = requests.post(token_url, data=payload, timeout=10)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())
    
    return response.json()

@router.get("/me")
async def get_me(token: str):
    sp = spotipy.Spotify(auth=token)
    try:
        return sp.current_user()
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/sync_library")
async def trigger_sync(background_tasks: BackgroundTasks, token: str = Body(..., embed=True)):
    sync_manager = LibrarySyncManager(token)
    token_id = f"{token[:10]}{id(token)}" # Unique ID for this sync
    active_syncs[token_id] = sync_manager
    
    log_activity("sync", f"Library Sync started (Scanning 2,578 tracks)...")
    
    # Use FastAPI native background tasks for better stability
    background_tasks.add_task(sync_manager.sync_library)
    
    return {"status": "started", "token_id": token_id}

@router.get("/sync_status/{token_id}")
async def get_sync_status(token_id: str):
    if token_id in active_syncs:
        return active_syncs[token_id].progress
    return {"status": "not_found"}

@router.post("/generate_playlists")
async def generate_playlists(req: GenerateRequest):
    try:
        tracks = req.tracks
        
        # Optimization: If no tracks provided, auto-load from the synced library file
        if not tracks:
            data_path = "data/output/auto_synced_library.json"
            if os.path.exists(data_path):
                with open(data_path, "r", encoding="utf-8") as f:
                    library_data = json.load(f)
                    tracks = library_data.get("tracks", [])
                    print(f"DEBUG: Auto-loaded {len(tracks)} tracks from synced library.")
        
        if not tracks:
            return {"playlists": [], "error": "No tracks found. Please sync your library first."}

        # Choose clustering algorithm and get labels
        if req.algorithm == "hdbscan":
            labels = hdbscan_cluster(tracks, min_cluster_size=req.min_size)
        elif req.algorithm == "spectral":
            labels = spectral_cluster(tracks, n_clusters=req.num_playlists)
        else: # default kmeans
            labels = kmeans_cluster(tracks, n_clusters=req.num_playlists)
            
        # Group tracks by labels
        clusters_map = {}
        for i, label in enumerate(labels):
            if label not in clusters_map: clusters_map[label] = []
            clusters_map[label].append(tracks[i])
            
        playlists = []
        for i, (label, cluster_tracks) in enumerate(clusters_map.items()):
            if label == -1: continue # Noise in HDBSCAN
            if len(cluster_tracks) < req.min_size: continue
            
            # Perform Quality Analysis
            quality = analyze_quality(cluster_tracks)
            
            # Apply Harmonic Flow if requested
            if req.algorithm == "harmonic":
                # Special mode: we just take the input tracks and sort them?
                # No, usually people want the clusters to be harmonically sorted.
                cluster_tracks = sort_harmonically(cluster_tracks)
                
            # Generate Semantic Name
            name = generate_semantic_name(quality)
            
            # Apply Max Tracks limit
            if len(cluster_tracks) > req.max_tracks:
                cluster_tracks = cluster_tracks[:req.max_tracks]

            playlists.append({
                "id": f"cluster_{i}_{id(cluster_tracks)}",
                "name": name,
                "tracks": cluster_tracks,
                "analysis": quality
            })
            
        log_activity("generator", f"Generated {len(playlists)} mixes using {req.algorithm.upper()} algorithm.")
        return {"playlists": playlists}
    except Exception as e:
        print(f"Generation Error: {e}")
        return {"playlists": [], "error": str(e)}

@router.post("/create_spotify_playlist")
def create_spotify_playlist(
    token: str = Body(...),
    playlist_name: str = Body(...), 
    track_ids: list = Body(...)
):
    sp = spotipy.Spotify(auth=token)
    try:
        print(f"🛠️ EXPORT: Attempting to create playlist '{playlist_name}' with {len(track_ids)} tracks.")
        user = sp.current_user()
        user_id = user['id']
        
        # 1. Create the playlist
        playlist = sp.user_playlist_create(user_id, playlist_name)
        playlist_id = playlist['id']
        
        # 2. Filter and format track IDs (ensure they are just the IDs)
        clean_track_ids = []
        for tid in track_ids:
            if not tid: continue
            # Spotify IDs are usually 22 chars. If it's a full URI, extract ID.
            clean_id = tid.split(':')[-1] if ':' in tid else tid
            clean_track_ids.append(clean_id)

        if not clean_track_ids:
            print("⚠️ EXPORT WARNING: No valid track IDs provided.")
            return {"status": "error", "message": "No valid tracks to add."}

        # 3. Add tracks in chunks of 100
        for i in range(0, len(clean_track_ids), 100):
            chunk = clean_track_ids[i:i+100]
            sp.playlist_add_items(playlist_id, chunk)
            print(f"✅ EXPORT: Added chunk {i//100 + 1} ({len(chunk)} tracks)")

        log_activity("export", f"Playlist '{playlist_name}' created on Spotify with {len(clean_track_ids)} tracks.")
        return {"status": "success", "playlist_id": playlist_id, "count": len(clean_track_ids)}
    except Exception as e:
        print(f"❌ EXPORT ERROR: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.post("/cluster/kmeans")
def cluster_kmeans(tracks: list = Body(...), n_clusters: int = 5):
    labels = kmeans_cluster(tracks, n_clusters)
    return {"labels": labels}

@router.post("/cluster/hdbscan")
def cluster_hdbscan(tracks: list = Body(...), min_cluster_size: int = 5):
    labels = hdbscan_cluster(tracks, min_cluster_size)
    return {"labels": labels}

@router.post("/cluster/spectral")
def cluster_spectral(tracks: list = Body(...), n_clusters: int = 5):
    labels = spectral_cluster(tracks, n_clusters)
    return {"labels": labels}

@router.post("/cluster/deep_embeddings")
def cluster_deep_embeddings(tracks: list = Body(...), n_clusters: int = 5):
    labels = deep_embedding_cluster(tracks, n_clusters)
    return {"labels": labels}

@router.post("/analyze_quality")
def analyze_quality_endpoint(playlists: list = Body(...)):
    result = analyze_quality(playlists)
    return result

@router.post("/feedback")
def feedback(user_id: str = Body(...), playlist_id: str = Body(...), rating: int = Body(...)):
    update_recommendation(user_id, playlist_id, rating)
    return {"status": "Feedback received"}
