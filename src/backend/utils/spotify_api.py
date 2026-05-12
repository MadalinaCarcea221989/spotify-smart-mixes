import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import logging
import os
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class SpotifyAPI:
    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        """
        Initialize Spotify API with credentials.
        If not provided, looks for SPOTIPY_CLIENT_ID and SPOTIPY_CLIENT_SECRET environment variables.
        """
        self.client_id = client_id or os.getenv("SPOTIPY_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("SPOTIPY_CLIENT_SECRET")
        
        if not self.client_id or not self.client_secret:
            logger.warning("Spotify credentials not fully provided. Some features may be limited.")
            self.sp = None
        else:
            self.sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
                client_id=self.client_id,
                client_secret=self.client_secret
            ))

    def get_track_audio_features(self, track_id: str) -> Optional[Dict[str, Any]]:
        """Fetch audio features for a specific track ID"""
        if not self.sp:
            return None
        try:
            return self.sp.audio_features(track_id)[0]
        except Exception as e:
            logger.error(f"Error fetching audio features for {track_id}: {e}")
            return None

    def get_tracks_audio_features(self, track_ids: List[str]) -> List[Optional[Dict[str, Any]]]:
        """Fetch audio features for multiple track IDs (max 100 per request)"""
        if not self.sp:
            return []
        
        all_features = []
        for i in range(0, len(track_ids), 100):
            chunk = track_ids[i:i+100]
            try:
                features = self.sp.audio_features(chunk)
                all_features.extend(features)
            except Exception as e:
                logger.error(f"Error fetching audio features for chunk: {e}")
                all_features.extend([None] * len(chunk))
        
        return all_features

    def search_track(self, artist: str, track_name: str) -> Optional[str]:
        """Search for a track and return its Spotify ID"""
        if not self.sp:
            return None
        try:
            query = f"artist:{artist} track:{track_name}"
            results = self.sp.search(q=query, type='track', limit=1)
            if results['tracks']['items']:
                return results['tracks']['items'][0]['id']
        except Exception as e:
            logger.error(f"Error searching for {artist} - {track_name}: {e}")
        return None

    def create_playlist(self, user_id: str, name: str, description: str = "") -> Optional[str]:
        """Create a new playlist for the user and return its ID"""
        if not self.sp:
            return None
        try:
            playlist = self.sp.user_playlist_create(user=user_id, name=name, public=False, description=description)
            return playlist['id']
        except Exception as e:
            logger.error(f"Error creating playlist {name}: {e}")
            return None

    def add_tracks_to_playlist(self, playlist_id: str, track_ids: List[str]):
        """Add tracks to an existing playlist"""
        if not self.sp:
            return
        try:
            # Spotify allows max 100 tracks per request
            for i in range(0, len(track_ids), 100):
                self.sp.playlist_add_items(playlist_id, track_ids[i:i+100])
        except Exception as e:
            logger.error(f"Error adding tracks to playlist {playlist_id}: {e}")
