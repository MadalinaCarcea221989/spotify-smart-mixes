"use client";

import { useEffect, useState } from "react";
import { 
  Music, 
  Mic2, 
  BarChart3, 
  Activity, 
  ShieldCheck, 
  RefreshCw,
  PlusCircle,
  Zap,
  LogIn,
  Heart,
  Sparkles,
  Shield,
  Settings as SettingsIcon,
  History,
  TrendingUp,
  Layers,
} from "lucide-react";
import { spotifyAuth } from "@/lib/spotifyAuth";
import { useSync } from "@/context/SyncContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001/api/v1';

export default function Dashboard() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [stats, setStats] = useState({
    total_tracks: "0",
    total_genres: "0",
    total_artists: "0",
    profile_cohesion: "0%"
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [features, setFeatures] = useState({
    danceability: 0,
    energy: 0,
    acousticness: 0,
    valence: 0
  });
  const { isSyncing, syncProgress, startSync } = useSync();

  useEffect(() => {
    const authStatus = spotifyAuth.isAuthenticated();
    setIsAuthenticated(authStatus);
    checkBackend();
    if (authStatus) {
      fetchSummary();
      fetchActivities();
      fetchFeatures();
      
      const interval = setInterval(() => {
        fetchActivities();
        fetchFeatures();
        // Auto-refresh summary cards if syncing is active
        if (isSyncing) {
          fetchSummary();
        }
      }, 3000); // Poll every 3 seconds during sync
      return () => clearInterval(interval);
    }
  }, [isSyncing]);

  const fetchActivities = async () => {
    try {
      const res = await fetch(`${API_BASE}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFeatures = async () => {
    try {
      const res = await fetch(`${API_BASE}/library/features`);
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/library/summary`);
      if (res.ok) {
        const data = await res.json();
        setStats({
          total_tracks: data.total_tracks.toLocaleString(),
          total_genres: data.total_genres.toLocaleString(),
          total_artists: data.total_artists.toLocaleString(),
          profile_cohesion: data.profile_cohesion
        });
      }
    } catch (e) {
      console.error("Failed to fetch summary", e);
    }
  };

  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync_status/ping`);
      if (res.ok) setBackendStatus("Connected");
      else setBackendStatus("Error");
    } catch (e) {
      setBackendStatus("Disconnected");
    }
  };

  const handleLogin = async () => {
    try {
      await spotifyAuth.login();
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2 text-white">Library Overview</h2>
          <p className="text-muted font-bold uppercase tracking-widest text-[10px]">
            Backend Connection: <span className={backendStatus === 'Connected' ? 'text-spotify-green' : 'text-amber-500'}>{backendStatus}</span>
          </p>
        </div>
        
        <div className="flex gap-4">
          {!isAuthenticated ? (
            <div className="flex flex-col items-end">
              <button 
                onClick={handleLogin}
                className="bg-spotify-green hover:bg-spotify-green-bright text-black px-8 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(29,185,84,0.3)] hover:scale-105 active:scale-95"
              >
                <LogIn size={16} />
                AUTHENTICATE PREMIUM SESSION
              </button>
              <p className="mt-3 text-[10px] text-muted uppercase tracking-[0.2em] font-bold">
                Spotify Premium Required
              </p>
            </div>
          ) : (
            <div className="flex gap-4">
              <button 
                onClick={startSync}
                disabled={isSyncing}
                className="bg-card border border-border hover:bg-card-hover px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? `SYNCING ${syncProgress}%` : 'REFRESH LIBRARY'}
              </button>
              <button 
                onClick={() => window.location.href = '/generator'}
                className="bg-spotify-green hover:bg-spotify-green-bright text-black px-8 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(29,185,84,0.2)] hover:scale-105 active:scale-95"
              >
                <PlusCircle size={16} />
                GENERATE MIX
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Library Tracks", value: stats.total_tracks, icon: Music, color: "text-spotify-green" },
          { label: "Detected Genres", value: stats.total_genres, icon: BarChart3, color: "text-blue-400" },
          { label: "Mapped Artists", value: stats.total_artists, icon: Mic2, color: "text-purple-400" },
          { label: "Profile Cohesion", value: stats.profile_cohesion, icon: ShieldCheck, color: "text-emerald-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border p-8 rounded-[2rem] hover:border-border-hover transition-all"
          >
            <stat.icon className={`${stat.color} mb-6`} size={20} />
            <p className="text-muted text-[10px] font-bold uppercase tracking-[0.15em] mb-1">{stat.label}</p>
            <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-[2.5rem] p-10 relative overflow-hidden flex flex-col justify-center min-h-[380px] group transition-all hover:border-spotify-green/20">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={250} className="text-spotify-green" />
          </div>
          <div className="relative z-10 space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-spotify-green/10 border border-spotify-green/20 text-spotify-green text-[10px] font-bold uppercase tracking-widest">
              <TrendingUp size={12} />
              Insight Engine Active
            </div>
            <h3 className="text-4xl font-bold leading-tight tracking-tight text-white">Your musical DNA, <br /><span className="text-spotify-green">reimagined.</span></h3>
            <p className="text-muted text-sm leading-relaxed font-medium">
              We've analyzed your library using multi-dimensional audio feature clustering. 
              View the similarity map to discover hidden patterns in your listening habits.
            </p>
            <div className="pt-4 flex gap-4">
              <button 
                onClick={() => window.location.href = '/insights'}
                className="bg-spotify-green text-black px-10 py-4 rounded-full text-xs font-bold hover:bg-spotify-green-bright transition-all shadow-[0_10px_20px_rgba(29,185,84,0.2)]"
              >
                EXPLORE MAP
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-[2.5rem] p-8 flex flex-col justify-between h-[180px] hover:border-border-hover transition-all">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Activity className="text-blue-400" size={16} />
                </div>
                <h4 className="font-bold text-sm text-white">Sync Engine</h4>
              </div>
              <span className={`text-[10px] font-bold ${backendStatus === 'Connected' ? 'text-spotify-green' : 'text-red-500'} tracking-widest`}>
                {backendStatus === 'Connected' ? 'STABLE' : 'OFFLINE'}
              </span>
            </div>
            <div className="space-y-4">
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-spotify-green transition-all duration-500" style={{ width: isSyncing ? `${syncProgress}%` : '100%' }} />
              </div>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                {isSyncing ? `Enriching tracks: ${syncProgress}%` : 'Library up to date'}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-8 h-[180px] group cursor-pointer hover:border-purple-500/20 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Layers className="text-purple-400" size={16} />
              </div>
              <h4 className="font-bold text-sm text-white">Cluster Status</h4>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{stats.total_genres || '—'}</p>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Genre Clusters Found</p>
              </div>
              <div className="flex flex-wrap gap-1 max-w-[80px] justify-end">
                {Array.from({ length: Math.min(Number(stats.total_genres) || 0, 9) }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-purple-400/60" />
                ))}
                {Number(stats.total_genres) > 9 && (
                  <span className="text-[8px] text-purple-400 font-bold">+{Number(stats.total_genres) - 9}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Genre Vault Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="text-spotify-green" size={24} />
            <h3 className="text-2xl font-bold text-white">Genre Vault</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Auto-Generated Collections</span>
        </div>

        <GenreVault />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
        <div className="bg-card border border-border rounded-[2.5rem] p-8 h-[300px] flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-spotify-green">
            <Activity size={18} />
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Recent Activity</h4>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {activities.length > 0 ? activities.map((item: any) => (
              <div key={item.id} className="flex gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="w-1.5 h-1.5 rounded-full bg-spotify-green mt-1.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-medium leading-relaxed">{item.message}</p>
                  <span className="text-[10px] text-muted font-bold">{item.timestamp}</span>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <Activity size={32} className="mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No Recent Events</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Attributes Box */}
        <div className="bg-card border border-border rounded-[2.5rem] p-8 h-[300px] flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-blue-400">
            <Zap size={18} />
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Musical DNA</h4>
          </div>
          <div className="space-y-4 flex-1 justify-center flex flex-col">
            {[
              { label: "Danceability", value: features.danceability, icon: Zap, color: "text-spotify-green" },
              { label: "Energy", value: features.energy, icon: Activity, color: "text-blue-400" },
              { label: "Acousticness", value: features.acousticness, icon: Heart, color: "text-rose-400" },
              { label: "Valence", value: features.valence, icon: Sparkles, color: "text-amber-400" },
            ].map((attr) => (
              <div key={attr.label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{attr.label}</span>
                  <span className="text-xs font-bold text-white">{attr.value}%</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full bg-current ${attr.color} transition-all duration-1000`} style={{ width: `${attr.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[2.5rem] p-8 h-[300px] hover:bg-card-hover transition-all">
          <Shield className="text-muted mb-4" size={20} />
          <h4 className="font-bold mb-2 text-white">System Shield</h4>
          <p className="text-xs text-muted leading-relaxed">Local-first data persistence active. Rate limit: 120req/min. Connection: Secure TLS.</p>
        </div>
      </div>
    </div>
  );
}

function GenreVault() {
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API_BASE}/library/genres`);
      if (res.ok) {
        const data = await res.json();
        setGenres(data.genres || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (genre: any) => {
    const token = spotifyAuth.getToken();
    if (!token) return;

    setExporting(genre.name);
    try {
      const res = await fetch('/api/v1/create_spotify_playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          playlist_name: `${genre.name.toUpperCase()} VAULT`,
          track_ids: genre.track_ids
        })
      });
      if (res.ok) alert(`Created "${genre.name} Vault" on Spotify!`);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
    {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-card rounded-2xl border border-border" />)}
  </div>;

  if (genres.length === 0) return (
    <div className="bg-card border border-border rounded-3xl p-10 text-center text-muted text-sm">
      No major genre clusters found yet. Complete a full sync to unlock the vault.
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
      {genres.map((g) => (
        <button
          key={g.name}
          onClick={() => handleExport(g)}
          disabled={!!exporting}
          className="bg-card border border-border p-6 rounded-[2rem] hover:border-spotify-green/40 transition-all text-left group flex flex-col justify-between h-40"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-spotify-green/10 flex items-center justify-center group-hover:bg-spotify-green transition-colors">
              <PlusCircle size={20} className="text-spotify-green group-hover:text-black" />
            </div>
            <span className="text-xs font-bold text-muted bg-white/5 px-2 py-1 rounded-lg">{g.count}</span>
          </div>
          <div>
            <h4 className="font-bold text-base leading-tight text-white mb-1">{g.name}</h4>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Collection</p>
          </div>
        </button>
      ))}
    </div>
  );
}
