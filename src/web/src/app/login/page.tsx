"use client";

import { motion } from "framer-motion";
import { LogIn, Sparkles, ShieldCheck, Zap, Layers, Music, ArrowRight } from "lucide-react";
import { spotifyAuth } from "@/lib/spotifyAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Pre-emptively wake up the backend as soon as the landing page loads
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001/api/v1';
    fetch(`${API_BASE}/sync_status/ping`).catch(() => {});

    if (spotifyAuth.isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await spotifyAuth.login();
    } catch (err) {
      console.error("Login failed", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-spotify-green/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse delay-700" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      
      <main className="max-w-4xl w-full z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8"
        >
          {/* Logo / Title Area */}
          <div className="space-y-4">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-spotify-green text-xs font-bold uppercase tracking-[0.2em]"
            >
              <Sparkles size={14} />
              AI-Powered Curation
            </motion.div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
              SMART <span className="text-spotify-green">MIXES</span>
            </h1>
            <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto font-medium">
              The professional engine for Spotify library intelligence. Discover hidden clusters and generate high-fidelity playlists with machine learning.
            </p>
          </div>

          {/* Action Area */}
          <div className="pt-10">
            <button 
              onClick={handleLogin}
              disabled={isLoading}
              className="group relative bg-spotify-green hover:bg-spotify-green-bright text-black px-12 py-5 rounded-full text-sm font-black tracking-widest uppercase transition-all flex items-center gap-3 mx-auto shadow-[0_20px_50px_rgba(29,185,84,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={20} fill="black" />
                  AUTHENTICATE WITH SPOTIFY
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
            <p className="mt-6 text-[10px] text-muted font-bold uppercase tracking-[0.3em]">
              Requires Spotify Premium Account
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-24 text-left">
            {[
              { 
                title: "Neural Clustering", 
                desc: "Discover organic musical communities using HDBSCAN and Spectral analysis.",
                icon: Layers,
                color: "text-purple-400"
              },
              { 
                title: "Harmonic Sequencing", 
                desc: "Generate continuous mixes based on the Camelot Wheel and tempo synchronization.",
                icon: Music,
                color: "text-blue-400"
              },
              { 
                title: "Deep DNA Mapping", 
                desc: "Visualize your entire library DNA in a 2D PCA-projected feature map.",
                icon: Zap,
                color: "text-amber-400"
              }
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/[0.08] transition-all"
              >
                <f.icon className={`${f.color} mb-6`} size={24} />
                <h3 className="font-bold text-lg mb-2 text-white">{f.title}</h3>
                <p className="text-xs text-muted leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer Branding */}
      <footer className="absolute bottom-10 left-0 right-0 text-center">
        <div className="flex items-center justify-center gap-2 text-muted text-[10px] font-bold uppercase tracking-widest">
          <ShieldCheck size={14} className="text-spotify-green" />
          Secure OAuth 2.0 PKCE Handshake
        </div>
      </footer>
    </div>
  );
}
