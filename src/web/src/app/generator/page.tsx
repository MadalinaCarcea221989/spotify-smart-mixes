"use client";

import { motion } from "framer-motion";
import { Disc, Play, Sliders, Hash, RefreshCw, Layers, Sparkles, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { spotifyAuth } from "@/lib/spotifyAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001/api/v1';

export default function GeneratorPage() {
  const [numPlaylists, setNumPlaylists] = useState(10);
  const [minTracks, setMinTracks] = useState(25);
  const [namingPrefix, setNamingPrefix] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [allGenres, setAllGenres] = useState<any[]>([]);
  const [algorithm, setAlgorithm] = useState("kmeans");
  const [stats, setStats] = useState({ total_tracks: 0, total_genres: 0 });

  useEffect(() => {
    fetchAllGenres();
  }, []);

  const fetchAllGenres = async () => {
    try {
      const [genresRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/library/genres?min_count=1&limit=1000`),
        fetch(`${API_BASE}/library/summary`)
      ]);
      if (genresRes.ok) {
        const data = await genresRes.json();
        setAllGenres(data.genres || []);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setStats({ total_tracks: data.total_tracks || 0, total_genres: data.total_genres || 0 });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGenrePlaylist = async (genre: any) => {
    const token = spotifyAuth.getToken();
    if (!token) return;

    setCreatingId(genre.name);
    try {
      const res = await fetch(`${API_BASE}/create_spotify_playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
          playlist_name: `${genre.name} Collection`,
          track_ids: genre.track_ids
        })
      });

      if (res.ok) {
        alert(`Successfully created "${genre.name} Collection"!`);
      }
    } catch (err) {
      console.error("Genre creation failed", err);
    } finally {
      setCreatingId(null);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // We no longer need to fetch and send all tracks! 
      // The backend will load them directly from the synced library file.
      const genRes = await fetch(`${API_BASE}/generate_playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tracks: [], // Backend will auto-load from file
          num_playlists: numPlaylists, 
          min_size: minTracks,
          algorithm
        })
      });
      
      const genData = await genRes.json();
      if (genData.error) {
        alert(genData.error);
        return;
      }
      setPlaylists(genData?.playlists || []);
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateOnSpotify = async (playlist: any) => {
    const token = spotifyAuth.getToken();
    if (!token) return;

    setCreatingId(playlist.id);
    try {
      const name = namingPrefix ? `${namingPrefix} - ${playlist.name}` : playlist.name;
      const track_ids = playlist.tracks.map((t: any) => t.id);

      const res = await fetch(`${API_BASE}/create_spotify_playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
          playlist_name: name,
          track_ids
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        alert(`Successfully created "${name}" on your Spotify!`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error("Creation failed", err);
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6 p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-4xl font-bold tracking-tight mb-2">Playlist Generator</h2>
        <p className="text-muted">Generate custom mixes based on your library's hidden clusters.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border p-8 rounded-3xl space-y-8 sticky top-8">
            <div className="flex items-center gap-3 mb-4">
              <Sliders className="text-spotify-green" size={20} />
              <h3 className="font-bold text-lg">Mix Parameters</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Generation Intelligence</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'kmeans', name: 'AI Clusters', icon: Layers },
                    { id: 'hdbscan', name: 'Natural Vibe', icon: Sparkles },
                    { id: 'harmonic', name: 'DJ Flow', icon: RefreshCw },
                    { id: 'spectral', name: 'Spectral', icon: Hash },
                  ].map((algo) => (
                    <button
                      key={algo.id}
                      onClick={() => setAlgorithm(algo.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 ${
                        algorithm === algo.id 
                        ? 'bg-spotify-green/10 border-spotify-green text-spotify-green' 
                        : 'bg-background border-border text-muted hover:border-white/20'
                      }`}
                    >
                      <algo.icon size={16} />
                      <span className="text-[10px] font-bold">{algo.name}</span>
                    </button>
                  ))}
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5 mt-2">
                  <p className="text-[10px] text-muted leading-relaxed">
                    {algorithm === 'kmeans' && <><strong className="text-white">AI Clusters:</strong> Creates perfectly balanced, evenly-sized playlists by dividing your library mathematically. Great for general listening.</>}
                    {algorithm === 'hdbscan' && <><strong className="text-white">Natural Vibe:</strong> Discovers organic communities of songs. It isolates distinct 'vibes' and filters out noise. Mix sizes will vary heavily.</>}
                    {algorithm === 'harmonic' && <><strong className="text-white">DJ Flow:</strong> Sorts tracks by musical key and tempo (using the Camelot Wheel) to create seamless, continuous DJ-style mixes.</>}
                    {algorithm === 'spectral' && <><strong className="text-white">Spectral:</strong> Uses complex graph theory to find deeply hidden connections between niche genres. Expect surprising, highly specific curations.</>}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted">Cluster Target</label>
                  <span className="text-spotify-green font-bold">{numPlaylists} Mixes</span>
                </div>
                <input 
                  type="range" min="1" max="50" value={numPlaylists} 
                  onChange={(e) => setNumPlaylists(parseInt(e.target.value))}
                  className="w-full accent-spotify-green bg-background h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted">Minimum Tracks</label>
                  <span className="text-spotify-green font-bold">{minTracks} per Mix</span>
                </div>
                <input 
                  type="range" min="10" max="100" value={minTracks} 
                  onChange={(e) => setMinTracks(parseInt(e.target.value))}
                  className="w-full accent-spotify-green bg-background h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-3 pt-4">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Naming Prefix</label>
                <input 
                  type="text" 
                  value={namingPrefix}
                  onChange={(e) => setNamingPrefix(e.target.value)}
                  placeholder="e.g. Smart Mix"
                  className="w-full bg-background border border-border p-4 rounded-xl text-sm font-medium focus:border-spotify-green outline-none transition-all"
                />
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-spotify-green hover:bg-spotify-green-bright text-black font-bold py-4 rounded-full transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="black" />}
              {isGenerating ? "ANALYZING CLUSTERS..." : "INITIALIZE GENERATION"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {playlists?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playlists.map((p, i) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border p-6 rounded-2xl hover:border-border-hover transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                        <Disc className="text-spotify-green" size={24} />
                      </div>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{p.tracks.length} tracks</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{p.name}</h4>
                      <div className="flex gap-4 mt-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Energy</span>
                          <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${p.analysis.avg_energy * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Dance</span>
                          <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-spotify-green" style={{ width: `${p.analysis.avg_danceability * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Vibe</span>
                          <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${p.analysis.avg_valence * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted mt-3 italic">
                        {algorithm === 'harmonic' ? 'DJ-Optimized Flow' : 
                         algorithm === 'hdbscan' ? 'Natural Vibe Community' : 
                         'AI-Balanced Cluster'}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleCreateOnSpotify(p)}
                    disabled={creatingId === p.id}
                    className="mt-6 w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    {creatingId === p.id ? <RefreshCw className="animate-spin" size={14} /> : <PlusCircleIcon className="text-spotify-green" size={14} />}
                    {creatingId === p.id ? "CREATING..." : "ADD TO SPOTIFY"}
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-6 opacity-60">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                <Hash className="text-muted" size={40} />
              </div>
              <div className="max-w-xs">
                <h4 className="font-bold text-xl">No Mixes Generated</h4>
                <p className="text-sm text-muted mt-2">Adjust your parameters and click "Initialize Generation" to create custom clusters from your synced library.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Advanced Genre Vault Section */}
      <div className="pt-10 border-t border-border">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <Hash className="text-spotify-green" size={24} />
              Advanced Genre Explorer
            </h3>
            <p className="text-muted text-sm mt-1">Deep-dive into every niche category discovered in your {stats.total_tracks ? stats.total_tracks.toLocaleString() : '...'} -track library.</p>
          </div>
          <span className="text-[10px] font-bold bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 text-muted">
            {stats.total_genres || allGenres.length} Categories Found
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {allGenres.map((g) => (
            <button
              key={g.name}
              onClick={() => handleCreateGenrePlaylist(g)}
              disabled={creatingId === g.name}
              className="bg-card/40 border border-border p-4 rounded-2xl hover:border-spotify-green/40 transition-all text-left group flex flex-col justify-between h-32 hover:bg-card"
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-lg bg-spotify-green/10 flex items-center justify-center group-hover:bg-spotify-green transition-colors">
                  <PlusCircleIcon size={16} className="text-spotify-green group-hover:text-black" />
                </div>
                <span className="text-[10px] font-bold text-muted bg-white/5 px-2 py-0.5 rounded-md">{g.count}</span>
              </div>
              <h4 className="font-bold text-sm leading-tight text-white/90 group-hover:text-white transition-colors">{g.name}</h4>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlusCircleIcon({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      className={className} 
      width={size} height={size} 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
