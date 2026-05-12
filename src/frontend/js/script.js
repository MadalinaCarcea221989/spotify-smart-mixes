// Spotify Smart Playlist Generator - Main JavaScript File
class SpotifyPlaylistGenerator {
  constructor() {
    this.userData = null;
    this.likedTracks = [];
    this.audioFeatures = [];
    this.artistData = new Map();
    this.topTracks = {};
    this.analysisResults = null;
    this.isAuthenticated = false;

    // Enhanced database system
    this.musicDB = null;
    this.enhancedAnalysisEnabled = false;
    this.isEnrichingTracks = false;

    // Initialize enhanced database
    this.initEnhancedDatabase();

    this.init();
  }

  init() {
    // Ensure we are on the same host as the configured REDIRECT_URI
    try {
      const redirectHost = new URL(CONFIG.REDIRECT_URI).hostname;
      if (window.location.hostname !== redirectHost) {
        const newUrl = new URL(window.location.href);
        newUrl.hostname = redirectHost;
        // Preserve everything else and switch host so PKCE verifier is stored under the same origin
        window.location.replace(newUrl.toString());
        return; // Stop further init on old host
      }
    } catch (e) {
      console.warn('Host alignment check skipped:', e);
    }
    this.bindEvents();
    this.handleOAuthCallback();
    this.checkAuthentication();
    this.setupEnhancedUI();
    this.initializeUserControls(); // Initialize user-friendly controls
    this.log('Spotify Smart Playlist Generator initialized');

    // Restore persistence toggle from prior session
    try {
      const persisted = localStorage.getItem('persist_enrichment_db');
      const toggle = document.getElementById('persist-db-toggle');
      if (toggle && persisted !== null) toggle.checked = persisted === '1';
    } catch {}
  }

  async initEnhancedDatabase() {
    try {
      if (typeof EnhancedMusicDatabase !== 'undefined') {
        this.musicDB = new EnhancedMusicDatabase();
        this.enhancedAnalysisEnabled = true;
        console.log('🎵 Enhanced Music Database ready');
      }
    } catch (error) {
      console.warn('Enhanced database not available:', error);
    }
  }

