import spotipy
from spotipy.oauth2 import SpotifyOAuth
import requests
import json
import os
import time
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

LASTFM_API_KEY = "20d9fa0335075f7dc746c9463ae09e13" # Using your existing key

def fetch_lastfm_tags(artist, track):
    """Fetch genre tags from Last.fm"""
    url = "http://ws.audioscrobbler.com/2.0/"
    params = {
        "method": "track.getInfo",
        "api_key": LASTFM_API_KEY,
        "artist": artist,
        "track": track,
        "format": "json"
    }
    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "track" in data and "toptags" in data["track"]:
                return [tag["name"] for tag in data["track"]["toptags"]["tag"][:5]]
    except:
        pass
    return []

def fetch_library_with_genres():
    """
    Fetches Liked Songs from Spotify + Genres from Last.fm
    """
    scope = "user-library-read"
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(scope=scope))

    logger.info("Fetching your 2,500+ Liked Songs from Spotify...")
    
    all_tracks = []
    results = sp.current_user_saved_tracks(limit=50)
    
    while results:
        for item in results['items']:
            track = item['track']
            all_tracks.append({
                'id': track['id'],
                'name': track['name'],
                'artist': track['artists'][0]['name'],
            })
        if results['next']:
            results = sp.next(results)
            logger.info(f"Loaded {len(all_tracks)} tracks...")
        else:
            break

    logger.info("Now fetching Genres from Last.fm (this bypasses Spotify's block)...")
    
    enriched_data = []
    for i, track in enumerate(all_tracks):
        tags = fetch_lastfm_tags(track['artist'], track['name'])
        
        enriched_data.append({
            "id": track['id'],
            "original_data": {
                "track_name": track['name'],
                "artist": track['artist']
            },
            "genres": tags
        })
        
        if (i + 1) % 50 == 0:
            logger.info(f"Processed {i + 1}/{len(all_tracks)} tracks...")
        
        # Respect Last.fm rate limits
        time.sleep(0.1)

    output_path = "data/output/library_genres_only.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"tracks": enriched_data}, f, indent=2, ensure_ascii=False)

    logger.info(f"Success! Library with genres saved to {output_path}")

if __name__ == "__main__":
    if not os.path.exists("data/output"):
        os.makedirs("data/output")
    fetch_library_with_genres()
