import json
import os

def audit_library():
    path = "data/output/auto_synced_library.json"
    print(f"--- DIAGNOSTIC REPORT ---")
    print(f"File Path: {os.path.abspath(path)}")
    
    if not os.path.exists(path):
        print("ERROR: Library file does not exist.")
        return

    size = os.path.getsize(path)
    print(f"File Size: {size / 1024:.2f} KB")

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            tracks = data.get("tracks", [])
            total = len(tracks)
            print(f"Total Tracks: {total}")

            if total == 0:
                print("WARNING: Track list is empty.")
                return

            # Analyze first 50 tracks
            genre_count = 0
            feature_count = 0
            all_genres = set()
            
            for t in tracks:
                if t.get("genres"):
                    genre_count += 1
                    for g in t["genres"]: all_genres.add(g)
                if t.get("audio_features") and t["audio_features"].get("energy"):
                    feature_count += 1

            print(f"Tracks with Genres: {genre_count} ({ (genre_count/total)*100:.1f}%)")
            print(f"Tracks with Audio Features: {feature_count} ({ (feature_count/total)*100:.1f}%)")
            print(f"Unique Genres found: {len(all_genres)}")
            if all_genres:
                print(f"Sample Genres: {list(all_genres)[:10]}")

    except Exception as e:
        print(f"ERROR: Failed to parse JSON: {e}")

if __name__ == "__main__":
    audit_library()
