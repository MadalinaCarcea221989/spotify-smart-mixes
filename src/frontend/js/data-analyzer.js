// Data Import and Analysis Tool - Work with Existing Spotify Export
class SpotifyDataAnalyzer {
  constructor() {
    this.userData = null;
    this.tracks = [];
    this.genres = new Map();
    this.artists = new Map();
    this.decades = new Map();
    this.initialized = false;
  }

  // Load data from JSON export
  async loadDataFromFile(fileInput) {
    return new Promise((resolve, reject) => {
      const file = fileInput.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          this.processImportedData(jsonData);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Invalid JSON file: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }

  // Load data from existing user-data.json
  async loadExistingData() {
    try {
      const response = await fetch('./user-data.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();
      this.processImportedData(jsonData);
      console.log('✅ Loaded existing data:', jsonData.totalTracks, 'tracks');
      return jsonData;
    } catch (error) {
      console.error('Failed to load existing data:', error);
      throw error;
    }
  }

  // Process the imported JSON data
  processImportedData(data) {
    this.userData = {
      name: data.user,
      totalTracks: data.totalTracks,
      dataCompleteness: data.dataCompleteness,
      libraryStats: data.libraryStats,
    };

    this.tracks = data.tracks || [];
    this.processGenres(data.topGenres || []);
    this.processArtists();
    this.processDecades();
    this.initialized = true;

    console.log(`📊 Processed ${this.tracks.length} tracks`);
    console.log(`🎵 Found ${this.genres.size} genres`);
    console.log(`🎤 Found ${this.artists.size} artists`);
  }

  // Process genre data
  processGenres(topGenres) {
    this.genres.clear();

    // Add genres from top genres list
    topGenres.forEach((genre) => {
      this.genres.set(genre.genre, {
        name: genre.genre,
        count: genre.count,
        tracks: [],
      });
    });

    // Map tracks to genres
    this.tracks.forEach((track) => {
      if (track.artistGenres) {
        track.artistGenres.forEach((artist) => {
          if (artist.genres) {
            artist.genres.forEach((genre) => {
              if (this.genres.has(genre)) {
                this.genres.get(genre).tracks.push(track);
              }
            });
          }
        });
      }
    });
  }

  // Process artist data
  processArtists() {
    this.artists.clear();

    this.tracks.forEach((track) => {
      const artistName = track.artist;
      if (!this.artists.has(artistName)) {
        this.artists.set(artistName, {
          name: artistName,
          tracks: [],
          genres: new Set(),
          popularity: 0,
          followers: 0,
        });
      }

      const artist = this.artists.get(artistName);
      artist.tracks.push(track);

      // Get artist details from track data
      if (track.artistGenres) {
        const artistData = track.artistGenres.find(
          (a) => a.name === artistName
        );
        if (artistData) {
          artist.popularity = artistData.popularity || 0;
          artist.followers = artistData.followers || 0;
          if (artistData.genres) {
            artistData.genres.forEach((genre) => artist.genres.add(genre));
          }
        }
      }
    });
  }

  // Process decade data
  processDecades() {
    this.decades.clear();

    this.tracks.forEach((track) => {
      if (track.addedAt) {
        const year = new Date(track.addedAt).getFullYear();
        const decade = Math.floor(year / 10) * 10;

        if (!this.decades.has(decade)) {
          this.decades.set(decade, {
            decade,
            tracks: [],
            count: 0,
          });
        }

        this.decades.get(decade).tracks.push(track);
        this.decades.get(decade).count++;
      }
    });
  }

  // Generate smart playlists based on existing data
  generateDataDrivenPlaylists() {
    const playlists = [];

    // Genre-based playlists
    const topGenres = Array.from(this.genres.values())
      .filter((genre) => genre.count >= 20)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    topGenres.forEach((genre) => {
      playlists.push({
        name: `${this.capitalizeGenre(genre.name)} Collection`,
        description: `Your ${genre.count} favorite ${genre.name} tracks`,
        tracks: genre.tracks.slice(0, 50).map((t) => t.spotifyUrl),
        type: 'genre',
        metadata: {
          genre: genre.name,
          trackCount: genre.count,
          avgPopularity: this.calculateAvgPopularity(genre.tracks),
        },
      });
    });

    // Artist-based playlists (for artists with many tracks)
    const topArtists = Array.from(this.artists.values())
      .filter((artist) => artist.tracks.length >= 5)
      .sort((a, b) => b.tracks.length - a.tracks.length)
      .slice(0, 15);

    topArtists.forEach((artist) => {
      playlists.push({
        name: `${artist.name} Deep Dive`,
        description: `All your ${artist.tracks.length} tracks by ${artist.name}`,
        tracks: artist.tracks.slice(0, 50).map((t) => t.spotifyUrl),
        type: 'artist',
        metadata: {
          artist: artist.name,
          trackCount: artist.tracks.length,
          popularity: artist.popularity,
          followers: artist.followers,
        },
      });
    });

    // Popularity-based playlists
    const popularTracks = this.tracks
      .filter((t) => t.popularity >= 70)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 50);

    if (popularTracks.length >= 10) {
      playlists.push({
        name: 'Your Mainstream Hits',
        description: `${popularTracks.length} of your most popular tracks`,
        tracks: popularTracks.map((t) => t.spotifyUrl),
        type: 'popularity',
        metadata: {
          minPopularity: 70,
          avgPopularity: this.calculateAvgPopularity(popularTracks),
        },
      });
    }

    // Hidden gems (low popularity but in your library)
    const hiddenGems = this.tracks
      .filter((t) => t.popularity > 0 && t.popularity <= 40)
      .sort((a, b) => a.popularity - b.popularity)
      .slice(0, 40);

    if (hiddenGems.length >= 10) {
      playlists.push({
        name: 'Hidden Gems',
        description: `${hiddenGems.length} underrated tracks you love`,
        tracks: hiddenGems.map((t) => t.spotifyUrl),
        type: 'hidden_gems',
        metadata: {
          maxPopularity: 40,
          avgPopularity: this.calculateAvgPopularity(hiddenGems),
        },
      });
    }

    // Recent discoveries (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentTracks = this.tracks
      .filter((t) => new Date(t.addedAt) > sixMonthsAgo)
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
      .slice(0, 50);

    if (recentTracks.length >= 10) {
      playlists.push({
        name: 'Recent Discoveries',
        description: `${recentTracks.length} tracks you've added in the last 6 months`,
        tracks: recentTracks.map((t) => t.spotifyUrl),
        type: 'recent',
        metadata: {
          timeframe: '6 months',
          newestTrack: recentTracks[0]?.addedAt,
          oldestTrack: recentTracks[recentTracks.length - 1]?.addedAt,
        },
      });
    }

    // Romanian music (special detection)
    const romanianTracks = this.tracks.filter((track) =>
      this.isRomanianTrack(track)
    );

    if (romanianTracks.length >= 10) {
      playlists.push({
        name: 'Romanian Music Collection',
        description: `${romanianTracks.length} Romanian tracks in your library`,
        tracks: romanianTracks.slice(0, 50).map((t) => t.spotifyUrl),
        type: 'romanian',
        metadata: {
          trackCount: romanianTracks.length,
          mainGenres: this.getTopGenresFromTracks(romanianTracks),
        },
      });
    }

    return playlists;
  }

  // Helper functions
  capitalizeGenre(genre) {
    return genre
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  calculateAvgPopularity(tracks) {
    if (tracks.length === 0) return 0;
    const total = tracks.reduce(
      (sum, track) => sum + (track.popularity || 0),
      0
    );
    return Math.round(total / tracks.length);
  }

  isRomanianTrack(track) {
    const romanianKeywords = ['manele', 'romanian', 'românia', 'bucharest'];
    const trackText =
      `${track.name} ${track.artist} ${track.album}`.toLowerCase();

    // Check for Romanian genres
    if (track.artistGenres) {
      for (const artist of track.artistGenres) {
        if (artist.genres) {
          for (const genre of artist.genres) {
            if (
              romanianKeywords.some((keyword) =>
                genre.toLowerCase().includes(keyword)
              )
            ) {
              return true;
            }
          }
        }
      }
    }

    // Check for Romanian text in track/artist/album
    return romanianKeywords.some((keyword) => trackText.includes(keyword));
  }

  getTopGenresFromTracks(tracks) {
    const genreCount = new Map();

    tracks.forEach((track) => {
      if (track.artistGenres) {
        track.artistGenres.forEach((artist) => {
          if (artist.genres) {
            artist.genres.forEach((genre) => {
              genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
            });
          }
        });
      }
    });

    return Array.from(genreCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));
  }

  // Generate detailed statistics
  generateDetailedStats() {
    if (!this.initialized) {
      throw new Error('Data not loaded. Call loadExistingData() first.');
    }

    return {
      overview: {
        totalTracks: this.tracks.length,
        totalArtists: this.artists.size,
        totalGenres: this.genres.size,
        avgPopularity: this.userData.libraryStats.avgPopularity,
        avgDuration: this.formatDuration(
          this.userData.libraryStats.avgDuration
        ),
      },
      topGenres: Array.from(this.genres.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topArtists: Array.from(this.artists.values())
        .sort((a, b) => b.tracks.length - a.tracks.length)
        .slice(0, 15)
        .map((artist) => ({
          name: artist.name,
          trackCount: artist.tracks.length,
          popularity: artist.popularity,
          followers: artist.followers.toLocaleString(),
          topGenres: Array.from(artist.genres).slice(0, 3),
        })),
      timelineAnalysis: {
        decades: Array.from(this.decades.values()).sort(
          (a, b) => b.decade - a.decade
        ),
        recentActivity: this.analyzeRecentActivity(),
        listeningPattern: this.analyzeListeningPattern(),
      },
    };
  }

  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  analyzeRecentActivity() {
    const last30Days = this.tracks.filter((track) => {
      const addedDate = new Date(track.addedAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return addedDate > thirtyDaysAgo;
    });

    return {
      tracksAdded: last30Days.length,
      avgPerDay: (last30Days.length / 30).toFixed(1),
      topGenres: this.getTopGenresFromTracks(last30Days),
    };
  }

  analyzeListeningPattern() {
    const monthlyStats = new Map();

    this.tracks.forEach((track) => {
      const date = new Date(track.addedAt);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!monthlyStats.has(monthYear)) {
        monthlyStats.set(monthYear, 0);
      }
      monthlyStats.set(monthYear, monthlyStats.get(monthYear) + 1);
    });

    const sortedMonths = Array.from(monthlyStats.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return {
      peakMonth: sortedMonths.reduce((max, current) =>
        current[1] > max[1] ? current : max
      ),
      mostActiveYear: this.getMostActiveYear(),
      consistency: this.calculateListeningConsistency(sortedMonths),
    };
  }

  getMostActiveYear() {
    const yearStats = new Map();

    this.tracks.forEach((track) => {
      const year = new Date(track.addedAt).getFullYear();
      yearStats.set(year, (yearStats.get(year) || 0) + 1);
    });

    return Array.from(yearStats.entries()).sort((a, b) => b[1] - a[1])[0];
  }

  calculateListeningConsistency(monthlyData) {
    if (monthlyData.length < 2) return 'insufficient_data';

    const values = monthlyData.map(([, count]) => count);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    const coefficient = stdDev / avg;

    if (coefficient < 0.3) return 'very_consistent';
    if (coefficient < 0.6) return 'consistent';
    if (coefficient < 1) return 'variable';
    return 'very_variable';
  }
}

// Export for use
window.SpotifyDataAnalyzer = SpotifyDataAnalyzer;
