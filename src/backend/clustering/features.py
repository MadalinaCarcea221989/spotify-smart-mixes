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
    
    # Semantic mapping with Romanian genre support
    GENRE_ENERGY   = ["rock", "metal", "punk", "edm", "techno", "hardcore", "dance", "trap", "manele"]
    GENRE_DANCE    = ["pop", "disco", "house", "hip hop", "funk", "r&b", "dance", "manele", "reggaeton"]
    GENRE_ACOUSTIC = ["folk", "acoustic", "classical", "jazz", "blues", "country", "lautareasca"]
    GENRE_VALENCE  = ["pop", "disco", "happy", "feel good", "reggae", "manele"]
    
    def score(kws, base=0.4, boost=0.15):
        # We also check for partial matches to catch things like "romanian trap" or "manele vechi"
        matches = sum(1 for k in kws if any(k in g.lower() for g in genres))
        return min(base + boost * matches, 1.0)
        
    estimated_energy = score(GENRE_ENERGY, base=0.3, boost=0.2)
    estimated_dance = score(GENRE_DANCE, base=0.4, boost=0.2)
    estimated_valence = score(GENRE_VALENCE, base=0.4, boost=0.15)
    estimated_acoustic = score(GENRE_ACOUSTIC, base=0.2, boost=0.3)
    
    # Manele specific boost: Higher energy and danceability than standard pop
    is_manele = any("manele" in g.lower() for g in genres)
    if is_manele:
        estimated_energy = min(estimated_energy + 0.2, 1.0)
        estimated_dance = min(estimated_dance + 0.15, 1.0)
        estimated_acoustic = max(estimated_acoustic - 0.2, 0.1)

    # Folk/Lautareasca specific boost: Much higher acousticness
    is_folk = any(g in ["folk", "lautareasca", "populara"] for g in [x.lower() for x in genres])
    if is_folk:
        estimated_acoustic = min(estimated_acoustic + 0.4, 1.0)
        estimated_energy = max(estimated_energy - 0.3, 0.1)
    
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

