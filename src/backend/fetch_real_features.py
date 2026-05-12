import asyncio
import pandas as pd
import json
import os
from dotenv import load_dotenv
from utils.async_spotify_api import AsyncSpotifyAPI
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

async def fetch_all_data(csv_path, output_path):
    # 1. Load CSV
    df = pd.read_csv(csv_path)
    logger.info(f"Loaded {len(df)} tracks from {csv_path}")

    api = AsyncSpotifyAPI()
    
    # 2. Search for Spotify IDs (if not in CSV)
    # Most exported CSVs don't have the Spotify ID, just name/artist
    logger.info("Searching for Spotify Track IDs...")
    search_queries = []
    for _, row in df.iterrows():
        search_queries.append({
            'artist': row.get('Artist'),
            'track': row.get('Track Name')
        })
    
    # Process in batches of 50 for search
    track_ids = []
    for i in range(0, len(search_queries), 50):
        batch = search_queries[i:i+50]
        ids = await api.search_tracks_async(batch)
        track_ids.extend(ids)
        logger.info(f"Searched {len(track_ids)}/{len(df)} tracks...")

    # 3. Fetch Audio Features for IDs found
    valid_ids = [tid for tid in track_ids if tid]
    logger.info(f"Found {len(valid_ids)} valid IDs. Fetching audio features...")
    
    all_features = await api.get_audio_features_batch(valid_ids)
    
    # 4. Map back to original data
    feature_map = {f['id']: f for f in all_features if f}
    
    enriched_tracks = []
    for idx, row in df.iterrows():
        tid = track_ids[idx]
        features = feature_map.get(tid) if tid else None
        
        enriched_tracks.append({
            'id': tid,
            'original_data': {
                'track_name': row.get('Track Name'),
                'artist': row.get('Artist'),
                'album': row.get('Album'),
                'popularity': row.get('Popularity')
            },
            'audio_features': features
        })

    # 5. Save results
    result = {
        "metadata": {
            "total_tracks": len(df),
            "enriched_at": pd.Timestamp.now().isoformat(),
            "success_count": len(valid_ids)
        },
        "tracks": enriched_tracks
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Enrichment complete! Saved to {output_path}")

if __name__ == "__main__":
    csv_file = "data/samples/spotify-tracks-2025-09-26 (1).csv"
    output_file = "data/output/real_enriched_data.json"
    
    if not os.path.exists("data/output"):
        os.makedirs("data/output")
        
    asyncio.run(fetch_all_data(csv_file, output_file))
