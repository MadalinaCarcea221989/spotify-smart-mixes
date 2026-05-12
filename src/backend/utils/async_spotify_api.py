import httpx
import asyncio
import logging
import os
from typing import List, Dict, Any, Optional
import base64

logger = logging.getLogger(__name__)

class AsyncSpotifyAPI:
    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id or os.getenv("SPOTIPY_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("SPOTIPY_CLIENT_SECRET")
        self.access_token = None

    async def _get_access_token(self):
        if self.access_token:
            return self.access_token
            
        auth_str = f"{self.client_id}:{self.client_secret}"
        encoded_auth = base64.b64encode(auth_str.encode()).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://accounts.spotify.com/api/token",
                headers={"Authorization": f"Basic {encoded_auth}"},
                data={"grant_type": "client_credentials"}
            )
            data = response.json()
            self.access_token = data.get("access_token")
            return self.access_token

    async def get_audio_features_batch(self, track_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch audio features for multiple tracks concurrently"""
        token = await self._get_access_token()
        if not token:
            return []

        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token}"}
            
            # Spotify allows 100 IDs per request
            tasks = []
            for i in range(0, len(track_ids), 100):
                chunk = track_ids[i:i+100]
                ids_str = ",".join(chunk)
                tasks.append(client.get(
                    f"https://api.spotify.com/v1/audio-features?ids={ids_str}",
                    headers=headers
                ))
            
            responses = await asyncio.gather(*tasks)
            all_features = []
            for r in responses:
                if r.status_code == 200:
                    all_features.extend(r.json().get('audio_features', []))
                else:
                    logger.error(f"Error fetching batch: {r.status_code}")
            
            return all_features

    async def search_tracks_async(self, queries: List[Dict[str, str]]) -> List[Optional[str]]:
        """Search for multiple tracks concurrently"""
        token = await self._get_access_token()
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token}"}
            
            tasks = []
            for q in queries:
                query = f"artist:{q['artist']} track:{q['track']}"
                tasks.append(client.get(
                    "https://api.spotify.com/v1/search",
                    params={"q": query, "type": "track", "limit": 1},
                    headers=headers
                ))
                
            responses = await asyncio.gather(*tasks)
            results = []
            for r in responses:
                if r.status_code == 200:
                    items = r.json().get('tracks', {}).get('items', [])
                    results.append(items[0]['id'] if items else None)
                else:
                    results.append(None)
            return results
