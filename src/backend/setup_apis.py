#!/usr/bin/env python3
"""
Quick setup script for music API enrichment
Run this first to test your API keys and setup
"""

import os
import sys

import requests


def test_lastfm_api(api_key):
    """Test Last.fm API connection"""
    print("🔍 Testing Last.fm API...")

    # Test with a popular song
    url = "http://ws.audioscrobbler.com/2.0/"
    params = {
        "method": "track.getInfo",
        "api_key": api_key,
        "artist": "Coldplay",
        "track": "Yellow",
        "format": "json",
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if "error" in data:
            print(f"❌ Last.fm API Error: {data['message']}")
            return False
        elif "track" in data:
            track_name = data["track"]["name"]
            artist_name = data["track"]["artist"]["name"]
            print(
                f"✅ Last.fm API Working! Found track: {track_name} "
                f"by {artist_name}"
            )
            return True
        else:
            print("❌ Unexpected Last.fm response format")
            return False

    except Exception as e:
        print(f"❌ Last.fm API Connection Error: {str(e)}")
        return False


def test_musicbrainz_api():
    """Test MusicBrainz API connection"""
    print("🔍 Testing MusicBrainz API...")

    url = "https://musicbrainz.org/ws/2/recording"
    params = {
        "query": 'artist:"Coldplay" AND recording:"Yellow"',
        "fmt": "json",
        "limit": 1,
    }

    headers = {"User-Agent": "SpotifyPlaylistGenerator/1.0"}

    try:
        response = requests.get(
            url, params=params, headers=headers, timeout=10
        )
        data = response.json()

        if "recordings" in data and len(data["recordings"]) > 0:
            recording = data["recordings"][0]
            title = recording["title"]
            artist = recording["artist-credit"][0]["name"]
            print(f"✅ MusicBrainz API Working! Found: {title} by {artist}")
            return True
        else:
            print("❌ No recordings found in MusicBrainz")
            return False

    except Exception as e:
        print(f"❌ MusicBrainz API Connection Error: {str(e)}")
        return False


def check_files():
    """Check if required files exist"""
    print("📁 Checking required files...")

    required_files = [
        "spotify-tracks-2025-09-26.csv",
        "enrich_music_data.py",
        "requirements.txt",
    ]

    all_good = True
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ Found: {file}")
        else:
            print(f"❌ Missing: {file}")
            all_good = False

    return all_good


def get_api_key():
    """Get API key from user"""
    print("\n🔑 API Key Setup")
    print("Go to: https://www.last.fm/api/account/create")
    print("Create an application and get your API key")

    api_key = input("\nEnter your Last.fm API key: ").strip()

    if not api_key:
        print("❌ No API key provided")
        return None

    return api_key


def update_script_with_api_key(api_key):
    """Update the enrichment script with API key"""
    try:
        with open("enrich_music_data.py", "r", encoding="utf-8") as f:
            content = f.read()

        # Replace the placeholder API key
        updated_content = content.replace(
            "'api_key': 'YOUR_LASTFM_API_KEY',", f"'api_key': '{api_key}',"
        )

        if updated_content != content:
            with open("enrich_music_data.py", "w", encoding="utf-8") as f:
                f.write(updated_content)
            print("✅ API key updated in script")
            return True
        else:
            print(
                "⚠️ API key placeholder not found - you may need to "
                "update manually"
            )
            return False

    except Exception as e:
        print(f"❌ Error updating script: {str(e)}")
        return False


def main():
    print("🎵 Music API Setup & Test Tool")
    print("=" * 40)

    # Check files first
    if not check_files():
        print("\n❌ Some required files are missing. Please ensure you have:")
        print("- spotify-tracks-2025-09-26.csv (your exported data)")
        print("- enrich_music_data.py (the enrichment script)")
        print("- requirements.txt (Python dependencies)")
        sys.exit(1)

    # Get API key
    api_key = get_api_key()
    if not api_key:
        sys.exit(1)

    # Test APIs
    print("\n🧪 Testing API Connections...")

    lastfm_ok = test_lastfm_api(api_key)
    musicbrainz_ok = test_musicbrainz_api()

    if lastfm_ok and musicbrainz_ok:
        print("\n🎉 All APIs are working!")

        # Update the script
        if update_script_with_api_key(api_key):
            print("\n✅ Setup Complete! You can now run:")
            print(
                "python enrich_music_data.py spotify-tracks-2025-09-26.csv 10"
            )
            print("\n(This will test with first 10 tracks)")

    else:
        print("\n❌ API setup incomplete. Please check the errors above.")

        if not lastfm_ok:
            print("\nLast.fm API Issues:")
            print("- Check your API key is correct")
            print("- Ensure your Last.fm application is active")

        if not musicbrainz_ok:
            print("\nMusicBrainz API Issues:")
            print("- Check your internet connection")
            print("- MusicBrainz might be temporarily unavailable")


if __name__ == "__main__":
    main()
