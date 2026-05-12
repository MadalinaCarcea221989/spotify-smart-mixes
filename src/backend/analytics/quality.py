"""
Playlist quality analysis: cohesion, genre purity, artist spread, auto-tuning.
"""
from typing import List, Dict, Any

def analyze_quality(tracks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyse a cluster of tracks and return rich quality metrics.
    Works with or without real Spotify audio features—falls back to
    genre-based semantic estimation when features are missing.
    """
    if not tracks:
        return {
            "cohesion": 0.0,
            "genre_purity": 0.0,
            "artist_spread": 0.0,
            "avg_energy": 0.5,
            "avg_danceability": 0.5,
            "avg_valence": 0.5,
            "avg_acousticness": 0.5,
            "avg_tempo": 120.0,
            "top_genres": [],
            "track_count": 0,
        }

    # ---------- Audio Feature Averages ----------
    GENRE_ENERGY   = ["rock", "metal", "punk", "edm", "techno", "hardcore", "dance"]
    GENRE_DANCE    = ["pop", "disco", "house", "hip hop", "funk", "r&b", "dance"]
    GENRE_ACOUSTIC = ["folk", "acoustic", "classical", "jazz", "blues", "singer-songwriter"]
    GENRE_VALENCE  = ["pop", "disco", "happy", "feel good", "funk", "reggae"]

    totals = {"energy": 0.0, "danceability": 0.0, "valence": 0.0,
              "acousticness": 0.0, "tempo": 0.0}
    valid = 0

    for t in tracks:
        feats = t.get("audio_features") or {}
        genres = [g.lower() for g in t.get("genres", [])]

        if feats.get("energy") is not None:
            totals["energy"]       += feats.get("energy", 0.5)
            totals["danceability"] += feats.get("danceability", 0.5)
            totals["valence"]      += feats.get("valence", 0.5)
            totals["acousticness"] += feats.get("acousticness", 0.5)
            totals["tempo"]        += feats.get("tempo", 120.0)
            valid += 1
        elif genres:
            # Semantic fallback from genre tags
            def genre_score(kws):
                return min(0.4 + 0.15 * sum(1 for k in kws if k in genres), 1.0)

            totals["energy"]       += genre_score(GENRE_ENERGY)
            totals["danceability"] += genre_score(GENRE_DANCE)
            totals["valence"]      += genre_score(GENRE_VALENCE)
            totals["acousticness"] += genre_score(GENRE_ACOUSTIC)
            totals["tempo"]        += 120.0
            valid += 1

    n = max(valid, 1)
    avg_energy       = round(totals["energy"]       / n, 3)
    avg_danceability = round(totals["danceability"] / n, 3)
    avg_valence      = round(totals["valence"]      / n, 3)
    avg_acousticness = round(totals["acousticness"] / n, 3)
    avg_tempo        = round(totals["tempo"]        / n, 1)

    # ---------- Genre Purity ----------
    from collections import Counter
    all_genres = []
    for t in tracks:
        all_genres.extend([g.lower() for g in t.get("genres", [])])

    genre_counts = Counter(all_genres)
    top_genres   = [g for g, _ in genre_counts.most_common(5)]

    if genre_counts:
        top_count    = genre_counts.most_common(1)[0][1]
        genre_purity = round(top_count / len(tracks), 3)
    else:
        genre_purity = 0.0

    # ---------- Artist Spread ----------
    artists = set()
    for t in tracks:
        a = t.get("artist") or t.get("original_data", {}).get("artist")
        if a:
            artists.add(a)
    artist_spread = round(len(artists) / max(len(tracks), 1), 3)

    # ---------- Cohesion (simple energy variance proxy) ----------
    if valid > 1:
        energies = []
        for t in tracks:
            feats = t.get("audio_features") or {}
            energies.append(feats.get("energy", avg_energy))
        mean_e   = sum(energies) / len(energies)
        variance = sum((e - mean_e) ** 2 for e in energies) / len(energies)
        cohesion = round(max(0.0, 1.0 - variance * 4), 3)
    else:
        cohesion = 1.0

    return {
        "cohesion":         cohesion,
        "genre_purity":     genre_purity,
        "artist_spread":    artist_spread,
        "avg_energy":       avg_energy,
        "avg_danceability": avg_danceability,
        "avg_valence":      avg_valence,
        "avg_acousticness": avg_acousticness,
        "avg_tempo":        avg_tempo,
        "top_genres":       top_genres,
        "track_count":      len(tracks),
    }
