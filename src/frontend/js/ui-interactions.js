/**
 * UI INTERACTIONS
 * Handles all UI-related interactions for the improved layout
 * Separate from Spotify API logic
 */

(function() {
  'use strict';

  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', initializeUI);

  function initializeUI() {
    setupSectionSwitching();
    setupModeSelection();
    setupSliders();
    setupAdvancedToggle();
    setupConsoleToggle();
    setupButtonAnimations();
  }

  /**
   * Section Switching (Generate, Stats, Library)
   */
  function setupSectionSwitching() {
    const actionCards = document.querySelectorAll('.action-card');
    const sections = document.querySelectorAll('.content-section');

    actionCards.forEach(card => {
      card.addEventListener('click', function() {
        const targetSection = this.dataset.section;
        
        // Update active card
        actionCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');

        // Update active section
        sections.forEach(section => {
          section.classList.remove('active');
          if (section.id === targetSection + 'Section') {
            section.classList.add('active');
          }
        });

        // Log to console (if console exists)
        logToConsole(`Switched to ${targetSection} section`);
      });
    });
  }

  /**
   * Mode Selection (Balanced, Diverse, Favorites)
   */
  function setupModeSelection() {
    const modeCards = document.querySelectorAll('.mode-card');

    modeCards.forEach(card => {
      card.addEventListener('click', function() {
        const selectedMode = this.dataset.mode;
        
        // Update active mode
        modeCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');

        // Log to console
        logToConsole(`Selected mode: ${selectedMode}`);

        // Store mode in data attribute or global variable if needed
        document.body.dataset.selectedMode = selectedMode;
      });
    });
  }

  /**
   * Slider Value Updates
   */
  function setupSliders() {
    const sliders = [
      { id: 'numPlaylists', displayId: null },
      { id: 'minSongs', displayId: null },
      { id: 'maxSongs', displayId: null }
    ];

    sliders.forEach(({ id }) => {
      const slider = document.getElementById(id);
      if (!slider) return;

      const container = slider.closest('.slider-container');
      const valueDisplay = container ? container.querySelector('.slider-value') : null;

      if (valueDisplay) {
        // Update display on input
        slider.addEventListener('input', function() {
          valueDisplay.textContent = this.value;
        });

        // Initialize with current value
        valueDisplay.textContent = slider.value;
      }
    });
  }

  /**
   * Advanced Settings Toggle
   */
  function setupAdvancedToggle() {
    const toggleBtn = document.getElementById('advancedToggle');
    const settingsPanel = document.getElementById('advancedSettings');

    if (!toggleBtn || !settingsPanel) return;

    toggleBtn.addEventListener('click', function() {
      const isActive = settingsPanel.classList.toggle('active');
      this.classList.toggle('active');

      logToConsole(isActive ? 'Opened advanced settings' : 'Closed advanced settings');
    });
  }

  /**
   * Console Toggle
   */
  function setupConsoleToggle() {
    const consoleContainer = document.getElementById('consoleContainer');
    const toggleBtn = document.getElementById('consoleToggle');

    if (!consoleContainer || !toggleBtn) return;

    // Start collapsed
    consoleContainer.classList.add('collapsed');

    toggleBtn.addEventListener('click', function() {
      consoleContainer.classList.toggle('collapsed');
    });
  }

  /**
   * Button Animations & Interactions
   */
  function setupButtonAnimations() {
    // Generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', function() {
        logToConsole('Generate button clicked - initiating playlist generation...');
        
        // Add loading state (you can customize this)
        this.disabled = true;
        const originalText = this.innerHTML;
        this.innerHTML = `
          <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <span>Generating...</span>
        `;

        // Re-enable after 2 seconds (remove this in production, let your API handle it)
        setTimeout(() => {
          this.disabled = false;
          this.innerHTML = originalText;
        }, 2000);
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        logToConsole('Refreshing data...');
        // Add your refresh logic here
      });
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        logToConsole('Exporting enhanced database...');
        // Add your export logic here
      });
    }
  }

  /**
   * Utility: Log to Console
   */
  function logToConsole(message) {
    const consoleContent = document.getElementById('consoleContent');
    if (!consoleContent) return;

    const timestamp = new Date().toLocaleTimeString();
    const logLine = document.createElement('div');
    logLine.className = 'console-line';
    logLine.textContent = `[${timestamp}] ${message}`;
    
    consoleContent.appendChild(logLine);
    
    // Auto-scroll to bottom
    consoleContent.scrollTop = consoleContent.scrollHeight;

    // Keep only last 50 lines
    const lines = consoleContent.querySelectorAll('.console-line');
    if (lines.length > 50) {
      lines[0].remove();
    }
  }

  /**
   * Utility: Show/Hide Status Area
   */
  window.showStatus = function(message) {
    const statusArea = document.getElementById('statusArea');
    if (!statusArea) return;

    statusArea.style.display = 'block';
    const statusCard = statusArea.querySelector('.status-card p');
    if (statusCard) {
      statusCard.textContent = message;
    }
  };

  window.hideStatus = function() {
    const statusArea = document.getElementById('statusArea');
    if (statusArea) {
      statusArea.style.display = 'none';
    }
  };

  /**
   * Utility: Update Stats Values
   */
  window.updateStats = function(tracks, genres, artists) {
    const totalTracks = document.getElementById('totalTracks');
    const totalGenres = document.getElementById('totalGenres');
    const totalArtists = document.getElementById('totalArtists');

    if (totalTracks) totalTracks.textContent = tracks || '-';
    if (totalGenres) totalGenres.textContent = genres || '-';
    if (totalArtists) totalArtists.textContent = artists || '-';
  };

  // Expose log function globally for your existing scripts
  window.logToConsole = logToConsole;

  // Initialize with welcome message
  setTimeout(() => {
    logToConsole('✨ Playlist Vibe Creator initialized');
    logToConsole('Welcome! Ready to create amazing playlists.');
  }, 500);

})();
