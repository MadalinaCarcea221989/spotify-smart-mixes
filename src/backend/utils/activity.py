import json
import os
from datetime import datetime

LOG_FILE = "data/output/activity_log.json"

def log_activity(event_type: str, message: str):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    
    activities = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                activities = json.load(f)
        except:
            activities = []
            
    new_event = {
        "id": datetime.now().timestamp(),
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "type": event_type,
        "message": message
    }
    
    # Keep last 50 activities
    activities.insert(0, new_event)
    activities = activities[:50]
    
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(activities, f, indent=2)

def get_activities():
    if not os.path.exists(LOG_FILE):
        return []
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []
