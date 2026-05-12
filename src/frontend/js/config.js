// Spotify Smart Playlist Generator Configuration
// OAuth Configuration for Spotify Authorization

const CONFIG = {
  // Spotify API Configuration
  CLIENT_ID: '2e5babb7dcf346cb82db7ed7fb07e84b',
  ACCESS_TOKEN: null, // Will be set after OAuth flow

  // API Endpoints
  SPOTIFY_API_BASE: 'https://api.spotify.com/v1',
  SPOTIFY_AUTH_BASE: 'https://accounts.spotify.com',

  // Redirect URI - must match exactly what's in your Spotify app settings
  REDIRECT_URI: window.location.origin + '/html/callback.html',

  // Required Scopes for Spotify API
  REQUIRED_SCOPES: [
    'user-read-private',
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-top-read',
    'user-read-recently-played'
  ],

  // Playlist Configuration
  PLAYLIST_SETTINGS: {
    maxSongsPerPlaylist: 50,
    createPublicPlaylists: false,
    addPlaylistDescriptions: true,
    defaultDescription: 'Created by Smart Playlist Generator 🎵',
    
    // Genre-based playlist names
    genrePlaylistNames: {
      rock: 'Rock Vibes 🎸',
      pop: 'Pop Hits 🎤',
      jazz: 'Jazz Sessions 🎷',
      classical: 'Classical Elegance 🎼',
      electronic: 'Electronic Beats 🎛️',
      'hip-hop': 'Hip-Hop Flows 🎤',
      country: 'Country Roads 🤠',
      blues: 'Blues Moods 🎵',
      folk: 'Folk Stories 🎻',
      reggae: 'Reggae Rhythms 🌴',
      metal: 'Metal Power ⚡',
      indie: 'Indie Discoveries 🎧',
      rnb: 'R&B Grooves 💫',
      funk: 'Funk Vibes 🕺',
      soul: 'Soul Music ❤️',
      disco: 'Disco Fever ✨',
      punk: 'Punk Energy ⚡',
      alternative: 'Alternative Edge 🎸',
      ambient: 'Ambient Soundscapes 🌙',
      world: 'World Music 🌍'
    },

    // Mood-based playlist names
    moodPlaylistNames: {
      happy: 'Happy Vibes ☀️',
      sad: 'Melancholy Moments 🌧️',
      energetic: 'Energy Boost ⚡',
      chill: 'Chill Time 😌',
      romantic: 'Romantic Moods 💕',
      workout: 'Workout Power 💪',
      focus: 'Focus Flow 🧠',
      party: 'Party Time 🎉',
      relaxing: 'Relaxation Station 🧘',
      uplifting: 'Uplifting Spirits ✨'
    },

    // Decade-based playlist names
    decadePlaylistNames: {
      '1960s': '60s Classics 📻',
      '1970s': '70s Hits 🎶',
      '1980s': '80s Retro 💿',
      '1990s': '90s Nostalgia 📼',
      '2000s': '2000s Throwbacks 🎧',
      '2010s': '2010s Favorites 🎵',
      '2020s': '2020s Current 📱'
    }
  },

  // Analysis Configuration
  ANALYSIS_SETTINGS: {
    audioFeatures: {
      enabled: true,
      useForGrouping: true,
      features: ['energy', 'danceability', 'valence', 'acousticness', 'instrumentalness', 'liveness', 'speechiness', 'tempo']
    },
    
    clustering: {
      enabled: true,
      algorithm: 'kmeans',
      maxClusters: 10,
      minClusterSize: 3
    },
    
    similarity: {
      enabled: true,
      threshold: 0.7,
      weights: {
        genre: 0.3,
        audioFeatures: 0.4,
        popularity: 0.1,
        artist: 0.2
      }
    }
  },

  // UI Configuration
  UI_SETTINGS: {
    animationsEnabled: true,
    showDebugInfo: false,
    autoRefreshInterval: 30000, // 30 seconds
    maxDisplayedPlaylists: 20,
    defaultPlaylistSize: 25
  }
};

// ===============
// PKCE - HELPERS
// ===============

// Simple validation
CONFIG.validate = function() {
  return this.ACCESS_TOKEN !== null && this.ACCESS_TOKEN.length > 0;
};

// Auth headers
CONFIG.getAuthHeaders = function() {
  return {
    'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
};

// Base64 URL encode
CONFIG.base64UrlEncode = function(arrayBuffer) {
  let str = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Create a random code verifier
CONFIG.generateCodeVerifier = function() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => ('0' + b.toString(16)).slice(-2)).join('');
};

// Create a code challenge from verifier
CONFIG.generateCodeChallenge = async function(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return this.base64UrlEncode(digest);
};

// Build the authorization URL (Authorization Code with PKCE)
CONFIG.getAuthorizationUrl = function(codeChallenge) {
  const params = new URLSearchParams({
    client_id: this.CLIENT_ID,
    response_type: 'code',
    redirect_uri: this.REDIRECT_URI,
    scope: this.REQUIRED_SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'false'
  });
  return `${this.SPOTIFY_AUTH_BASE}/authorize?${params.toString()}`;
};

// Start OAuth flow (async to generate PKCE values)
CONFIG.startOAuthFlow = async function() {
  try {
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);
    localStorage.setItem('spotify_code_verifier', verifier);
    const url = this.getAuthorizationUrl(challenge);
    window.location.href = url;
  } catch (e) {
    console.error('Failed to start OAuth flow:', e);
  }
};

// ========================
// Token storage and checks
// ========================

// Check for token previously saved by callback.html
CONFIG.checkForTokenInUrl = function() {
  try {
    const raw = localStorage.getItem('spotify_token_data');
    if (!raw) return false;
    const data = JSON.parse(raw);
    const now = Date.now();
    const expiresAt = data.timestamp + (data.expires_in * 1000);
    if (now < (expiresAt - 60_000)) { // 1 minute safety window
      this.ACCESS_TOKEN = data.access_token;
      return true;
    }
    // expired
    localStorage.removeItem('spotify_token_data');
    return false;
  } catch (e) {
    console.warn('Token read error:', e);
    return false;
  }
};

CONFIG.loadStoredToken = function() {
  return this.checkForTokenInUrl();
};

CONFIG.clearStoredTokens = function() {
  localStorage.removeItem('spotify_token_data');
  localStorage.removeItem('spotify_code_verifier');
  this.ACCESS_TOKEN = null;
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}