import spotipy
from spotipy.oauth2 import SpotifyOAuth
import json
import os
import time
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def fetch_liked_songs():
    """
    Fetches ALL liked songs from the user's library using OAuth2.
    Includes audio features for each track.
    """
    scope = "user-library-read"
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(scope=scope))

    logger.info("Starting library fetch (this may take a few minutes for 2,500+ songs)...")
    
    all_tracks = []
    results = sp.current_user_saved_tracks(limit=50)
    
    while results:
        for item in results['items']:
            track = item['track']
            all_tracks.append({
                'id': track['id'],
                'name': track['name'],
                'artist': track['artists'][0]['name'],
                'album': track['album']['name'],
                'popularity': track['popularity']
            })
        
        if results['next']:
            logger.info(f"Fetched {len(all_tracks)} tracks...")
            # Simple rate limit prevention
            time.sleep(0.1)
            results = sp.next(results)
        else:
            results = None

    logger.info(f"Successfully fetched {len(all_tracks)} track IDs. Now fetching audio features...")

    # Fetch audio features in batches of 100
    enriched_tracks = []
    for i in range(0, len(all_tracks), 100):
        batch = all_tracks[i:i+100]
        ids = [t['id'] for t in batch]
        
        # Retry logic for 429 errors
        retries = 3
        while retries > 0:
            try:
                features = sp.audio_features(ids)
                for j, f in enumerate(features):
                    enriched_tracks.append({
                        'id': batch[j]['id'],
                        'original_data': {
                            'track_name': batch[j]['name'],
                            'artist': batch[j]['artist'],
                            'album': batch[j]['album'],
                            'popularity': batch[j]['popularity']
                        },
                        'audio_features': f
                    })
                break
            except Exception as e:
                if "429" in str(e):
                    logger.warning("Rate limit hit! Waiting 5 seconds...")
                    time.sleep(5)
                    retries -= 1
                else:
                    logger.error(f"Error fetching features: {e}")
                    break
        
        logger.info(f"Processed {len(enriched_tracks)}/{len(all_tracks)} audio features...")

    output_path = "data/output/current_library_enriched.json"
    result = {
        "metadata": {
            "total_tracks": len(enriched_tracks),
            "fetched_at": pd.Timestamp.now().isoformat() if 'pd' in globals() else time.strftime("%Y-%m-%dT%H:%M:%S")
        },
        "tracks": enriched_tracks
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info(f"Done! All {len(enriched_tracks)} tracks saved to {output_path}")

if __name__ == "__main__":
    if not os.path.exists("data/output"):
        os.makedirs("data/output")
    fetch_liked_songs()
