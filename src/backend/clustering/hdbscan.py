"""
HDBSCAN clustering for audio features.
"""
import hdbscan
import numpy as np
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any
from src.backend.clustering.features import extract_track_features

def hdbscan_cluster(tracks: List[Dict[str, Any]], min_cluster_size: int = 5) -> List[int]:
    data = [extract_track_features(track) for track in tracks]
    
    if not data: return []
    X_scaled = StandardScaler().fit_transform(np.array(data))
    
    clusterer = hdbscan.HDBSCAN(min_cluster_size=min_cluster_size)
    labels = clusterer.fit_predict(X_scaled)
    return labels.tolist()
