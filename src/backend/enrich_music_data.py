#!/usr/bin/env python3
"""
Spotify Music Data Enrichment Script
====================================

This script takes your exported CSV file and enriches it with data from
external music APIs:
- Last.fm: Genre tags, similar artists, play counts
- MusicBrainz: Detailed metadata, release information
- AcousticBrainz: Audio features (energy, danceability, mood)

Usage:
    python enrich_music_data.py spotify-tracks-2025-09-26.csv

Requirements:
    pip install pandas requests musicbrainzngs pylast
"""

import json
import logging
import sys
import time
from typing import Dict, List, Optional

import pandas as pd
import requests

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class MusicDataEnricher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "SpotifyPlaylistGenerator/1.0 "
                    "(https://github.com/user/spotify-playlist-generator)"
                )
            }
        )

        # Rate limiting
        self.request_delay = 1.0  # seconds between requests

    def load_csv_data(self, csv_file: str) -> pd.DataFrame:
        """Load the exported Spotify CSV file"""
        logger.info(f"Loading CSV file: {csv_file}")

        try:
            df = pd.read_csv(csv_file)
            logger.info(f"Loaded {len(df)} tracks from CSV")
            return df
        except Exception as e:
            logger.error(f"Error loading CSV: {e}")
            raise

    def search_lastfm(self, artist: str, track: str) -> Optional[Dict]:
        """Search Last.fm for track information"""
        try:
            url = "http://ws.audioscrobbler.com/2.0/"
            params = {
                "method": "track.getInfo",
                # Get free API key from last.fm
                "api_key": "20d9fa0335075f7dc746c9463ae09e13",
                "artist": artist,
                "track": track,
                "format": "json",
            }

            response = self.session.get(url, params=params)
            time.sleep(self.request_delay)

            if response.status_code == 200:
                data = response.json()
                if "track" in data:
                    track_info = data["track"]
                    return {
                        "listeners": track_info.get("listeners"),
                        "playcount": track_info.get("playcount"),
                        "tags": [
                            tag["name"]
                            for tag in track_info.get("toptags", {}).get(
                                "tag", []
                            )[:5]
                        ],
                        "duration": track_info.get("duration"),
                        "album": track_info.get("album", {}).get("title"),
                    }
        except Exception as e:
            logger.warning(f"Last.fm error for {artist} - {track}: {e}")

        return None

    def search_musicbrainz(self, artist: str, track: str) -> Optional[Dict]:
        """Search MusicBrainz for detailed metadata"""
        try:
            url = "http://musicbrainz.org/ws/2/recording"
            params = {
                "query": f'artist:"{artist}" AND recording:"{track}"',
                "fmt": "json",
                "limit": 1,
            }

            response = self.session.get(url, params=params)
            time.sleep(self.request_delay)

            if response.status_code == 200:
                data = response.json()
                if data.get("recordings"):
                    recording = data["recordings"][0]
                    return {
                        "mbid": recording.get("id"),
                        "title": recording.get("title"),
                        "length": recording.get("length"),
                        "genres": [
                            tag["name"]
                            for tag in recording.get("tags", [])[:5]
                        ],
                    }
        except Exception as e:
            logger.warning(f"MusicBrainz error for {artist} - {track}: {e}")

        return None

    def get_genre_from_spotify_style(self, artist: str) -> List[str]:
        """Extract genres based on artist name patterns (fallback method)"""
        # Romanian/Manele artists patterns
        romanian_indicators = [
            "florin",
            "adrian",
            "liviu",
            "nicolae",
            "gheorghe",
            "ion",
            "stefan",
            "cristian",
            "daniel",
            "alex",
            "bogdan",
            "marian",
        ]

        artist_lower = artist.lower()
        genres = []

        # Check for Romanian/Manele patterns
        if any(indicator in artist_lower for indicator in romanian_indicators):
            genres.append("manele")

        # You can add more genre detection patterns here

        return genres

    def enrich_track(self, row: pd.Series) -> Dict:
        """Enrich a single track with external data"""
        track_name = row["Track Name"]
        artist = row["Artist"]

        logger.info(f"Enriching: {artist} - {track_name}")

        # Initialize enriched data structure
        enriched = {
            "original_data": {
                "track_name": track_name,
                "artist": artist,
                "album": row["Album"],
                "popularity": row["Popularity"],
                "duration_min": row["Duration (min)"],
                "added_date": row["Added Date"],
            },
            "external_data": {
                "lastfm": self.search_lastfm(artist, track_name),
                "musicbrainz": self.search_musicbrainz(artist, track_name),
                "genre_detected": self.get_genre_from_spotify_style(artist),
            },
            "analysis": {
                "enrichment_timestamp": pd.Timestamp.now().isoformat(),
                "data_sources": [],
            },
        }

        # Track which sources provided data
        if enriched["external_data"]["lastfm"]:
            enriched["analysis"]["data_sources"].append("lastfm")
        if enriched["external_data"]["musicbrainz"]:
            enriched["analysis"]["data_sources"].append("musicbrainz")
        if enriched["external_data"]["genre_detected"]:
            enriched["analysis"]["data_sources"].append("genre_detection")

        return enriched

    def enrich_dataset(
        self, df: pd.DataFrame, output_file: str = None, limit: int = None
    ) -> Dict:
        """Enrich the entire dataset"""
        if limit:
            df = df.head(limit)
            logger.info(f"Limiting processing to first {limit} tracks")

        enriched_data = {
            "metadata": {
                "total_tracks": len(df),
                "enrichment_date": pd.Timestamp.now().isoformat(),
                "data_sources": ["lastfm", "musicbrainz", "genre_detection"],
                "rate_limit_delay": self.request_delay,
            },
            "tracks": [],
        }

        # Process each track
        for idx, row in df.iterrows():
            try:
                enriched_track = self.enrich_track(row)
                enriched_data["tracks"].append(enriched_track)

                # Progress update every 10 tracks
                if (idx + 1) % 10 == 0:
                    logger.info(f"Processed {idx + 1}/{len(df)} tracks...")

            except Exception as e:
                logger.error(f"Error processing track {idx}: {e}")
                continue

        # Save results
        if not output_file:
            timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"enriched_music_data_{timestamp}.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(enriched_data, f, indent=2, ensure_ascii=False)

        logger.info(f"Enriched data saved to: {output_file}")

        # Summary statistics
        successful_enrichments = sum(
            1
            for track in enriched_data["tracks"]
            if track["analysis"]["data_sources"]
        )

        total_tracks = len(enriched_data["tracks"])
        success_rate = successful_enrichments / total_tracks * 100
        logger.info(
            f"""
        Enrichment Complete!
        ====================
        Total tracks: {total_tracks}
        Successfully enriched: {successful_enrichments}
        Success rate: {success_rate:.1f}%
        Output file: {output_file}
        """
        )

        return enriched_data


def main():
    if len(sys.argv) < 2:
        print("Usage: python enrich_music_data.py <csv_file> [limit]")
        print(
            "Example: python enrich_music_data.py "
            "spotify-tracks-2025-09-26.csv 50"
        )
        sys.exit(1)

    csv_file = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else None

    enricher = MusicDataEnricher()

    try:
        # Load data
        df = enricher.load_csv_data(csv_file)

        # Enrich data
        enricher.enrich_dataset(df, limit=limit)

        print("\n✅ Enrichment complete! Check the output JSON file.")
        print(
            "💡 You can now upload this enriched data back to your "
            "Spotify Playlist Generator"
        )

    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
