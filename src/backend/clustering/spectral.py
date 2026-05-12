"""
Spectral clustering for audio features.
"""
from sklearn.cluster import SpectralClustering
import numpy as np
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any
from src.backend.clustering.features import extract_track_features

def spectral_cluster(tracks: List[Dict[str, Any]], n_clusters: int = 5) -> List[int]:
    data = [extract_track_features(track) for track in tracks]
        
    if not data: return []
    X_scaled = StandardScaler().fit_transform(np.array(data))
    
    spectral = SpectralClustering(n_clusters=n_clusters, random_state=42, assign_labels='discretize')
    labels = spectral.fit_predict(X_scaled)
    return labels.tolist()
