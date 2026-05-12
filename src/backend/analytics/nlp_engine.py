import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.metrics.pairwise import cosine_similarity

class NLPPlaylistEngine:
    def __init__(self, tracks: List[Dict[str, Any]]):
        self.tracks = tracks
        self.feature_keys = ['danceability', 'energy', 'valence', 'tempo']
        self._prepare_vectors()

    def _prepare_vectors(self):
        vectors = []
        for t in self.tracks:
            f = t.get('audio_features', {}) or {}
            # Normalize tempo to 0-1 scale for cosine similarity
            tempo = f.get('tempo', 120) / 200.0
            row = [f.get('danceability', 0.5), f.get('energy', 0.5), f.get('valence', 0.5), tempo]
            vectors.append(row)
        self.vectors = np.array(vectors)

    def _parse_query(self, query: str) -> Dict[str, float]:
        """
        Simple keyword-based query parsing.
        In a real app, use an LLM to extract these target features.
        """
        targets = {"danceability": 0.5, "energy": 0.5, "valence": 0.5, "tempo": 0.5}
        
        q = query.lower()
        if "happy" in q or "cheerful" in q: targets["valence"] = 0.9
        if "sad" in q or "melancholy" in q: targets["valence"] = 0.1
        if "energetic" in q or "workout" in q: targets["energy"] = 0.9
        if "chill" in q or "relax" in q: targets["energy"] = 0.2
        if "dance" in q: targets["danceability"] = 0.9
        if "slow" in q: targets["tempo"] = 0.2
        if "fast" in q: targets["tempo"] = 0.8
        
        return targets

    def generate_from_query(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Find tracks that best match the natural language query"""
        targets = self._parse_query(query)
        target_vec = np.array([[targets[k] for k in self.feature_keys]])
        
        # Calculate similarity
        similarities = cosine_similarity(self.vectors, target_vec).flatten()
        
        # Get top matches
        top_indices = np.argsort(similarities)[-limit:][::-1]
        
        return [self.tracks[i] for i in top_indices]

    def generate_transition_playlist(self, start_mood: str, end_mood: str, length: int = 15) -> List[Dict[str, Any]]:
        """
        Create a 'Flow' playlist that transitions from one mood to another.
        """
        start_targets = self._parse_query(start_mood)
        end_targets = self._parse_query(end_mood)
        
        playlist = []
        used_indices = set()
        
        for i in range(length):
            # Calculate interpolated target for this step
            alpha = i / (length - 1)
            step_target = {
                k: (1 - alpha) * start_targets[k] + alpha * end_targets[k]
                for k in self.feature_keys
            }
            step_vec = np.array([[step_target[k] for k in self.feature_keys]])
            
            # Find best match not already used
            similarities = cosine_similarity(self.vectors, step_vec).flatten()
            sorted_indices = np.argsort(similarities)[::-1]
            
            for idx in sorted_indices:
                if idx not in used_indices:
                    playlist.append(self.tracks[idx])
                    used_indices.add(idx)
                    break
                    
        return playlist
