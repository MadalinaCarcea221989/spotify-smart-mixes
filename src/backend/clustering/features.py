from typing import Dict, Any, List

def extract_track_features(track: Dict[str, Any]) -> List[float]:
    """
    Extracts numerical features from a track.
    If Spotify audio features are missing (which happens often due to API deprecations or limits),
    it uses a semantic fallback based on the track's genres to estimate the audio profile,
    ensuring that clustering algorithms still receive meaningful variance to group tracks.
    """
    feature_keys = [
        'danceability', 'energy', 'valence', 'tempo', 
        'acousticness', 'instrumentalness', 'liveness', 'speechiness'
    ]
    
    feats = track.get('audio_features', {}) or \
            track.get('analysis', {}).get('audio_features', {}) or \
            track.get('features', {})
            
    # Check if we actually have audio features
    if feats and 'energy' in feats:
        # We have real features
        return [feats.get(k, 0.5) for k in feature_keys]
        
    # We don't have real features, fallback to genre-based estimation
    genres = [g.lower() for g in track.get('genres', [])]
    
    # Semantic mapping
    GENRE_ENERGY   = ["rock", "metal", "punk", "edm", "techno", "hardcore", "dance"]
    GENRE_DANCE    = ["pop", "disco", "house", "hip hop", "funk", "r&b", "dance"]
    GENRE_ACOUSTIC = ["folk", "acoustic", "classical", "jazz", "blues", "singer-songwriter", "country"]
    GENRE_VALENCE  = ["pop", "disco", "happy", "feel good", "funk", "reggae"]
    
    def score(kws, base=0.4, boost=0.15):
        matches = sum(1 for k in kws if any(k in g for g in genres))
        return min(base + boost * matches, 1.0)
        
    estimated_energy = score(GENRE_ENERGY, base=0.3, boost=0.2)
    estimated_dance = score(GENRE_DANCE, base=0.4, boost=0.2)
    estimated_valence = score(GENRE_VALENCE, base=0.4, boost=0.15)
    estimated_acoustic = score(GENRE_ACOUSTIC, base=0.2, boost=0.3)
    
    # Provide synthetic values for the vector so clustering works
    import hashlib
    track_id = track.get('id', 'unknown')
    hash_val = int(hashlib.md5(track_id.encode('utf-8')).hexdigest(), 16)
    
    def get_jitter(index: int) -> float:
        val = ((hash_val >> (index * 4)) & 0xFFFF) / 65535.0
        return (val - 0.5) * 0.1

    return [
        estimated_dance + get_jitter(0),
        estimated_energy + get_jitter(1),
        estimated_valence + get_jitter(2),
        (120.0 + (estimated_energy - 0.5) * 40) + get_jitter(3) * 10,
        estimated_acoustic + get_jitter(4),
        0.1 + get_jitter(5),
        0.2 + get_jitter(6),
        0.1 + get_jitter(7)
    ]

