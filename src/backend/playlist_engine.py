"""
Core playlist creation engine: combines audio features, genre, artist similarity, user history, and scoring.
"""
from typing import List, Dict, Any
from src.backend.clustering.kmeans import kmeans_cluster

class PlaylistEngine:
    def __init__(self, tracks: List[Dict[str, Any]]):
        self.tracks = tracks

    def generate_playlists(self, num_playlists: int = 5, min_size: int = 10, max_size: int = 100) -> List[Dict[str, Any]]:
        """
        Generate multiple playlists using K-Means clustering.
        Returns a list of dictionaries, each representing a playlist.
        """
        if not self.tracks:
            return []
            
        # 1. Cluster the tracks
        labels = kmeans_cluster(self.tracks, n_clusters=num_playlists)
        
        # 2. Group tracks by labels
        clusters = {}
        for i, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(self.tracks[i])
            
        # 3. Format into playlists
        playlists = []
        for label, tracks in clusters.items():
            if len(tracks) < min_size:
                continue
                
            # Limit to max_size
            playlist_tracks = tracks[:max_size]
            
            # Simple naming logic based on features or predominant genre
            avg_energy = sum(t.get('audio_features', {}).get('energy', 0.5) for t in playlist_tracks) / len(playlist_tracks)
            avg_valence = sum(t.get('audio_features', {}).get('valence', 0.5) for t in playlist_tracks) / len(playlist_tracks)
            
            mood = "Chill" if avg_energy < 0.4 else "Balanced" if avg_energy < 0.7 else "Energetic"
            vibe = "Melancholic" if avg_valence < 0.4 else "Neutral" if avg_valence < 0.7 else "Happy"
            
            playlists.append({
                "id": f"cluster_{label}",
                "name": f"{mood} {vibe} Mix",
                "tracks": playlist_tracks,
                "analysis": {
                    "avg_energy": avg_energy,
                    "avg_valence": avg_valence,
                    "count": len(playlist_tracks)
                }
            })
            
        return playlists
