"use client";

import { motion } from "framer-motion";
import { BarChart2, Activity, Zap, Heart, RefreshCw, Layers, Sparkles, Hash, Music2, Target, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useSync } from "@/context/SyncContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001/api/v1';

const ALGO_META: Record<string, { icon: any; color: string; badge: string }> = {
  kmeans:   { icon: Layers,    color: "text-blue-400",         badge: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  hdbscan:  { icon: Sparkles,  color: "text-spotify-green",    badge: "bg-spotify-green/10 text-spotify-green border-spotify-green/20" },
  spectral: { icon: Hash,      color: "text-purple-400",       badge: "bg-purple-400/10 text-purple-400 border-purple-400/20" },
  harmonic: { icon: Music2,    color: "text-orange-400",       badge: "bg-orange-400/10 text-orange-400 border-orange-400/20" },
};

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export default function InsightsPage() {
  const { isSyncing, syncProgress } = useSync();
  const [features, setFeatures] = useState({
    danceability: 0,
    energy: 0,
    acousticness: 0,
    valence: 0
  });
  const [algoInsights, setAlgoInsights] = useState<any[]>([]);
  const [algoLoading, setAlgoLoading] = useState(true);
  const [totalTracks, setTotalTracks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatures();
    fetchAlgoInsights();
    const interval = setInterval(fetchFeatures, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchFeatures = async () => {
    try {
      const res = await fetch(`${API_BASE}/library/features`);
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
      }
    } catch (e) {
      console.error("Failed to fetch library features", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlgoInsights = async () => {
    try {
      const res = await fetch(`${API_BASE}/library/algorithm_insights`);
      if (res.ok) {
        const data = await res.json();
        setAlgoInsights(data.algorithms || []);
        setTotalTracks(data.total_tracks || 0);
      }
    } catch (e) {
      console.error("Failed to fetch algorithm insights", e);
    } finally {
      setAlgoLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6 p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2 text-white">Library Insights</h2>
          <p className="text-muted">Deep analysis of your musical preferences and algorithm performance.</p>
        </div>
        {isSyncing && (
          <div className="bg-spotify-green/10 border border-spotify-green/20 px-4 py-2 rounded-xl flex items-center gap-3 animate-pulse">
            <RefreshCw size={14} className="text-spotify-green animate-spin" />
            <span className="text-xs font-bold text-spotify-green uppercase tracking-widest">Live Syncing: {syncProgress}%</span>
          </div>
        )}
      </motion.div>

      {/* Row 1: DNA Map + Attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 h-[420px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl">Musical DNA Map</h3>
            <span className="text-[10px] bg-spotify-green/10 text-spotify-green px-2 py-1 rounded font-bold uppercase tracking-widest border border-spotify-green/20">Live Projection</span>
          </div>
          <div className="flex-1 bg-black/40 rounded-2xl border border-border flex flex-col items-center justify-center gap-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-spotify-green),transparent_70%)] opacity-5" />
            {loading ? (
              <>
                <div className="w-12 h-12 border-4 border-spotify-green border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-muted">Calculating Audio Feature Centroids...</p>
              </>
            ) : (
              <div className="relative w-full h-full p-4 flex items-center justify-center">
                <img
                  src="/library_map.png"
                  alt="Musical DNA Map"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform group-hover:scale-105"
                />
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-spotify-green mb-1">Clustering Mode: HDBSCAN</p>
                  <p className="text-xs text-white/80">Each point represents a track in your library, positioned by its unique combination of 12 audio features.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-3xl">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-6">Your Library DNA</h4>
            <div className="space-y-5">
              {[
                { label: "Danceability", value: features.danceability, icon: Zap,      color: "bg-spotify-green", textColor: "text-spotify-green" },
                { label: "Energy",       value: features.energy,       icon: Activity,  color: "bg-blue-400",      textColor: "text-blue-400" },
                { label: "Acousticness", value: features.acousticness, icon: Heart,     color: "bg-rose-400",      textColor: "text-rose-400" },
                { label: "Valence",      value: features.valence,      icon: Sparkles,  color: "bg-amber-400",     textColor: "text-amber-400" },
              ].map((attr) => (
                <div key={attr.label} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <attr.icon size={14} className={attr.textColor} />
                      <span className="text-sm font-medium">{attr.label}</span>
                    </div>
                    <span className={`text-xs font-bold ${attr.textColor}`}>{attr.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${attr.value}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${attr.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalTracks > 0 && (
            <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3">
              <BarChart2 size={16} className="text-spotify-green" />
              <div>
                <p className="text-xs text-muted">Tracks Analyzed</p>
                <p className="font-bold text-lg">{totalTracks.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Algorithm Comparison Panel */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-2xl font-bold tracking-tight">Algorithm Intelligence Comparison</h3>
          <span className="text-[10px] bg-white/5 border border-white/10 text-muted px-2 py-1 rounded font-bold uppercase tracking-widest">
            {algoLoading ? "Computing..." : `${algoInsights.length} Algorithms`}
          </span>
        </div>

        {algoLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse space-y-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
                <div className="h-2 bg-white/5 rounded" />
                <div className="h-2 bg-white/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {algoInsights.map((algo, i) => {
              const meta = ALGO_META[algo.id] || ALGO_META.kmeans;
              const Icon = meta.icon;
              return (
                <motion.div
                  key={algo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border hover:border-white/20 rounded-2xl p-6 flex flex-col gap-5 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5`}>
                      <Icon size={18} className={meta.color} />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${meta.badge}`}>
                      {algo.cluster_count} clusters
                    </span>
                  </div>

                  {/* Name & Description */}
                  <div>
                    <h4 className="font-bold text-base">{algo.name}</h4>
                    <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{algo.description}</p>
                  </div>

                  {/* Quality Scores */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                          <Target size={9} /> Cohesion
                        </span>
                        <span className="text-[10px] font-bold">{Math.round(algo.avg_cohesion * 100)}%</span>
                      </div>
                      <MiniBar value={algo.avg_cohesion} color="bg-white" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                          <Users size={9} /> Genre Purity
                        </span>
                        <span className="text-[10px] font-bold">{Math.round(algo.avg_purity * 100)}%</span>
                      </div>
                      <MiniBar value={algo.avg_purity} color={meta.color.replace("text-", "bg-")} />
                    </div>
                  </div>

                  {/* DNA Mini-Bar */}
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted">Avg. Cluster DNA</p>
                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] text-muted w-10">Energy</span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(algo.avg_energy || 0) * 100}%` }} />
                      </div>
                      <span className="text-[9px] text-muted">{Math.round((algo.avg_energy || 0) * 100)}%</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] text-muted w-10">Dance</span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-spotify-green rounded-full" style={{ width: `${(algo.avg_danceability || 0) * 100}%` }} />
                      </div>
                      <span className="text-[9px] text-muted">{Math.round((algo.avg_danceability || 0) * 100)}%</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] text-muted w-10">Vibe</span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(algo.avg_valence || 0) * 100}%` }} />
                      </div>
                      <span className="text-[9px] text-muted">{Math.round((algo.avg_valence || 0) * 100)}%</span>
                    </div>
                  </div>

                  {/* Top Genres */}
                  {algo.top_genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {algo.top_genres.slice(0, 3).map((g: string) => (
                        <span key={g} className="text-[9px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded font-medium capitalize">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