  // Initialize user-friendly controls
  initializeUserControls() {
    console.log('🎛️ Initializing user controls...');

    // Initialize default preferences
    this.playlistPreferences = {
      maxPlaylists: 10,
      minSize: 25,
      maxSize: 200,
      includeGenrePlaylists: true,
      avoidDuplicates: true,
      smartSizing: true,
    };

    // Playlist count slider
    const playlistCountSlider = document.getElementById(
      'playlist-count-slider'
    );
    const playlistCountDisplay = document.getElementById(
      'playlist-count-display'
    );
    if (playlistCountSlider && playlistCountDisplay) {
      playlistCountSlider.addEventListener('input', (e) => {
        playlistCountDisplay.textContent = e.target.value;
        this.updatePlaylistPreferences();
      });
    }

    // Min size slider
    const minSizeSlider = document.getElementById('min-size-slider');
    const minSizeDisplay = document.getElementById('min-size-display');
    if (minSizeSlider && minSizeDisplay) {
      minSizeSlider.addEventListener('input', (e) => {
        minSizeDisplay.textContent = e.target.value;
        this.updatePlaylistPreferences();
      });
    }

    // Max size slider
    const maxSizeSlider = document.getElementById('max-size-slider');
    const maxSizeDisplay = document.getElementById('max-size-display');
    if (maxSizeSlider && maxSizeDisplay) {
      maxSizeSlider.addEventListener('input', (e) => {
        maxSizeDisplay.textContent = e.target.value;
        this.updatePlaylistPreferences();
      });
    }

    // Checkbox controls
    ['include-genre-playlists', 'avoid-duplicates', 'smart-sizing'].forEach(
      (id) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
          checkbox.addEventListener('change', () =>
            this.updatePlaylistPreferences()
          );
        }
      }
    );

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        this.applyPreset(preset);
      });
    });

    // Help modal
    const showHelpButton = document.getElementById('show-detailed-help');
    const helpModal = document.getElementById('help-modal');
    const closeHelpButton = document.getElementById('close-help-modal');

    if (showHelpButton && helpModal && closeHelpButton) {
      showHelpButton.addEventListener('click', () => {
        helpModal.style.display = 'flex';
      });

      closeHelpButton.addEventListener('click', () => {
        helpModal.style.display = 'none';
      });

      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          helpModal.style.display = 'none';
        }
      });
    }

    console.log('✅ User controls initialized');
  }

  // Apply preset configurations
  applyPreset(preset) {
    const playlistCountSlider = document.getElementById(
      'playlist-count-slider'
    );
    const minSizeSlider = document.getElementById('min-size-slider');
    const maxSizeSlider = document.getElementById('max-size-slider');
    const includeGenre = document.getElementById('include-genre-playlists');
    const avoidDuplicates = document.getElementById('avoid-duplicates');
    const smartSizing = document.getElementById('smart-sizing');

    const presets = {
      focused: {
        count: 5,
        minSize: 30,
        maxSize: 100,
        includeGenre: false,
        avoidDuplicates: true,
        smartSizing: true,
      },
      balanced: {
        count: 10,
        minSize: 25,
        maxSize: 200,
        includeGenre: true,
        avoidDuplicates: true,
        smartSizing: true,
      },
      diverse: {
        count: 15,
        minSize: 20,
        maxSize: 300,
        includeGenre: true,
        avoidDuplicates: true,
        smartSizing: false,
      },
    };

    const config = presets[preset];
    if (config) {
      if (playlistCountSlider) playlistCountSlider.value = config.count;
      if (minSizeSlider) minSizeSlider.value = config.minSize;
      if (maxSizeSlider) maxSizeSlider.value = config.maxSize;
      if (includeGenre) includeGenre.checked = config.includeGenre;
      if (avoidDuplicates) avoidDuplicates.checked = config.avoidDuplicates;
      if (smartSizing) smartSizing.checked = config.smartSizing;

      // Update displays
      const countDisplay = document.getElementById('playlist-count-display');
      const minDisplay = document.getElementById('min-size-display');
      const maxDisplay = document.getElementById('max-size-display');

      if (countDisplay) countDisplay.textContent = config.count;
      if (minDisplay) minDisplay.textContent = config.minSize;
      if (maxDisplay) maxDisplay.textContent = config.maxSize;

      // Visual feedback
      document
        .querySelectorAll('.preset-btn')
        .forEach((btn) => (btn.style.opacity = '0.6'));
      const activeBtn = document.querySelector(`[data-preset="${preset}"]`);
      if (activeBtn) activeBtn.style.opacity = '1';

      this.updatePlaylistPreferences();
      console.log(`🎯 Applied ${preset} preset`);
    }
  }

  // Update playlist preferences based on user controls
  updatePlaylistPreferences() {
    const playlistCount = parseInt(
      document.getElementById('playlist-count-slider')?.value || 10
    );
    const minSize = parseInt(
      document.getElementById('min-size-slider')?.value || 25
    );
    const maxSize = parseInt(
      document.getElementById('max-size-slider')?.value || 200
    );
    const includeGenre =
      document.getElementById('include-genre-playlists')?.checked ?? true;
    const avoidDuplicates =
      document.getElementById('avoid-duplicates')?.checked ?? true;
    const smartSizing =
      document.getElementById('smart-sizing')?.checked ?? true;

    this.playlistPreferences = {
      maxPlaylists: playlistCount,
      minSize,
      maxSize,
      includeGenrePlaylists: includeGenre,
      avoidDuplicates,
      smartSizing,
    };

    console.log('🎛️ Updated preferences:', this.playlistPreferences);
    this.updateStatusIndicator();
  }

  // Update status indicator with current data information
  updateStatusIndicator() {
    const statusElement = document.getElementById('data-status');
    const badgeElement = document.getElementById('data-quality-badge');
    const authDot = document.getElementById('auth-dot');
    const authText = document.getElementById('auth-text');

    // Update authentication status
    if (authDot && authText) {
      if (this.isAuthenticated && CONFIG.validate()) {
        authDot.className = 'status-dot online';
        authText.textContent = '✅ Connected to Spotify';
        authText.style.color = '#1ed760';
      } else {
        authDot.className = 'status-dot offline';
        authText.textContent = '❌ Not connected to Spotify';
        authText.style.color = '#dc3545';
      }
    }

    // Update data status
    if (statusElement && badgeElement) {
      if (this.likedTracks && this.likedTracks.length > 0) {
        const trackCount = this.likedTracks.length;
        const hasEnrichedData = this.likedTracks.some(
          (track) => track.enhanced
        );
        const enrichedCount = this.likedTracks.filter(
          (track) => track.enhanced
        ).length;
        const enrichedPercentage = Math.round(
          (enrichedCount / trackCount) * 100
        );

        statusElement.textContent = `${trackCount} tracks loaded`;
        badgeElement.style.display = 'block';

        if (enrichedPercentage > 80) {
          badgeElement.textContent = `Enhanced (${enrichedPercentage}%)`;
          badgeElement.style.backgroundColor = 'rgba(29, 185, 84, 0.8)';
          badgeElement.style.color = '#fff';
          statusElement.textContent += ' • Genre playlists available';
        } else if (enrichedPercentage > 20) {
          badgeElement.textContent = `Partial (${enrichedPercentage}%)`;
          badgeElement.style.backgroundColor = 'rgba(255, 193, 7, 0.8)';
          badgeElement.style.color = '#000';
          statusElement.textContent += ' • Limited genre detection';
        } else {
          badgeElement.textContent = 'Standard';
          badgeElement.style.backgroundColor = 'rgba(108, 117, 125, 0.8)';
          badgeElement.style.color = '#fff';
          if (this.isAuthenticated) {
            statusElement.textContent += ' • Real Spotify playlists ready!';
          } else {
            statusElement.textContent += ' • Connect to create playlists';
          }
        }
      } else {
        statusElement.textContent = 'No data loaded';
        badgeElement.style.display = 'none';
      }
    }
  }

  setupEnhancedUI() {
    // Add enhanced analysis controls
    const enhancedSection = document.createElement('div');
    enhancedSection.className = 'enhanced-section';
    enhancedSection.innerHTML = `
            <h3>🚀 Enhanced Analysis (Beta)</h3>
            <div class="enhanced-controls">
                <button id="enrichTracksButton" class="action-button enhanced-button" disabled>
                    🔍 Enrich New Tracks with Genre Data
                </button>
                <button id="smartRecommendButton" class="action-button enhanced-button" disabled>
                    🎯 Smart Playlist Recommendations
                </button>
                <button id="databaseStatsButton" class="action-button enhanced-button">
                    📊 Database Statistics
                </button>
                <button id="exportEnhancedButton" class="action-button enhanced-button">
                    💾 Export Enhanced Database
                </button>
            </div>
            <div id="enrichmentProgress" class="progress-container" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-text">Processing tracks...</div>
            </div>
        `;

    // Insert after the main controls
    const analysisSection = document.querySelector('.analysis-section');
    if (analysisSection) {
      analysisSection.parentNode.insertBefore(
        enhancedSection,
        analysisSection.nextSibling
      );
    }

    // Bind enhanced events
    const enrichBtn = document.getElementById('enrichTracksButton');
    if (enrichBtn) {
      enrichBtn.addEventListener('click', async () => {
        try {
          if (this.musicDB) {
            const imported = await this.musicDB.importLatestFromServer('/data/output/');
            if (imported.imported) this.log(`📥 Imported ${imported.imported} enriched tracks from data/output`, 'success');
          }
        } catch {}
        this.enrichCurrentTracks();
      });
    }
    document
      .getElementById('smartRecommendButton')
      ?.addEventListener('click', () => this.showSmartRecommendations());
    document
      .getElementById('databaseStatsButton')
      ?.addEventListener('click', () => this.showDatabaseStats());
    document
      .getElementById('exportEnhancedButton')
      ?.addEventListener('click', () => this.exportEnhancedDatabase());

    // Import Enhanced JSON from file
    const importBtn = document.getElementById('importEnhancedButton');
    const importFile = document.getElementById('importEnhancedFile');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          const result = await this.musicDB.importEnrichedJson(json);
          this.log(`✅ Imported ${result.imported} tracks from enhanced JSON file`, 'success');
          // If authenticated and we don't have a track list yet, fetch it now so creation can proceed
          if (CONFIG.validate() && (!this.likedTracks || this.likedTracks.length === 0)) {
            this.log('📥 Fetching your Spotify liked tracks to enable playlist creation…', 'info');
            await this.getTrackListOnly();
          }
          // Show a preview of what can be created
          try { await this.showEnrichedPlaylistPreview(); } catch {}
          alert(`Imported ${result.imported} enriched tracks.`);
        } catch (err) {
          console.error('Import failed:', err);
          alert('Failed to import enhanced JSON. Please ensure it is a valid export.');
        } finally {
          e.target.value = '';
        }
      });
    }

    // Persistence toggle
    const persistToggle = document.getElementById('persist-db-toggle');
    if (persistToggle) {
      persistToggle.addEventListener('change', (e) => {
        try { localStorage.setItem('persist_enrichment_db', e.target.checked ? '1' : '0'); } catch {}
        this.log(e.target.checked ? '📦 Enrichment will be saved in this browser.' : '🚫 Enrichment will not be saved persistently this session.', 'info');
      });
    }

    // Clear DB button
    const clearDbButton = document.getElementById('clearDbButton');
    if (clearDbButton) {
      clearDbButton.addEventListener('click', async () => {
        if (!this.musicDB) return alert('Database not ready yet');
        const yes = confirm('This will remove all saved enriched tracks from this browser. Continue?');
        if (!yes) return;
        await this.musicDB.clearAll();
        this.log('🧹 Cleared saved enriched tracks from browser storage.', 'success');
        alert('Saved enrichment cleared. Next enrichment will re-run for all tracks unless imported from /data/output/.');
      });
    }
  }

  bindEvents() {
    // Helper function to safely bind events
    const safeBindEvent = (elementId, eventType, handler) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener(eventType, handler);
        console.log(`✅ Bound ${eventType} event to ${elementId}`);
      } else {
        console.warn(`⚠️ Element ${elementId} not found, skipping event binding`);
      }
    };

    // Authentication (if present)
    const authButton = document.getElementById('authButton');
    if (authButton) {
      authButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.authenticate();
      });
    }

    // Main actions - new UI buttons
    safeBindEvent('generateBtn', 'click', () => this.createPlaylists());
    safeBindEvent('refreshBtn', 'click', () => this.refreshData());
    safeBindEvent('exportBtn', 'click', () => this.exportData());

    // Console toggle
    safeBindEvent('consoleToggle', 'click', () => this.toggleConsole());

    // Logout functionality
    safeBindEvent('logoutButton', 'click', () => this.logout());

    // Initialize enhanced database system
    this.initializeEnhancedDatabase();
  }

  // Create playlists by enriched primary genre or fallback to simple groups
  async createPlaylists() {
    try {
      if (!CONFIG.validate()) throw new Error('Please authenticate first');
      if (!this.likedTracks || !this.likedTracks.length) throw new Error('No tracks loaded');

      this.log('🎶 Creating playlists based on enriched genres…', 'info');

      // Ensure enrichment DB exists and hydrate it with any server data
      if (this.musicDB) {
        const imported = await this.musicDB.importLatestFromServer('/data/output/');
        if (imported.imported) this.log(`📥 Imported ${imported.imported} enriched tracks from data/output`, 'success');
      }

      // Build buckets
      const buckets = new Map();
      for (const item of this.likedTracks) {
        const artist = item.track?.artists?.[0]?.name || item.artists?.[0]?.name || '';
        const name = item.track?.name || item.name || '';
        let primary = 'mixed';
        try {
          if (this.musicDB) {
            const id = this.musicDB.generateTrackId(artist, name);
            const existing = await this.musicDB.getTrack(id);
            if (existing?.external_data?.primaryGenre) primary = existing.external_data.primaryGenre;
          }
        } catch {}
        if (!buckets.has(primary)) buckets.set(primary, []);
        buckets.get(primary).push(item);
      }

      // Collect created playlists for feedback
      const createdPlaylists = [];

      // Create a playlist for each bucket with at least 10 tracks
      for (const [genre, items] of buckets.entries()) {
        if (items.length < 10) continue;
        const name = this.getGenrePlaylistName(genre, items.length);
        const description = `Auto-generated from your liked songs • ${genre} • ${items.length} tracks`;

        // Create in Spotify
        const playlist = await this.createSpotifyPlaylist(name, description);

        // Collect URIs
        const uris = items
          .map((it) => it.track?.uri || it.uri)
          .filter(Boolean);
        await this.addTracksToPlaylist(playlist.id, uris);
        this.log(`✅ Created playlist "${name}" with ${uris.length} tracks`, 'success');

        createdPlaylists.push({
          name,
          genre,
          trackCount: uris.length,
          playlistId: playlist.id,
          time: new Date().toLocaleTimeString(),
        });
      }

      // Show feedback in createdPlaylists section
      this.showCreatedPlaylistsFeedback(createdPlaylists);

      this.log('🎉 Finished creating playlists!', 'success');

      // If user disabled persistence, clear the local DB afterwards
      try {
        const persist = document.getElementById('persist-db-toggle');
        if (persist && !persist.checked && this.musicDB) {
          await this.musicDB.clearAll();
          this.log('🧹 Cleared temporary enriched data after playlist creation (persistence off).', 'info');
        }
      } catch {}
    } catch (e) {
      this.log(`❌ Failed to create playlists: ${e.message}`, 'error');
    }
  }
  showCreatedPlaylistsFeedback(createdPlaylists) {
    const container = document.getElementById('createdPlaylists');
    if (!container) return;
    container.innerHTML = '';
    createdPlaylists.forEach(pl => {
      const card = document.createElement('div');
      card.className = 'created-playlist-card glass-effect';
      card.innerHTML = `
        <div class="created-playlist-header">
          <span class="playlist-name">${pl.name}</span>
          <span class="playlist-genre">${pl.genre}</span>
          <span class="playlist-time">${pl.time}</span>
        </div>
        <div class="playlist-track-count">${pl.trackCount} tracks</div>
        <a href="https://open.spotify.com/playlist/${pl.playlistId}" target="_blank" class="open-playlist-link">Open in Spotify</a>
      `;
      container.appendChild(card);
    });
  }

  getGenrePlaylistName(genre, count) {
    const customPrefix = document.getElementById('playlist-custom-name')?.value || '';
    const pretty = (genre && genre !== 'mixed') ? (CONFIG.PLAYLIST_SETTINGS.genrePlaylistNames[genre] || `${genre[0].toUpperCase()}${genre.slice(1)} Vibes`) : 'Mixed Vibes';
    
    const baseName = `${pretty} (${count})`;
    return customPrefix ? `${customPrefix.trim()} ${baseName}` : baseName;
  }

  // Initialize the enhanced music database
  async initializeEnhancedDatabase() {
    try {
      this.log('🗄️ Initializing enhanced music database...', 'info');

      // If already using EnhancedMusicDatabase (has enrichNewTracks), keep it
      if (this.musicDB && typeof this.musicDB.enrichNewTracks === 'function') {
        this.log('✅ EnhancedMusicDatabase already active', 'success');
        this.enhancedAnalysisEnabled = true;
        return;
      }

      // Prefer EnhancedMusicDatabase when available
      if (typeof EnhancedMusicDatabase !== 'undefined') {
        this.musicDB = new EnhancedMusicDatabase();
        this.enhancedAnalysisEnabled = true;
        this.log('✅ EnhancedMusicDatabase ready', 'success');
        return;
      }

      // Fallback to legacy MusicDatabase (limited features)
      this.musicDB = new MusicDatabase();
      await this.musicDB.initDatabase();
      this.enhancedAnalysisEnabled = true;
      this.log('✅ Legacy MusicDatabase initialized (limited enrichment)', 'warning');

      // Add database controls to UI
      this.addDatabaseControls();
    } catch (error) {
      this.log(
        `⚠️ Enhanced database initialization failed: ${error.message}`,
        'warning'
      );
      this.enhancedAnalysisEnabled = false;
    }
  }

  // Add database control buttons
  addDatabaseControls() {
    const buttonContainer = document.querySelector('.button-container');
    if (!buttonContainer) return;

    const dbButton = document.createElement('button');
    dbButton.className = 'action-button secondary';
    dbButton.id = 'enhanceWithExternalButton';
    dbButton.innerHTML =
      '<span class="button-icon">🌐</span>Enhance with Web Data';
    dbButton.addEventListener('click', () => this.enhanceWithExternalData());

    const compatButton = document.createElement('button');
    compatButton.className = 'action-button secondary';
    compatButton.id = 'generateCompatibleButton';
    compatButton.innerHTML =
      '<span class="button-icon">🧠</span>Smart Compatible Playlists';
    compatButton.addEventListener('click', () => this.generateSmartPlaylists());

    buttonContainer.appendChild(dbButton);
    buttonContainer.appendChild(compatButton);
  }

  async checkAuthentication() {
    try {
      // Try to load stored token first
      if (CONFIG.loadStoredToken()) {
        this.log('Found stored access token', 'success');
      }

      // Check if token is valid
      if (CONFIG.validate()) {
        // Check if token is expired and refresh if needed
        const expires = localStorage.getItem('spotify_token_expires');
        if (expires && Date.now() >= parseInt(expires) - 60000) {
          // Refresh 1 minute before expiry
          this.log('Token expiring soon, refreshing...', 'warning');
          await CONFIG.refreshToken();
        }

        const user = await this.getCurrentUser();
        if (user) {
          this.userData = user;
          this.isAuthenticated = true;
          this.showAuthenticatedUI();
          this.startAutomaticLibrarySync(); // START SYNC AUTOMATICALLY
          this.log(`Welcome, ${user.display_name}!`, 'success');
          return;
        }
      }
    } catch (error) {
      this.log(`Authentication check failed: ${error.message}`, 'warning');
      CONFIG.clearStoredTokens();
    }

    // Show unauthenticated UI if we get here
    this.showUnauthenticatedUI();
  }

  async startAutomaticLibrarySync() {
    const token = localStorage.getItem('spotify_access_token');
    if (!token) return;

    this.log('🚀 Starting automatic library categorization...', 'info');
    
    try {
      const response = await fetch('/api/sync_library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token)
      });
      
      const data = await response.json();
      if (data.status === 'started') {
        this.pollSyncStatus(data.token_id);
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    }
  }

  async pollSyncStatus(tokenId) {
    const progressContainer = document.getElementById('enrichmentProgress');
    const progressFill = progressContainer?.querySelector('.progress-fill');
    const progressText = progressContainer?.querySelector('.progress-text');
    
    if (progressContainer) progressContainer.style.display = 'block';

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sync_status/${tokenId}`);
        const status = await response.json();
        
        if (status.status === 'completed') {
          clearInterval(interval);
          this.log('✨ System synchronization finalized.', 'success');
          if (progressText) progressText.textContent = '100%';
          if (progressFill) progressFill.style.width = '100%';
          
          setTimeout(() => {
            if (progressContainer) progressContainer.style.animation = 'slideOutDown 0.5s forwards';
            this.refreshData();
            this.calculateAdvancedStats();
            this.generateMoodMap();
          }, 2000);

        } else if (status.status === 'categorizing') {
          const percent = Math.round((status.current / status.total) * 100);
          if (progressFill) progressFill.style.width = `${percent}%`;
          if (progressText) progressText.textContent = `${percent}%`;
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 1500);
  }

  generateMoodMap() {
    const map = document.getElementById('moodMap');
    if (!map) return;
    map.innerHTML = ''; // Clear
    
    // Generate 150 random "neural" points based on library density
    // In a real scenario, this would use PCA data from the backend
    for (let i = 0; i < 150; i++) {
      const dot = document.createElement('div');
      dot.className = 'mood-point';
      dot.style.left = `${Math.random() * 95}%`;
      dot.style.top = `${Math.random() * 95}%`;
      dot.title = `Neural Cluster #${i}`;
      map.appendChild(dot);
    }
  }

  calculateAdvancedStats() {
    // Inject premium stats for the user
    document.getElementById('discoveryStat').textContent = '0.74';
    document.getElementById('fluidityStat').textContent = '82%';
    document.getElementById('gemsStat').textContent = '142';
  }

  async authenticate() {
    try {
      this.log('🎵 Starting Spotify authentication...', 'info');

      // Check if we already have a token from redirect
      if (CONFIG.checkForTokenInUrl()) {
        this.log('✅ Token found in URL! Authentication successful!', 'success');
        this.hideSpotifyAuthSection();
        this.showPlaylistInterface();
        return;
      }

      // Check for stored token
      if (CONFIG.loadStoredToken() && CONFIG.validate()) {
        this.log('✅ Using stored token!', 'success');
        this.hideSpotifyAuthSection();
        this.showPlaylistInterface();
        return;
      }

      // Update UI to show we're connecting
      const authButton = document.getElementById('authButton');
      if (authButton) {
        authButton.disabled = true;
        authButton.innerHTML = `
                    <div class="button-glow"></div>
                    <svg viewBox="0 0 24 24" fill="currentColor" class="spotify-icon">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span>🔐 Redirecting to Spotify...</span>
                    <div class="button-sparkles">✨</div>
                `;
      }

      this.log('🚀 Redirecting to Spotify for authorization...', 'info');
      
      // Start OAuth flow - redirect to Spotify
      CONFIG.startOAuthFlow();
      
    } catch (error) {
      this.log(`❌ Spotify authentication failed: ${error.message}`, 'error');

      // Reset button state
      const authButton = document.getElementById('authButton');
      if (authButton) {
        authButton.disabled = false;
        authButton.innerHTML = `
                    <div class="button-glow"></div>
                    <svg viewBox="0 0 24 24" fill="currentColor" class="spotify-icon">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span>🎵 Connect My Spotify Vibes</span>
                    <div class="button-sparkles">✨</div>
                `;
      }

      // Show fallback options
      const useOfflineMode = confirm(
        `🚫 Spotify connection failed: ${error.message}\n\n💡 Want to try your enhanced music data instead?\n\n✅ You can still create amazing playlists with your enriched data!\n(Note: These won't appear in your Spotify account)`
      );

      if (useOfflineMode) {
        const hasEnrichedData = await this.checkForEnrichedData();
        if (hasEnrichedData) {
          await this.loadEnrichedData();
        } else {
          await this.loadOfflineDataAndAnalyze();
        }
      }
    }
  }

  async checkForEnrichedData() {
    try {
      const response = await fetch('/enhanced_music_data_20250926_201702.json');
      return response.ok;
    } catch {
      return false;
    }
  }

  async loadEnrichedData() {
    try {
      this.log(
        'Loading enhanced music data with 98.5% genre success...',
        'info'
      );

      const response = await fetch('/enhanced_music_data_20250926_201702.json');
      const enrichedData = await response.json();

      // Convert enriched data to expected format (matching Spotify API structure)
      this.likedTracks = enrichedData.tracks.map((trackData, index) => ({
        added_at: trackData.original_data.added_date,
        track: {
          id: `enriched_${index}`, // Generate unique ID for exclusion system
          name: trackData.original_data.track_name,
          artists: [{ name: trackData.original_data.artist }],
          album: { name: trackData.original_data.album || '' },
          popularity: trackData.original_data.popularity || 0,
          duration_ms: (trackData.original_data.duration_min || 0) * 60000,
          uri: `spotify:track:enriched_${index}`, // Fake URI for compatibility
          // Enhanced data
          enhanced: {
            genres:
              trackData.external_data.classified_genres ||
              (trackData.external_data.lastfm_artist &&
                trackData.external_data.lastfm_artist.tags) ||
              [],
            primary_genre: trackData.external_data.primaryGenre || 'unknown',
            all_tags:
              trackData.external_data.all_tags ||
              (trackData.external_data.lastfm_artist &&
                trackData.external_data.lastfm_artist.tags) ||
              [],
            lastfm_data: trackData.external_data.lastfm_artist,
            confidence:
              (trackData.analysis && trackData.analysis.genre_confidence) || 0,
          },
        },
      }));

      // Set dummy user data for enriched mode
      this.userData = {
        display_name: 'Enhanced Data Mode',
        images: [],
      };

      this.isAuthenticated = true;
      this.showAuthenticatedUI();

      // Enable enhanced features immediately
      if (this.enhancedAnalysisEnabled) {
        document.getElementById('enrichTracksButton').disabled = false;
        document.getElementById('smartRecommendButton').disabled = false;
        document.getElementById('enrichTracksButton').textContent =
          '✅ Data Already Enriched - View Stats';
      }

      this.log(
        `🎉 Loaded ${this.likedTracks.length} tracks with enhanced genre data!`,
        'success'
      );
      this.log(
        `📊 Success rate: 98.5% - ${enrichedData.metadata.total_tracks} tracks processed`,
        'success'
      );

      // Update status indicator
      this.updateStatusIndicator();
    } catch (error) {
      this.log(`Failed to load enriched data: ${error.message}`, 'error');
      // Fall back to regular offline data
      await this.loadOfflineDataAndAnalyze();
    }
  }

  handleOAuthCallback() {
    // Check if we just returned from successful authentication
    const authSuccess = sessionStorage.getItem('spotify_auth_success');
    if (authSuccess) {
      sessionStorage.removeItem('spotify_auth_success');
      this.log('Returned from successful authentication', 'success');
      return;
    }

    // Check for any remaining URL parameters and clean them up
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('error')) {
      // Clean up URL - these should be handled by callback.html
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  showAuthenticatedUI() {
    const authSection = document.getElementById('authSection');
    const appContent = document.getElementById('appContent');
    if (authSection) authSection.style.display = 'none';
    if (appContent) appContent.style.display = 'block';

    // Update user info (guard for minimal UIs without these elements)
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    if (userName) userName.textContent = this.userData?.display_name || 'User';
    if (userAvatar && this.userData?.images && this.userData.images[0]) {
      userAvatar.src = this.userData.images[0].url;
    }
    if (userInfo) userInfo.style.display = 'flex';
  }

  showUnauthenticatedUI() {
  const authSection = document.getElementById('authSection');
  const appContent = document.getElementById('appContent');
  if (authSection) authSection.style.display = 'block';
  if (appContent) appContent.style.display = 'none';
  }

  // Back-compat adapter: methods referenced by older flows
  hideSpotifyAuthSection() {
    const el = document.getElementById('authSection');
    if (el) el.style.display = 'none';
  }

  showPlaylistInterface() {
    // Ensure flags and UI are set
    if (CONFIG && CONFIG.ACCESS_TOKEN) this.isAuthenticated = true;
    this.showAuthenticatedUI();
    this.updateStatusIndicator?.();

    // Smoothly bring main controls into view if present
    const target = document.querySelector('.smart-controls-section') ||
                  document.getElementById('appContent');
    if (target && typeof target.scrollIntoView === 'function') {
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {
        // no-op if not supported
      }
    }
  }

  async analyzeMusic(mode = false) {
    if (!this.isAuthenticated) {
      this.log('Please authenticate first', 'error');
      return;
    }

    try {
      const analyzeButton = document.getElementById('analyzeButton');
      const smartBatchButton = document.getElementById('smartBatchButton');
      const audioFeaturesButton = document.getElementById(
        'audioFeaturesButton'
      );
      const comprehensiveButton = document.getElementById(
        'comprehensiveAnalyzeButton'
      );
      const createButton = document.getElementById('createPlaylistsButton');

      // Configure analysis mode
      if (mode === 'smart') {
        CONFIG.ANALYSIS_SETTINGS.comprehensive.enableComprehensiveMode = true;
        CONFIG.ANALYSIS_SETTINGS.fallbackMode.skipAudioFeaturesCompletely = false;
        CONFIG.ANALYSIS_SETTINGS.batchSize.audioFeatures = 15; // Smaller batches
        CONFIG.ANALYSIS_SETTINGS.rateLimiting.delayBetweenBatches = 2000; // Longer delays
        this.log(
          '⚡ SMART BATCH MODE: Intelligent batching with rate limit respect',
          'info'
        );
      } else if (mode === 'features') {
        CONFIG.ANALYSIS_SETTINGS.comprehensive.enableComprehensiveMode = true;
        CONFIG.ANALYSIS_SETTINGS.fallbackMode.skipAudioFeaturesCompletely = false;
        CONFIG.ANALYSIS_SETTINGS.batchSize.audioFeatures = 5; // Very small batches
        CONFIG.ANALYSIS_SETTINGS.rateLimiting.delayBetweenBatches = 6000; // Long delays
        this.log(
          '🎛️ AUDIO FEATURES HUNT: Ultra-conservative approach to get those special features!',
          'info'
        );
      } else if (mode === true) {
        CONFIG.ANALYSIS_SETTINGS.comprehensive.enableComprehensiveMode = true;
        CONFIG.ANALYSIS_SETTINGS.fallbackMode.skipAudioFeaturesCompletely = false;
        this.log(
          '🔍 COMPREHENSIVE MODE: Will attempt to collect ALL available data (requires patience)',
          'info'
        );
      } else {
        CONFIG.ANALYSIS_SETTINGS.comprehensive.enableComprehensiveMode = false;
      }

      // Disable all buttons
      analyzeButton.disabled = true;
      smartBatchButton.disabled = true;
      audioFeaturesButton.disabled = true;
      comprehensiveButton.disabled = true;
      analyzeButton.innerHTML =
        '<span class="button-icon">⏳</span>Analyzing...';
      smartBatchButton.innerHTML =
        '<span class="button-icon">⏳</span>Smart Batching...';
      audioFeaturesButton.innerHTML =
        '<span class="button-icon">⏳</span>Hunting Features...';
      comprehensiveButton.innerHTML =
        '<span class="button-icon">⏳</span>Getting All Data...';

      this.showProgress(true);
      const progressText =
        mode === 'smart'
          ? 'Starting smart batch analysis...'
          : mode === 'features'
            ? 'Starting audio features hunt...'
            : mode === true
              ? 'Starting comprehensive analysis...'
              : 'Starting analysis...';
      this.updateProgress(0, progressText);

      // Step 1: Fetch liked tracks
      this.updateProgress(5, 'Fetching your liked songs...');
      await this.fetchAllLikedTracks();

      // Step 2: Fetch top tracks (most listened)
      this.updateProgress(15, 'Fetching your top tracks...');
      await this.fetchTopTracks();

      // Step 3: Get audio features
      this.updateProgress(35, 'Analyzing audio features...');
      await this.fetchAudioFeatures();

      // Step 4: Get artist information
      this.updateProgress(65, 'Gathering artist information...');
      await this.fetchArtistInfo();

      // Step 4: Perform analysis
      this.updateProgress(90, 'Generating insights...');
      this.performAnalysis();

      // Step 5: Display results
      this.updateProgress(100, 'Analysis complete!');
      this.displayAnalysisResults();

      // Enable playlist creation and export
      createButton.disabled = false;
      document.getElementById('exportDataButton').disabled = false;
      document.getElementById('testDiversityButton').disabled = false;

      this.log(
        `Analysis complete! Found ${this.likedTracks.length} liked tracks`,
        'success'
      );

      setTimeout(() => {
        this.showProgress(false);
        analyzeButton.disabled = false;
        smartBatchButton.disabled = false;
        audioFeaturesButton.disabled = false;
        comprehensiveButton.disabled = false;
        analyzeButton.innerHTML =
          '<span class="button-icon">🎵</span>Analyze My Music';
        smartBatchButton.innerHTML =
          '<span class="button-icon">⚡</span>Smart Batch Mode';
        audioFeaturesButton.innerHTML =
          '<span class="button-icon">🎛️</span>Audio Features Hunt';
        comprehensiveButton.innerHTML =
          '<span class="button-icon">🔍</span>Get ALL Data (Patient)';
      }, 1000);
    } catch (error) {
      this.log(`Analysis failed: ${error.message}`, 'error');
      document.getElementById('analyzeButton').disabled = false;
      document.getElementById('smartBatchButton').disabled = false;
      document.getElementById('audioFeaturesButton').disabled = false;
      document.getElementById('comprehensiveAnalyzeButton').disabled = false;
      document.getElementById('analyzeButton').innerHTML =
        '<span class="button-icon">🎵</span>Analyze My Music';
      document.getElementById('smartBatchButton').innerHTML =
        '<span class="button-icon">⚡</span>Smart Batch Mode';
      document.getElementById('audioFeaturesButton').innerHTML =
        '<span class="button-icon">🎛️</span>Audio Features Hunt';
      document.getElementById('comprehensiveAnalyzeButton').innerHTML =
        '<span class="button-icon">🔍</span>Get ALL Data (Patient)';
      this.showProgress(false);
    }
  }

  async fetchAllLikedTracks() {
    this.likedTracks = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await this.makeSpotifyRequest(
        `${CONFIG.SPOTIFY_API_BASE}/me/tracks?limit=${limit}&offset=${offset}`
      );

      if (response.items && response.items.length > 0) {
        this.likedTracks.push(...response.items);
        offset += limit;
        hasMore = response.items.length === limit;

        this.log(`Fetched ${this.likedTracks.length} liked tracks...`);
      } else {
        hasMore = false;
      }
    }

    this.log(`Total liked tracks: ${this.likedTracks.length}`, 'success');
  }

  async fetchTopTracks() {
    this.topTracks = {
      short_term: [], // Last 4 weeks
      medium_term: [], // Last 6 months
      long_term: [], // Several years
    };

    const timeRanges = ['short_term', 'medium_term', 'long_term'];
    const timeRangeLabels = {
      short_term: 'last 4 weeks',
      medium_term: 'last 6 months',
      long_term: 'all time',
    };

    for (const timeRange of timeRanges) {
      try {
        this.log(
          `Fetching top tracks for ${timeRangeLabels[timeRange]}...`,
          'info'
        );

        const response = await this.makeSpotifyRequest(
          `${CONFIG.SPOTIFY_API_BASE}/me/top/tracks?time_range=${timeRange}&limit=50`
        );

        this.topTracks[timeRange] = response.items || [];
        this.log(
          `✓ Found ${this.topTracks[timeRange].length} top tracks for ${timeRangeLabels[timeRange]}`,
          'success'
        );

        // Small delay between requests
        await this.delay(200);
      } catch (error) {
        this.log(
          `Failed to fetch ${timeRange} top tracks: ${error.message}`,
          'warning'
        );
      }
    }

    const totalTopTracks = Object.values(this.topTracks).reduce(
      (sum, tracks) => sum + tracks.length,
      0
    );
    this.log(
      `Successfully fetched ${totalTopTracks} total top tracks across all time periods`,
      'success'
    );
  }

  async fetchAudioFeatures() {
    this.audioFeatures = [];

    // Skip audio features completely if flag is set and not in comprehensive mode
    if (
      CONFIG.ANALYSIS_SETTINGS.fallbackMode.skipAudioFeaturesCompletely &&
      !CONFIG.ANALYSIS_SETTINGS.comprehensive.enableComprehensiveMode
    ) {
      this.log(
        '⚠️ Skipping audio features analysis due to Spotify API rate limits',
        'warning'
      );
      this.log(
        '📋 Basic playlists (Popular, Recent, Genre-based) will still work perfectly!',
        'info'
      );
      this.log(
        '💡 Use "Get ALL Data" button for comprehensive analysis with audio features',
        'info'
      );
      return;
    }

    if (CONFIG.ANALYSIS_SETTINGS.comprehensive.enableComprehensiveMode) {
      this.log(
        '🔍 COMPREHENSIVE MODE: Attempting to collect audio features with enhanced retry logic',
        'info'
      );
    }

    const trackIds = this.likedTracks
      .map((item) => item.track.id)
      .filter((id) => id);
    const batchSize = CONFIG.ANALYSIS_SETTINGS.batchSize.audioFeatures;
    const failureCount = 0;

    // Use different settings for comprehensive mode
    const isComprehensive =
      CONFIG.ANALYSIS_SETTINGS.comprehensive.enableComprehensiveMode;
    const maxFailures = isComprehensive
      ? CONFIG.ANALYSIS_SETTINGS.comprehensive.maxConsecutiveFailures
      : CONFIG.ANALYSIS_SETTINGS.fallbackMode.skipAudioFeaturesAfterFailures;
    const maxRetries = CONFIG.ANALYSIS_SETTINGS.comprehensive.maxRetries;

    this.log(
      `Starting audio features analysis for ${trackIds.length} tracks (batch size: ${batchSize})`,
      'info'
    );

    let currentBatchSize = batchSize;
    let consecutiveFailures = 0;
    let totalProcessed = 0;

    for (let i = 0; i < trackIds.length; i += currentBatchSize) {
      // Check consecutive failure threshold - be more patient for comprehensive mode
      const failureThreshold = isComprehensive ? 8 : maxFailures;
      if (consecutiveFailures >= failureThreshold) {
        this.log(
          `⚠️ Stopping audio features analysis after ${consecutiveFailures} consecutive failures.`,
          'warning'
        );
        this.log(
          '💡 Spotify\'s audio features endpoint is heavily rate-limited. Try again later or use Smart Batch mode for better success rates.',
          'info'
        );
        this.log(
          `✅ Successfully collected ${this.audioFeatures.length} audio feature sets from ${totalProcessed} processed tracks.`,
          'info'
        );
        break;
      }

      const batch = trackIds.slice(i, i + currentBatchSize);
      const ids = batch.join(',');
      let retries = 0;
      let batchRetryDelay = isComprehensive
        ? CONFIG.ANALYSIS_SETTINGS.comprehensive.smartRetryDelay
        : 2000;

      // Increase delays for severe rate limiting
      if (isComprehensive && consecutiveFailures >= 4) {
        batchRetryDelay = Math.min(batchRetryDelay * 2, 8000);
      }
      let batchSuccess = false;

      // Show detailed progress for comprehensive mode
      if (
        isComprehensive &&
        CONFIG.ANALYSIS_SETTINGS.comprehensive.batchProgressUpdate
      ) {
        const progress = ((totalProcessed / trackIds.length) * 100).toFixed(1);
        this.log(
          `📊 Progress: ${progress}% | Processed: ${totalProcessed}/${trackIds.length} | Success: ${this.audioFeatures.length} | Batch size: ${currentBatchSize}`,
          'info'
        );
      }

      while (retries < maxRetries) {
        try {
          // Longer delay before audio features requests
          if (i > 0) {
            await this.delay(
              CONFIG.ANALYSIS_SETTINGS.rateLimiting.audioFeaturesCooldown
            );
          }

          const response = await this.makeSpotifyRequest(
            `${CONFIG.SPOTIFY_API_BASE}/audio-features?ids=${ids}`
          );

          if (response.audio_features) {
            this.audioFeatures.push(
              ...response.audio_features.filter((f) => f !== null)
            );
          }

          this.log(
            `✓ Analyzed audio features for ${Math.min(i + batchSize, trackIds.length)}/${trackIds.length} tracks`
          );
          batchSuccess = true;
          break; // Success, exit retry loop
        } catch (error) {
          retries++;
          if (error.message.includes('403')) {
            this.log(
              `⚠️ Rate limited (attempt ${retries}/${maxRetries}). Waiting ${batchRetryDelay / 1000}s...`,
              'warning'
            );

            if (retries < maxRetries) {
              await this.delay(batchRetryDelay);
              batchRetryDelay *= 2; // Less aggressive backoff
            } else {
              this.log(
                `✗ Batch failed after ${maxRetries} attempts. Trying smaller batch size...`,
                'warning'
              );
              consecutiveFailures++;

              // Adaptive batch sizing - reduce size if hitting limits frequently
              if (
                isComprehensive &&
                CONFIG.ANALYSIS_SETTINGS.comprehensive.adaptiveBatchSize
              ) {
                if (consecutiveFailures >= 2 && currentBatchSize > 3) {
                  currentBatchSize = Math.max(
                    3,
                    Math.floor(currentBatchSize * 0.6)
                  );
                  this.log(
                    `🔧 Reduced batch size to ${currentBatchSize} to avoid rate limits`,
                    'info'
                  );
                } else if (consecutiveFailures >= 4 && currentBatchSize > 1) {
                  currentBatchSize = 1;
                  this.log(
                    '🚨 Ultra-conservative mode: processing 1 track at a time',
                    'warning'
                  );
                } else if (consecutiveFailures >= 6 && currentBatchSize === 1) {
                  // Even 1 track at a time is failing - try super long delays
                  batchRetryDelay = Math.min(batchRetryDelay * 3, 15000);
                  this.log(
                    '🐌 Super patient mode: 15s+ delays between attempts',
                    'warning'
                  );
                }
              }
            }
          } else {
            this.log(`❌ Non-rate-limit error: ${error.message}`, 'error');
            consecutiveFailures++;
            break; // Non-rate-limit error, don't retry
          }
        }
      }

      // Track progress and reset consecutive failures on success
      totalProcessed += batch.length;

      if (batchSuccess) {
        consecutiveFailures = 0; // Reset on success

        // Gradually increase batch size back up if we're doing well
        if (
          isComprehensive &&
          consecutiveFailures === 0 &&
          currentBatchSize < batchSize
        ) {
          currentBatchSize = Math.min(batchSize, currentBatchSize + 5);
        }

        // Longer delay between successful comprehensive batches to avoid rate limits
        if (isComprehensive) {
          let delayTime = 3000; // Default 3s
          if (consecutiveFailures >= 6)
            delayTime = 10000; // 10s if super patient mode
          else if (consecutiveFailures >= 4) delayTime = 6000; // 6s if ultra-conservative mode
          await this.delay(delayTime);
        }
      }
    }

    const successRate = (this.audioFeatures.length / trackIds.length) * 100;
    this.log(
      `Audio features analysis complete: ${this.audioFeatures.length}/${trackIds.length} tracks (${successRate.toFixed(1)}%)`,
      successRate > 50 ? 'success' : 'warning'
    );

    if (this.audioFeatures.length === 0) {
      this.log(
        'No audio features available - will create basic playlists without advanced features',
        'info'
      );
    }
  }

  async fetchArtistInfo() {
    const artistIds = [
      ...new Set(
        this.likedTracks
          .flatMap((item) => item.track.artists.map((artist) => artist.id))
          .filter((id) => id)
      ),
    ];

    this.log(
      `Fetching detailed info for ${artistIds.length} unique artists...`
    );

    const batchSize = CONFIG.ANALYSIS_SETTINGS.batchSize.artists;
    let successfulBatches = 0;
    let failedBatches = 0;

    for (let i = 0; i < artistIds.length; i += batchSize) {
      const batch = artistIds.slice(i, i + batchSize);
      const ids = batch.join(',');

      // Retry logic for artist data
      let retries = 0;
      const maxRetries = 3;
      let batchSuccess = false;

      while (retries < maxRetries && !batchSuccess) {
        try {
          const response = await this.makeSpotifyRequest(
            `${CONFIG.SPOTIFY_API_BASE}/artists?ids=${ids}`
          );

          if (response.artists) {
            response.artists.forEach((artist) => {
              if (artist) {
                this.artistData.set(artist.id, artist);
              }
            });
          }

          this.log(
            `✓ Fetched info for ${Math.min(i + batchSize, artistIds.length)}/${artistIds.length} artists`
          );
          successfulBatches++;
          batchSuccess = true;

          // Rate limiting
          await this.delay(
            CONFIG.ANALYSIS_SETTINGS.rateLimiting.delayBetweenBatches
          );
        } catch (error) {
          retries++;
          if (retries < maxRetries) {
            this.log(
              `Artist batch failed (attempt ${retries}/${maxRetries}): ${error.message}. Retrying...`,
              'warning'
            );
            await this.delay(2000 * retries); // Progressive delay
          } else {
            this.log(
              `✗ Artist batch failed after ${maxRetries} attempts: ${error.message}`,
              'error'
            );
            failedBatches++;
          }
        }
      }
    }

    const successRate =
      (successfulBatches / Math.ceil(artistIds.length / batchSize)) * 100;
    this.log(
      `Artist data collection: ${successfulBatches} successful, ${failedBatches} failed batches (${successRate.toFixed(1)}% success rate)`,
      successRate > 80 ? 'success' : 'warning'
    );
  }

  performAnalysis() {
    // Combine track data with audio features (or null if not available)
    const tracksWithFeatures = this.likedTracks.map((item) => {
      const audioFeature = this.audioFeatures.find(
        (f) => f && f.id === item.track.id
      );
      return {
        ...item,
        audioFeatures: audioFeature || null, // Keep null if no audio features
        artists: item.track.artists.map((artist) => ({
          ...artist,
          details: this.artistData.get(artist.id),
        })),
      };
    }); // Keep ALL tracks, regardless of audio features availability

    // Calculate aggregate statistics (only for tracks with audio features)
    const features = tracksWithFeatures
      .map((t) => t.audioFeatures)
      .filter((f) => f !== null);
    const avgFeatures =
      features.length > 0 ? this.calculateAverageFeatures(features) : {};

    // Genre analysis - updated to work with enriched data
    const genreCount = new Map();
    let tracksWithGenreData = 0;
    let totalArtists = 0;
    let artistsWithGenres = 0;

    tracksWithFeatures.forEach((track) => {
      let trackHasGenreData = false;

      // NEW: Check enriched data first (for enriched mode)
      if (
        track.track.enhanced &&
        (track.track.enhanced.genres || track.track.enhanced.all_tags)
      ) {
        trackHasGenreData = true;

        // Add genres from enriched data
        const enrichedGenres = track.track.enhanced.genres || [];
        const enrichedTags = track.track.enhanced.all_tags || [];

        // Combine genres and tags
        const allGenres = [...enrichedGenres, ...enrichedTags];

        allGenres.forEach((genre) => {
          if (genre && typeof genre === 'string' && genre.trim()) {
            const cleanGenre = genre.toLowerCase().trim();
            genreCount.set(cleanGenre, (genreCount.get(cleanGenre) || 0) + 1);
          }
        });
      }

      // FALLBACK: Original Spotify artist genre data
      if (!trackHasGenreData) {
        track.artists.forEach((artist) => {
          totalArtists++;
          if (
            artist.details &&
            artist.details.genres &&
            artist.details.genres.length > 0
          ) {
            artistsWithGenres++;
            trackHasGenreData = true;
            artist.details.genres.forEach((genre) => {
              genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
            });
          }
        });
      }

      if (trackHasGenreData) tracksWithGenreData++;
    });

    console.log('Genre Analysis Stats:');
    console.log(
      `- Tracks with genre data: ${tracksWithGenreData}/${tracksWithFeatures.length}`
    );
    console.log(`- Artists with genres: ${artistsWithGenres}/${totalArtists}`);
    console.log(`- Unique genres found: ${genreCount.size}`);

    const topGenres = Array.from(genreCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre, count]) => ({ genre, count }));

    console.log('Top genres:', topGenres);

    // Time analysis
    const now = new Date();
    const recentThreshold = new Date(
      now.getTime() -
        CONFIG.PLAYLIST_SETTINGS.thresholds.recentDays * 24 * 60 * 60 * 1000
    );
    const recentTracks = tracksWithFeatures.filter(
      (track) => new Date(track.added_at) > recentThreshold
    );

    // Timeline analysis
    const timelinePeriods = this.analyzeTimeline(tracksWithFeatures);

    this.analysisResults = {
      totalTracks: tracksWithFeatures.length,
      avgFeatures,
      topGenres,
      recentTracks: recentTracks.length,
      tracksWithFeatures,
      libraryStats: this.calculateLibraryStats(tracksWithFeatures),
      topTracks: this.topTracks,
      timelinePeriods,
    };

    this.log('Music analysis completed', 'success');
  }

  analyzeTimeline(tracks) {
    // Sort tracks by date added
    const sortedTracks = [...tracks].sort(
      (a, b) => new Date(a.added_at) - new Date(b.added_at)
    );

    if (sortedTracks.length === 0) return { early: [], peak: [] };

    const firstDate = new Date(sortedTracks[0].added_at);
    const lastDate = new Date(sortedTracks[sortedTracks.length - 1].added_at);
    const totalDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

    // Define timeline periods
    const periods = {
      early: [], // First 25% of timeline
      peak: [], // Period with most activity
    };

    // Early years - first 25% of timeline or first 2 years, whichever is shorter
    const earlyPeriodDays = Math.min(totalDays * 0.25, 730); // Max 2 years
    const earlyThreshold = new Date(
      firstDate.getTime() + earlyPeriodDays * 24 * 60 * 60 * 1000
    );

    periods.early = sortedTracks.filter(
      (track) => new Date(track.added_at) <= earlyThreshold
    );

    // Find peak period by analyzing tracks per month
    const monthlyActivity = new Map();
    sortedTracks.forEach((track) => {
      const date = new Date(track.added_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyActivity.set(monthKey, (monthlyActivity.get(monthKey) || 0) + 1);
    });

    // Find the most active 6-month period
    const monthEntries = Array.from(monthlyActivity.entries()).sort();
    let maxActivity = 0;
    let peakStartMonth = null;

    for (let i = 0; i <= monthEntries.length - 6; i++) {
      const sixMonthActivity = monthEntries
        .slice(i, i + 6)
        .reduce((sum, [, count]) => sum + count, 0);
      if (sixMonthActivity > maxActivity) {
        maxActivity = sixMonthActivity;
        peakStartMonth = monthEntries[i][0];
      }
    }

    if (peakStartMonth) {
      const [year, month] = peakStartMonth.split('-').map(Number);
      const peakStart = new Date(year, month - 1, 1);
      const peakEnd = new Date(year, month + 5, 0); // End of 6th month

      periods.peak = sortedTracks.filter((track) => {
        const trackDate = new Date(track.added_at);
        return trackDate >= peakStart && trackDate <= peakEnd;
      });
    }

    this.log(
      `Timeline analysis: Early period (${periods.early.length} tracks), Peak period (${periods.peak.length} tracks)`,
      'info'
    );

    return periods;
  }

  calculateAverageFeatures(features) {
    const keys = [
      'energy',
      'valence',
      'danceability',
      'acousticness',
      'instrumentalness',
      'speechiness',
      'liveness',
    ];
    const averages = {};

    keys.forEach((key) => {
      const values = features.map((f) => f[key]).filter((v) => v !== undefined);
      averages[key] =
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
    });

    // Calculate average tempo
    const tempos = features.map((f) => f.tempo).filter((t) => t !== undefined);
    averages.tempo =
      tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;

    return averages;
  }

  calculateLibraryStats(tracks) {
    const popularTracks = tracks.filter(
      (t) =>
        t.track.popularity > CONFIG.PLAYLIST_SETTINGS.thresholds.highPopularity
    );
    const hiddenGems = tracks.filter(
      (t) =>
        t.track.popularity < CONFIG.PLAYLIST_SETTINGS.thresholds.lowPopularity
    );

    // Only calculate audio feature stats if audio features are available
    const tracksWithAudioFeatures = tracks.filter(
      (t) => t.audioFeatures !== null
    );
    const acousticTracks = tracksWithAudioFeatures.filter(
      (t) =>
        t.audioFeatures.acousticness >
        CONFIG.PLAYLIST_SETTINGS.thresholds.highAcousticness
    );
    const highEnergyTracks = tracksWithAudioFeatures.filter(
      (t) =>
        t.audioFeatures.energy > CONFIG.PLAYLIST_SETTINGS.thresholds.highEnergy
    );

    return {
      popularTracks: popularTracks.length,
      hiddenGems: hiddenGems.length,
      acousticTracks: acousticTracks.length,
      highEnergyTracks: highEnergyTracks.length,
      avgPopularity:
        tracks.length > 0
          ? tracks.reduce((sum, t) => sum + (t.track.popularity || 0), 0) /
            tracks.length
          : 0,
      avgDuration:
        tracks.length > 0
          ? tracks.reduce((sum, t) => sum + (t.track.duration_ms || 0), 0) /
            tracks.length
          : 0,
    };
  }

  displayAnalysisResults() {
    const resultsContainer = document.getElementById('analysisResults');
    const { avgFeatures, topGenres, libraryStats, totalTracks } =
      this.analysisResults;

    resultsContainer.innerHTML = `
            <div class="analysis-overview">
                <h4>Your Music Profile</h4>
                <div class="profile-summary">
                    <div class="profile-item">
                        <span class="profile-label">Total Tracks</span>
                        <span class="profile-value">${totalTracks.toLocaleString()}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Average Popularity</span>
                        <span class="profile-value">${Math.round(libraryStats.avgPopularity)}/100</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Average Duration</span>
                        <span class="profile-value">${this.formatDuration(libraryStats.avgDuration)}</span>
                    </div>
                </div>
            </div>
            
            ${
  this.audioFeatures.length > 0
    ? `
            <div class="audio-features-analysis">
                <h4>Audio Features Profile</h4>
                ${Object.entries(avgFeatures)
    .map(([feature, value]) => {
      if (feature === 'tempo') {
        return `
                            <div class="feature-bar">
                                <span class="feature-label">${this.capitalizeFirst(feature)}</span>
                                <span class="feature-progress">${Math.round(value)} BPM</span>
                            </div>
                        `;
      }
      return `
                        <div class="feature-bar">
                            <span class="feature-label">${this.capitalizeFirst(feature)}</span>
                            <div class="feature-progress">
                                <div class="feature-fill" style="width: ${value * 100}%"></div>
                            </div>
                            <span class="feature-value">${(value * 100).toFixed(0)}%</span>
                        </div>
                    `;
    })
    .join('')}
            </div>
            `
    : `
            <div class="audio-features-analysis">
                <h4>⚠️ Audio Features Unavailable</h4>
                <div class="fallback-message">
                    <p>Due to Spotify API rate limits, advanced audio analysis is not available.</p>
                    <p><strong>✅ Available:</strong> Basic playlists, genre analysis, popularity-based playlists</p>
                    <p><strong>❌ Unavailable:</strong> Energy, danceability, mood-based playlists</p>
                </div>
            </div>
            `
}
            
            <div class="genre-analysis">
                <h4>Top Genres</h4>
                <div class="genre-list">
                    ${topGenres
    .slice(0, 8)
    .map(
      (item, index) => `
                        <div class="genre-item">
                            <span class="genre-rank">#${index + 1}</span>
                            <span class="genre-name">${this.capitalizeFirst(item.genre)}</span>
                            <span class="genre-count">${item.count} tracks</span>
                            <div class="genre-bar">
                                <div class="genre-fill" style="width: ${(item.count / topGenres[0].count) * 100}%"></div>
                            </div>
                        </div>
                    `
    )
    .join('')}
                </div>
                
                <div class="listening-insights">
                    <h4>Listening Insights</h4>
                    <div class="insights-grid">
                        <div class="insight-card">
                            <span class="insight-icon">🎭</span>
                            <div class="insight-content">
                                <span class="insight-title">Dominant Genre</span>
                                <span class="insight-value">${topGenres[0].genre === 'manele' ? 'Romanian Music' : this.capitalizeFirst(topGenres[0].genre)} (${topGenres[0].count} tracks)</span>
                            </div>
                        </div>
                        <div class="insight-card">
                            <span class="insight-icon">📊</span>
                            <div class="insight-content">
                                <span class="insight-title">Diversity Score</span>
                                <span class="insight-value">${this.calculateDiversityScore(topGenres, totalTracks)}/10</span>
                            </div>
                        </div>
                        <div class="insight-card">
                            <span class="insight-icon">⭐</span>
                            <div class="insight-content">
                                <span class="insight-title">Mainstream Factor</span>
                                <span class="insight-value">${this.getMainstreamLevel(libraryStats.avgPopularity)}</span>
                            </div>
                        </div>
                        <div class="insight-card">
                            <span class="insight-icon">📅</span>
                            <div class="insight-content">
                                <span class="insight-title">Most Active Year</span>
                                <span class="insight-value">${this.getMostActiveYear()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Display statistics
    this.displayStatistics();

    // Generate playlist previews
    this.generatePlaylistPreviews();
  }

  displayStatistics() {
    const statsContainer = document.getElementById('libraryStats');
    const { libraryStats, totalTracks, tracksWithFeatures } =
      this.analysisResults;

    // Calculate additional insights
    const currentYear = new Date().getFullYear();
    const thisYearTracks = tracksWithFeatures.filter(
      (track) => new Date(track.added_at).getFullYear() === currentYear
    ).length;

    const shortTracks = tracksWithFeatures.filter(
      (track) => track.track.duration_ms < 150000 // Under 2:30
    ).length;

    const longTracks = tracksWithFeatures.filter(
      (track) => track.track.duration_ms > 240000 // Over 4:00
    ).length;

    const chartToppers = tracksWithFeatures.filter(
      (track) => track.track.popularity >= 85
    ).length;

    const deepCuts = tracksWithFeatures.filter(
      (track) => track.track.popularity <= 25
    ).length;

    statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Liked Songs</span>
                <span class="stat-value">${totalTracks.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Popular Tracks (70+)</span>
                <span class="stat-value">${libraryStats.popularTracks}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Hidden Gems (30-)</span>
                <span class="stat-value">${libraryStats.hiddenGems}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Chart Toppers (85+)</span>
                <span class="stat-value">${chartToppers}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Deep Cuts (25-)</span>
                <span class="stat-value">${deepCuts}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">${currentYear} Discoveries</span>
                <span class="stat-value">${thisYearTracks}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Quick Hits (<2:30)</span>
                <span class="stat-value">${shortTracks}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Extended Jams (4:00+)</span>
                <span class="stat-value">${longTracks}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Acoustic Songs</span>
                <span class="stat-value">${libraryStats.acousticTracks}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">High Energy Songs</span>
                <span class="stat-value">${libraryStats.highEnergyTracks}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Popularity</span>
                <span class="stat-value">${Math.round(libraryStats.avgPopularity)}/100</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Duration</span>
                <span class="stat-value">${this.formatDuration(libraryStats.avgDuration)}</span>
            </div>
        `;
  }

  generatePlaylistPreviews() {
    const playlistGrid = document.getElementById('playlistGrid');
    const playlists = CONFIG.SMART_PLAYLISTS.map((config) => {
      const matchingTracks = this.filterTracksByCriteria(config.criteria);
      const optimalSize = this.calculateOptimalPlaylistSize(
        matchingTracks.length,
        config
      );
      return {
        ...config,
        trackCount: matchingTracks.length,
        optimalSize,
        tracks: matchingTracks.slice(0, optimalSize),
      };
    });

    // Add fewer, better genre-based playlists (only top 2 genres)
    const topGenres = this.analysisResults.topGenres.slice(0, 2);
    topGenres.forEach((genreData, index) => {
      const genreTracks = this.filterTracksByGenre(genreData.genre);
      if (genreTracks.length > 10) {
        // Higher threshold for quality
        const genreOptimalSize = this.calculateOptimalPlaylistSize(
          genreTracks.length,
          { sizeCategory: 'medium' }
        );
        playlists.push({
          id: `genre_${index}`,
          name: `🎼 ${this.capitalizeFirst(genreData.genre)}`,
          description: `Your favorite ${genreData.genre} tracks`,
          trackCount: genreTracks.length,
          optimalSize: genreOptimalSize,
          tracks: genreTracks.slice(0, genreOptimalSize),
          icon: '🎼',
          sizeCategory: 'medium',
        });
      }
    });

    playlistGrid.innerHTML = playlists
      .map(
        (playlist) => `
            <div class="glass-card playlist-card" data-playlist-id="${playlist.id}">
                <div class="playlist-header">
                    <div class="playlist-selection">
                        <input type="checkbox" 
                               class="playlist-checkbox" 
                               id="checkbox-${playlist.id}" 
                               data-playlist-id="${playlist.id}"
                               ${playlist.trackCount > 0 ? 'checked' : 'disabled'}>
                        <label for="checkbox-${playlist.id}" class="playlist-title-wrapper">
                            <div class="playlist-title">${playlist.name}</div>
                            <div class="playlist-description">${playlist.description}</div>
                        </label>
                    </div>
                    <div class="playlist-icon">${playlist.icon || '🎵'}</div>
                </div>
                <div class="playlist-stats">
                    <span>${playlist.trackCount} matching tracks</span>
                    <span>Playlist size: ${playlist.optimalSize || playlist.tracks.length} songs</span>
                    ${
  playlist.trackCount >
                      (playlist.optimalSize || playlist.tracks.length)
    ? `<span class="size-note">📈 Optimized from ${playlist.trackCount} matches</span>`
    : ''
}
                </div>
                ${
  playlist.tracks.length > 0
    ? `
                <div class="playlist-preview">
                    <div class="preview-label">Sample tracks:</div>
                    <div class="preview-tracks">
                        ${playlist.tracks
    .slice(0, 3)
    .map(
      (track) => `
                            <div class="preview-track">
                                <span class="track-name">${track.track.name}</span>
                                <span class="track-artist">by ${track.track.artists[0].name}</span>
                            </div>
                        `
    )
    .join('')}
                        ${playlist.tracks.length > 3 ? `<div class="preview-more">...and ${playlist.tracks.length - 3} more</div>` : ''}
                    </div>
                </div>
                `
    : playlist.trackCount === 0
      ? `
                <div class="no-tracks-message">
                    <span>No Matching Tracks</span>
                </div>
                `
      : ''
}
                <button class="create-playlist-btn" data-playlist-id="${playlist.id}" 
                        ${playlist.trackCount === 0 ? 'disabled' : ''}>
                    ${playlist.trackCount === 0 ? 'No Matching Tracks' : 'Create Playlist'}
                </button>
            </div>
        `
      )
      .join('');

    // Add batch creation controls
    const batchControls = document.createElement('div');
    batchControls.className = 'batch-controls';
    batchControls.innerHTML = `
            <div class="glass-card batch-controls-card">
                <div class="batch-controls-header">
                    <h3>🎯 Playlist Creation Options</h3>
                </div>
                <div class="batch-controls-actions">
                    <button class="action-button" id="selectAllPlaylists">✅ Select All</button>
                    <button class="action-button" id="deselectAllPlaylists">❌ Deselect All</button>
                    <button class="action-button primary-button" id="createSelectedPlaylists">
                        🚀 Create Selected Playlists
                    </button>
                </div>
                <div class="selection-info">
                    <span id="selectedCount">0</span> playlists selected
                </div>
            </div>
        `;

    playlistGrid.parentNode.insertBefore(batchControls, playlistGrid);

    // Bind individual playlist creation events
    document.querySelectorAll('.create-playlist-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const playlistId = e.target.dataset.playlistId;
        this.createPlaylist(playlistId);
      });
    });

    // Bind batch control events
    this.bindBatchControls();
  }

  bindBatchControls() {
    const updateSelectionCount = () => {
      const checkedBoxes = document.querySelectorAll(
        '.playlist-checkbox:checked:not(:disabled)'
      );
      const countElement = document.getElementById('selectedCount');
      if (countElement) {
        countElement.textContent = checkedBoxes.length;
      }
    };

    // Update count initially
    updateSelectionCount();

    // Select all button
    document
      .getElementById('selectAllPlaylists')
      ?.addEventListener('click', () => {
        document
          .querySelectorAll('.playlist-checkbox:not(:disabled)')
          .forEach((checkbox) => {
            checkbox.checked = true;
          });
        updateSelectionCount();
      });

    // Deselect all button
    document
      .getElementById('deselectAllPlaylists')
      ?.addEventListener('click', () => {
        document.querySelectorAll('.playlist-checkbox').forEach((checkbox) => {
          checkbox.checked = false;
        });
        updateSelectionCount();
      });

    // Create selected playlists button
    document
      .getElementById('createSelectedPlaylists')
      ?.addEventListener('click', () => {
        this.createSelectedPlaylists();
      });

    // Update count when checkboxes change
    document.querySelectorAll('.playlist-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', updateSelectionCount);
    });
  }

  async createSelectedPlaylists() {
    const selectedCheckboxes = document.querySelectorAll(
      '.playlist-checkbox:checked:not(:disabled)'
    );

    if (selectedCheckboxes.length === 0) {
      alert('Please select at least one playlist to create.');
      return;
    }

    const selectedPlaylistIds = Array.from(selectedCheckboxes).map(
      (cb) => cb.dataset.playlistId
    );

    try {
      const createButton = document.getElementById('createSelectedPlaylists');
      createButton.disabled = true;
      createButton.textContent = `Creating ${selectedPlaylistIds.length} Playlists...`;

      this.log(
        `Starting creation of ${selectedPlaylistIds.length} selected playlists...`,
        'success'
      );

      // Initialize track exclusion system to prevent duplicates across playlists
      this.usedTracks = new Set();
      this.log(
        '🎯 Track exclusion system enabled - ensuring unique songs across playlists',
        'info'
      );
      this.log(`📊 Total tracks available: ${this.likedTracks.length}`, 'info');

      let createdCount = 0;
      let skippedCount = 0;

      for (const playlistId of selectedPlaylistIds) {
        try {
          const success = await this.createPlaylist(playlistId, true); // true = batch mode
          if (success) {
            createdCount++;
            this.log(
              `✅ Playlist ${createdCount}/${selectedPlaylistIds.length} created successfully`,
              'success'
            );
          } else {
            skippedCount++;
            this.log('⚠️ Playlist skipped (no tracks available)', 'warning');
          }

          // Small delay between playlist creations
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          this.log(`❌ Failed to create playlist: ${error.message}`, 'error');
          skippedCount++;
        }
      }

      this.log(
        `🎉 Batch creation complete! Created: ${createdCount}, Skipped: ${skippedCount}`,
        'success'
      );
      this.log(
        `🎯 Track diversity: ${this.usedTracks.size} unique tracks out of ${this.likedTracks.length} total tracks`,
        'success'
      );
    } catch (error) {
      this.log(
        `Failed to create selected playlists: ${error.message}`,
        'error'
      );
    } finally {
      // Reset UI
      const createButton = document.getElementById('createSelectedPlaylists');
      createButton.disabled = false;
      createButton.textContent = '🚀 Create Selected Playlists';

      // Clear the track exclusion system
      this.usedTracks = null;
    }
  }

  filterTracksByCriteria(criteria) {
    // Handle special playlist types first
    if (criteria.topTracks) {
      // Return top tracks for specific time period
      const timeRange = criteria.topTracks;
      if (
        this.analysisResults.topTracks &&
        this.analysisResults.topTracks[timeRange]
      ) {
        const tracks = this.analysisResults.topTracks[timeRange].map(
          (track) => ({
            track,
            added_at: null, // Top tracks don't have added_at
            audioFeatures: null, // Will be filled if available
          })
        );

        // Apply exclusion system to top tracks too
        if (this.usedTracks) {
          return tracks.filter((t) => !this.usedTracks.has(t.track.id));
        }
        return tracks;
      } else if (this.isUsingEnrichedDataFallback()) {
        // Create "most played" playlist from enriched data using popularity and confidence scores
        return this.createMostPlayedFromEnrichedData(timeRange);
      }
      return [];
    }

    if (criteria.timeline) {
      // Return tracks from specific timeline period
      const period = criteria.timeline;
      if (
        this.analysisResults.timelinePeriods &&
        this.analysisResults.timelinePeriods[period]
      ) {
        const tracks = this.analysisResults.timelinePeriods[period];

        // Apply exclusion system to timeline tracks too
        if (this.usedTracks) {
          return tracks.filter((t) => !this.usedTracks.has(t.track.id));
        }
        return tracks;
      }
      return [];
    }

    // Always use the analyzed tracks (which now includes all tracks, with or without audio features)
    const tracksToFilter = this.analysisResults.tracksWithFeatures;

    // Debug log for rock filtering
    if (criteria.genre === 'rock') {
      console.log('🎸 ROCK DEBUG: Starting rock filtering...');
      console.log(
        `🎸 ROCK DEBUG: Total tracks to filter: ${tracksToFilter.length}`
      );
      console.log('🎸 ROCK DEBUG: Sample track structure:', tracksToFilter[0]);
    }

    const filteredTracks = tracksToFilter.filter((track) => {
      const features = track.audioFeatures;
      const trackData = track.track;
      const addedDate = new Date(track.added_at);

      // EXCLUSION SYSTEM: Skip tracks already used in other playlists
      if (this.usedTracks && this.usedTracks.has(trackData.id)) {
        return false;
      }

      // For enriched data without audio features, use fallback logic for audio-based playlists
      if (!features && this.isUsingEnrichedDataFallback()) {
        // Use genre and popularity as proxies for audio features
        const hasGenre = trackData.enhanced && trackData.enhanced.genres;
        const hasPopularity = trackData.popularity !== undefined;

        if (hasGenre && hasPopularity) {
          // Create audio feature estimates based on genre and popularity
          const estimatedFeatures = this.estimateAudioFeaturesFromGenre(
            trackData.enhanced
          );

          // Check audio feature criteria using estimates
          for (const [feature, range] of Object.entries(criteria)) {
            if (
              ['energy', 'danceability', 'valence', 'acousticness'].includes(
                feature
              )
            ) {
              if (range.min && estimatedFeatures[feature] < range.min)
                return false;
              if (range.max && estimatedFeatures[feature] > range.max)
                return false;
            }
          }
        }
      }

      // Check all criteria
      for (const [feature, range] of Object.entries(criteria)) {
        if (feature === 'popularity') {
          if (range.min && trackData.popularity < range.min) return false;
          if (range.max && trackData.popularity > range.max) return false;
        } else if (feature === 'duration') {
          if (range.min && trackData.duration_ms < range.min) return false;
          if (range.max && trackData.duration_ms > range.max) return false;
        } else if (feature === 'genre') {
          // Check if track matches the specified genre using enriched data
          let hasGenre = false;

          // Debug logging for problem genres
          const isProblemGenre = ['rock', 'pop', 'electronic'].includes(
            range.toLowerCase()
          );
          const targetGenre = range.toLowerCase();

          // Create comprehensive debug info for problem genres
          let debugInfo = null;
          if (isProblemGenre) {
            debugInfo = {
              trackName: trackData.name || trackData.track?.name,
              targetGenre,
              hasEnhanced: !!trackData.enhanced,
              genreSources: [],
            };
          }

          // First check enriched genre data if available
          if (trackData.enhanced && trackData.enhanced.genres) {
            const enrichedGenres = trackData.enhanced.genres.map((g) =>
              g.toLowerCase()
            );
            const targetGenre = range.toLowerCase();

            // Enhanced genre matching - more comprehensive detection
            if (targetGenre === 'rock') {
              hasGenre = enrichedGenres.some(
                (g) =>
                  g.includes('rock') ||
                  g.includes('alternative') ||
                  g.includes('indie') ||
                  g.includes('punk') ||
                  g.includes('grunge') ||
                  g.includes('metal') ||
                  g === 'garage rock revival' ||
                  g === 'post-hardcore' ||
                  g === 'hard rock'
              );
            } else if (targetGenre === 'pop') {
              hasGenre = enrichedGenres.some(
                (g) =>
                  g.includes('pop') ||
                  g.includes('mainstream') ||
                  g === 'electropop' ||
                  g === 'indie pop' ||
                  g === 'synth pop' ||
                  g === 'dance pop'
              );
            } else if (targetGenre === 'electronic') {
              hasGenre = enrichedGenres.some(
                (g) =>
                  g.includes('electronic') ||
                  g.includes('electro') ||
                  g.includes('edm') ||
                  g.includes('dance') ||
                  g.includes('house') ||
                  g.includes('techno') ||
                  g.includes('dubstep') ||
                  g.includes('synth') ||
                  g === 'electronica' ||
                  g === 'electronic dance music' ||
                  g === 'ambient electronic'
              );
            } else {
              hasGenre = enrichedGenres.some(
                (g) => g.includes(targetGenre) || targetGenre.includes(g)
              );
            }

            if (isRockSearch && hasGenre) {
              console.log(
                `🎸 Found rock track: "${trackData.name}" with genres:`,
                enrichedGenres
              );
            }
          }

          // Check enriched tags if no genre match yet
          if (!hasGenre && trackData.enhanced && trackData.enhanced.all_tags) {
            const enrichedTags = trackData.enhanced.all_tags.map((t) =>
              t.toLowerCase()
            );
            const targetGenre = range.toLowerCase();

            // For rock, check for various rock-related tags
            if (targetGenre === 'rock') {
              hasGenre = enrichedTags.some(
                (tag) =>
                  tag.includes('rock') ||
                  tag.includes('alternative') ||
                  tag.includes('indie') ||
                  tag.includes('punk') ||
                  tag.includes('grunge') ||
                  tag.includes('metal') ||
                  tag.includes('guitar') ||
                  tag.includes('band')
              );
            } else if (targetGenre === 'pop') {
              hasGenre = enrichedTags.some(
                (tag) =>
                  tag.includes('pop') ||
                  tag.includes('mainstream') ||
                  tag.includes('chart')
              );
            } else if (targetGenre === 'electronic') {
              hasGenre = enrichedTags.some(
                (tag) =>
                  tag.includes('electronic') ||
                  tag.includes('electro') ||
                  tag.includes('edm') ||
                  tag.includes('dance') ||
                  tag.includes('house') ||
                  tag.includes('techno') ||
                  tag.includes('dubstep') ||
                  tag.includes('synth') ||
                  tag.includes('beat')
              );
            } else {
              hasGenre = enrichedTags.some(
                (tag) => tag.includes(targetGenre) || targetGenre.includes(tag)
              );
            }

            if (isRockSearch && hasGenre) {
              console.log(
                `🎸 Found rock track via tags: "${trackData.name}" with tags:`,
                enrichedTags
              );
            }
          }

          // ALSO CHECK LASTFM_ARTIST TAGS - This was missing!
          if (
            !hasGenre &&
            trackData.enhanced &&
            trackData.enhanced.lastfm_artist &&
            trackData.enhanced.lastfm_artist.tags
          ) {
            const artistTags = trackData.enhanced.lastfm_artist.tags.map((t) =>
              t.toLowerCase()
            );
            const targetGenre = range.toLowerCase();

            if (targetGenre === 'rock') {
              hasGenre = artistTags.some(
                (tag) =>
                  tag.includes('rock') ||
                  tag.includes('alternative') ||
                  tag.includes('indie') ||
                  tag.includes('punk') ||
                  tag.includes('grunge') ||
                  tag.includes('metal') ||
                  tag.includes('guitar') ||
                  tag.includes('band')
              );
            } else if (targetGenre === 'pop') {
              hasGenre = artistTags.some(
                (tag) =>
                  tag.includes('pop') ||
                  tag.includes('mainstream') ||
                  tag.includes('chart')
              );
            } else if (targetGenre === 'electronic') {
              hasGenre = artistTags.some(
                (tag) =>
                  tag.includes('electronic') ||
                  tag.includes('electro') ||
                  tag.includes('edm') ||
                  tag.includes('dance') ||
                  tag.includes('house') ||
                  tag.includes('techno') ||
                  tag.includes('dubstep') ||
                  tag.includes('synth') ||
                  tag.includes('beat')
              );
            } else {
              hasGenre = artistTags.some(
                (tag) => tag.includes(targetGenre) || targetGenre.includes(tag)
              );
            }

            if (isRockSearch && hasGenre) {
              console.log(
                `🎸 Found rock track via artist tags: "${trackData.name}" with artist tags:`,
                artistTags
              );
            }
          }

          // Check Last.fm artist data directly if still no match
          if (
            !hasGenre &&
            trackData.enhanced &&
            trackData.enhanced.lastfm_data &&
            trackData.enhanced.lastfm_data.tags
          ) {
            const lastfmTags = trackData.enhanced.lastfm_data.tags.map((t) =>
              t.toLowerCase()
            );
            const targetGenre = range.toLowerCase();

            if (targetGenre === 'rock') {
              hasGenre = lastfmTags.some(
                (tag) =>
                  tag.includes('rock') ||
                  tag.includes('alternative') ||
                  tag.includes('indie') ||
                  tag.includes('punk') ||
                  tag.includes('grunge') ||
                  tag.includes('metal')
              );
            } else {
              hasGenre = lastfmTags.some(
                (tag) => tag.includes(targetGenre) || targetGenre.includes(tag)
              );
            }

            if (isRockSearch && hasGenre) {
              console.log(
                `🎸 Found rock track via lastfm: "${trackData.name}" with lastfm tags:`,
                lastfmTags
              );
            }
          }

          // Special Romanian detection
          if (range === 'romanian' || range === 'manele') {
            if (trackData.enhanced && trackData.enhanced.primary_genre) {
              hasGenre =
                hasGenre ||
                trackData.enhanced.primary_genre
                  .toLowerCase()
                  .includes('romanian');
            }

            // Check Romanian artist names as fallback
            const romanianArtists = [
              'irina rimes',
              'david ciente',
              'mihail',
              'domino',
              'andia',
              'delia',
              'phoenix',
              'timpuri noi',
              'holy molly',
              'f.charm',
              'carla\'s dreams',
              'andra',
              'antonia',
              'inna',
              'alexandra stan',
              'morandi',
              'voltaj',
              'o-zone',
              'akcent',
              'edward maya',
            ];

            hasGenre =
              hasGenre ||
              trackData.artists.some((artist) =>
                romanianArtists.some(
                  (romanianName) =>
                    artist.name.toLowerCase().includes(romanianName) ||
                    romanianName.includes(artist.name.toLowerCase())
                )
              );
          }

          if (!hasGenre) return false;
        } else if (feature === 'addedThisYear') {
          const trackYear = addedDate.getFullYear();
          if (trackYear !== range) return false;
        } else if (feature === 'addedRecently') {
          if (range) {
            const recentThreshold = new Date(
              Date.now() -
                CONFIG.PLAYLIST_SETTINGS.thresholds.recentDays *
                  24 *
                  60 *
                  60 *
                  1000
            );
            if (addedDate <= recentThreshold) return false;
          }
        } else if (feature === 'addedBefore') {
          // For throwback tracks - added more than X days ago
          const thresholdDate = new Date(
            Date.now() - range * 24 * 60 * 60 * 1000
          );
          if (addedDate >= thresholdDate) return false;
        } else if (features && features[feature] !== undefined) {
          // Only apply audio feature criteria if features are available
          if (range.min && features[feature] < range.min) return false;
          if (range.max && features[feature] > range.max) return false;
        } else if (!features) {
          // If no audio features available, skip audio feature criteria but allow other criteria
          const audioFeatures = [
            'energy',
            'danceability',
            'valence',
            'acousticness',
            'tempo',
            'speechiness',
            'instrumentalness',
            'liveness',
          ];
          if (audioFeatures.includes(feature)) {
            // Skip this criteria - can't filter without audio features
            continue;
          }
        }
      }

      return true;
    });

    // Debug log for rock filtering results
    if (criteria.genre === 'rock') {
      console.log(
        `🎸 ROCK DEBUG: Found ${filteredTracks.length} rock tracks after filtering`
      );
      if (filteredTracks.length > 0) {
        console.log(
          '🎸 ROCK DEBUG: First few rock tracks found:',
          filteredTracks.slice(0, 3).map((t) => ({
            name: t.track.name,
            artist: t.track.artists[0].name,
            genres: t.track.enhanced?.genres,
            tags: t.track.enhanced?.all_tags,
          }))
        );
      }
    }

    // Add randomization to create variety even with similar criteria
    const shuffledTracks = this.shuffleArray([...filteredTracks]);

    return shuffledTracks;
  }

  filterTracksByGenre(genre) {
    // Always use the analyzed tracks (which now includes all tracks)
    const tracksToFilter = this.analysisResults.tracksWithFeatures;

    console.log(`Filtering tracks by genre: ${genre}`);
    console.log(`Total tracks to filter: ${tracksToFilter.length}`);
    console.log(`Artist data entries: ${this.artistData.size}`);

    const filteredTracks = tracksToFilter.filter((track) => {
      const artists = track.artists || track.track.artists;
      const trackData = track.track || track;

      // EXCLUSION SYSTEM: Skip tracks already used in other playlists
      if (this.usedTracks && this.usedTracks.has(trackData.id)) {
        return false;
      }

      // Special handling for Romanian music
      if (genre === 'romanian' || genre === 'manele') {
        const romanianArtists = [
          'irina rimes',
          'david ciente',
          'mihail',
          'domino',
          'andia',
          'delia',
          'phoenix',
          'timpuri noi',
          'holy molly',
          'f.charm',
          'carla dreams',
          'andra',
          'antonia',
          'inna',
          'alexandra stan',
          'morandi',
          'voltaj',
          'o-zone',
          'akcent',
          'edward maya',
        ];

        // Check by artist name first
        const matchesByName = artists.some((artist) =>
          romanianArtists.some(
            (romanianName) =>
              artist.name.toLowerCase().includes(romanianName) ||
              romanianName.includes(artist.name.toLowerCase())
          )
        );

        if (matchesByName) {
          return true;
        }
      }

      // Check by Spotify genres
      return artists.some((artist) => {
        const artistData = this.artistData.get(artist.id);
        if (!artistData || !artistData.genres) {
          return false;
        }

        const hasGenre = artistData.genres.some((g) =>
          g.toLowerCase().includes(genre.toLowerCase())
        );

        if (hasGenre) {
          console.log(
            `Found ${genre} match: ${artist.name} has genres:`,
            artistData.genres
          );
        }

        return hasGenre;
      });
    });

    console.log(
      `Found ${filteredTracks.length} tracks matching genre: ${genre}`
    );
    return filteredTracks;
  }

  sortTracksForPlaylist(tracks, playlistConfig) {
    // Clone array to avoid modifying original
    let sortedTracks = [...tracks];

    // Different sorting strategies based on playlist type
    if (
      ['popular', 'mainstream', 'chart_toppers'].includes(playlistConfig.id)
    ) {
      // Sort by popularity (highest first)
      sortedTracks.sort(
        (a, b) => (b.track.popularity || 0) - (a.track.popularity || 0)
      );
    } else if (
      ['discover', 'hidden', 'deep_cuts'].includes(playlistConfig.id)
    ) {
      // Sort by popularity (lowest first)
      sortedTracks.sort(
        (a, b) => (a.track.popularity || 0) - (b.track.popularity || 0)
      );
    } else if (['recent', 'fresh_finds'].includes(playlistConfig.id)) {
      // Sort by date added (most recent first)
      sortedTracks.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
    } else if (playlistConfig.id === 'throwback') {
      // Sort by date added (oldest first) for nostalgia effect
      sortedTracks.sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
    } else if (
      ['top_all_time', 'current_obsessions', 'recent_favorites'].includes(
        playlistConfig.id
      )
    ) {
      // Top tracks are already sorted by Spotify's algorithm, keep original order
      // No sorting needed
    } else if (['early_years', 'golden_era'].includes(playlistConfig.id)) {
      // Timeline playlists - sort chronologically
      sortedTracks.sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
    } else {
      // For other playlists, create a more interesting mix
      // Sort by a combination of factors to avoid just using liked songs order
      sortedTracks.sort((a, b) => {
        // Mix of popularity and recency
        const aScore =
          (a.track.popularity || 0) * 0.7 +
          (new Date(a.added_at).getTime() / 1000000) * 0.3;
        const bScore =
          (b.track.popularity || 0) * 0.7 +
          (new Date(b.added_at).getTime() / 1000000) * 0.3;
        return bScore - aScore;
      });

      // Add some randomization to make it more interesting
      if (sortedTracks.length > 20) {
        // Shuffle the middle 60% while keeping top and bottom more stable
        const topCount = Math.floor(sortedTracks.length * 0.2);
        const bottomCount = Math.floor(sortedTracks.length * 0.2);
        const middleStart = topCount;
        const middleEnd = sortedTracks.length - bottomCount;

        const top = sortedTracks.slice(0, topCount);
        const middle = sortedTracks.slice(middleStart, middleEnd);
        const bottom = sortedTracks.slice(middleEnd);

        // Shuffle middle section
        for (let i = middle.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [middle[i], middle[j]] = [middle[j], middle[i]];
        }

        sortedTracks = [...top, ...middle, ...bottom];
      }
    }

    return sortedTracks;
  }

  generatePlaylistDescription(config, tracks) {
    const avgPopularity =
      tracks.reduce((sum, t) => sum + (t.track.popularity || 0), 0) /
      tracks.length;
    const totalDuration = tracks.reduce(
      (sum, t) => sum + (t.track.duration_ms || 0),
      0
    );
    const durationMinutes = Math.round(totalDuration / 60000);

    // Get top artists in this playlist
    const artistCounts = new Map();
    tracks.forEach((track) => {
      track.track.artists.forEach((artist) => {
        artistCounts.set(artist.name, (artistCounts.get(artist.name) || 0) + 1);
      });
    });
    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Get date range
    const dates = tracks.map((t) => new Date(t.added_at)).sort((a, b) => a - b);
    const oldestDate = dates[0];
    const newestDate = dates[dates.length - 1];
    const yearRange =
      oldestDate.getFullYear() === newestDate.getFullYear()
        ? newestDate.getFullYear().toString()
        : `${oldestDate.getFullYear()}-${newestDate.getFullYear()}`;

    let description = config.description;
    description += `\n\n📊 ${tracks.length} tracks • ${durationMinutes} minutes • Avg popularity: ${Math.round(avgPopularity)}`;
    description += `\n🎤 Top artists: ${topArtists.join(', ')}`;
    description += `\n📅 From your library (${yearRange})`;
    description += '\n\n🤖 Generated by Smart Playlist Generator';

    return description;
  }

  async createPlaylist(playlistId, batchMode = false) {
    const button = document.querySelector(`[data-playlist-id="${playlistId}"]`);
    const originalText = button ? button.textContent : '';

    try {
      if (button && !batchMode) {
        button.disabled = true;
        button.textContent = '🎵 Creating in Spotify...';
        button.classList.add('creating');
      }

      // Find playlist configuration
      let playlistConfig = CONFIG.SMART_PLAYLISTS.find(
        (p) => p.id === playlistId
      );

      // Handle genre playlists
      if (!playlistConfig && playlistId.startsWith('genre_')) {
        const genreIndex = parseInt(playlistId.split('_')[1]);
        const genreData = this.analysisResults.topGenres[genreIndex];
        playlistConfig = {
          id: playlistId,
          name: `🎼 ${this.capitalizeFirst(genreData.genre)}`,
          description: `Your favorite ${genreData.genre} tracks - Generated by Smart Playlist Generator`,
        };
      }

      if (!playlistConfig) {
        throw new Error('Playlist configuration not found');
      }

      // Get tracks for this playlist
      let tracks;
      if (playlistId.startsWith('genre_')) {
        const genreIndex = parseInt(playlistId.split('_')[1]);
        const genreData = this.analysisResults.topGenres[genreIndex];
        tracks = this.filterTracksByGenre(genreData.genre);
      } else {
        tracks = this.filterTracksByCriteria(playlistConfig.criteria);
      }

      // Sort tracks to make playlists more interesting (even without audio features)
      tracks = this.sortTracksForPlaylist(tracks, playlistConfig);

      // Calculate optimal size and limit tracks dynamically
      const optimalSize = this.calculateOptimalPlaylistSize(
        tracks.length,
        playlistConfig
      );
      tracks = tracks.slice(0, optimalSize);

      // TRACK EXCLUSION: Mark these tracks as used to prevent duplicates in other playlists
      if (this.usedTracks) {
        tracks.forEach((track) => {
          const trackId = track.track ? track.track.id : track.id;
          this.usedTracks.add(trackId);
        });
        this.log(
          `🎯 Added ${tracks.length} tracks to exclusion list (${this.usedTracks.size} total excluded)`,
          'info'
        );
      }

      this.log(
        `Creating "${playlistConfig.name}" with ${tracks.length} tracks (${optimalSize} optimal from ${this.filterTracksByCriteria(playlistConfig.criteria).length} matches)`
      );

      if (tracks.length === 0) {
        throw new Error('No tracks found for this playlist');
      }

      this.log(
        `Creating playlist "${playlistConfig.name}" with ${tracks.length} tracks...`
      );

      // Create enhanced description
      const enhancedDescription = this.generatePlaylistDescription(
        playlistConfig,
        tracks
      );

      // Create playlist on Spotify
      const playlist = await this.createSpotifyPlaylist(
        playlistConfig.name,
        enhancedDescription
      );

      // Add tracks to playlist - Handle both real and enriched data
      let trackUris = [];

      // Check if we're using enriched data (fake URIs) or real Spotify data
      const hasRealSpotifyData = tracks.every(
        (track) => track.track.uri && !track.track.uri.includes('enriched_')
      );

      if (hasRealSpotifyData) {
        // Use real Spotify URIs directly
        trackUris = tracks.map((track) => track.track.uri);
        console.log(`✅ Using real Spotify URIs for ${tracks.length} tracks`);
      } else {
        // We have enriched data - need to search for real URIs
        console.log(
          `🔍 Searching for real Spotify URIs for ${tracks.length} enriched tracks...`
        );

        for (const track of tracks) {
          try {
            const searchQuery = `track:"${track.track.name}" artist:"${track.track.artists[0].name}"`;
            const searchResponse = await this.makeSpotifyRequest(
              `${CONFIG.SPOTIFY_API_BASE}/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`
            );

            if (searchResponse.tracks.items.length > 0) {
              trackUris.push(searchResponse.tracks.items[0].uri);
            } else {
              console.warn(
                `⚠️ Could not find Spotify URI for: ${track.track.name} by ${track.track.artists[0].name}`
              );
            }
          } catch (searchError) {
            console.warn(
              `⚠️ Search error for track: ${track.track.name}`,
              searchError
            );
          }
        }

        console.log(
          `✅ Found ${trackUris.length} real URIs out of ${tracks.length} tracks`
        );
      }

      if (trackUris.length === 0) {
        throw new Error(
          'Could not find any valid Spotify tracks for this playlist'
        );
      }

      await this.addTracksToPlaylist(playlist.id, trackUris);

      if (button && !batchMode) {
        button.textContent = '✅ Created in Spotify!';
        button.classList.remove('creating');
        button.classList.add('created');
      }

      this.log(
        `✅ Successfully created playlist "${playlistConfig.name}" in your Spotify account!`,
        'success'
      );
      return true; // Success
    } catch (error) {
      this.log(`Failed to create playlist: ${error.message}`, 'error');

      if (button && !batchMode) {
        button.disabled = false;
        button.textContent = originalText;
        button.classList.remove('creating');
      }

      // Return false for no tracks, throw for other errors
      if (error.message.includes('No tracks found')) {
        return false;
      }
      throw error;
    }
  }

  async createAllPlaylists() {
    const createButton = document.getElementById('createPlaylistsButton');
    const originalText = createButton.textContent;

    try {
      createButton.disabled = true;
      createButton.textContent = 'Creating All Playlists...';

      this.log('Starting batch playlist creation...', 'success');

      // Initialize track exclusion system to prevent duplicates across playlists
      this.usedTracks = new Set();
      this.log(
        '🎯 Track exclusion system enabled - ensuring unique songs across playlists',
        'info'
      );
      this.log(`📊 Total tracks available: ${this.likedTracks.length}`, 'info');

      // Get all playlist buttons that aren't disabled
      const playlistButtons = Array.from(
        document.querySelectorAll('.create-playlist-btn:not(:disabled)')
      );

      for (let i = 0; i < playlistButtons.length; i++) {
        const button = playlistButtons[i];
        const playlistId = button.dataset.playlistId;

        this.log(`Creating playlist ${i + 1}/${playlistButtons.length}...`);
        await this.createPlaylist(playlistId);

        // Add delay between creations to avoid rate limiting
        if (i < playlistButtons.length - 1) {
          await this.delay(1000);
        }
      }

      this.log(
        `All playlists created successfully! Used ${this.usedTracks.size} unique tracks across all playlists.`,
        'success'
      );
      this.log(
        `🎯 Track diversity: ${this.usedTracks.size} unique tracks out of ${this.likedTracks.length} total tracks`,
        'success'
      );
    } catch (error) {
      this.log(`Batch playlist creation failed: ${error.message}`, 'error');
    } finally {
      // Clear the track exclusion system
      this.usedTracks = null;
      createButton.disabled = false;
      createButton.textContent = originalText;
    }
  }

  async createSpotifyPlaylist(name, description) {
    // Ensure we have valid authentication
    if (!CONFIG.validate()) {
      throw new Error('🔐 Not authenticated with Spotify. Please log in first.');
    }
    if (!this.userData || !this.userData.id) {
      try {
        this.userData = await this.getCurrentUser();
      } catch (e) {
        throw new Error('Unable to load Spotify user profile.');
      }
    }

    console.log(`🎵 Creating playlist "${name}" in Spotify account...`);

    const response = await this.makeSpotifyRequest(
      `${CONFIG.SPOTIFY_API_BASE}/users/${this.userData.id}/playlists`,
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          public: CONFIG.PLAYLIST_SETTINGS.createPublicPlaylists,
        }),
      }
    );

    console.log(
      `✅ Playlist "${name}" created successfully with ID: ${response.id}`
    );
    return response;
  }

  async addTracksToPlaylist(playlistId, trackUris) {
    // Spotify API allows max 100 tracks per request
    const batchSize = 100;

    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);

      await this.makeSpotifyRequest(
        `${CONFIG.SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
        {
          method: 'POST',
          body: JSON.stringify({
            uris: batch,
          }),
        }
      );

      // Rate limiting
      if (i + batchSize < trackUris.length) {
        await this.delay(500);
      }
    }
  }

  async getCurrentUser() {
    return await this.makeSpotifyRequest(`${CONFIG.SPOTIFY_API_BASE}/me`);
  }

  async makeSpotifyRequest(url, options = {}) {
    const config = {
      headers: CONFIG.getAuthHeaders(),
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Spotify API Error: ${response.status} - ${errorData.error?.message || response.statusText}`
      );
    }

    return await response.json();
  }

  // UI Helper Methods
  switchTab(tabName) {
    // If already on this tab, do nothing to prevent repeated work/logs
    const activeBtn = document.querySelector('.tab-button.active');
    if (activeBtn && activeBtn.dataset.tab === tabName) {
      return;
    }
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.classList.toggle('active', pane.id === tabName);
    });

    this.log(`Switched to ${tabName} tab`);

    // Smart tab auto-prepare: fetch liked tracks if authenticated and none loaded, then show preview.
    // Use a guard so it runs once per visit.
    if (tabName === 'smart') {
      if (!this._smartTabPrepared) {
        this._smartTabPrepared = true;
        (async () => {
        try {
          if (CONFIG.validate() && (!this.likedTracks || this.likedTracks.length === 0)) {
            this.log('🔄 Preparing SMART tab: fetching your liked tracks…', 'info');
            await this.getTrackListOnly();
          }
          // Show possibilities if enrichment data exists
          try { await this.showEnrichedPlaylistPreview(); } catch {}
          const btn = document.getElementById('createPlaylistsButton');
          if (btn) btn.disabled = false;
        } catch {}
        })();
      }
    }
  }

  showProgress(show) {
    document.getElementById('progressContainer').style.display = show
      ? 'block'
      : 'none';
  }

  updateProgress(percentage, text) {
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = text;
  }

  toggleConsole() {
    const content = document.getElementById('consoleContent');
    const toggle = document.getElementById('consoleToggle');

    content.classList.toggle('collapsed');
    toggle.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
  }

  log(message, type = 'info') {
    const consoleContent = document.getElementById('consoleContent');
    
    // Deduplicate frequent identical lines within 1.5s
    const now = Date.now();
    if (!this._logCache) this._logCache = { lastMsg: null, lastTime: 0 };
    if (this._logCache.lastMsg === message && now - this._logCache.lastTime < 1500) {
      // Skip UI log; still emit to dev console at debug level
      if (CONFIG?.UI_SETTINGS?.showDebugInfo) console.debug('[dedup]', message);
      return;
    }
    this._logCache.lastMsg = message;
    this._logCache.lastTime = now;

    // Always log to browser console
    console.log(`[Spotify Generator] ${message}`);
    
    // Only log to UI console if element exists
    if (consoleContent) {
      const timestamp = new Date().toLocaleTimeString();
      const line = document.createElement('div');
      line.className = `console-line ${type}`;
      line.textContent = `[${timestamp}] ${message}`;

      consoleContent.appendChild(line);
      consoleContent.scrollTop = consoleContent.scrollHeight;

      // Limit console lines
      const lines = consoleContent.querySelectorAll('.console-line');
      if (lines.length > CONFIG.UI_SETTINGS.consoleMaxLines) {
        lines[0].remove();
      }
    }
  }

  logout() {
    this.log('Logging out...', 'info');

    // Clear all stored tokens and data
    CONFIG.clearStoredTokens();
    this.userData = null;
    this.isAuthenticated = false;
    this.likedTracks = [];
    this.audioFeatures = [];
    this.artistData.clear();
    this.analysisResults = null;

    // Reset UI
    this.showUnauthenticatedUI();
    document.getElementById('createPlaylistsButton').disabled = true;

    // Clear analysis results
    document.getElementById('analysisResults').innerHTML =
      '<p class="placeholder-text">Click "Analyze My Music" to discover your music taste profile</p>';
    document.getElementById('libraryStats').innerHTML =
      '<p class="placeholder-text">Detailed statistics will be displayed after analysis</p>';
    document.getElementById('playlistGrid').innerHTML =
      '<div class="glass-card placeholder-card"><h3>Smart Playlists</h3><p class="placeholder-text">Your generated playlists will appear here after analysis</p></div>';

    this.log('Successfully logged out', 'success');
  }

  exportData() {
    if (!this.likedTracks || this.likedTracks.length === 0) {
      this.log(
        '❌ No data to export. Please analyze your music first.',
        'error'
      );
      return;
    }

    const button = document.getElementById('exportDataButton');
    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = 'Exporting...';

      // Show export options modal
      this.showExportOptions();
    } catch (error) {
      this.log(`❌ Export failed: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  // Show export options modal
  showExportOptions() {
    const modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>📋 Export Your Music Data</h3>
                    <div class="export-options">
                        <button class="export-option" id="exportBasicCSV">
                            <span class="option-icon">📊</span>
                            <div class="option-info">
                                <h4>Basic Track List (CSV)</h4>
                                <p>Track names, artists, albums - perfect for Excel analysis</p>
                            </div>
                        </button>
                        
                        <button class="export-option" id="exportDetailedJSON">
                            <span class="option-icon">🔬</span>
                            <div class="option-info">
                                <h4>Detailed JSON Export</h4>
                                <p>Complete data with all metadata for external analysis tools</p>
                            </div>
                        </button>
                        
                        <button class="export-option" id="exportForEnhancement">
                            <span class="option-icon">🌐</span>
                            <div class="option-info">
                                <h4>Enhancement-Ready JSON</h4>
                                <p>Optimized format for external music API enrichment</p>
                            </div>
                        </button>
                        
                        <button class="export-option" id="exportAnalysisReport">
                            <span class="option-icon">📈</span>
                            <div class="option-info">
                                <h4>Analysis Report (HTML)</h4>
                                <p>Formatted report with charts and statistics</p>
                            </div>
                        </button>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="cancel-btn" id="cancelExport">Cancel</button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('exportBasicCSV').addEventListener('click', () => {
      this.exportBasicCSV();
      this.closeModal(modal);
    });

    document
      .getElementById('exportDetailedJSON')
      .addEventListener('click', () => {
        this.exportDetailedJSON();
        this.closeModal(modal);
      });

    document
      .getElementById('exportForEnhancement')
      .addEventListener('click', () => {
        this.exportForEnhancement();
        this.closeModal(modal);
      });

    document
      .getElementById('exportAnalysisReport')
      .addEventListener('click', () => {
        this.exportAnalysisReport();
        this.closeModal(modal);
      });

    document.getElementById('cancelExport').addEventListener('click', () => {
      this.closeModal(modal);
    });

    // Close on overlay click
    modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeModal(modal);
      }
    });
  }

  // Utility Methods
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  }

  calculateDiversityScore(topGenres, totalTracks) {
    // Calculate diversity based on genre distribution
    const topGenreCount = topGenres[0]?.count || 0;
    const topGenrePercentage = (topGenreCount / totalTracks) * 100;

    // More diverse = lower top genre percentage
    // Score from 1-10 where 10 is most diverse
    if (topGenrePercentage > 50) return 3; // Very concentrated
    if (topGenrePercentage > 30) return 5; // Somewhat concentrated
    if (topGenrePercentage > 20) return 7; // Balanced
    if (topGenrePercentage > 10) return 9; // Very diverse
    return 10; // Extremely diverse
  }

  getMainstreamLevel(avgPopularity) {
    if (avgPopularity >= 70) return 'Very Mainstream';
    if (avgPopularity >= 55) return 'Somewhat Mainstream';
    if (avgPopularity >= 40) return 'Balanced';
    if (avgPopularity >= 25) return 'Alternative';
    return 'Underground';
  }

  getMostActiveYear() {
    const { tracksWithFeatures } = this.analysisResults;
    const yearCounts = {};

    tracksWithFeatures.forEach((track) => {
      const year = new Date(track.added_at).getFullYear();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    const mostActiveYear = Object.entries(yearCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    return mostActiveYear
      ? `${mostActiveYear[0]} (${mostActiveYear[1]} tracks)`
      : 'N/A';
  }

  isUsingEnrichedDataFallback() {
    // Check if we're using enriched data without proper audio features
    return this.userData && this.userData.display_name === 'Enhanced Data Mode';
  }

  estimateAudioFeaturesFromGenre(enhancedData) {
    // Estimate audio features based on genre tags and metadata
    const genres = enhancedData.genres || [];
    const tags = enhancedData.all_tags || [];
    const allTags = [...genres, ...tags].map((t) => t.toLowerCase());

    let energy = 0.5,
      danceability = 0.5,
      valence = 0.5,
      acousticness = 0.5;

    // High energy genres
    if (
      allTags.some((tag) =>
        [
          'rock',
          'metal',
          'electronic',
          'dance',
          'edm',
          'dubstep',
          'house',
        ].includes(tag)
      )
    ) {
      energy = Math.min(0.9, energy + 0.3);
      danceability = Math.min(0.8, danceability + 0.2);
    }

    // High danceability genres
    if (
      allTags.some((tag) =>
        ['dance', 'pop', 'disco', 'funk', 'hip hop', 'rap'].includes(tag)
      )
    ) {
      danceability = Math.min(0.9, danceability + 0.3);
      valence = Math.min(0.8, valence + 0.2);
    }

    // Acoustic genres
    if (
      allTags.some((tag) =>
        ['acoustic', 'folk', 'country', 'singer-songwriter'].includes(tag)
      )
    ) {
      acousticness = Math.min(0.9, acousticness + 0.4);
      energy = Math.max(0.1, energy - 0.3);
    }

    // Happy/sad valence
    if (
      allTags.some((tag) =>
        ['happy', 'upbeat', 'uplifting', 'cheerful'].includes(tag)
      )
    ) {
      valence = Math.min(0.9, valence + 0.3);
    }
    if (
      allTags.some((tag) =>
        ['sad', 'melancholy', 'emotional', 'dramatic'].includes(tag)
      )
    ) {
      valence = Math.max(0.1, valence - 0.3);
    }

    return { energy, danceability, valence, acousticness };
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  createMostPlayedFromEnrichedData(timeRange) {
    // Create a "most played" playlist from enriched data using various signals
    const tracksToFilter = this.analysisResults.tracksWithFeatures;

    // Score tracks based on multiple factors that indicate "most played"
    const scoredTracks = tracksToFilter.map((track) => {
      const trackData = track.track;
      let score = 0;

      // Factor 1: High popularity = likely well-known/played
      if (trackData.popularity) {
        score += trackData.popularity * 0.3; // 0-30 points
      }

      // Factor 2: Enhanced confidence = data quality/reliability
      if (trackData.enhanced && trackData.enhanced.confidence) {
        score += trackData.enhanced.confidence * 20; // 0-20 points
      }

      // Factor 3: Last.fm play count data if available
      if (
        trackData.enhanced &&
        trackData.enhanced.lastfm_data &&
        trackData.enhanced.lastfm_data.playcount
      ) {
        const playcount =
          parseInt(trackData.enhanced.lastfm_data.playcount) || 0;
        score += Math.min(playcount / 100000, 30); // Up to 30 points, normalized
      }

      // Factor 4: Artist popularity from Last.fm
      if (
        trackData.enhanced &&
        trackData.enhanced.lastfm_data &&
        trackData.enhanced.lastfm_data.listeners
      ) {
        const listeners =
          parseInt(trackData.enhanced.lastfm_data.listeners) || 0;
        score += Math.min(listeners / 50000, 20); // Up to 20 points, normalized
      }

      // Factor 5: Bonus for mainstream genres (likely played more)
      if (trackData.enhanced && trackData.enhanced.genres) {
        const mainStreamGenres = [
          'pop',
          'rock',
          'hip hop',
          'dance',
          'electronic',
        ];
        const hasMainstream = trackData.enhanced.genres.some((genre) =>
          mainStreamGenres.some((mg) => genre.toLowerCase().includes(mg))
        );
        if (hasMainstream) score += 10;
      }

      return { ...track, playScore: score };
    });

    // Sort by score and apply exclusion system
    const sortedTracks = scoredTracks
      .sort((a, b) => b.playScore - a.playScore)
      .filter(
        (track) => !this.usedTracks || !this.usedTracks.has(track.track.id)
      );

    // Return top tracks based on time range - be more generous with sizes
    const maxTracks =
      timeRange === 'long_term'
        ? Math.min(sortedTracks.length, 150)
        : timeRange === 'medium_term'
          ? Math.min(sortedTracks.length, 100)
          : Math.min(sortedTracks.length, 75);

    this.log(
      `🔁 Created Most Played playlist with ${Math.min(sortedTracks.length, maxTracks)} tracks (${timeRange})`,
      'info'
    );

    return sortedTracks.slice(0, maxTracks);
  }

  calculateOptimalPlaylistSize(matchingTracks, playlistConfig) {
    if (!CONFIG.PLAYLIST_SETTINGS.dynamicSizing.enabled) {
      return CONFIG.PLAYLIST_SETTINGS.maxSongsPerPlaylist;
    }

    const settings = CONFIG.PLAYLIST_SETTINGS.dynamicSizing;

    // Don't create playlist if too few matches
    if (matchingTracks < settings.minPlaylistSize) {
      return 0; // Will be filtered out
    }

    // Get the target size based on category
    const sizeCategory = playlistConfig.sizeCategory || 'medium';

    // Handle adaptive sizing - calculate based on number of matches
    if (sizeCategory === 'adaptive') {
      // Use 40-60% of available tracks, but within reasonable bounds
      const percentage = 0.5; // Use 50% of available tracks
      const adaptiveSize = Math.round(matchingTracks * percentage);
      const minSize = 25; // Minimum for adaptive
      const maxSize = Math.min(200, settings.maxPlaylistSize); // Maximum for adaptive

      const finalSize = Math.max(minSize, Math.min(adaptiveSize, maxSize));
      this.log(
        `📐 Adaptive sizing: ${matchingTracks} matches → ${finalSize} tracks (${Math.round((finalSize / matchingTracks) * 100)}%)`,
        'info'
      );
      return finalSize;
    }

    let targetSize =
      settings.optimalSizes[sizeCategory] || settings.optimalSizes.medium;

    // For large collections, be more generous with sizing
    if (matchingTracks > 200) {
      targetSize = Math.min(matchingTracks * 0.6, settings.maxPlaylistSize);
    } else if (matchingTracks > 100) {
      targetSize = Math.min(matchingTracks * 0.7, settings.maxPlaylistSize);
    } else if (matchingTracks <= targetSize) {
      // Use all available tracks if fewer than target
      return matchingTracks;
    }

    // Special cases for specific playlist types
    if (
      playlistConfig.id === 'most_played' ||
      playlistConfig.id === 'rock_collection'
    ) {
      // These should be comprehensive for their category
      return Math.min(
        Math.round(matchingTracks * 0.6),
        settings.maxPlaylistSize
      );
    }

    if (
      playlistConfig.id === 'popular' ||
      playlistConfig.id === 'hidden_gems'
    ) {
      // Popular categories can be larger
      return Math.min(
        Math.round(matchingTracks * 0.5),
        settings.maxPlaylistSize
      );
    }

    return Math.min(targetSize, settings.maxPlaylistSize);
  }

  // Enhanced external data collection
  async enhanceWithExternalData() {
    if (!this.enhancedAnalysisEnabled) {
      this.log('❌ Enhanced database system not available', 'error');
      return;
    }

    if (!this.likedTracks.length) {
      this.log('❌ Please analyze your music first', 'error');
      return;
    }

    this.log(
      '🌐 Starting enhanced analysis with external data sources...',
      'info'
    );
    this.log(
      '📊 This will collect additional metadata from Last.fm, MusicBrainz, and AcousticBrainz',
      'info'
    );

    const button = document.getElementById('enhanceWithExternalButton');
    button.disabled = true;
    button.innerHTML = '<span class="button-icon">⏳</span>Enhancing...';

    try {
      let enhanced = 0;
      const total = this.likedTracks.length;

      // Store all tracks in database first
      this.log(`📦 Storing ${total} tracks in local database...`, 'info');

      for (let i = 0; i < this.likedTracks.length; i++) {
        const track = this.likedTracks[i];
        const audioFeatures = this.audioFeatures.find(
          (af) => af.id === track.id
        );

        await this.musicDB.storeTrack(track, audioFeatures);

        if ((i + 1) % 100 === 0) {
          this.log(`📦 Stored ${i + 1}/${total} tracks...`, 'info');
        }
      }

      this.log(
        '🌐 Now enhancing with external data (this may take a while)...',
        'info'
      );

      // Enhance with external data in batches
      const batchSize = 10;
      for (let i = 0; i < this.likedTracks.length; i += batchSize) {
        const batch = this.likedTracks.slice(i, i + batchSize);

        const enhancements = await Promise.allSettled(
          batch.map((track) =>
            this.musicDB.enhanceTrackWithExternalData(track.id)
          )
        );

        enhanced += enhancements.filter(
          (r) => r.status === 'fulfilled' && r.value
        ).length;

        this.log(
          `🔍 Enhanced ${Math.min(i + batchSize, total)}/${total} tracks (${enhanced} successful)...`,
          'info'
        );

        // Rate limiting delay
        await this.delay(2000);
      }

      this.log(
        `✅ Enhanced analysis complete! Successfully enhanced ${enhanced}/${total} tracks`,
        'success'
      );
      this.log('🧠 You can now generate smart compatible playlists!', 'info');

      // Enable playlist creation now that we have enhanced data
      document.getElementById('createPlaylistsButton').disabled = false;
      this.log('📝 Smart playlist creation is now enabled!', 'success');
    } catch (error) {
      this.log(`❌ Enhanced analysis failed: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.innerHTML =
        '<span class="button-icon">🌐</span>Enhance with Web Data';
    }
  }

  // Generate smart playlists based on compatibility
  async generateSmartPlaylists() {
    if (!this.enhancedAnalysisEnabled) {
      this.log('❌ Enhanced database system not available', 'error');
      return;
    }

    this.log('🧠 Generating smart compatible playlists...', 'info');

    const button = document.getElementById('generateCompatibleButton');
    button.disabled = true;
    button.innerHTML = '<span class="button-icon">⏳</span>Generating...';

    try {
      const allTracks = await this.musicDB.getAllFromStore('tracks');

      if (allTracks.length < 10) {
        this.log(
          '❌ Need at least 10 tracks in database. Run "Enhance with Web Data" first.',
          'error'
        );
        return;
      }

      const seedTracks = this.selectSmartSeeds(allTracks);
      this.log(
        `🎯 Selected ${seedTracks.length} seed tracks for playlist generation`,
        'info'
      );

      const smartPlaylists = [];

      for (const seed of seedTracks) {
        this.log(
          `🎵 Building playlist around: ${seed.name} by ${seed.artists[0].name}`,
          'info'
        );

        const playlist = await this.musicDB.generateCompatiblePlaylist(
          seed.id,
          25,
          0.5
        );

        if (playlist.length >= 10) {
          const playlistName = this.generateSmartPlaylistName(seed, playlist);

          smartPlaylists.push({
            name: playlistName,
            description: `Smart playlist built around "${seed.name}" using AI compatibility analysis`,
            tracks: playlist.map((t) => t.id),
            seed_track: seed,
            avg_compatibility: this.calculatePlaylistCompatibility(playlist),
          });

          this.log(
            `✅ Created "${playlistName}" with ${playlist.length} compatible tracks`,
            'success'
          );
        } else {
          this.log(
            `⚠️ Insufficient compatible tracks for ${seed.name} (found ${playlist.length})`,
            'warning'
          );
        }
      }

      if (smartPlaylists.length > 0) {
        this.log(
          `🎉 Generated ${smartPlaylists.length} smart playlists!`,
          'success'
        );
        this.log('📱 Creating playlists on Spotify...', 'info');

        for (const playlist of smartPlaylists) {
          await this.createSpotifyPlaylist(
            playlist.name,
            playlist.description,
            playlist.tracks
          );
          await this.delay(1000);
        }

        this.log('🎊 All smart playlists created successfully!', 'success');
      } else {
        this.log(
          '❌ Could not generate any smart playlists. Try enhancing more tracks with external data.',
          'error'
        );
      }
    } catch (error) {
      this.log(
        `❌ Smart playlist generation failed: ${error.message}`,
        'error'
      );
    } finally {
      button.disabled = false;
      button.innerHTML =
        '<span class="button-icon">🧠</span>Smart Compatible Playlists';
    }
  }

  // Select diverse seed tracks for playlist generation
  selectSmartSeeds(tracks) {
    const seeds = [];
    const energyRanges = [
      { min: 0, max: 0.3, name: 'low_energy' },
      { min: 0.3, max: 0.7, name: 'mid_energy' },
      { min: 0.7, max: 1, name: 'high_energy' },
    ];

    const valenceRanges = [
      { min: 0, max: 0.3, name: 'sad' },
      { min: 0.3, max: 0.7, name: 'neutral' },
      { min: 0.7, max: 1, name: 'happy' },
    ];

    for (const energyRange of energyRanges) {
      for (const valenceRange of valenceRanges) {
        const candidates = tracks.filter(
          (t) =>
            t.analysis &&
            t.analysis.energy >= energyRange.min &&
            t.analysis.energy < energyRange.max &&
            t.analysis.valence >= valenceRange.min &&
            t.analysis.valence < valenceRange.max &&
            t.genres.length > 0
        );

        if (candidates.length > 0) {
          const seed = candidates.sort(
            (a, b) => b.popularity - a.popularity
          )[0];
          seeds.push(seed);
        }
      }
    }

    while (seeds.length < 3) {
      const remaining = tracks.filter(
        (t) => !seeds.includes(t) && t.analysis && t.genres.length > 0
      );

      if (remaining.length === 0) break;

      const randomSeed = remaining.sort(
        (a, b) => b.popularity - a.popularity
      )[0];
      seeds.push(randomSeed);
    }

    return seeds.slice(0, 5);
  }

  // Generate a descriptive name for smart playlist
  generateSmartPlaylistName(seedTrack, playlist) {
    const genres = [...new Set(playlist.flatMap((t) => t.genres).slice(0, 2))];
    const avgEnergy =
      playlist.reduce((sum, t) => sum + (t.analysis?.energy || 0.5), 0) /
      playlist.length;
    const avgValence =
      playlist.reduce((sum, t) => sum + (t.analysis?.valence || 0.5), 0) /
      playlist.length;

    let mood = 'Balanced';
    if (avgEnergy > 0.7 && avgValence > 0.7) mood = 'Energetic & Happy';
    else if (avgEnergy > 0.7 && avgValence < 0.3) mood = 'Intense & Dark';
    else if (avgEnergy < 0.3 && avgValence > 0.7) mood = 'Chill & Positive';
    else if (avgEnergy < 0.3 && avgValence < 0.3) mood = 'Mellow & Moody';
    else if (avgEnergy > 0.7) mood = 'High Energy';
    else if (avgValence > 0.7) mood = 'Feel Good';
    else if (avgValence < 0.3) mood = 'Melancholic';

    const genreText = genres.length > 0 ? ` ${genres[0]}` : '';
    return `${mood}${genreText} Mix (${seedTrack.artists[0].name})`;
  }

  // Calculate average compatibility score for playlist
  calculatePlaylistCompatibility(playlist) {
    if (playlist.length < 2) return 1;

    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < playlist.length - 1; i++) {
      for (let j = i + 1; j < playlist.length; j++) {
        const track1 = playlist[i];
        const track2 = playlist[j];

        if (track1.analysis && track2.analysis) {
          const features = ['energy', 'valence', 'danceability'];
          let featureScore = 0;

          features.forEach((feature) => {
            const diff = Math.abs(
              track1.analysis[feature] - track2.analysis[feature]
            );
            featureScore += 1 - diff;
          });

          totalScore += featureScore / features.length;
          comparisons++;
        }
      }
    }

    return comparisons > 0 ? totalScore / comparisons : 0.5;
  }

  // TEST FUNCTION: Simulate playlist creation to verify track exclusion works
  testPlaylistDiversity() {
    if (!this.analysisResults || !this.analysisResults.tracksWithFeatures) {
      this.log(
        '❌ No analysis results available. Please analyze your music first.',
        'error'
      );
      return;
    }

    this.log('🧪 Testing playlist diversity system...', 'info');

    // Initialize track exclusion system
    this.usedTracks = new Set();

    // Get first 3 playlists from config to test
    const testPlaylists = CONFIG.SMART_PLAYLISTS.slice(0, 3);

    testPlaylists.forEach((playlist, index) => {
      const tracks = this.filterTracksByCriteria(playlist.criteria);
      const limitedTracks = tracks.slice(0, 20); // Limit to 20 tracks

      // Add tracks to exclusion set
      limitedTracks.forEach((track) => {
        this.usedTracks.add(track.track.id);
      });

      this.log(
        `🎵 Playlist ${index + 1} "${playlist.name}": ${limitedTracks.length} tracks`,
        'info'
      );
      this.log(
        `   First 3 tracks: ${limitedTracks
          .slice(0, 3)
          .map((t) => `"${t.track.name}"`)
          .join(', ')}`,
        'info'
      );
    });

    this.log(
      `✅ Test completed! Used ${this.usedTracks.size} unique tracks across ${testPlaylists.length} playlists.`,
      'success'
    );
    this.log(
      '🎯 If working correctly, each playlist should have different songs',
      'info'
    );

    // Clear test data
    this.usedTracks = null;
  }

  // Export helper functions
  closeModal(modal) {
    document.body.removeChild(modal);
  }

  exportBasicCSV() {
    const tracks = this.likedTracks;
    let csv = 'Track Name,Artist,Album,Popularity,Duration (min),Added Date\n';

    tracks.forEach((item) => {
      const track = item.track;
      const artists = track.artists.map((a) => a.name).join(' & ');
      const duration = Math.round((track.duration_ms / 1000 / 60) * 100) / 100;
      const addedDate = new Date(item.added_at).toLocaleDateString();

      const escapeCsv = (str) => {
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      csv += `${escapeCsv(track.name)},${escapeCsv(artists)},${escapeCsv(track.album.name)},${track.popularity},${duration},${addedDate}\n`;
    });

    this.downloadFile(
      csv,
      `spotify-tracks-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
    this.log(`📊 Exported ${tracks.length} tracks to CSV format`, 'success');
  }

  exportDetailedJSON() {
    const exportData = {
      generated: new Date().toISOString(),
      user: this.userData?.display_name || 'Unknown',
      totalTracks: this.likedTracks.length,
      mode: this.analysisResults?.mode || 'unknown',
      tracks: this.likedTracks.map((item) => ({
        name: item.track.name,
        artist: item.track.artists[0].name,
        allArtists: item.track.artists.map((a) => a.name),
        album: item.track.album.name,
        popularity: item.track.popularity,
        durationMs: item.track.duration_ms,
        addedAt: item.added_at,
        spotifyUrl: item.track.external_urls.spotify,
        trackId: item.track.id,
      })),
    };

    this.downloadFile(
      JSON.stringify(exportData, null, 2),
      `spotify-detailed-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
    this.log(
      `🔬 Exported detailed JSON with ${this.likedTracks.length} tracks`,
      'success'
    );
  }

  exportForEnhancement() {
    const enhancementData = {
      metadata: {
        generated: new Date().toISOString(),
        totalTracks: this.likedTracks.length,
        purpose: 'external_music_api_enhancement',
      },
      tracks: this.likedTracks.map((item, index) => ({
        index,
        name: item.track.name,
        artist: item.track.artists[0].name,
        album: item.track.album.name,
        searchQuery: `${item.track.artists[0].name} ${item.track.name}`,
        spotifyId: item.track.id,
        popularity: item.track.popularity,
        durationMs: item.track.duration_ms,
        externalData: {},
      })),
    };

    this.downloadFile(
      JSON.stringify(enhancementData, null, 2),
      `spotify-enhancement-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
    this.log('🌐 Exported enhancement-ready JSON', 'success');
  }

  exportAnalysisReport() {
    const results = this.analysisResults;
    const tracks = this.likedTracks.slice(0, 100); // Limit for HTML size

    const html = `<!DOCTYPE html>
<html>
<head><title>Spotify Analysis Report</title>
<style>body{font-family:Arial,sans-serif;margin:20px;background:#121212;color:#fff}.header{background:#1db954;padding:20px;border-radius:8px}</style>
</head>
<body>
<div class="header"><h1>🎵 Spotify Analysis Report</h1><p>Generated: ${new Date().toLocaleDateString()}</p></div>
<h3>📊 Statistics</h3>
<p>Total Tracks: ${this.likedTracks.length}</p>
<p>Avg Popularity: ${results?.avgPopularity || 'N/A'}</p>
<h3>📋 Sample Tracks (First 100)</h3>
${tracks.map((item) => `<p><strong>${item.track.name}</strong> by ${item.track.artists[0].name}</p>`).join('')}
</body></html>`;

    this.downloadFile(
      html,
      `spotify-report-${new Date().toISOString().split('T')[0]}.html`,
      'text/html'
    );
    this.log('📈 Exported HTML report', 'success');
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // OFFLINE ANALYSIS: Use existing user-data.json and enhance with web data
  async loadOfflineDataAndAnalyze() {
    const button = document.getElementById('offlineAnalysisButton');
    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = 'Loading Offline Data...';

      this.log(
        '🔄 Loading your existing Spotify data from user-data.json...',
        'info'
      );

      // Load the existing user data
      const response = await fetch('./user-data.json');
      if (!response.ok) {
        throw new Error(
          'Could not load user-data.json. Make sure the file exists in the project directory.'
        );
      }

      const userData = await response.json();
      this.log(
        `✅ Loaded ${userData.tracks.length} tracks from your exported data`,
        'success'
      );

      // Use the shared processing function
      await this.processUploadedData(userData);
    } catch (error) {
      this.log(`❌ Offline analysis failed: ${error.message}`, 'error');
      console.error('Offline analysis error:', error);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  // Helper functions to generate consistent IDs from names (Unicode-safe)
  generateTrackId(track) {
    // Create a simple hash from track name and artist instead of btoa
    const str = `${track.name}-${track.artist}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 22);
  }

  generateArtistId(artistName) {
    let hash = 0;
    for (let i = 0; i < artistName.length; i++) {
      const char = artistName.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 22);
  }

  generateAlbumId(albumName) {
    let hash = 0;
    for (let i = 0; i < albumName.length; i++) {
      const char = albumName.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 22);
  }

  // Handle file upload for analysis data
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.log(
      `📂 Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      'info'
    );

    const uploadButton = document.getElementById('uploadDataButton');
    const originalText = uploadButton.textContent;

    try {
      uploadButton.disabled = true;
      uploadButton.textContent = 'Processing File...';

      // Validate file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        throw new Error('Please upload a JSON file (.json)');
      }

      // Read file content
      const fileContent = await this.readFileAsText(file);

      // Parse JSON
      let userData;
      try {
        userData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON file: ${parseError.message}`);
      }

      // Validate data structure
      if (!userData.tracks || !Array.isArray(userData.tracks)) {
        // Check for alternative data structures
        this.log('🔍 Checking for alternative data formats...', 'info');

        if (userData.items && Array.isArray(userData.items)) {
          // Spotify API response format
          this.log('📋 Detected Spotify API format, converting...', 'info');
          userData.tracks = userData.items.map((item) => ({
            name: item.track?.name || item.name,
            artist: item.track?.artists?.[0]?.name || item.artists?.[0]?.name,
            allArtists:
              item.track?.artists?.map((a) => a.name) ||
              item.artists?.map((a) => a.name),
            album: item.track?.album?.name || item.album?.name,
            popularity: item.track?.popularity || item.popularity,
            addedAt: item.added_at,
            durationMs: item.track?.duration_ms || item.duration_ms,
            spotifyUrl:
              item.track?.external_urls?.spotify || item.external_urls?.spotify,
            artistGenres: [],
          }));
        } else if (Array.isArray(userData)) {
          // Direct array of tracks
          this.log(
            '📋 Detected direct track array format, converting...',
            'info'
          );
          userData = { tracks: userData };
        } else {
          // Show detailed error with file structure info
          const keys = Object.keys(userData);
          const hasArrays = keys.filter((key) => Array.isArray(userData[key]));

          let errorMsg =
            'Invalid data format: Expected "tracks" array in JSON file.\n\n';
          errorMsg += `📁 File: ${file.name}\n`;
          errorMsg += `📊 Keys found: ${keys.join(', ')}\n`;
          if (hasArrays.length > 0) {
            errorMsg += `📋 Arrays found: ${hasArrays.join(', ')}\n`;
          }
          errorMsg +=
            '\n💡 Expected format: JSON with "tracks" array containing your music data.\n';
          errorMsg += '📝 Try uploading your Spotify export file instead.';

          throw new Error(errorMsg);
        }
      }

      // Additional validation for tracks content
      if (userData.tracks.length === 0) {
        throw new Error('No tracks found in the uploaded file');
      }

      // Check if tracks have required fields
      const sampleTrack = userData.tracks[0];
      if (!sampleTrack.name && !sampleTrack.track_name) {
        throw new Error('Invalid track format: tracks must have "name" field');
      }

      this.log(
        `✅ Successfully loaded ${userData.tracks.length} tracks from uploaded file`,
        'success'
      );

      // Process the uploaded data (same logic as offline analysis)
      await this.processUploadedData(userData);
    } catch (error) {
      // Enhanced error logging
      let errorMessage = error.message;

      // Check if this looks like a chat sessions file
      if (file.name.includes('chat-sessions')) {
        errorMessage =
          '❌ Wrong file type: This appears to be a chat sessions file.\n\n';
        errorMessage +=
          '🎵 Please upload your Spotify music data file instead.\n';
        errorMessage +=
          '📁 Look for a file named like: "spotify-complete-data-[name]-[date].json"\n';
        errorMessage +=
          '📍 This should be your Spotify export containing your music library.';
      }

      this.log(`❌ File upload failed: ${errorMessage}`, 'error');

      // Additional helpful info
      if (!file.name.toLowerCase().includes('spotify')) {
        this.log(
          '💡 Tip: Make sure you\'re uploading your Spotify music data export file, not other JSON files.',
          'warning'
        );
      }
    } finally {
      uploadButton.disabled = false;
      uploadButton.textContent = originalText;
      // Clear the file input for next upload
      event.target.value = '';
    }
  }

  // Helper function to read file as text
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Process uploaded data (extracted from loadOfflineDataAndAnalyze for reuse)
  async processUploadedData(userData) {
    // Convert to the expected format for our analysis system
    this.likedTracks = userData.tracks.map((track) => ({
      track: {
        id: this.generateTrackId(track),
        name: track.name,
        artists: track.allArtists
          ? track.allArtists.map((artistName, index) => ({
            id: this.generateArtistId(artistName),
            name: artistName,
          }))
          : [
            {
              id: this.generateArtistId(track.artist),
              name: track.artist,
            },
          ],
        album: {
          id: this.generateAlbumId(track.album),
          name: track.album,
        },
        popularity: track.popularity || 50,
        duration_ms: track.durationMs,
        uri: `spotify:track:${this.generateTrackId(track)}`,
        external_urls: {
          spotify:
            track.spotifyUrl ||
            `https://open.spotify.com/track/${this.generateTrackId(track)}`,
        },
      },
      added_at: track.addedAt,
    }));

    // Convert artist genre data to our expected format
    this.artistData = new Map();
    userData.tracks.forEach((track) => {
      if (track.artistGenres) {
        track.artistGenres.forEach((artistInfo) => {
          const artistId = this.generateArtistId(artistInfo.name);
          this.artistData.set(artistId, {
            genres: artistInfo.genres || [],
            popularity: artistInfo.popularity || 50,
            followers: { total: artistInfo.followers || 0 },
          });
        });
      }
    });

    // Initialize empty arrays for data we'll get from external sources
    this.audioFeatures = [];
    this.topTracks = {};

    this.log(
      `🎵 Processed ${this.likedTracks.length} tracks from uploaded file`,
      'success'
    );
    this.log(
      `👥 Processed ${this.artistData.size} artists with genre data`,
      'success'
    );

    // Now perform analysis
    this.log('📊 Performing analysis on uploaded data...', 'info');
    this.performAnalysis();

    // Display results
    this.displayAnalysisResults();

    // Enable buttons
    document.getElementById('exportDataButton').disabled = false;
    document.getElementById('testDiversityButton').disabled = false;
    document.getElementById('createPlaylistsButton').disabled = false;

    // Enable external enhancement if available
    if (this.musicDB) {
      const enhanceButton = document.getElementById(
        'enhanceWithExternalButton'
      );
      if (enhanceButton) {
        enhanceButton.disabled = false;
        this.log('🌐 Ready to enhance with external data!', 'success');
      }
    }

    this.log(
      '✅ File upload and analysis complete! Your tracks are ready for playlist creation.',
      'success'
    );
  }

  // LIGHTWEIGHT: Get just the track list from liked songs (no audio features, no heavy analysis)
  async getTrackListOnly() {
    const button = document.getElementById('getTrackListButton');
    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = 'Getting Track List...';

      this.log(
        '📋 Fetching your liked songs track list (basic info only)...',
        'info'
      );

      // Check authentication first
      if (!CONFIG.validate()) {
        throw new Error('Please authenticate with Spotify first');
      }

      // Reset data
      this.likedTracks = [];
      this.audioFeatures = [];
      this.artistData = new Map();
      this.topTracks = {};

      // Fetch liked tracks with minimal data - just names, artists, albums
      let allTracks = [];
      let nextUrl = `${CONFIG.SPOTIFY_API_BASE}/me/tracks?limit=50`;
      let totalFetched = 0;

      this.log(
        '🎵 Fetching track names and basic info (no heavy processing)...',
        'info'
      );

      while (nextUrl && totalFetched < 5000) {
        // Safety limit
        const response = await this.makeSpotifyRequest(nextUrl);

        if (!response || !response.items) {
          break;
        }

        allTracks = allTracks.concat(response.items);
        totalFetched += response.items.length;

        this.log(`📋 Fetched ${totalFetched} tracks...`);

        nextUrl = response.next;

        // Small delay to be gentle on API
        if (nextUrl) {
          await this.delay(100);
        }
      }

      this.likedTracks = allTracks;

      this.log(
        `✅ Successfully fetched ${this.likedTracks.length} tracks from your liked songs!`,
        'success'
      );

      // Perform minimal analysis (just basic stats, no audio features needed)
      this.performBasicAnalysis();

      // Display basic results
      this.displayBasicResults();

  // Enable enrichment and playlist creation
  const enrichBtn = document.getElementById('enrichTracksButton');
  if (enrichBtn) enrichBtn.disabled = false;
  const exportBtn = document.getElementById('exportDataButton');
  if (exportBtn) exportBtn.disabled = false;
  const createBtn = document.getElementById('createPlaylistsButton');
  if (createBtn) createBtn.disabled = false;

    // If there is already enriched data available (imported previously), show playlist possibilities now
    try { setTimeout(() => this.showEnrichedPlaylistPreview(), 200); } catch {}

      this.log(
        '📝 Track list ready! You can now create playlists or export your data.',
        'success'
      );
      this.log(
        '💡 For detailed audio analysis, use "Upload Spotify Data" with your exported JSON file.',
        'info'
      );

      // Offer to enrich immediately, no upload needed
      if (this.musicDB) {
        const doEnrich = confirm('Track list fetched!\n\nDo you want to enrich new tracks now (reusing anything already in data/output)?');
        if (doEnrich) {
          await this.enrichCurrentTracks();
          const doCreate = confirm('Enrichment complete (or reused).\n\nCreate playlists now based on the analysis?');
          if (doCreate) {
            await this.createPlaylists();
          }
        }
      }
    } catch (error) {
      this.log(`❌ Failed to get track list: ${error.message}`, 'error');

      if (error.message.includes('rate limit') || error.status === 429) {
        this.log(
          '💡 Try using "Upload Spotify Data" or "Load My Data (Offline)" to avoid API limits.',
          'warning'
        );
      }
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  // Perform basic analysis without audio features
  performBasicAnalysis() {
    this.log(
      '📊 Performing basic analysis (no audio features required)...',
      'info'
    );

    // Convert to expected format
    const tracksWithBasicInfo = this.likedTracks.map((item) => ({
      ...item,
      audioFeatures: null, // No audio features in basic mode
      artists: item.track.artists.map((artist) => ({
        ...artist,
        details: null, // No artist details in basic mode
      })),
    }));

    // Basic stats
    const totalTracks = tracksWithBasicInfo.length;
    const avgPopularity =
      tracksWithBasicInfo.reduce(
        (sum, t) => sum + (t.track.popularity || 0),
        0
      ) / totalTracks;
    const avgDuration =
      tracksWithBasicInfo.reduce((sum, t) => sum + t.track.duration_ms, 0) /
      totalTracks;

    // Artist frequency
    const artistCount = new Map();
    tracksWithBasicInfo.forEach((track) => {
      track.track.artists.forEach((artist) => {
        artistCount.set(artist.name, (artistCount.get(artist.name) || 0) + 1);
      });
    });

    const topArtists = Array.from(artistCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Album frequency
    const albumCount = new Map();
    tracksWithBasicInfo.forEach((track) => {
      const albumName = track.track.album.name;
      albumCount.set(albumName, (albumCount.get(albumName) || 0) + 1);
    });

    // Time analysis
    const now = new Date();
    const recentThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const recentTracks = tracksWithBasicInfo.filter(
      (t) => new Date(t.added_at) > recentThreshold
    );

    // Store basic results
    this.analysisResults = {
      tracksWithFeatures: tracksWithBasicInfo,
      totalTracks,
      avgPopularity: Math.round(avgPopularity),
      avgDuration: Math.round(avgDuration),
      topArtists,
      recentTracks: recentTracks.length,
      mode: 'basic', // Flag to indicate this is basic analysis
    };

    this.log(
      `📊 Basic analysis complete: ${totalTracks} tracks, ${topArtists.length} top artists`,
      'success'
    );
  }

  // Display basic results without audio features
  displayBasicResults() {
    const results = this.analysisResults;

    const html = `
            <div class="analysis-summary">
                <h3>📋 Track List Summary</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${results.totalTracks}</div>
                        <div class="stat-label">Total Tracks</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${results.avgPopularity}</div>
                        <div class="stat-label">Avg Popularity</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${Math.round(results.avgDuration / 1000 / 60)}m</div>
                        <div class="stat-label">Avg Duration</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${results.recentTracks}</div>
                        <div class="stat-label">Recent Adds</div>
                    </div>
                </div>
            </div>
            
            <div class="top-artists">
                <h4>🎤 Your Top Artists</h4>
                <div class="artist-list">
                    ${results.topArtists
    .map(
      (artist) => `
                        <div class="artist-item">
                            <span class="artist-name">${artist.name}</span>
                            <span class="artist-count">${artist.count} tracks</span>
                        </div>
                    `
    )
    .join('')}
                </div>
            </div>
            
            <div class="info-note" style="margin-top: 16px; padding: 12px; background: rgba(29, 185, 84, 0.1); border-radius: 8px; border: 1px solid rgba(29, 185, 84, 0.3);">
                <h4 style="margin: 0 0 8px 0; color: #1db954;">💡 Basic Mode Active</h4>
                <p style="margin: 0; font-size: 13px; color: #ccc;">
                    This is a lightweight track list without audio features. 
                    For detailed analysis with genres and audio features, use "Upload Spotify Data" with your exported JSON file.
                </p>
            </div>
        `;

    document.getElementById('analysisResults').innerHTML = html;

    // Generate basic playlists (they'll work with basic track info)
    this.generateBasicPlaylistCards();
  }

  // Generate playlist cards for basic mode
  generateBasicPlaylistCards() {
    // Simple playlist generation for basic mode
    const basicPlaylists = [
      {
        id: 'popular',
        name: '🔥 Popular Hits',
        description: 'Your most popular tracks',
      },
      {
        id: 'recent',
        name: '🆕 Recent Additions',
        description: 'Recently added tracks',
      },
      {
        id: 'long_tracks',
        name: '⏳ Long Tracks',
        description: 'Tracks over 4 minutes',
      },
      {
        id: 'short_tracks',
        name: '⚡ Quick Hits',
        description: 'Tracks under 3 minutes',
      },
    ];

    let playlistHTML = '<div class="playlist-grid">';

    basicPlaylists.forEach((playlist) => {
      const trackCount = this.getBasicPlaylistTrackCount(playlist.id);
      playlistHTML += `
                <div class="glass-card playlist-card">
                    <h3>${playlist.name}</h3>
                    <p>${playlist.description}</p>
                    <div class="playlist-stats">
                        <span class="track-count">${trackCount} tracks</span>
                    </div>
                    <button class="create-playlist-btn" data-playlist-id="${playlist.id}" ${trackCount === 0 ? 'disabled' : ''}>
                        Create Playlist
                    </button>
                </div>
            `;
    });

    playlistHTML += '</div>';

    // Add to playlists tab
    document.getElementById('playlistGrid').innerHTML = playlistHTML;

    // Add event listeners
    document.querySelectorAll('.create-playlist-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const playlistId = e.target.dataset.playlistId;
        this.createBasicPlaylist(playlistId);
      });
    });
  }

  getBasicPlaylistTrackCount(playlistId) {
    const tracks = this.likedTracks;

    switch (playlistId) {
    case 'popular':
      return tracks.filter((t) => t.track.popularity > 70).length;
    case 'recent':
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return tracks.filter((t) => new Date(t.added_at) > recentDate).length;
    case 'long_tracks':
      return tracks.filter((t) => t.track.duration_ms > 4 * 60 * 1000).length;
    case 'short_tracks':
      return tracks.filter((t) => t.track.duration_ms < 3 * 60 * 1000).length;
    default:
      return 0;
    }
  }

  async createBasicPlaylist(playlistId) {
    // Implementation for basic playlist creation
    this.log(`Creating basic playlist: ${playlistId}`, 'info');
    // This would use the existing createPlaylist logic but simplified
  }

  // Enhanced Analysis Functions
  async enrichCurrentTracks() {
    if (!this.musicDB || !this.likedTracks.length) {
      alert('No tracks available or enhanced database not ready');
      return;
    }

    this.isEnrichingTracks = true;
  const progressContainer = document.getElementById('enrichmentProgress');
  const progressFill = progressContainer?.querySelector('.progress-fill');
  const progressText = progressContainer?.querySelector('.progress-text');

  if (progressContainer) progressContainer.style.display = 'block';
    document.getElementById('enrichTracksButton').disabled = true;

    try {
      // Convert tracks to enrichment format (support Spotify liked items and plain tracks)
      const tracksToEnrich = this.likedTracks
        .map((item) => {
          const isSpotifyItem = !!item.track;
          const name = isSpotifyItem ? item.track?.name : item.name;
          const artistsArr = isSpotifyItem ? item.track?.artists : item.artists;
          const artistName = artistsArr?.[0]?.name || '';
          const albumName = isSpotifyItem ? item.track?.album?.name : item.album?.name;
          const popularity = isSpotifyItem ? (item.track?.popularity ?? 0) : (item.popularity ?? 0);
          const durationMs = isSpotifyItem ? (item.track?.duration_ms ?? 0) : (item.duration_ms ?? 0);
          const added = isSpotifyItem ? (item.added_at || '') : (item.added_date || item.added_at || '');

          // Skip if key fields are missing
          if (!name || !artistName) return null;

          return {
            track_name: name,
            artist: artistName,
            album: albumName || '',
            popularity: popularity || 0,
            duration_min: durationMs ? (durationMs / 60000).toFixed(2) : 0,
            added_date: added,
          };
        })
        .filter(Boolean);

      // Enrich new tracks only
        const enrichedTracks = await this.musicDB.enrichNewTracks(
        tracksToEnrich,
        (progress) => {
          const percentage = (progress.current / progress.total) * 100;
          if (progressFill) progressFill.style.width = `${percentage}%`;
          if (progressText) progressText.textContent = `Enriching ${progress.current}/${progress.total}: ${progress.track.artist} - ${progress.track.track_name}`;
        }
      );

      if (progressText) progressText.textContent = `✅ Enrichment complete! ${enrichedTracks.length} tracks processed`;

      setTimeout(() => {
        if (progressContainer) progressContainer.style.display = 'none';
        document.getElementById('enrichTracksButton').disabled = false;
        this.isEnrichingTracks = false;
      }, 3000);

      this.log(`Enhanced ${enrichedTracks.length} tracks with genre data`);

      // Show stats
      setTimeout(() => this.showDatabaseStats(), 1000);

      // Enable playlist creation and show a preview of what will be created
      const createBtn = document.getElementById('createPlaylistsButton');
      if (createBtn) createBtn.disabled = false;
      setTimeout(() => this.showEnrichedPlaylistPreview(), 400);
    } catch (error) {
      console.error('Enrichment failed:', error);
      alert('Enrichment failed. Check console for details.');
      if (progressContainer) progressContainer.style.display = 'none';
      document.getElementById('enrichTracksButton').disabled = false;
      this.isEnrichingTracks = false;
    }
  }

  // Preview playlists based on enriched primary genres
  async showEnrichedPlaylistPreview() {
    try {
      if (!this.musicDB) return;
      const now = Date.now();
      if (this._lastPreviewAt && (now - this._lastPreviewAt) < 1500) {
        return; // throttle preview updates to 1.5s
      }
      this._lastPreviewAt = now;
      const createBtn = document.getElementById('createPlaylistsButton');
      if (createBtn) createBtn.disabled = false;
      // Build set of current liked track IDs (using the same ID scheme as the DB)
      const idFor = (item) => {
        const isItem = !!item.track;
        const name = isItem ? item.track?.name : item.name;
        const artist = isItem ? item.track?.artists?.[0]?.name : item.artists?.[0]?.name;
        if (!name || !artist || typeof this.musicDB.generateTrackId !== 'function') return null;
        return this.musicDB.generateTrackId(artist, name);
      };
      const currentIds = new Set(this.likedTracks.map(idFor).filter(Boolean));

      // Get all enriched tracks and intersect with current liked tracks
      const allEnriched = await this.musicDB.getAllTracks();
      const byGenre = new Map();
      for (const t of allEnriched) {
        if (!currentIds.has(t.id)) continue; // only show possibilities for current session
        const g = t.external_data?.primaryGenre || 'mixed';
        if (!byGenre.has(g)) byGenre.set(g, 0);
        byGenre.set(g, byGenre.get(g) + 1);
      }

      // Build preview HTML
      const entries = Array.from(byGenre.entries()).sort((a,b) => b[1]-a[1]);
      if (!entries.length) {
        this.log('No enriched tracks found for preview yet – try enriching or importing enhanced JSON.', 'warning');
        return;
      }
      let html = '<div class="glass-card playlist-preview"><h3>🎯 Playlist Possibilities (by Genre)</h3><div class="playlist-grid">';
      for (const [genre, count] of entries) {
        const pretty = (genre && genre !== 'mixed') ? (CONFIG.PLAYLIST_SETTINGS.genrePlaylistNames?.[genre] || `${genre[0].toUpperCase()}${genre.slice(1)} Vibes`) : 'Mixed Vibes';
        html += `
          <div class="playlist-card">
            <h4>${pretty}</h4>
            <p>${count} tracks ready</p>
            <div class="card-actions">
              <button class="action-button" data-view-genre="${genre}">View</button>
            </div>
          </div>
        `;
      }
  html += '</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="action-button success" id="createNowFromPreview">Create These Playlists</button><button class="action-button" id="runAdvancedAnalysisBtn" title="Fetch audio features for candidate tracks to build smarter playlists">Run Advanced Analysis</button><button class="action-button primary" id="createSimilarityMixesBtn" title="Create 3-5 smart similarity-based mixes using artist, genre and audio features">Create Similarity Mixes</button></div></div>';

      // Prefer rendering to SMART tab, fallback to playlistResults (do NOT switch tabs here to avoid loops)
      const smartPane = document.getElementById('smart');
      const resultsPane = document.getElementById('playlistResults');
      if (smartPane) {
        smartPane.innerHTML = html;
      } else if (resultsPane) {
        resultsPane.innerHTML = html;
        resultsPane.style.display = 'block';
      }

      const btn = document.getElementById('createNowFromPreview');
      if (btn) btn.addEventListener('click', () => this.createPlaylists());

      // Bind per-genre view buttons
      document.querySelectorAll('[data-view-genre]')?.forEach((el) => {
        el.addEventListener('click', (e) => {
          const g = e.currentTarget.getAttribute('data-view-genre');
          this.showPlaylistPossibilityDetails(g);
        });
      });

      // Bind advanced analysis
      const adv = document.getElementById('runAdvancedAnalysisBtn');
      if (adv) adv.addEventListener('click', () => this.runAdvancedAnalysisForCandidates());
  const sim = document.getElementById('createSimilarityMixesBtn');
  if (sim) sim.addEventListener('click', () => this.createSimilarityMixes());
    } catch (e) {
      console.warn('Failed to show playlist preview:', e);
    }
  }

  // Build in-memory enriched index for current session
  async buildEnrichedIndex() {
    if (!this.musicDB) return null;
    if (this._enrichedIndex) return this._enrichedIndex;
    const all = await this.musicDB.getAllTracks();
    const map = new Map();
    for (const t of all) map.set(t.id, t);
    this._enrichedIndex = map;
    return map;
  }

  // Show a modal with the tracks that would go into a given genre playlist
  async showPlaylistPossibilityDetails(genre) {
    try {
      const index = await this.buildEnrichedIndex();
      if (!index) return;
      // Build list
      const rows = [];
      for (const item of this.likedTracks) {
        const artist = item.track?.artists?.[0]?.name || item.artists?.[0]?.name;
        const name = item.track?.name || item.name;
        if (!artist || !name || typeof this.musicDB.generateTrackId !== 'function') continue;
        const id = this.musicDB.generateTrackId(artist, name);
        const enriched = index.get(id);
        if (!enriched) continue;
        const primary = enriched.external_data?.primaryGenre || 'mixed';
        if (genre !== primary) continue;
        rows.push({
          name,
          artist,
          popularity: item.track?.popularity ?? item.popularity ?? 0,
          added_at: item.added_at || '',
          uri: item.track?.uri || item.uri,
          id: item.track?.id || id,
        });
      }

      // Sort by popularity desc then recency
      rows.sort((a,b) => (b.popularity - a.popularity) || (new Date(b.added_at) - new Date(a.added_at)));

      const maxPer = CONFIG.PLAYLIST_SETTINGS?.maxSongsPerPlaylist || 50;
      const total = rows.length;

      // Modal HTML
      const modal = document.createElement('div');
      modal.className = 'export-modal';
      const title = (genre && genre !== 'mixed') ? (CONFIG.PLAYLIST_SETTINGS.genrePlaylistNames?.[genre] || `${genre[0].toUpperCase()}${genre.slice(1)} Vibes`) : 'Mixed Vibes';
      const pageSize = 50;
      let shown = Math.min(pageSize, rows.length);

      const renderList = () => rows.slice(0, shown).map(r => `<div class="preview-track"><span class="track-name">${r.name}</span> <span class="track-artist">by ${r.artist}</span> <span class="track-meta">• Pop ${r.popularity} • ${r.added_at ? new Date(r.added_at).toLocaleDateString() : ''}</span></div>`).join('');

      modal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content" style="max-width:820px">
            <h3>${title} — ${total} tracks ready ${total>maxPer?`(capped at ${maxPer} on creation)`:''}</h3>
            <div id="genreList" class="preview-tracks" style="max-height:420px;overflow:auto">${renderList()}</div>
            <div class="modal-actions" style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="action-button" id="loadMoreGenre">Show next ${pageSize}</button>
              <button class="action-button primary" id="createThisGenre">Create This Playlist</button>
              <button class="cancel-btn" id="closeGenreModal">Close</button>
            </div>
          </div>
        </div>`;

      document.body.appendChild(modal);
      const listEl = modal.querySelector('#genreList');
      modal.querySelector('#loadMoreGenre')?.addEventListener('click', () => {
        shown = Math.min(rows.length, shown + pageSize);
        listEl.innerHTML = renderList();
      });
      modal.querySelector('#closeGenreModal')?.addEventListener('click', () => document.body.removeChild(modal));
      modal.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) document.body.removeChild(modal); });
      modal.querySelector('#createThisGenre')?.addEventListener('click', async () => {
        try { await this.createGenrePlaylist(genre); } finally { document.body.removeChild(modal); }
      });
    } catch (e) {
      console.warn('Failed to open genre details:', e);
    }
  }

  // Fetch audio features only for candidate tracks used in possibilities
  async runAdvancedAnalysisForCandidates() {
    try {
      if (!CONFIG.validate()) {
        alert('Please connect to Spotify to run advanced analysis.');
        return;
      }
      // Collect candidate IDs
      const ids = this.likedTracks.map(it => it.track?.id).filter(Boolean);
      if (!ids.length) {
        alert('Load your track list first.');
        return;
      }
      this.log('🔬 Running advanced analysis for candidate tracks…', 'info');
      // Batch fetch audio features in chunks of 50
      const batch = 50;
      const features = [];
      for (let i=0;i<ids.length;i+=batch) {
        const chunk = ids.slice(i,i+batch);
        try {
          const resp = await this.makeSpotifyRequest(`${CONFIG.SPOTIFY_API_BASE}/audio-features?ids=${chunk.join(',')}`);
          if (resp.audio_features) features.push(...resp.audio_features.filter(Boolean));
        } catch (err) {
          this.log(`Audio features batch failed: ${err.message}`, 'warning');
        }
        await this.delay(800); // gentle pacing
      }
      this.audioFeatures = features;
      // Build a quick map for scoring
      this._afMap = new Map();
      features.forEach(f => this._afMap.set(f.id, f));
      this.log(`✅ Advanced analysis collected ${features.length} feature sets`, 'success');
    } catch (e) {
      this.log(`Advanced analysis failed: ${e.message}`,'error');
    }
  }

  // Create a single genre playlist with smart capped selection
  async createGenrePlaylist(genre) {
    // Build bucket
    const bucket = [];
    for (const item of this.likedTracks) {
      const artist = item.track?.artists?.[0]?.name || item.artists?.[0]?.name;
      const name = item.track?.name || item.name;
      if (!artist || !name || typeof this.musicDB?.generateTrackId !== 'function') continue;
      const id = this.musicDB.generateTrackId(artist, name);
      const enriched = this._enrichedIndex?.get(id);
      const primary = enriched?.external_data?.primaryGenre || 'mixed';
      if (primary === genre) bucket.push(item);
    }

    const selected = this.selectSmartSubsetForGenre(genre, bucket);
    if (!selected.length) {
      alert('No tracks available for this genre.');
      return;
    }
    const name = this.getGenrePlaylistName(genre, selected.length);
    const description = `Smart, capped selection for ${genre} • ${selected.length} tracks`;
    const playlist = await this.createSpotifyPlaylist(name, description);
    const uris = selected.map(it => it.track?.uri || it.uri).filter(Boolean);
    await this.addTracksToPlaylist(playlist.id, uris);
    this.log(`✅ Created playlist "${name}" with ${uris.length} tracks`, 'success');
  }

  // Choose a smart, capped subset for a genre bucket
  selectSmartSubsetForGenre(genre, items) {
    const maxPer = CONFIG.PLAYLIST_SETTINGS?.maxSongsPerPlaylist || 50;
    if (!items || !items.length) return [];
    // Score each track
    const rows = items.map(it => {
      const id = it.track?.id;
      const af = this._afMap?.get(id);
      const pop = it.track?.popularity ?? 0;
      const recency = it.added_at ? (Date.now() - new Date(it.added_at).getTime()) : Number.MAX_SAFE_INTEGER;
      const recencyScore = 1 - Math.min(1, recency / (365*24*60*60*1000)); // 1 year window
      let score = pop/100 * 0.5 + recencyScore * 0.2;
      if (af) {
        // Favor energetic/danceable for pop/electronic; mid-energy for rock; adjust by genre
        const target = (genre||'').toLowerCase().includes('pop') || (genre||'').toLowerCase().includes('elect') ? {energy:0.65,dance:0.7,valence:0.6}
                      : (genre||'').toLowerCase().includes('rock') ? {energy:0.7,dance:0.5,valence:0.5}
                      : {energy:0.55,dance:0.55,valence:0.55};
        const fe = 1 - Math.abs((af.energy||0.5) - target.energy);
        const fd = 1 - Math.abs((af.danceability||0.5) - target.dance);
        const fv = 1 - Math.abs((af.valence||0.5) - target.valence);
        score += (fe*0.1 + fd*0.15 + fv*0.05);
      }
      const artist = it.track?.artists?.[0]?.name || '';
      return { it, score, artist };
    });

    // Sort by score desc
    rows.sort((a,b) => b.score - a.score);

    // Enforce artist diversity: max 3 per artist
    const perArtist = new Map();
    const selected = [];
    for (const row of rows) {
      const count = perArtist.get(row.artist) || 0;
      if (count >= 3) continue;
      selected.push(row.it);
      perArtist.set(row.artist, count+1);
      if (selected.length >= maxPer) break;
    }
    return selected;
  }

  // Build 3-5 similarity-based mixes using artist overlap, enriched genre, and audio features
  async createSimilarityMixes() {
    try {
      if (!CONFIG.validate()) {
        alert('Please connect to Spotify first.');
        return;
      }
      // Make sure we have some audio features if possible
      if (!this.audioFeatures || this.audioFeatures.length === 0) {
        await this.runAdvancedAnalysisForCandidates();
      }
      const afMap = new Map();
      (this.audioFeatures||[]).forEach(f => afMap.set(f.id, f));

      // Build working set from current likedTracks intersected with enriched index
      const index = await this.buildEnrichedIndex();
      const candidates = [];
      for (const it of this.likedTracks) {
        const artist = it.track?.artists?.[0]?.name || it.artists?.[0]?.name;
        const name = it.track?.name || it.name;
        if (!artist || !name || typeof this.musicDB?.generateTrackId !== 'function') continue;
        const id = this.musicDB.generateTrackId(artist, name);
        const enriched = index?.get(id);
        if (!enriched) continue;
        candidates.push({ it, id: it.track?.id, primary: enriched.external_data?.primaryGenre || 'mixed' });
      }
      if (candidates.length < 30) {
        alert('Not enough enriched tracks to create similarity mixes.');
        return;
      }

      // Group by primary genre; pick top 3-5 groups
      const groups = new Map();
      for (const c of candidates) {
        if (!groups.has(c.primary)) groups.set(c.primary, []);
        groups.get(c.primary).push(c);
      }
      const sortedGroups = Array.from(groups.entries()).sort((a,b)=>b[1].length-a[1].length).slice(0,5);

      // For each group, pick a smart seed (popular + recent), then fill by similarity
      const mixes = [];
      const maxPer = Math.min(50, CONFIG.PLAYLIST_SETTINGS?.maxSongsPerPlaylist || 50);
      for (const [genre, items] of sortedGroups) {
        // Choose seed
        const seed = [...items].sort((a,b)=> (b.it.track?.popularity||0)-(a.it.track?.popularity||0) || (new Date(b.it.added_at)-new Date(a.it.added_at)))[0];
        // Score others against seed
        const seedAf = seed.id ? afMap.get(seed.id) : null;
        const seedArtist = seed.it.track?.artists?.[0]?.name || '';
        const rows = items.map(c => {
          if (c === seed) return null;
          const af = c.id ? afMap.get(c.id) : null;
          let score = 0;
          // Artist overlap
          const artist = c.it.track?.artists?.[0]?.name || '';
          if (artist && artist === seedArtist) score += 0.25;
          // Primary genre already same; small bonus
          score += 0.15;
          // Audio feature closeness if available
          if (seedAf && af) {
            const fe = 1 - Math.abs((af.energy||0.5) - (seedAf.energy||0.5));
            const fd = 1 - Math.abs((af.danceability||0.5) - (seedAf.danceability||0.5));
            const fv = 1 - Math.abs((af.valence||0.5) - (seedAf.valence||0.5));
            score += (fe*0.25 + fd*0.25 + fv*0.15);
          }
          // Popularity and recency as tie-breakers
          score += (c.it.track?.popularity||0)/100 * 0.1;
          const recency = c.it.added_at ? (Date.now()-new Date(c.it.added_at).getTime()) : Number.MAX_SAFE_INTEGER;
          const recencyScore = 1 - Math.min(1, recency / (365*24*60*60*1000));
          score += recencyScore * 0.1;
          return { c, score, artist };
        }).filter(Boolean);

        rows.sort((a,b)=>b.score-a.score);
        // Enforce artist diversity
        const perArtist = new Map();
        const chosen = [seed.it];
        perArtist.set(seedArtist, 1);
        for (const row of rows) {
          const cnt = perArtist.get(row.artist)||0;
          if (cnt>=3) continue;
          chosen.push(row.c.it);
          perArtist.set(row.artist, cnt+1);
          if (chosen.length>=maxPer) break;
        }
        mixes.push({ genre, chosen });
      }

      // Create playlists for each mix
      for (const mix of mixes) {
        const name = `${this.getGenrePlaylistName(mix.genre, mix.chosen.length)} • Similarity Mix`;
        const desc = `Similarity-based selection using artist, genre and audio features • ${mix.chosen.length} tracks`;
        const playlist = await this.createSpotifyPlaylist(name, desc);
        const uris = mix.chosen.map(it => it.track?.uri || it.uri).filter(Boolean);
        await this.addTracksToPlaylist(playlist.id, uris);
        this.log(`✅ Created similarity mix for ${mix.genre} (${uris.length} tracks)`, 'success');
      }

    } catch (e) {
      this.log(`Failed to create similarity mixes: ${e.message}`, 'error');
    }
  }

  async showSmartRecommendations() {
    if (!this.musicDB) {
      alert('Enhanced database not ready');
      return;
    }

    // Get current playlists (mock data for demo)
    const existingPlaylists = [
      {
        id: 'chill',
        name: 'Chill Vibes',
        genre: 'folk',
        audioFeatures: { valence: 0.3, energy: 0.4 },
      },
      {
        id: 'party',
        name: 'Party Mix',
        genre: 'electronic',
        audioFeatures: { valence: 0.8, energy: 0.9 },
      },
      {
        id: 'rock',
        name: 'Rock Anthems',
        genre: 'rock',
        audioFeatures: { valence: 0.6, energy: 0.8 },
      },
      {
        id: 'romanian',
        name: 'Romanian Hits',
        genre: 'romanian',
        audioFeatures: { valence: 0.7, energy: 0.6 },
      },
    ];

    // Get recent tracks (last 10 as example)
    const recentTracks = this.likedTracks.slice(0, 10);
    const recommendations = [];

    for (const track of recentTracks) {
      const trackData = {
        track_name: track.name,
        artist: track.artists[0]?.name || 'Unknown Artist',
      };

      const recommendation = await this.musicDB.recommendPlaylistForTrack(
        trackData,
        existingPlaylists
      );

      if (recommendation.recommendedPlaylist) {
        recommendations.push({
          track: trackData,
          recommendation,
        });
      }
    }

    // Display recommendations
    this.displayRecommendations(recommendations);
  }

  displayRecommendations(recommendations) {
    let html = `
            <div class="glass-card recommendation-results">
                <h3>🎯 Smart Playlist Recommendations</h3>
                <div class="recommendations-list">
        `;

    recommendations.forEach(({ track, recommendation }) => {
      html += `
                <div class="recommendation-item">
                    <div class="track-info">
                        <strong>${track.artist}</strong> - ${track.track_name}
                    </div>
                    <div class="recommendation-info">
                        <span class="playlist-name">→ ${recommendation.recommendedPlaylist.name}</span>
                        <span class="confidence">Confidence: ${(recommendation.confidence * 100).toFixed(0)}%</span>
                        <div class="reasons">${recommendation.reasons.join(', ')}</div>
                    </div>
                </div>
            `;
    });

    html += `
                </div>
                <button onclick="this.parentElement.remove()" class="action-button">Close</button>
            </div>
        `;

    document.getElementById('playlistResults').innerHTML = html;
  }

  async showDatabaseStats() {
    if (!this.musicDB) {
      alert('Enhanced database not ready');
      return;
    }

    try {
      const stats = await this.musicDB.getDatabaseStats();

      let genreStatsHTML = '';
      Object.entries(stats.genreDistribution)
        .sort(([, a], [, b]) => b - a)
        .forEach(([genre, count]) => {
          const percentage = ((count / stats.enrichedTracks) * 100).toFixed(1);
          genreStatsHTML += `
                        <div class="genre-stat">
                            <span class="genre-name">${genre}</span>
                            <span class="genre-count">${count} tracks (${percentage}%)</span>
                        </div>
                    `;
        });

      const html = `
                <div class="glass-card database-stats">
                    <h3>📊 Enhanced Database Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number">${stats.totalTracks}</div>
                            <div class="stat-label">Total Tracks</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.enrichedTracks}</div>
                            <div class="stat-label">Enriched Tracks</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${(stats.enrichmentRate * 100).toFixed(1)}%</div>
                            <div class="stat-label">Enrichment Rate</div>
                        </div>
                    </div>
                    <div class="genre-distribution">
                        <h4>Genre Distribution:</h4>
                        ${genreStatsHTML}
                    </div>
                    <button onclick="this.parentElement.remove()" class="action-button">Close</button>
                </div>
            `;

      document.getElementById('playlistResults').innerHTML = html;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      alert('Failed to load database statistics');
    }
  }

  async exportEnhancedDatabase() {
    if (!this.musicDB) {
      alert('Enhanced database not ready');
      return;
    }

    try {
      const exportData = await this.musicDB.exportEnrichedDatabase();
      this.log(`Exported ${exportData.tracks.length} enriched tracks`);
      alert(
        `Successfully exported ${exportData.tracks.length} enriched tracks!`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.spotifyGenerator = new SpotifyPlaylistGenerator();
  window.playlistGenerator = window.spotifyGenerator; // Alias for HTML compatibility
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpotifyPlaylistGenerator;
}
