import spotipy
import json

token = "BQBO56GkdjonRMvUZBi9cB4lXsMr4hTl6-6Gq2-IL2w-8bFkpjJyMnmWbvPciUeXsl4MSnYjMJ_DTD4cC-2i2ut8YTMb0Ao_MxoN4hef5gl5pw-Y5XwwufWuf_j17ZDI1KP4X-nFC702xPuj7ojy-NXbS2mhT9xkLQVU6o3W4wbv1P1tkWjcIbCHZLW0TZQrORz7dFY3AGqJVhc0pqSzjbdnte-C1Zx406IIUP3RdGqAuFQdsa8xq8g9pUqeXG4louRWwzyb-aZRIfivc8W1xJY61M6X6-rm0nkLKi2YcayixNg1TghbK-bPxGBNopm0cW4bcNc8IL8ymsKpu14"
sp = spotipy.Spotify(auth=token)

test_ids = ["4n19QpCmsPTeRYqACgUk5H", "1G9YZPtxUGfl1yVw7kq4yc"]
features = sp.audio_features(test_ids)
print(json.dumps(features, indent=2))
