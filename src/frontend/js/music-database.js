// Music Database Manager - Enhanced Analysis with External Data
class MusicDatabase {
  constructor() {
    this.db = null;
    this.tracks = new Map();
    this.artists = new Map();
    this.albums = new Map();
    this.externalDataSources = {
      lastfm: true,
      musicbrainz: true,
      acousticbrainz: true,
    };
  }

  // Initialize IndexedDB for local storage
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpotifyMusicDB', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Tracks store
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('artist', 'artists', { multiEntry: true });
          trackStore.createIndex('genre', 'genres', { multiEntry: true });
          trackStore.createIndex('year', 'year');
          trackStore.createIndex('energy', 'analysis.energy');
          trackStore.createIndex('valence', 'analysis.valence');
          trackStore.createIndex('danceability', 'analysis.danceability');
        }

        // Artists store
        if (!db.objectStoreNames.contains('artists')) {
          const artistStore = db.createObjectStore('artists', {
            keyPath: 'id',
          });
          artistStore.createIndex('genre', 'genres', { multiEntry: true });
          artistStore.createIndex('popularity', 'popularity');
        }

        // External data cache
        if (!db.objectStoreNames.contains('external_data')) {
          const extStore = db.createObjectStore('external_data', {
            keyPath: 'key',
          });
          extStore.createIndex('source', 'source');
          extStore.createIndex('timestamp', 'timestamp');
        }

        // Compatibility matrix
        if (!db.objectStoreNames.contains('compatibility')) {
          const compatStore = db.createObjectStore('compatibility', {
            keyPath: 'pair_id',
          });
          compatStore.createIndex('score', 'compatibility_score');
        }
      };
    });
  }

  // Store track with enhanced metadata
  async storeTrack(spotifyTrack, audioFeatures = null) {
    const enhancedTrack = {
      id: spotifyTrack.id,
      name: spotifyTrack.name,
      artists: spotifyTrack.artists.map((a) => ({ id: a.id, name: a.name })),
      album: {
        id: spotifyTrack.album.id,
        name: spotifyTrack.album.name,
        release_date: spotifyTrack.album.release_date,
      },
      duration_ms: spotifyTrack.duration_ms,
      popularity: spotifyTrack.popularity,
      explicit: spotifyTrack.explicit,
      preview_url: spotifyTrack.preview_url,
      external_urls: spotifyTrack.external_urls,

      // Spotify audio features (if available)
      analysis: audioFeatures
        ? {
          acousticness: audioFeatures.acousticness,
          danceability: audioFeatures.danceability,
          energy: audioFeatures.energy,
          instrumentalness: audioFeatures.instrumentalness,
          liveness: audioFeatures.liveness,
          loudness: audioFeatures.loudness,
          speechiness: audioFeatures.speechiness,
          tempo: audioFeatures.tempo,
          valence: audioFeatures.valence,
          time_signature: audioFeatures.time_signature,
          key: audioFeatures.key,
          mode: audioFeatures.mode,
        }
        : null,

      // Enhanced metadata placeholders
      genres: [],
      mood_tags: [],
      energy_level: null,
      similar_artists: [],
      year: null,
      country: null,
      language: null,

      // External data status
      external_data: {
        lastfm: { status: 'pending', data: null },
        musicbrainz: { status: 'pending', data: null },
        acousticbrainz: { status: 'pending', data: null },
      },

      // Analysis metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.saveToStore('tracks', enhancedTrack);
  }

  // Enhanced track analysis using multiple data sources
  async enhanceTrackWithExternalData(trackId) {
    const track = await this.getFromStore('tracks', trackId);
    if (!track) return null;

    console.log(
      `🔍 Enhancing track: ${track.name} by ${track.artists[0].name}`
    );

    // Try to get data from multiple sources
    const enhancements = await Promise.allSettled([
      this.getLastFmData(track),
      this.getMusicBrainzData(track),
      this.getAcousticBrainzData(track),
    ]);

    // Merge external data
    enhancements.forEach((result, index) => {
      const sources = ['lastfm', 'musicbrainz', 'acousticbrainz'];
      const source = sources[index];

      if (result.status === 'fulfilled' && result.value) {
        track.external_data[source] = {
          status: 'success',
          data: result.value,
          updated_at: new Date().toISOString(),
        };

        // Merge specific data points
        this.mergeExternalData(track, result.value, source);
      } else {
        track.external_data[source].status = 'failed';
      }
    });

    track.updated_at = new Date().toISOString();
    await this.saveToStore('tracks', track);

    return track;
  }

  // Last.fm API integration for rich metadata
  async getLastFmData(track) {
    const config = window.EXTERNAL_API_CONFIG?.LASTFM;
    if (!config?.ENABLED || config.API_KEY === 'demo_key') {
      console.log('Last.fm API not configured - skipping');
      return null;
    }

    const artist = encodeURIComponent(track.artists[0].name);
    const title = encodeURIComponent(track.name);

    try {
      // Check cache first
      const cacheKey = `lastfm_${track.id}`;
      const cached = await this.getFromStore('external_data', cacheKey);

      if (
        cached &&
        this.isDataFresh(cached.timestamp, config.CACHE_DURATION_DAYS || 7)
      ) {
        return cached.data;
      }

      // Fetch from Last.fm
      const trackInfoUrl = `${config.BASE_URL}?method=track.getInfo&api_key=${config.API_KEY}&artist=${artist}&track=${title}&format=json`;
      const artistInfoUrl = `${config.BASE_URL}?method=artist.getInfo&api_key=${config.API_KEY}&artist=${artist}&format=json`;

      // Rate limiting
      await new Promise((resolve) =>
        setTimeout(resolve, config.RATE_LIMIT_MS || 500)
      );

      const [trackResponse, artistResponse] = await Promise.all([
        this.fetchWithRetry(trackInfoUrl),
        this.fetchWithRetry(artistInfoUrl),
      ]);

      const trackData = await trackResponse.json();
      const artistData = await artistResponse.json();

      const lastfmData = {
        track_tags: trackData.track?.toptags?.tag?.map((tag) => tag.name) || [],
        artist_tags: artistData.artist?.tags?.tag?.map((tag) => tag.name) || [],
        similar_artists:
          artistData.artist?.similar?.artist?.map((a) => a.name) || [],
        playcount: parseInt(trackData.track?.playcount) || 0,
        listeners: parseInt(trackData.track?.listeners) || 0,
        summary: trackData.track?.wiki?.summary || null,
      };

      // Cache the result
      await this.saveToStore('external_data', {
        key: cacheKey,
        source: 'lastfm',
        data: lastfmData,
        timestamp: new Date().toISOString(),
      });

      return lastfmData;
    } catch (error) {
      console.warn(`Last.fm data fetch failed for ${track.name}:`, error);
      return null;
    }
  }

  // MusicBrainz for structured music data
  async getMusicBrainzData(track) {
    const config = window.EXTERNAL_API_CONFIG?.MUSICBRAINZ;
    if (!config?.ENABLED) {
      console.log('MusicBrainz API not configured - skipping');
      return null;
    }

    try {
      const cacheKey = `mb_${track.id}`;
      const cached = await this.getFromStore('external_data', cacheKey);

      if (
        cached &&
        this.isDataFresh(cached.timestamp, config.CACHE_DURATION_DAYS || 30)
      ) {
        return cached.data;
      }

      const artist = encodeURIComponent(track.artists[0].name);
      const title = encodeURIComponent(track.name);

      // Search for recording
      const searchUrl = `${config.BASE_URL}recording/?query=recording:"${title}" AND artist:"${artist}"&fmt=json&limit=1`;

      // Rate limiting (MusicBrainz requires 1 request per second)
      await new Promise((resolve) =>
        setTimeout(resolve, config.RATE_LIMIT_MS || 1000)
      );

      const response = await this.fetchWithRetry(searchUrl, {
        headers: {
          'User-Agent':
            config.USER_AGENT || 'SpotifySmartPlaylistGenerator/1.0',
        },
      });

      const data = await response.json();

      if (data.recordings && data.recordings.length > 0) {
        const recording = data.recordings[0];

        const mbData = {
          mbid: recording.id,
          country: recording.country || null,
          date: recording.date || null,
          genres: recording.genres?.map((g) => g.name) || [],
          isrcs: recording.isrcs || [],
          length: recording.length || null,
        };

        await this.saveToStore('external_data', {
          key: cacheKey,
          source: 'musicbrainz',
          data: mbData,
          timestamp: new Date().toISOString(),
        });

        return mbData;
      }
    } catch (error) {
      console.warn(`MusicBrainz data fetch failed for ${track.name}:`, error);
    }

    return null;
  }

  // AcousticBrainz for additional audio analysis
  async getAcousticBrainzData(track) {
    try {
      // First need MusicBrainz ID
      const mbData = await this.getMusicBrainzData(track);
      if (!mbData?.mbid) return null;

      const cacheKey = `ab_${mbData.mbid}`;
      const cached = await this.getFromStore('external_data', cacheKey);

      if (cached && this.isDataFresh(cached.timestamp, 30)) {
        return cached.data;
      }

      const analysisUrl = `https://acousticbrainz.org/${mbData.mbid}/low-level`;
      const highlevelUrl = `https://acousticbrainz.org/${mbData.mbid}/high-level`;

      const [analysisResponse, highlevelResponse] = await Promise.allSettled([
        this.fetchWithRetry(analysisUrl),
        this.fetchWithRetry(highlevelUrl),
      ]);

      const abData = {
        low_level: null,
        high_level: null,
      };

      if (analysisResponse.status === 'fulfilled') {
        const lowLevel = await analysisResponse.value.json();
        abData.low_level = {
          tempo: lowLevel.rhythm?.bpm,
          key: lowLevel.tonal?.key_key,
          scale: lowLevel.tonal?.key_scale,
          danceability: lowLevel.rhythm?.danceability,
        };
      }

      if (highlevelResponse.status === 'fulfilled') {
        const highLevel = await highlevelResponse.value.json();
        abData.high_level = {
          mood: highlevelResponse.mood_happy?.all,
          genre: highlevelResponse.genre_rosamerica?.all,
          voice_instrumental: highlevelResponse.voice_instrumental?.all,
        };
      }

      if (abData.low_level || abData.high_level) {
        await this.saveToStore('external_data', {
          key: cacheKey,
          source: 'acousticbrainz',
          data: abData,
          timestamp: new Date().toISOString(),
        });

        return abData;
      }
    } catch (error) {
      console.warn(
        `AcousticBrainz data fetch failed for ${track.name}:`,
        error
      );
    }

    return null;
  }

  // Merge external data into track record
  mergeExternalData(track, externalData, source) {
    switch (source) {
    case 'lastfm':
      if (externalData.track_tags) {
        track.genres.push(
          ...externalData.track_tags.filter(
            (tag) => !track.genres.includes(tag)
          )
        );
      }
      if (externalData.artist_tags) {
        track.genres.push(
          ...externalData.artist_tags.filter(
            (tag) => !track.genres.includes(tag)
          )
        );
      }
      if (externalData.similar_artists) {
        track.similar_artists.push(...externalData.similar_artists);
      }
      break;

    case 'musicbrainz':
      if (externalData.country) track.country = externalData.country;
      if (externalData.date) {
        track.year = new Date(externalData.date).getFullYear();
      }
      if (externalData.genres) {
        track.genres.push(
          ...externalData.genres.filter(
            (genre) => !track.genres.includes(genre)
          )
        );
      }
      break;

    case 'acousticbrainz':
      if (externalData.low_level || externalData.high_level) {
        if (!track.analysis) track.analysis = {};

        // Supplement Spotify audio features with AcousticBrainz data
        if (externalData.low_level) {
          if (!track.analysis.tempo)
            track.analysis.tempo = externalData.low_level.tempo;
          if (!track.analysis.key)
            track.analysis.key = externalData.low_level.key;
        }
      }
      break;
    }
  }

  // Calculate compatibility between tracks
  async calculateTrackCompatibility(track1Id, track2Id) {
    const track1 = await this.getFromStore('tracks', track1Id);
    const track2 = await this.getFromStore('tracks', track2Id);

    if (!track1 || !track2) return null;

    let compatibilityScore = 0;
    let factors = 0;

    // Audio features compatibility
    if (track1.analysis && track2.analysis) {
      const audioWeight = 0.4;
      const audioFeatures = [
        'energy',
        'valence',
        'danceability',
        'acousticness',
        'instrumentalness',
      ];

      let audioScore = 0;
      audioFeatures.forEach((feature) => {
        if (
          track1.analysis[feature] !== null &&
          track2.analysis[feature] !== null
        ) {
          const diff = Math.abs(
            track1.analysis[feature] - track2.analysis[feature]
          );
          audioScore += 1 - diff;
        }
      });

      compatibilityScore += (audioScore / audioFeatures.length) * audioWeight;
      factors += audioWeight;
    }

    // Tempo compatibility
    if (track1.analysis?.tempo && track2.analysis?.tempo) {
      const tempoWeight = 0.2;
      const tempoDiff = Math.abs(track1.analysis.tempo - track2.analysis.tempo);
      const tempoScore = Math.max(0, 1 - tempoDiff / 40); // 40 BPM tolerance

      compatibilityScore += tempoScore * tempoWeight;
      factors += tempoWeight;
    }

    // Genre compatibility
    if (track1.genres.length > 0 && track2.genres.length > 0) {
      const genreWeight = 0.3;
      const sharedGenres = track1.genres.filter((g) =>
        track2.genres.includes(g)
      );
      const genreScore =
        sharedGenres.length /
        Math.max(track1.genres.length, track2.genres.length);

      compatibilityScore += genreScore * genreWeight;
      factors += genreWeight;
    }

    // Artist similarity
    if (
      track1.similar_artists.length > 0 &&
      track2.similar_artists.length > 0
    ) {
      const artistWeight = 0.1;
      const sharedArtists = track1.similar_artists.filter(
        (a) =>
          track2.similar_artists.includes(a) ||
          track2.artists.some((ta) => ta.name === a)
      );
      const artistScore =
        sharedArtists.length /
        Math.max(track1.similar_artists.length, track2.similar_artists.length);

      compatibilityScore += artistScore * artistWeight;
      factors += artistWeight;
    }

    const finalScore = factors > 0 ? compatibilityScore / factors : 0;

    // Store compatibility result
    const pairId = [track1Id, track2Id].sort().join('_');
    await this.saveToStore('compatibility', {
      pair_id: pairId,
      track1_id: track1Id,
      track2_id: track2Id,
      compatibility_score: finalScore,
      calculated_at: new Date().toISOString(),
    });

    return finalScore;
  }

  // Smart playlist generation based on compatibility
  async generateCompatiblePlaylist(
    seedTrackId,
    targetSize = 20,
    minCompatibility = 0.6
  ) {
    const allTracks = await this.getAllFromStore('tracks');
    const playlist = [await this.getFromStore('tracks', seedTrackId)];
    const used = new Set([seedTrackId]);

    console.log(
      `🎵 Building compatible playlist starting with: ${playlist[0].name}`
    );

    while (playlist.length < targetSize && playlist.length < allTracks.length) {
      let bestTrack = null;
      let bestScore = 0;

      // Find most compatible track with current playlist
      for (const candidate of allTracks) {
        if (used.has(candidate.id)) continue;

        // Calculate average compatibility with playlist
        let totalScore = 0;
        let comparisons = 0;

        for (const playlistTrack of playlist) {
          const score = await this.calculateTrackCompatibility(
            candidate.id,
            playlistTrack.id
          );
          if (score !== null) {
            totalScore += score;
            comparisons++;
          }
        }

        if (comparisons > 0) {
          const avgScore = totalScore / comparisons;
          if (avgScore > bestScore && avgScore >= minCompatibility) {
            bestScore = avgScore;
            bestTrack = candidate;
          }
        }
      }

      if (bestTrack) {
        playlist.push(bestTrack);
        used.add(bestTrack.id);
        console.log(
          `➕ Added: ${bestTrack.name} (compatibility: ${(bestScore * 100).toFixed(1)}%)`
        );
      } else {
        console.log('🔍 Lowering compatibility threshold...');
        minCompatibility *= 0.9; // Lower threshold if no matches found
      }
    }

    return playlist;
  }

  // Utility functions
  async saveToStore(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            Accept: 'application/json',
            ...options.headers,
          },
        });

        if (response.ok) {
          return response;
        }

        if (response.status === 429) {
          // Rate limited, wait before retry
          const delay = Math.pow(2, i) * 1000;
          console.log(`Rate limited, waiting ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  isDataFresh(timestamp, maxAgeDays) {
    const age = (new Date() - new Date(timestamp)) / (1000 * 60 * 60 * 24);
    return age < maxAgeDays;
  }

  // Export database for backup
  async exportDatabase() {
    const data = {
      tracks: await this.getAllFromStore('tracks'),
      artists: await this.getAllFromStore('artists'),
      external_data: await this.getAllFromStore('external_data'),
      compatibility: await this.getAllFromStore('compatibility'),
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `spotify-music-database-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);

    return data;
  }
}

// Export for use in main script
window.MusicDatabase = MusicDatabase;
