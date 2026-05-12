// --- Mood Detection via Lyrics or APIs ---
async function detectMoodFromLyrics(lyrics) {
  // Simple sentiment analysis: count positive/negative words
  const positive = ['happy','love','joy','good','bright','smile','fun','party','shine','dream'];
  const negative = ['sad','cry','pain','dark','lonely','hurt','tears','fear','lost','cold'];
  let score = 0;
  const words = lyrics.toLowerCase().split(/\W+/);
  words.forEach(w => {
    if (positive.includes(w)) score++;
    if (negative.includes(w)) score--;
  });
  if (score > 2) return 'positive';
  if (score < -2) return 'negative';
  return 'neutral';
}

async function fetchLyrics(track) {
  // Example: use lyrics.ovh API (or other)
  const artist = (track.track?.artists?.[0]?.name || track.artists?.[0]?.name || '').replace(/ /g, '%20');
  const title = (track.track?.name || track.name || '').replace(/ /g, '%20');
  const url = `https://api.lyrics.ovh/v1/${artist}/${title}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const data = await res.json();
    return data.lyrics || '';
  } catch { return ''; }
}

async function detectTrackMood(track) {
  const lyrics = await fetchLyrics(track);
  if (!lyrics) return 'unknown';
  return await detectMoodFromLyrics(lyrics);
}

window.detectTrackMood = detectTrackMood;
window.detectMoodFromLyrics = detectMoodFromLyrics;
window.fetchLyrics = fetchLyrics;
// --- User Feedback Loop & Reinforcement Learning ---
const playlistFeedback = {};

function ratePlaylist(playlistId, rating) {
  // rating: 1 (like), 0 (neutral), -1 (dislike)
  if (!playlistFeedback[playlistId]) playlistFeedback[playlistId] = { ratings: [], skips: 0 };
  playlistFeedback[playlistId].ratings.push(rating);
}

function recordTrackSkip(playlistId) {
  if (!playlistFeedback[playlistId]) playlistFeedback[playlistId] = { ratings: [], skips: 0 };
  playlistFeedback[playlistId].skips += 1;
}

function getPlaylistScore(playlistId) {
  const fb = playlistFeedback[playlistId];
  if (!fb) return 0;
  const avgRating = fb.ratings.length ? fb.ratings.reduce((a,b)=>a+b,0)/fb.ratings.length : 0;
  const skipPenalty = Math.min(1, fb.skips * 0.1);
  return avgRating - skipPenalty;
}

// Simple multi-armed bandit: boost selection of playlists with higher scores
function selectBestPlaylists(playlists) {
  return playlists.sort((a,b) => getPlaylistScore(b.id) - getPlaylistScore(a.id));
}

window.ratePlaylist = ratePlaylist;
window.recordTrackSkip = recordTrackSkip;
window.getPlaylistScore = getPlaylistScore;
window.selectBestPlaylists = selectBestPlaylists;
// --- Playlist Quality Analysis & Auto-Tuning ---
function analyzePlaylistQuality(tracks) {
  // Cohesion: variance of audio features
  const features = tracks.map(t => [
    t.audio_features?.danceability ?? 0,
    t.audio_features?.energy ?? 0,
    t.audio_features?.valence ?? 0,
    t.audio_features?.tempo ?? 0,
    t.audio_features?.acousticness ?? 0,
    t.audio_features?.instrumentalness ?? 0,
    t.audio_features?.liveness ?? 0,
    t.audio_features?.speechiness ?? 0,
  ]);
  const mean = features[0].map((_,i) => features.reduce((a,b) => a+b[i],0)/features.length);
  const variance = features[0].map((_,i) => features.reduce((a,b) => a+(b[i]-mean[i])**2,0)/features.length);
  const cohesion = 1 - (variance.reduce((a,b) => a+b,0)/variance.length); // Higher is better

  // Genre purity: most common genre fraction
  const genres = tracks.map(t => t.external_data?.primaryGenre || t.genre || 'unknown');
  const genreCounts = {};
  genres.forEach(g => { genreCounts[g] = (genreCounts[g]||0)+1; });
  const genrePurity = Math.max(...Object.values(genreCounts))/genres.length;

  // Artist spread: number of unique artists
  const artists = tracks.flatMap(t => (t.track?.artists || t.artists || []).map(a => a.name));
  const uniqueArtists = new Set(artists);
  const artistSpread = uniqueArtists.size / tracks.length;

  return { cohesion, genrePurity, artistSpread };
}

function autoTuneSelectionParams(quality, params) {
  // Example: if cohesion is low, reduce playlist size; if genre purity is low, increase genre weighting
  if (quality.cohesion < 0.5) params.maxSize = Math.max(20, params.maxSize * 0.8);
  if (quality.genrePurity < 0.6) params.genreWeight = Math.min(1, (params.genreWeight ?? 0.2) + 0.1);
  if (quality.artistSpread < 0.2) params.maxPerArtist = Math.max(2, (params.maxPerArtist ?? 5) - 1);
  return params;
}

window.analyzePlaylistQuality = analyzePlaylistQuality;
window.autoTuneSelectionParams = autoTuneSelectionParams;
// --- Recency/Popularity Bias & Diversity Caps ---
function computeRecencyScore(track, now = Date.now()) {
  // Assume track.added_date is ISO string or timestamp
  const added = Date.parse(track.added_date || track.added || 0);
  if (!added) return 0;
  const daysAgo = (now - added) / (1000 * 60 * 60 * 24);
  // Exponential decay: recent tracks score higher
  return Math.exp(-daysAgo / 30);
}

function computePopularityScore(track) {
  // Spotify popularity is 0-100
  return (track.popularity ?? track.track?.popularity ?? 0) / 100;
}

function applyDiversityCaps(tracks, options = {}) {
  // options: { maxPerArtist, maxPerGenre }
  const maxPerArtist = options.maxPerArtist ?? 5;
  const maxPerGenre = options.maxPerGenre ?? 30;
  const artistCounts = {};
  const genreCounts = {};
  const result = [];
  tracks.forEach(track => {
    const artists = (track.track?.artists || track.artists || []).map(a => a.name);
    const genre = track.external_data?.primaryGenre || track.genre || 'unknown';
    let allow = true;
    artists.forEach(a => {
      artistCounts[a] = (artistCounts[a] || 0) + 1;
      if (artistCounts[a] > maxPerArtist) allow = false;
    });
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    if (genreCounts[genre] > maxPerGenre) allow = false;
    if (allow) result.push(track);
  });
  return result;
}

window.computeRecencyScore = computeRecencyScore;
window.computePopularityScore = computePopularityScore;
window.applyDiversityCaps = applyDiversityCaps;
// --- Hybrid Scoring System for Playlist Selection ---
function computeHybridScore(track, userHistory = {}) {
  // Audio features
  const af = track.audio_features || {};
  const audioScore = (
    (af.energy ?? 0) * 0.2 +
    (af.danceability ?? 0) * 0.2 +
    (af.valence ?? 0) * 0.2 +
    (af.acousticness ?? 0) * 0.1 +
    (af.instrumentalness ?? 0) * 0.1 +
    (af.liveness ?? 0) * 0.1 +
    (af.speechiness ?? 0) * 0.1
  );

  // Genre embedding
  const genreVec = genreToVector(track.external_data?.primaryGenre || track.genre || 'unknown');
  const genreScore = genreVec.reduce((a,b) => a+b, 0) / genreVec.length;

  // Artist similarity (bonus if artist is in user's top artists)
  let artistScore = 0;
  const artists = (track.track?.artists || track.artists || []).map(a => a.name);
  if (userHistory.topArtists) {
    artistScore = artists.some(a => userHistory.topArtists.includes(a)) ? 1 : 0;
  }

  // User history (bonus for recent plays, favorites, skips)
  let historyScore = 0;
  if (userHistory.recentTracks) {
    historyScore = userHistory.recentTracks.includes(track.id) ? 1 : 0;
  }
  if (userHistory.favorites && userHistory.favorites.includes(track.id)) historyScore += 0.5;
  if (userHistory.skipped && userHistory.skipped.includes(track.id)) historyScore -= 0.5;

  // Weighted sum
  const score = (
    audioScore * 0.4 +
    genreScore * 0.2 +
    artistScore * 0.2 +
    historyScore * 0.2
  );
  return score;
}

window.computeHybridScore = computeHybridScore;
// --- Artist Similarity Graph & Community Detection ---
// Build artist similarity graph from track data
function buildArtistGraph(tracks) {
  const graph = {};
  // Build edges based on co-occurrence in playlists and collaborations
  tracks.forEach(track => {
    const artists = (track.track?.artists || track.artists || []).map(a => a.name);
    artists.forEach(a1 => {
      if (!graph[a1]) graph[a1] = new Set();
      artists.forEach(a2 => {
        if (a1 !== a2) graph[a1].add(a2);
      });
    });
  });
  // Convert sets to arrays
  Object.keys(graph).forEach(a => { graph[a] = Array.from(graph[a]); });
  return graph;
}

// Simple label propagation for community detection
function detectArtistCommunities(graph, maxIter = 10) {
  const labels = {};
  Object.keys(graph).forEach(a => { labels[a] = a; });
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    Object.keys(graph).forEach(a => {
      const neighborLabels = graph[a].map(n => labels[n]);
      if (neighborLabels.length === 0) return;
      // Most frequent label among neighbors
      const freq = {};
      neighborLabels.forEach(l => { freq[l] = (freq[l] || 0) + 1; });
      const bestLabel = Object.entries(freq).sort((a,b) => b[1]-a[1])[0][0];
      if (labels[a] !== bestLabel) {
        labels[a] = bestLabel;
        changed = true;
      }
    });
    if (!changed) break;
  }
  // Group artists by label
  const communities = {};
  Object.entries(labels).forEach(([artist, label]) => {
    if (!communities[label]) communities[label] = [];
    communities[label].push(artist);
  });
  return Object.values(communities);
}

// Main entry: get artist clusters from tracks
function getArtistClusters(tracks) {
  const graph = buildArtistGraph(tracks);
  const communities = detectArtistCommunities(graph);
  // Map communities to tracks
  return communities.map(community =>
    tracks.filter(track => {
      const artists = (track.track?.artists || track.artists || []).map(a => a.name);
      return artists.some(a => community.includes(a));
    })
  );
}

window.getArtistClusters = getArtistClusters;
// --- Audio Feature Clustering (k-means) ---
function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function kMeansCluster(tracks, k = 5) {
  const features = tracks.map(t => [
    t.audio_features?.danceability ?? 0,
    t.audio_features?.energy ?? 0,
    t.audio_features?.valence ?? 0,
    t.audio_features?.tempo ?? 0,
    t.audio_features?.acousticness ?? 0,
    t.audio_features?.instrumentalness ?? 0,
    t.audio_features?.liveness ?? 0,
    t.audio_features?.speechiness ?? 0,
  ]);
  let centroids = features.slice(0, k);
  for (let iter = 0; iter < 20; iter++) {
    const clusters = Array.from({ length: k }, () => []);
    features.forEach((f, idx) => {
      let minDist = Infinity, minIdx = 0;
      centroids.forEach((c, i) => {
        const d = euclidean(f, c);
        if (d < minDist) { minDist = d; minIdx = i; }
      });
      clusters[minIdx].push(idx);
    });
    centroids = clusters.map(cluster => {
      if (cluster.length === 0) return Array(features[0].length).fill(0);
      const mean = Array(features[0].length).fill(0);
      cluster.forEach(idx => {
        features[idx].forEach((v, i) => { mean[i] += v; });
      });
      return mean.map(v => v / cluster.length);
    });
  }
  return clusters;
}

function getVibeClusters(tracks, k = 5) {
  const clusters = kMeansCluster(tracks, k);
  return clusters.map(cluster => cluster.map(idx => tracks[idx]));
}

// --- Genre Embeddings & Clustering (t-SNE/UMAP-like) ---
function genreToVector(genre) {
  const topGenres = ['pop','rock','electronic','hip-hop','r&b','folk','country','romanian'];
  const vec = Array(topGenres.length).fill(0);
  const idx = topGenres.findIndex(g => genre.toLowerCase().includes(g));
  if (idx >= 0) vec[idx] = 1;
  else vec[Math.floor(Math.random()*vec.length)] = 0.5;
  return vec;
}

function getTrackGenreEmbedding(track) {
  const genre = track.external_data?.primaryGenre || track.genre || 'unknown';
  return genreToVector(genre);
}

function genreCluster(tracks, k = 5) {
  const features = tracks.map(getTrackGenreEmbedding);
  let centroids = features.slice(0, k);
  for (let iter = 0; iter < 10; iter++) {
    const clusters = Array.from({ length: k }, () => []);
    features.forEach((f, idx) => {
      let minDist = Infinity, minIdx = 0;
      centroids.forEach((c, i) => {
        const d = euclidean(f, c);
        if (d < minDist) { minDist = d; minIdx = i; }
      });
      clusters[minIdx].push(idx);
    });
    centroids = clusters.map(cluster => {
      if (cluster.length === 0) return Array(features[0].length).fill(0);
      const mean = Array(features[0].length).fill(0);
      cluster.forEach(idx => {
        features[idx].forEach((v, i) => { mean[i] += v; });
      });
      return mean.map(v => v / cluster.length);
    });
  }
  return clusters;
}

function getGenreClusters(tracks, k = 5) {
  const clusters = genreCluster(tracks, k);
  return clusters.map(cluster => cluster.map(idx => tracks[idx]));
}

window.getVibeClusters = getVibeClusters;
window.getGenreClusters = getGenreClusters;
/**
 * Enhanced Music Database System
 * Integrates Last.fm API directly into web app for real-time enrichment
 */

class EnhancedMusicDatabase {
  constructor() {
    this.dbName = 'spotify-enhanced-db';
    this.version = 1;
    this.db = null;
    this.lastfmApiKey = '20d9fa0335075f7dc746c9463ae09e13';
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;

    // Romanian music patterns for detection
    this.romanianPatterns = {
      artists: [
        'irina rimes',
        'mihail',
        'carla\'s dreams',
        'alex velea',
        'antonia',
        'inna',
        'alexandra stan',
        'smiley',
        'dorian popa',
        'delia',
        'loredana groza',
        'florin salam',
        'adrian minune',
        'nicolae guta',
        'liviu guta',
        'vali vijelie',
        'jean de la craiova',
        'daniela gyorfi',
        'david ciente',
        'surorile osoianu',
        'timpuri noi',
        'phoenix',
        'voltaj',
        'holograf',
        'iris',
        'compact',
        'andra',
        'anda adam',
      ],
      words: ['manele', 'lautaresc', 'etno', 'taraf', 'nunta', 'hora'],
      songPatterns: [
        /\b(la\s+)?(nunta|hora|sarba|brau)\b/i,
        /\b(dragostea?|iubirea?|inima)\b/i,
        /\b(viata|lumea|casa)\b/i,
        /[ăâîșț]/,
      ],
    };

    // Genre classification mapping
    this.genreMapping = {
      electronic: [
        'electronic',
        'edm',
        'dance',
        'techno',
        'house',
        'trance',
        'dubstep',
      ],
      pop: ['pop', 'mainstream', 'radio', 'commercial'],
      rock: ['rock', 'alternative', 'indie rock', 'punk', 'metal'],
      'hip-hop': ['hip hop', 'rap', 'hip-hop', 'urban', 'trap'],
      'r&b': ['rnb', 'r&b', 'soul', 'funk', 'neo-soul'],
      folk: ['folk', 'acoustic', 'singer-songwriter', 'indie folk'],
      country: ['country', 'bluegrass', 'americana'],
      romanian: ['manele', 'lautaresc', 'romanian pop', 'etno'],
    };

    this.init();
  }
      // ...existing code...
// ...existing code...

  async init() {
    try {
      this.db = await this.openDatabase();
      console.log('🎵 Enhanced Music Database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  }

  // Import enriched data JSON (export format from backend) into IndexedDB
  async importEnrichedJson(json) {
    if (!json || !Array.isArray(json.tracks)) return { imported: 0 };
    let imported = 0;
    for (const entry of json.tracks) {
      try {
        const orig = entry.original_data || {};
        const ext = entry.external_data || {};
        const id = this.generateTrackId(orig.artist || '', orig.track_name || '');
        const primaryGenre = ext.primaryGenre || (Array.isArray(ext.classified_genres) ? ext.classified_genres[0] : 'unknown');
        const lastEnriched = Date.parse(entry.analysis?.enrichment_timestamp || '') || Date.now();
        const track = {
          id,
          track_name: orig.track_name || '',
          artist: orig.artist || '',
          album: orig.album || '',
          popularity: orig.popularity || 0,
          duration_min: orig.duration_min || 0,
          added_date: orig.added_date || '',
          external_data: {
            ...ext,
            primaryGenre,
          },
          lastEnriched,
          enrichmentVersion: entry.analysis?.enrichment_version || 'imported',
        };
        await this.saveTrack(track);
        imported++;
      } catch (e) {
        console.warn('Skip import track due to error:', e);
      }
    }
    return { imported };
  }

  // Import from a URL that hosts the enriched JSON
  async importFromUrl(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
      const json = await res.json();
      return await this.importEnrichedJson(json);
    } catch (e) {
      console.warn('Import from URL failed:', e);
      return { imported: 0 };
    }
  }

  // Discover the latest enhanced JSON in /data/output/ and import it
  async importLatestFromServer(basePath = '/data/output/') {
    try {
      const res = await fetch(basePath);
      if (res.ok) {
        const html = await res.text();
        const links = [];
        // Match both enhanced_music_data_YYYY_MM_DD_HHMMSS.json and spotify-enhancement-YYYY-MM-DD*.json
        const regex = /href=["']([^"']*(?:enhanced_music_data_[0-9_]+|spotify-enhancement-[0-9\-]+(?:_[0-9]+)?).*?\.json)["']/gi;
        let m;
        while ((m = regex.exec(html)) !== null) links.push(m[1]);
        if (links.length) {
          const absolute = links.map(href => href.startsWith('http') ? href : (basePath + href.replace(/^\//, '')));
          absolute.sort();
          const latestUrl = absolute[absolute.length - 1];
          return await this.importFromUrl(latestUrl);
        }
      }
      // Fallback to known filenames when directory listing is disabled
      const candidates = [
        'spotify-enhancement-2025-10-02.json',
        'enhanced_music_data_20250926_201718.json',
        'enhanced_music_data_20250926_201702.json',
        'enhanced_music_data_20250926_180455.json',
        'enhanced_music_data_20250926_180444.json',
      ];
      for (const name of candidates) {
        const url = basePath + name;
        try {
          const head = await fetch(url, { method: 'HEAD' });
          if (head.ok) return await this.importFromUrl(url);
        } catch {}
      }
      return { imported: 0 };
    } catch (e) {
      console.debug('Import latest enriched data failed:', e);
      return { imported: 0 };
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stores
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('artist', 'artist', { unique: false });
          trackStore.createIndex('genre', 'primaryGenre', { unique: false });
          trackStore.createIndex('lastEnriched', 'lastEnriched', {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('enrichmentQueue')) {
          db.createObjectStore('enrichmentQueue', { keyPath: 'trackId' });
        }
      };
    });
  }

  // Generate unique ID for tracks
  generateTrackId(artist, trackName) {
    return btoa(encodeURIComponent(`${artist}-${trackName}`))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 20);
  }

  // Rate-limited API requests
  async makeRateLimitedRequest(url) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.debug('API non-OK response:', response.status, url);
        return null;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.debug('API unexpected content-type:', contentType);
        return null;
      }
      try {
        return await response.json();
      } catch (e) {
        console.debug('API JSON parse failed:', e);
        return null;
      }
    } catch (error) {
      console.debug('API request failed:', error);
      return null;
    }
  }

  // Detect Romanian music
  detectRomanianGenre(artist, trackName = '') {
    const artistLower = artist.toLowerCase();
    const trackLower = trackName.toLowerCase();
    const text = `${artistLower} ${trackLower}`;

    // Check known Romanian artists
    if (
      this.romanianPatterns.artists.some((name) => artistLower.includes(name))
    ) {
      return ['romanian', 'manele'];
    }

    // Check Romanian words
    if (this.romanianPatterns.words.some((word) => text.includes(word))) {
      return ['romanian', 'manele'];
    }

    // Check Romanian patterns
    if (
      this.romanianPatterns.songPatterns.some((pattern) => pattern.test(text))
    ) {
      return ['romanian'];
    }

    return [];
  }

  // Classify genres from tags
  classifyGenres(tags) {
    const classified = new Set();
    const tagsLower = tags.map((tag) => tag.toLowerCase());

    for (const [genre, keywords] of Object.entries(this.genreMapping)) {
      if (
        keywords.some((keyword) =>
          tagsLower.some(
            (tag) => tag.includes(keyword) || keyword.includes(tag)
          )
        )
      ) {
        classified.add(genre);
      }
    }

    return Array.from(classified);
  }

  // Get artist info from Last.fm
  async getLastFmArtistInfo(artist) {
    const url = `http://ws.audioscrobbler.com/2.0/?method=artist.getInfo&api_key=${this.lastfmApiKey}&artist=${encodeURIComponent(artist)}&format=json`;

    const data = await this.makeRateLimitedRequest(url);

    if (data && data.artist && !data.error) {
      const artistInfo = data.artist;
      const tags = artistInfo.tags?.tag
        ? artistInfo.tags.tag.slice(0, 10).map((t) => t.name)
        : [];

      return {
        listeners: artistInfo.stats?.listeners,
        playcount: artistInfo.stats?.playcount,
        tags,
        similar:
          artistInfo.similar?.artist?.slice(0, 5).map((a) => a.name) || [],
        bio: artistInfo.bio?.summary?.split('<a')[0] || '',
      };
    }

    return null;
  }

  // Get track info from Last.fm
  async getLastFmTrackInfo(artist, track) {
    const url = `http://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${this.lastfmApiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;

    const data = await this.makeRateLimitedRequest(url);

    if (data && data.track && !data.error) {
      const trackInfo = data.track;
      const tags = trackInfo.toptags?.tag
        ? trackInfo.toptags.tag.slice(0, 5).map((t) => t.name)
        : [];

      return {
        listeners: trackInfo.listeners,
        playcount: trackInfo.playcount,
        tags,
        duration: trackInfo.duration,
        album: trackInfo.album?.title,
      };
    }

    return null;
  }

  // Enrich a single track
  async enrichTrack(trackData) {
    const trackId = this.generateTrackId(
      trackData.artist,
      trackData.track_name
    );

    // Check if already enriched recently
    const existingTrack = await this.getTrack(trackId);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    if (existingTrack && existingTrack.lastEnriched > oneWeekAgo) {
      console.log(
        `✅ Track already enriched: ${trackData.artist} - ${trackData.track_name}`
      );
      return existingTrack;
    }

    console.log(`🔍 Enriching: ${trackData.artist} - ${trackData.track_name}`);

    // Get data from multiple sources
    const [artistInfo, trackInfo] = await Promise.all([
      this.getLastFmArtistInfo(trackData.artist),
      this.getLastFmTrackInfo(trackData.artist, trackData.track_name),
    ]);

    // Detect Romanian music
    const romanianGenres = this.detectRomanianGenre(
      trackData.artist,
      trackData.track_name
    );

    // Collect all tags
    const allTags = [];
    if (artistInfo?.tags) allTags.push(...artistInfo.tags);
    if (trackInfo?.tags) allTags.push(...trackInfo.tags);
    if (romanianGenres) allTags.push(...romanianGenres);

    // Classify genres
    const classifiedGenres = this.classifyGenres(allTags);
    const primaryGenre = classifiedGenres[0] || 'unknown';

    // Create enriched track object
    const enrichedTrack = {
      id: trackId,
      ...trackData,
      external_data: {
        lastfm_artist: artistInfo,
        lastfm_track: trackInfo,
        detected_genres: romanianGenres,
        all_tags: [...new Set(allTags)], // Remove duplicates
        classified_genres: classifiedGenres,
        primaryGenre,
      },
      lastEnriched: Date.now(),
      enrichmentVersion: '2.0',
    };

    // Save to database
    await this.saveTrack(enrichedTrack);

    return enrichedTrack;
  }

  // Batch enrich new tracks only
  async enrichNewTracks(tracks, onProgress = null) {
    const newTracks = [];
    const existingTracks = [];

    // Separate new vs existing tracks
    for (const track of tracks) {
      const trackId = this.generateTrackId(track.artist, track.track_name);
      const existing = await this.getTrack(trackId);

      if (existing) {
        existingTracks.push(existing);
      } else {
        newTracks.push(track);
      }
    }

    console.log(
      `📊 Found ${existingTracks.length} existing tracks, ${newTracks.length} new tracks to enrich`
    );

    // Enrich only new tracks
    const enrichedNewTracks = [];
    for (let i = 0; i < newTracks.length; i++) {
      try {
        const enriched = await this.enrichTrack(newTracks[i]);
        enrichedNewTracks.push(enriched);

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: newTracks.length,
            track: enriched,
          });
        }
      } catch (error) {
        console.error(`Error enriching track ${i}:`, error);
      }
    }

    return [...existingTracks, ...enrichedNewTracks];
  }

  // Smart playlist recommendation for new tracks
  async recommendPlaylistForTrack(track, existingPlaylists) {
    const enriched = await this.enrichTrack(track);
    const trackGenres = enriched.external_data.classified_genres;
    const primaryGenre = enriched.external_data.primaryGenre;

    let bestMatch = null;
    let bestScore = 0;

    for (const playlist of existingPlaylists) {
      let score = 0;

      // Genre matching
      if (playlist.genre && trackGenres.includes(playlist.genre)) {
        score += 50;
      }

      // Primary genre exact match
      if (playlist.genre === primaryGenre) {
        score += 100;
      }

      // Audio features similarity (if available)
      if (playlist.audioFeatures && track.audioFeatures) {
        const similarities = this.calculateAudioSimilarity(
          playlist.audioFeatures,
          track.audioFeatures
        );
        score += similarities * 30;
      }

      // Artist similarity
      if (playlist.artists && enriched.external_data.lastfm_artist?.similar) {
        const artistMatch = playlist.artists.some((artist) =>
          enriched.external_data.lastfm_artist.similar.includes(artist)
        );
        if (artistMatch) score += 25;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = playlist;
      }
    }

    return {
      recommendedPlaylist: bestMatch,
      confidence: Math.min(bestScore / 100, 1.0),
      reasons: this.getRecommendationReasons(enriched, bestMatch, bestScore),
    };
  }

  getRecommendationReasons(track, playlist, score) {
    const reasons = [];

    if (playlist) {
      if (track.external_data.primaryGenre === playlist.genre) {
        reasons.push(`Perfect genre match: ${playlist.genre}`);
      }
      if (track.external_data.classified_genres.includes(playlist.genre)) {
        reasons.push(`Genre compatibility: ${playlist.genre}`);
      }
    }

    return reasons;
  }

  // Database operations
  async saveTrack(track) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tracks'], 'readwrite');
      const store = transaction.objectStore('tracks');
      const request = store.put(track);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTrack(trackId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tracks'], 'readonly');
      const store = transaction.objectStore('tracks');
      const request = store.get(trackId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTracks() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tracks'], 'readonly');
      const store = transaction.objectStore('tracks');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tracks'], 'readwrite');
      const store = tx.objectStore('tracks');
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getTracksByGenre(genre) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tracks'], 'readonly');
      const store = transaction.objectStore('tracks');
      const index = store.index('genre');
      const request = index.getAll(genre);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Export enriched database
  async exportEnrichedDatabase() {
    const tracks = await this.getAllTracks();
    const exportData = {
      metadata: {
        totalTracks: tracks.length,
        exportDate: new Date().toISOString(),
        enrichmentVersion: '2.0',
        source: 'Enhanced Music Database',
      },
      tracks,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-spotify-database-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return exportData;
  }

  // Get database statistics
  async getDatabaseStats() {
    const tracks = await this.getAllTracks();
    const genreStats = {};
    let enrichedCount = 0;

    tracks.forEach((track) => {
      if (track.external_data) {
        enrichedCount++;
        const genres = track.external_data.classified_genres || [];
        genres.forEach((genre) => {
          genreStats[genre] = (genreStats[genre] || 0) + 1;
        });
      }
    });

    return {
      totalTracks: tracks.length,
      enrichedTracks: enrichedCount,
      enrichmentRate: enrichedCount / tracks.length,
      genreDistribution: genreStats,
      lastUpdate: Math.max(...tracks.map((t) => t.lastEnriched || 0)),
    };
  }
}

// Export for use in main script
window.EnhancedMusicDatabase = EnhancedMusicDatabase;
