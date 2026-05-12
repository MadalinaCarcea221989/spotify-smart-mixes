// External API Configuration
// Copy this file and rename to external-api-config.js for your actual keys

// Last.fm API Configuration
const LASTFM_API_KEY = 'YOUR_LASTFM_API_KEY_HERE';

// MusicBrainz Configuration (no key needed)
// Rate limit: 1 request per second (handled automatically)

// Instructions:
// 1. Get your Last.fm API key from: https://www.last.fm/api/account/create
// 2. Replace YOUR_LASTFM_API_KEY_HERE with your actual key
// 3. Save as external-api-config.js (this filename is in .gitignore)

// Export configuration
const EXTERNAL_API_CONFIG = {
  lastfm: {
    apiKey: LASTFM_API_KEY,
  },
};
