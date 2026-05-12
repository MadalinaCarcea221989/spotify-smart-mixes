"use client";

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8000/callback';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001/api/v1';

export const spotifyAuth = {
  isMockMode: () => false,
  generateCodeVerifier: () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },

  // PKCE Helper: SHA-256 hash
  generateCodeChallenge: async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },

  login: async () => {
    try {
      const verifier = spotifyAuth.generateCodeVerifier();
      const challenge = await spotifyAuth.generateCodeChallenge(verifier);
      
      localStorage.setItem('spotify_code_verifier', verifier);

      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: [
          'user-read-private',
          'user-read-email',
          'user-library-read',
          'playlist-modify-public',
          'playlist-modify-private',
          'user-top-read',
        ].join(' '),
        code_challenge_method: 'S256',
        code_challenge: challenge,
      });

      const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
      console.log("🚀 AUTH REDIRECT:", authUrl);
      
      // Wake up the backend pre-emptively to avoid timeout later
      fetch(`${API_BASE}/sync_status/ping`).catch(() => {});
      
      window.location.href = authUrl;
    } catch (error) {
      console.error("Login Initialization Failed:", error);
    }
  },

  exchangeCodeForToken: async (code: string) => {
    // 1. Prevent double-exchange (React StrictMode protection)
    if (window.sessionStorage.getItem('spotify_exchange_in_progress')) {
      console.log("⏳ Exchange already in progress, skipping redundant call.");
      return;
    }
    window.sessionStorage.setItem('spotify_exchange_in_progress', 'true');

    try {
      const verifier = localStorage.getItem('spotify_code_verifier');
      if (!verifier) {
        // If we ALREADY have a token, it means the first attempt succeeded!
        if (spotifyAuth.isAuthenticated()) {
          console.log("✅ Already authenticated, skipping handshake.");
          window.location.href = "/";
          return;
        }
        throw new Error('Missing security verifier. Please start the login process again from the Home page.');
      }
      
      console.log("🧬 Backend Handshake Initiated...");

      const res = await fetch(`${API_BASE}/exchange_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          code_verifier: verifier,
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Auth Server Error: ${JSON.stringify(errorData.detail || errorData)}`);
      }

      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
        localStorage.removeItem('spotify_code_verifier');
        console.log("✅ Auth Successful!");
        return data.access_token;
      }
      throw new Error('Login failed: No access token received.');
    } finally {
      // Always unlock, but wait a bit to ensure the redirect happens
      setTimeout(() => window.sessionStorage.removeItem('spotify_exchange_in_progress'), 2000);
    }
  },

  refreshAccessToken: async () => {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE}/refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('spotify_access_token', data.access_token);
          if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
          return data.access_token;
        }
      }
    } catch (e) {
      console.error("Token refresh failed", e);
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    window.location.href = '/';
  },

  getToken: () => {
    if (typeof window !== 'undefined') return localStorage.getItem('spotify_access_token');
    return null;
  },

  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('spotify_access_token');
  }
};
