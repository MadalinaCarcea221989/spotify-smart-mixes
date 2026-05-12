#!/usr/bin/env python3
"""
Enhanced Music Data Enricher - IMPROVED GENRE DETECTION
Now with better Last.fm tag extraction and Romanian music detection
"""

import json
import logging
import re
import time
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd
import requests

# Configure logging with UTF-8 encoding
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("music_enrichment.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class EnhancedMusicDataEnricher:
    def __init__(self, lastfm_api_key: str, request_delay: float = 1.0):
        """Initialize with Last.fm API key and rate limiting"""
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "SpotifyPlaylistGenerator/2.0 (Enhanced Genre Detection)"
                )
            }
        )

        self.lastfm_config = {
            "base_url": "http://ws.audioscrobbler.com/2.0/",
            "api_key": lastfm_api_key,
        }

        self.request_delay = request_delay

        # Enhanced Romanian/Balkan music detection
        self.romanian_patterns = {
            "artists": [
                "irina rimes",
                "mihail",
                "carla's dreams",
                "alex velea",
                "antonia",
                "inna",
                "alexandra stan",
                "smiley",
                "dorian popa",
                "delia",
                "loredana groza",
                "florin salam",
                "adrian minune",
                "nicolae guta",
                "liviu guta",
                "vali vijelie",
                "jean de la craiova",
                "daniela gyorfi",
                "carmen serban",
                "manele de top",
                "formatia mariola",
                "ionut cercel",
                "florin peste",
                "liviu pustiu",
                "sorinel pustiu",
                "tzanca uraganu",
                "jador",
                "bogdan mocanu",
                "tzanca",
                "florin mitroi",
                "costel biju",
                "david ciente",
                "surorile osoianu",
                "timpuri noi",
                "phoenix",
                "voltaj",
                "holograf",
                "iris",
                "compact",
                "firma",
                "zdob si zdub",
                "paula seling",
                "mandinga",
                "akcent",
                "morandi",
                "andreea banica",
                "elena gheorghe",
                "andra",
                "corina",
                "giulia",
                "cristina rus",
                "alina eremia",
                "amna",
                "misha miller",
                "andreea balan",
            ],
            "words": [
                "manele",
                "lautaresc",
                "etno",
                "taraf",
                "rromani",
                "tigani",
                "moldovenesc",
                "ardelenesc",
                "oltenesc",
                "muntenesc",
                "dobrogenesc",
            ],
            "song_patterns": [
                r"\b(la\s+)?(nunta|hora|sarba|brau)\b",
                r"\b(dragostea?|iubirea?|inima)\b",
                r"\b(viata|lumea|casa)\b",
                r"\b(mama|tata|fratii?|sora)\b",
            ],
        }

        # Genre keywords for better classification
        self.genre_keywords = {
            "electronic": [
                "electronic",
                "edm",
                "dance",
                "techno",
                "house",
                "trance",
                "dubstep",
                "drum and bass",
            ],
            "pop": ["pop", "mainstream", "radio", "commercial"],
            "rock": [
                "rock",
                "alternative",
                "indie rock",
                "punk",
                "metal",
                "grunge",
            ],
            "hip-hop": ["hip hop", "rap", "hip-hop", "urban", "trap"],
            "r&b": ["rnb", "r&b", "soul", "funk", "neo-soul"],
            "folk": ["folk", "acoustic", "singer-songwriter", "indie folk"],
            "jazz": ["jazz", "blues", "swing", "bebop"],
            "classical": ["classical", "orchestra", "symphony", "chamber"],
            "latin": ["latin", "reggaeton", "salsa", "bachata", "merengue"],
            "country": ["country", "bluegrass", "americana"],
            "romanian": [
                "manele",
                "lautaresc",
                "romanian pop",
                "etno",
                "folk romanian",
            ],
        }

    def search_lastfm_artist(self, artist: str) -> Optional[Dict]:
        """Get artist info and top tags from Last.fm"""
        try:
            url = self.lastfm_config["base_url"]
            params = {
                "method": "artist.getInfo",
                "api_key": self.lastfm_config["api_key"],
                "artist": artist,
                "format": "json",
            }

            response = self.session.get(url, params=params)
            time.sleep(self.request_delay)

            if response.status_code == 200:
                data = response.json()
                if "artist" in data and "error" not in data:
                    artist_info = data["artist"]
                    tags = []
                    if "tags" in artist_info and "tag" in artist_info["tags"]:
                        tags = [
                            tag["name"]
                            for tag in artist_info["tags"]["tag"][:10]
                        ]

                    return {
                        "listeners": artist_info.get("stats", {}).get(
                            "listeners"
                        ),
                        "playcount": artist_info.get("stats", {}).get(
                            "playcount"
                        ),
                        "tags": tags,
                        "similar": [
                            a["name"]
                            for a in artist_info.get("similar", {}).get(
                                "artist", []
                            )[:5]
                        ],
                        "bio": artist_info.get("bio", {})
                        .get("summary", "")
                        .split("<a")[0],  # Clean HTML
                    }
        except Exception as e:
            logger.warning(f"Last.fm artist error for {artist}: {e}")

        return None

    def search_lastfm_track(self, artist: str, track: str) -> Optional[Dict]:
        """Get track info from Last.fm"""
        try:
            url = self.lastfm_config["base_url"]
            params = {
                "method": "track.getInfo",
                "api_key": self.lastfm_config["api_key"],
                "artist": artist,
                "track": track,
                "format": "json",
            }

            response = self.session.get(url, params=params)
            time.sleep(self.request_delay)

            if response.status_code == 200:
                data = response.json()
                if "track" in data and "error" not in data:
                    track_info = data["track"]
                    tags = []
                    if (
                        "toptags" in track_info
                        and "tag" in track_info["toptags"]
                    ):
                        tags = [
                            tag["name"]
                            for tag in track_info["toptags"]["tag"][:5]
                        ]

                    return {
                        "listeners": track_info.get("listeners"),
                        "playcount": track_info.get("playcount"),
                        "tags": tags,
                        "duration": track_info.get("duration"),
                        "album": (
                            track_info.get("album", {}).get("title")
                            if track_info.get("album")
                            else None
                        ),
                    }
        except Exception as e:
            logger.warning(f"Last.fm track error for {artist} - {track}: {e}")

        return None

    def search_musicbrainz(self, artist: str, track: str) -> Optional[Dict]:
        """Search MusicBrainz for detailed metadata"""
        try:
            url = "https://musicbrainz.org/ws/2/recording"
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

                    # Extract genres from tags
                    genres = []
                    if "tags" in recording:
                        genres = [
                            tag["name"]
                            for tag in recording["tags"]
                            if tag.get("count", 0) > 0
                        ]

                    return {
                        "mbid": recording["id"],
                        "title": recording["title"],
                        "length": recording.get("length"),
                        "genres": genres,
                        "releases": len(recording.get("releases", [])),
                        "country": (
                            recording.get("releases", [{}])[0].get("country")
                            if recording.get("releases")
                            else None
                        ),
                    }
        except Exception as e:
            logger.warning(f"MusicBrainz error for {artist} - {track}: {e}")

        return None

    def detect_romanian_music(self, artist: str, track: str = "") -> List[str]:
        """Enhanced Romanian/Balkan music detection"""
        genres = []
        artist_lower = artist.lower()
        track_lower = track.lower()

        # Check artist names
        if any(
            romanian_artist in artist_lower
            for romanian_artist in self.romanian_patterns["artists"]
        ):
            genres.extend(["romanian", "manele"])

        # Check for Romanian words in artist or track
        if any(
            word in artist_lower or word in track_lower
            for word in self.romanian_patterns["words"]
        ):
            genres.append("manele")

        # Check Romanian song patterns
        text_to_check = f"{artist_lower} {track_lower}"
        for pattern in self.romanian_patterns["song_patterns"]:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                genres.append("romanian")
                break

        # Detect specific Romanian characters
        romanian_chars = ["ă", "â", "î", "ș", "ț"]
        if any(char in text_to_check for char in romanian_chars):
            genres.append("romanian")

        return list(set(genres))  # Remove duplicates

    def classify_genres(self, all_tags: List[str]) -> List[str]:
        """Classify tags into broader genre categories"""
        classified = set()
        all_tags_lower = [tag.lower() for tag in all_tags]

        for genre, keywords in self.genre_keywords.items():
            if any(
                keyword in " ".join(all_tags_lower) for keyword in keywords
            ):
                classified.add(genre)

        return list(classified)

    def enrich_track(self, row: pd.Series) -> Dict:
        """Enhanced track enrichment with better genre detection"""
        track_name = row["Track Name"]
        artist = row["Artist"]

        logger.info(f"Enriching: {artist} - {track_name}")

        # Get data from multiple sources
        lastfm_artist = self.search_lastfm_artist(artist)
        lastfm_track = self.search_lastfm_track(artist, track_name)
        musicbrainz = self.search_musicbrainz(artist, track_name)
        romanian_genres = self.detect_romanian_music(artist, track_name)

        # Collect all tags
        all_tags = []
        if lastfm_artist and lastfm_artist["tags"]:
            all_tags.extend(lastfm_artist["tags"])
        if lastfm_track and lastfm_track["tags"]:
            all_tags.extend(lastfm_track["tags"])
        if musicbrainz and musicbrainz["genres"]:
            all_tags.extend(musicbrainz["genres"])

        # Add Romanian detection
        if romanian_genres:
            all_tags.extend(romanian_genres)

        # Classify into broader genres
        classified_genres = self.classify_genres(all_tags)

        enriched = {
            "original_data": {
                "track_name": track_name,
                "artist": artist,
                "album": row.get("Album", ""),
                "popularity": row.get("Popularity", 0),
                "duration_min": row.get("Duration (min)", 0),
                "added_date": row.get("Date Added", ""),
            },
            "external_data": {
                "lastfm_artist": lastfm_artist,
                "lastfm_track": lastfm_track,
                "musicbrainz": musicbrainz,
                "detected_genres": romanian_genres,
                "all_tags": list(set(all_tags)),  # Remove duplicates
                "classified_genres": classified_genres,
            },
            "analysis": {
                "enrichment_timestamp": datetime.now().isoformat(),
                "data_sources": [],
                "genre_confidence": len(all_tags)
                / 10.0,  # Simple confidence score
            },
        }

        # Track successful data sources
        if lastfm_artist:
            enriched["analysis"]["data_sources"].append("lastfm_artist")
        if lastfm_track:
            enriched["analysis"]["data_sources"].append("lastfm_track")
        if musicbrainz:
            enriched["analysis"]["data_sources"].append("musicbrainz")
        if romanian_genres:
            enriched["analysis"]["data_sources"].append("romanian_detection")

        return enriched

    def enrich_dataset(
        self, df: pd.DataFrame, limit: Optional[int] = None
    ) -> List[Dict]:
        """Enrich entire dataset with progress tracking"""
        if limit:
            df = df.head(limit)
            logger.info(f"Limiting processing to first {limit} tracks")

        enriched_tracks = []
        total = len(df)

        for index, row in df.iterrows():
            try:
                enriched = self.enrich_track(row)
                enriched_tracks.append(enriched)

                # Progress update every 10 tracks
                if (index + 1) % 10 == 0:
                    logger.info(f"Processed {index + 1}/{total} tracks...")

            except Exception as e:
                logger.error(f"Error enriching track {index}: {e}")
                continue

        return enriched_tracks


def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python enhanced_enrich_music_data.py <csv_file> [limit]")
        sys.exit(1)

    csv_file = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else None

    # Use your API key
    API_KEY = "20d9fa0335075f7dc746c9463ae09e13"

    logger.info(f"Loading CSV file: {csv_file}")
    df = pd.read_csv(csv_file)
    logger.info(f"Loaded {len(df)} tracks from CSV")

    enricher = EnhancedMusicDataEnricher(API_KEY, request_delay=1.0)
    enriched_data = enricher.enrich_dataset(df, limit=limit)

    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"enhanced_music_data_{timestamp}.json"

    result = {
        "metadata": {
            "total_tracks": len(enriched_data),
            "enrichment_date": datetime.now().isoformat(),
            "data_sources": [
                "lastfm_artist",
                "lastfm_track",
                "musicbrainz",
                "romanian_detection",
            ],
            "rate_limit_delay": enricher.request_delay,
            "enhanced_version": "2.0",
        },
        "tracks": enriched_data,
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    # Calculate success stats
    successful = sum(
        1 for track in enriched_data if track["analysis"]["data_sources"]
    )
    success_rate = (
        (successful / len(enriched_data) * 100) if enriched_data else 0
    )

    logger.info(f"Enhanced data saved to: {output_file}")
    logger.info(
        f"""
        Enhanced Enrichment Complete!
        =============================
        Total tracks: {len(enriched_data)}
        Successfully enriched: {successful}
        Success rate: {success_rate:.1f}%
        Output file: {output_file}

        New Features:
        - Artist-level Last.fm data
        - Enhanced Romanian detection
        - Genre classification
        - Confidence scoring
    """
    )

    print("\n✅ Enhanced enrichment complete! Check the output JSON file.")
    print(
        "💡 Upload this to your Spotify Playlist Generator for MUCH "
        "better genre detection!"
    )


if __name__ == "__main__":
    main()
