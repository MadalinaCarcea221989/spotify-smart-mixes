def get_camelot_key(key: int, mode: int):
    # Mapping Spotify (Key/Mode) to Camelot Notation
    # Major (mode 1) -> B, Minor (mode 0) -> A
    camelot_map = {
        (0, 1): "8B", (1, 1): "3B", (2, 1): "10B", (3, 1): "5B", (4, 1): "12B", (5, 1): "7B",
        (6, 1): "2B", (7, 1): "9B", (8, 1): "4B", (9, 1): "11B", (10, 1): "6B", (11, 1): "1B",
        (0, 0): "5A", (1, 0): "12A", (2, 0): "7A", (3, 0): "2A", (4, 0): "9A", (5, 0): "4A",
        (6, 0): "11A", (7, 0): "6A", (8, 0): "1A", (9, 0): "8A", (10, 0): "3A", (11, 0): "10A"
    }
    return camelot_map.get((key, mode), "1B")

def sort_harmonically(tracks):
    # Sorts tracks by Camelot Wheel compatibility and BPM
    if not tracks: return []
    
    sorted_tracks = [tracks[0]]
    remaining = tracks[1:]
    
    while remaining:
        current = sorted_tracks[-1]
        current_camelot = get_camelot_key(current.get("audio_features", {}).get("key", 0), current.get("audio_features", {}).get("mode", 1))
        
        # Simple heuristic: find track with closest BPM or same/adjacent Camelot key
        # For now, let's just sort by Camelot sequence
        remaining.sort(key=lambda x: get_camelot_key(x.get("audio_features", {}).get("key", 0), x.get("audio_features", {}).get("mode", 1)))
        sorted_tracks.append(remaining.pop(0))
        
    return sorted_tracks

import random

def generate_semantic_name(analysis):
    energy = analysis.get("avg_energy", 0.5)
    valence = analysis.get("avg_valence", 0.5)
    dance = analysis.get("avg_danceability", 0.5)
    top_genres = analysis.get("top_genres", [])
    
    # 1. Smarter Genre Filtering
    # If a genre is too common, we try to find a more specific one
    GENRE_BLACKLIST = ["manele", "favorites", "seen live", "2024", "2023", "pop"]
    
    filtered_genres = [g for g in top_genres if g.lower() not in GENRE_BLACKLIST]
    core_genre = filtered_genres[0] if filtered_genres else (top_genres[0] if top_genres else "Musical")

    prefixes = []
    if energy > 0.7: prefixes.extend(["High Voltage", "Kinetic", "Electric", "Turbo"])
    elif energy < 0.4: prefixes.extend(["Midnight", "Ambient", "Lucid", "Serene"])
    
    if valence > 0.7: prefixes.extend(["Euphoric", "Radiant", "Golden", "Bliss"])
    elif valence < 0.4: prefixes.extend(["Moody", "Deep", "Shadow", "Noir"])
    
    if dance > 0.7: prefixes.extend(["Groove", "Rhythmic", "Bounce", "Club"])
    
    prefix = random.choice(prefixes) if prefixes else random.choice(["Ethereal", "Sonic", "Abstract", "Nomadic", "Quantum"])
    
    suffixes = ["Session", "Mix", "Wave", "Collective", "Flow", "Vibration", "Sequence", "Resonance"]
    return f"{prefix} {core_genre.title()} {random.choice(suffixes)}"
