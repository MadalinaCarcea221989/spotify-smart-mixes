"""
k-means clustering for audio features.
"""
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from typing import List, Dict, Any
from src.backend.clustering.features import extract_track_features

def kmeans_cluster(tracks: List[Dict[str, Any]], n_clusters: int = 5) -> List[int]:
    """
    Cluster tracks based on audio features.
    Expected feature list in each track['analysis']['audio_features']
    """
    data = [extract_track_features(track) for track in tracks]
    
    if not data:
        return []

    # Convert to numpy and handle scaling
    X = np.array(data)
    
    # Scale features (especially tempo which is ~60-200 while others are 0-1)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)
    
    return labels.tolist()
