import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class LibraryHealthAudit:
    def __init__(self, tracks: List[Dict[str, Any]]):
        self.tracks = tracks
        self.df = self._to_dataframe()

    def _to_dataframe(self):
        data = []
        for t in self.tracks:
            # Flatten track data for easier analysis
            features = t.get('audio_features', {}) or {}
            orig = t.get('original_data', {}) or t
            ext = t.get('external_data', {}) or {}
            
            row = {
                'track_name': orig.get('track_name') or orig.get('Track Name'),
                'artist': orig.get('artist') or orig.get('Artist'),
                'id': t.get('id'),
                'danceability': features.get('danceability'),
                'energy': features.get('energy'),
                'valence': features.get('valence'),
                'tempo': features.get('tempo'),
                'genre_count': len(ext.get('classified_genres', []) or ext.get('all_tags', []) or [])
            }
            data.append(row)
        return pd.DataFrame(data)

    def find_missing_data(self) -> Dict[str, Any]:
        """Identify tracks missing critical metadata"""
        missing_features = self.df[self.df['energy'].isna()]
        missing_genres = self.df[self.df['genre_count'] == 0]
        
        return {
            "total_tracks": len(self.df),
            "missing_audio_features": len(missing_features),
            "missing_genres": len(missing_genres),
            "problematic_tracks": list(set(missing_features.index) | set(missing_genres.index))
        }

    def detect_outliers(self, contamination: float = 0.05) -> List[Dict[str, Any]]:
        """
        Use Isolation Forest to find tracks that are 'mathematically' different 
        from the rest of the library.
        """
        feature_cols = ['danceability', 'energy', 'valence', 'tempo']
        # Filter tracks that have all features
        valid_df = self.df.dropna(subset=feature_cols)
        
        if valid_df.empty:
            return []

        X = valid_df[feature_cols]
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        iso = IsolationForest(contamination=contamination, random_state=42)
        outlier_labels = iso.fit_predict(X_scaled)
        
        outliers = valid_df[outlier_labels == -1]
        return outliers[['track_name', 'artist']].to_dict('records')

    def find_duplicates(self) -> List[Dict[str, Any]]:
        """Find potential duplicate tracks based on name and artist"""
        # Simple exact match first
        dupes = self.df[self.df.duplicated(subset=['track_name', 'artist'], keep=False)]
        return dupes[['track_name', 'artist']].to_dict('records')

    def run_full_audit(self) -> Dict[str, Any]:
        return {
            "health_summary": self.find_missing_data(),
            "outliers": self.detect_outliers(),
            "potential_duplicates": self.find_duplicates()
        }
