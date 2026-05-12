import asyncio
import spotipy
import json
import os
import httpx
from typing import Callable, Awaitable

class LibrarySyncManager:
    def __init__(self, access_token: str, lastfm_key: str = "20d9fa0335075f7dc746c9463ae09e13"):
        self.sp = spotipy.Spotify(auth=access_token)
        self.lastfm_key = lastfm_key
        self.is_running = False
        self.progress = {"total": 0, "current": 0, "status": "idle"}

    async def fetch_lastfm_tags_async(self, client: httpx.AsyncClient, artist: str, track: str):
        url = "http://ws.audioscrobbler.com/2.0/"
        params = {
            "method": "track.getInfo",
            "api_key": self.lastfm_key,
            "artist": artist,
            "track": track,
            "format": "json"
        }
        try:
            response = await client.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "track" in data and "toptags" in data["track"]:
                    return [tag["name"] for tag in data["track"]["toptags"]["tag"][:5]]
        except Exception:
            pass
        return []

    async def sync_library(self, progress_callback: Callable[[dict], Awaitable[None]] = None):
        try:
            self.is_running = True
            self.progress["status"] = "fetching_spotify"
            
            # 1. Fetch all liked songs from Spotify
            all_tracks = []
            results = self.sp.current_user_saved_tracks(limit=50)
            
            while results:
                for item in results['items']:
                    t = item['track']
                    all_tracks.append({
                        'id': t['id'], 
                        'name': t['name'], 
                        'artist': t['artists'][0]['name'],
                        'artist_id': t['artists'][0]['id'],
                        'album': t['album']['name']
                    })
                
                if results['next']:
                    results = self.sp.next(results)
                    self.progress["current"] = len(all_tracks)
                    # Early save so dashboard shows count
                    output_dir = "data/output"
                    os.makedirs(output_dir, exist_ok=True)
                    with open(f"{output_dir}/auto_synced_library.json", "w", encoding="utf-8") as f:
                        json.dump({"tracks": [{"id": t["id"]} for t in all_tracks]}, f)
                    if progress_callback: await progress_callback(self.progress)
                else:
                    break

            self.progress["total"] = len(all_tracks)
            self.progress["status"] = "enriching_metadata"
            
            # 2. Fetch Artist Genres from Spotify (more reliable than track tags)
            artist_map = {}
            unique_artist_ids = list(set([item['artist_id'] for item in all_tracks if 'artist_id' in item]))
            
            for i in range(0, len(unique_artist_ids), 50):
                chunk_ids = unique_artist_ids[i:i+50]
                try:
                    artists_data = self.sp.artists(chunk_ids)
                    for a in artists_data['artists']:
                        if a: artist_map[a['id']] = a.get('genres', [])
                except Exception as e:
                    print(f"Error fetching artist genres: {e}")
                
                self.progress["current"] = min(i + 50, len(unique_artist_ids))
                if progress_callback: await progress_callback(self.progress)

            self.progress["status"] = "enriching_audio"
            
            # 2. Fetch Spotify Audio Features in chunks of 100
            audio_features_map = {}
            track_ids = [t['id'] for t in all_tracks]
            
            for i in range(0, len(track_ids), 100):
                chunk_ids = track_ids[i:i+100]
                try:
                    features = self.sp.audio_features(chunk_ids)
                    if features:
                        for f in features:
                            if f: audio_features_map[f['id']] = f
                except Exception as e:
                    print(f"Error fetching audio features: {e}")
                
                self.progress["current"] = min(i + 100, len(track_ids))
                if progress_callback: await progress_callback(self.progress)

            self.progress["status"] = "categorizing"
            
            # 3. Enrich with Last.fm Genres concurrently
            enriched_data = []
            async with httpx.AsyncClient() as client:
                for i in range(0, len(all_tracks), 25):
                    chunk = all_tracks[i:i+25]
                    tasks = [self.fetch_lastfm_tags_async(client, t['artist'], t['name']) for t in chunk]
                    tags_list = await asyncio.gather(*tasks)
                    
                    for j, tags in enumerate(tags_list):
                        track_id = chunk[j]['id']
                        artist_id = chunk[j]['artist_id']
                        spotify_genres = artist_map.get(artist_id, [])
                        
                        # CLEANING LOGIC: Filter out noise tags
                        noise_tags = {'seen live', 'favorites', 'awesome', '2024', '2023', 'cool', 'love', 'best'}
                        clean_tags = [t.lower() for t in tags if t.lower() not in noise_tags]
                        clean_spotify = [g.lower() for g in spotify_genres]
                        
                        final_genres = list(set(clean_spotify + clean_tags))
                        
                        enriched_data.append({
                            "id": track_id,
                            "original_data": {
                                "track_name": chunk[j]['name'], 
                                "artist": chunk[j]['artist'],
                                "album": chunk[j]['album']
                            },
                            "genres": final_genres,
                            "audio_features": audio_features_map.get(track_id, {})
                        })
                    
                    self.progress["current"] = len(enriched_data)
                    if progress_callback: await progress_callback(self.progress)
                    
                    # Incremental save every 100 tracks
                    if len(enriched_data) % 100 == 0:
                        output_dir = "data/output"
                        os.makedirs(output_dir, exist_ok=True)
                        with open(f"{output_dir}/auto_synced_library.json", "w", encoding="utf-8") as f:
                            json.dump({"tracks": enriched_data}, f, indent=2, ensure_ascii=False)
                    
                    await asyncio.sleep(0.2)

            # 4. Save result
            output_dir = "data/output"
            os.makedirs(output_dir, exist_ok=True)
            with open(f"{output_dir}/auto_synced_library.json", "w", encoding="utf-8") as f:
                json.dump({"tracks": enriched_data}, f, indent=2, ensure_ascii=False)
            
            self.progress["status"] = "completed"
            self.is_running = False

        except Exception as e:
            print(f"CRITICAL SYNC ERROR: {e}")
            self.progress["status"] = "error"
            self.progress["error_message"] = str(e)
            self.is_running = False
