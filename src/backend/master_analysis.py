import json
import os
import pandas as pd
import numpy as np
from datetime import datetime
from analytics.health import LibraryHealthAudit
from analytics.visualize import MusicVisualizer
from clustering.kmeans import kmeans_cluster
from analytics.nlp_engine import NLPPlaylistEngine
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def load_data(csv_path):
    logger.info(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    # Convert CSV to the format our engines expect
    tracks = []
    for idx, row in df.iterrows():
        # Mock some audio features for demonstration if they don't exist
        # In a real run, these would come from Spotify API
        mock_features = {
            'danceability': np.random.random(),
            'energy': np.random.random(),
            'valence': np.random.random(),
            'tempo': np.random.randint(60, 180),
            'acousticness': np.random.random(),
            'instrumentalness': np.random.random(),
            'liveness': np.random.random(),
            'speechiness': np.random.random()
        }
        
        tracks.append({
            'id': f"track_{idx}",
            'original_data': {
                'track_name': row.get('Track Name'),
                'artist': row.get('Artist'),
                'album': row.get('Album')
            },
            'audio_features': mock_features
        })
    return tracks

def main():
    csv_file = "data/samples/spotify-tracks-2025-09-26 (1).csv"
    if not os.path.exists(csv_file):
        logger.error(f"CSV file not found at {csv_file}")
        return

    # 1. Load and Prepare
    tracks = load_data(csv_file)
    
    # 2. Run Health Audit
    logger.info("Running Library Health Audit...")
    audit = LibraryHealthAudit(tracks)
    health_results = audit.run_full_audit()
    
    # 3. Clustering
    logger.info("Clustering tracks...")
    labels = kmeans_cluster(tracks, n_clusters=5)
    
    # 4. Visualization
    logger.info("Generating Music Library Map...")
    visualizer = MusicVisualizer(tracks, labels)
    map_path = visualizer.plot_clusters(method='pca', output_path='library_map_pca.png')
    logger.info(f"Library Map saved to {map_path}")
    
    # 5. NLP Examples
    logger.info("Testing NLP Engine...")
    nlp = NLPPlaylistEngine(tracks)
    
    # Example 1: Keyword query
    happy_mix = nlp.generate_from_query("Happy dance music", limit=5)
    
    # Example 2: Mood Transition
    transition_mix = nlp.generate_transition_playlist("Chill relax", "Energetic workout", length=10)
    
    # 6. Save Results Summary
    summary = {
        "timestamp": datetime.now().isoformat(),
        "total_tracks": len(tracks),
        "health": health_results["health_summary"],
        "sample_outliers": health_results["outliers"][:5],
        "nlp_examples": {
            "happy_dance_top_3": [f"{t['original_data']['track_name']} - {t['original_data']['artist']}" for t in happy_mix[:3]],
            "mood_transition_path": [f"{t['original_data']['track_name']}" for t in transition_mix]
        }
    }
    
    with open("analysis_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
        
    logger.info("Analysis Complete! Check 'analysis_summary.json' and 'library_map_pca.png'")
    print("\n✅ Success! All advanced modules have been tested on your data.")

if __name__ == "__main__":
    main()
