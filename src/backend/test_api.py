import requests

# Test Last.fm API
api_key = "20d9fa0335075f7dc746c9463ae09e13"
url = "http://ws.audioscrobbler.com/2.0/"
params = {
    "method": "track.getInfo",
    "api_key": api_key,
    "artist": "Coldplay",
    "track": "Yellow",
    "format": "json",
}

print("🔍 Testing Last.fm API...")
try:
    response = requests.get(url, params=params, timeout=10)
    data = response.json()

    if "error" in data:
        print(f"❌ API Error: {data['message']}")
    elif "track" in data:
        track_name = data["track"]["name"]
        artist_name = data["track"]["artist"]["name"]
        print(f"✅ API Working! Found: {track_name} by {artist_name}")
    else:
        print("❌ Unexpected response")
        print(data)

except Exception as e:
    print(f"❌ Connection Error: {str(e)}")

print("\n🎯 Next step: Convert your JSON data to CSV format for enrichment")
