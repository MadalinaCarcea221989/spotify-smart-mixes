// Simple Spotify Authentication - No Redirect Required
class SimpleSpotifyAuth {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.clientId = '2e5babb7dcf346cb82db7ed7fb07e84b'; // Your client ID
  }

  // Use Implicit Grant flow (simpler, no redirect issues)
  async authenticateImplicit() {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-top-read',
    ].join(' ');

    const redirectUri = window.location.origin + '/html/callback.html';

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'token',
      redirect_uri: redirectUri,
      scope: scopes,
      show_dialog: 'true',
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    console.log('🎵 Opening Spotify authentication...');

    // Open in popup to avoid redirect issues
    const popup = window.open(authUrl, 'spotify-auth', 'width=500,height=600');

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);

          // Check if token was stored
          const token = localStorage.getItem('spotify_access_token');
          if (token) {
            this.accessToken = token;
            resolve(token);
          } else {
            reject(new Error('Authentication was cancelled'));
          }
        }
      }, 1000);

      // Listen for token from popup
      window.addEventListener('message', (event) => {
        if (event.data.type === 'SPOTIFY_TOKEN') {
          this.accessToken = event.data.token;
          localStorage.setItem('spotify_access_token', event.data.token);
          popup.close();
          clearInterval(checkClosed);
          resolve(event.data.token);
        }
      });
    });
  }

  // Alternative: Manual token input (RECOMMENDED - No redirect URI issues)
  async authenticateManual() {
    const instructions = `
🎵 SPOTIFY AUTHENTICATION - QUICK & EASY METHOD:

Since redirect URI setup can be tricky, let's use the manual token method:

1. Visit: https://developer.spotify.com/console/post-playlists/
2. Click "Get Token" 
3. Check these scopes:
   ✅ playlist-modify-public
   ✅ playlist-modify-private
   ✅ user-read-private
   ✅ user-read-email
   ✅ user-library-read
   ✅ user-top-read
4. Click "Request Token"
5. Copy the token and paste it below

This token will work immediately and create real playlists in your Spotify account!
No redirect URI setup needed!
        `;

    const token = prompt(instructions + '\n\nPaste your Spotify access token:');

    if (token && token.trim()) {
      this.accessToken = token.trim();
      localStorage.setItem('spotify_access_token', token.trim());

      // Test the token
      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });

        if (response.ok) {
          const user = await response.json();
          console.log(`✅ Successfully authenticated as: ${user.display_name}`);
          alert(
            `🎉 Success! Welcome ${user.display_name}!\n\nYou can now create playlists in your Spotify account!`
          );
          return this.accessToken;
        } else {
          throw new Error('Invalid token');
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        alert(
          '❌ Invalid token. Please try again with a fresh token from the Spotify Console.'
        );
        localStorage.removeItem('spotify_access_token');
        return null;
      }
    }
    return null;
  }

  // Use Authorization Code flow with PKCE (recommended for web apps)
  async authenticateWithPKCE() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-top-read',
    ].join(' ');

    const redirectUri = window.location.origin + '/callback.html';
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      show_dialog: 'true',
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    
    console.log('🎵 Redirecting to Spotify authorization...');
    console.log('Redirect URI:', redirectUri);
    
    // Redirect to Spotify authorization
    window.location.href = authUrl;
  }

  // Generate code verifier for PKCE
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Generate code challenge for PKCE
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Handle the authorization code from callback
  async handleAuthorizationCode(code) {
    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    const redirectUri = window.location.origin + window.location.pathname;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier,
    });

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokenData = await response.json();
      
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;
      
      // Store tokens
      localStorage.setItem('spotify_access_token', tokenData.access_token);
      localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
      localStorage.setItem('spotify_token_expires', Date.now() + (tokenData.expires_in * 1000));
      
      // Clean up
      sessionStorage.removeItem('spotify_code_verifier');
      
      return tokenData;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }  // Check if we have a valid stored token
  async checkStoredToken() {
    const token = localStorage.getItem('spotify_access_token');
    if (token) {
      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          this.accessToken = token;
          return token;
        } else {
          localStorage.removeItem('spotify_access_token');
          return null;
        }
      } catch {
        localStorage.removeItem('spotify_access_token');
        return null;
      }
    }
    return null;
  }

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }
}

// Export for use
window.SimpleSpotifyAuth = SimpleSpotifyAuth;
