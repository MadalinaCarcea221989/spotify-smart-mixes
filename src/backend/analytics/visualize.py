import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
from typing import List, Dict, Any
import os

class MusicVisualizer:
    def __init__(self, tracks: List[Dict[str, Any]], labels: List[int]):
        self.tracks = tracks
        self.labels = labels
        self.feature_keys = [
            'danceability', 'energy', 'valence', 'tempo', 
            'acousticness', 'instrumentalness', 'liveness', 'speechiness'
        ]

    def _prepare_data(self):
        data = []
        for track in self.tracks:
            features = track.get('audio_features', {}) or \
                       track.get('analysis', {}).get('audio_features', {}) or \
                       track.get('features', {})
            row = [features.get(k, 0.5) for k in self.feature_keys]
            data.append(row)
        
        X = np.array(data)
        scaler = StandardScaler()
        return scaler.fit_transform(X)

    def plot_clusters(self, method='pca', output_path='library_map.png'):
        """Visualize clusters in 2D space"""
        X_scaled = self._prepare_data()
        
        if method.lower() == 'tsne':
            reducer = TSNE(n_components=2, perplexity=min(30, len(X_scaled)-1), random_state=42)
        else:
            reducer = PCA(n_components=2)
            
        coords = reducer.fit_transform(X_scaled)
        
        df_plot = pd.DataFrame(coords, columns=['x', 'y'])
        df_plot['cluster'] = self.labels
        
        plt.figure(figsize=(12, 8))
        sns.scatterplot(
            data=df_plot, x='x', y='y', 
            hue='cluster', palette='viridis', 
            alpha=0.7, s=100
        )
        
        plt.title(f'Music Library Map ({method.upper()})')
        plt.xlabel('Component 1')
        plt.ylabel('Component 2')
        plt.legend(title='Cluster')
        plt.grid(True, linestyle='--', alpha=0.6)
        
        plt.savefig(output_path)
        plt.close()
        return output_path
