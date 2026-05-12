"""
Unit tests for clustering algorithms.
"""
from clustering.kmeans import kmeans_cluster
from clustering.hdbscan import hdbscan_cluster
from clustering.spectral import spectral_cluster
from clustering.deep_embeddings import deep_embedding_cluster

def test_kmeans_cluster():
    tracks = [{"features": [0.1, 0.2]}, {"features": [0.2, 0.3]}, {"features": [0.9, 0.8]}]
    labels = kmeans_cluster(tracks, n_clusters=2)
    assert len(labels) == len(tracks)

def test_hdbscan_cluster():
    tracks = [{"features": [0.1, 0.2]}, {"features": [0.2, 0.3]}, {"features": [0.9, 0.8]}]
    labels = hdbscan_cluster(tracks, min_cluster_size=2)
    assert len(labels) == len(tracks)

def test_spectral_cluster():
    tracks = [{"features": [0.1, 0.2]}, {"features": [0.2, 0.3]}, {"features": [0.9, 0.8]}]
    labels = spectral_cluster(tracks, n_clusters=2)
    assert len(labels) == len(tracks)

def test_deep_embedding_cluster():
    tracks = [{"features": [0.1, 0.2]}, {"features": [0.2, 0.3]}, {"features": [0.9, 0.8]}]
    labels = deep_embedding_cluster(tracks, n_clusters=2)
    assert len(labels) == len(tracks)
