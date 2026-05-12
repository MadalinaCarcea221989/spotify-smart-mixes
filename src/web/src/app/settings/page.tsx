"use client";

import { motion } from "framer-motion";
import { Settings, LogOut, Shield, Database } from "lucide-react";
import { spotifyAuth } from "@/lib/spotifyAuth";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-4xl font-bold tracking-tight mb-2">Core Settings</h2>
        <p className="text-muted">Manage your system preferences and data connections.</p>
      </motion.div>

      <div className="space-y-6">
        <div className="bg-card border border-border p-8 rounded-3xl space-y-8">
          <div className="flex items-center gap-3">
            <Shield className="text-spotify-green" size={20} />
            <h3 className="font-bold text-lg">Account & Security</h3>
          </div>

          <div className="flex justify-between items-center py-4 border-b border-border/50">
            <div>
              <p className="font-bold">Spotify Connection</p>
              <p className="text-xs text-muted uppercase font-bold tracking-widest mt-1 text-spotify-green">Authorized via PKCE</p>
            </div>
            <button 
              onClick={() => spotifyAuth.logout()}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2"
            >
              <LogOut size={14} />
              DISCONNECT
            </button>
          </div>

          <div className="flex justify-between items-center py-4">
            <div>
              <p className="font-bold">Sync Mode</p>
              <p className="text-xs text-muted mt-1">Automatic library enrichment on every login.</p>
            </div>
            <div className="w-12 h-6 bg-spotify-green rounded-full relative p-1 cursor-pointer">
              <div className="w-4 h-4 bg-black rounded-full absolute right-1 shadow-sm" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-8 rounded-3xl space-y-8">
          <div className="flex items-center gap-3">
            <Database className="text-blue-400" size={20} />
            <h3 className="font-bold text-lg">Data Management</h3>
          </div>

          <div className="space-y-4">
            <button className="w-full bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-4 rounded-xl border border-border transition-all">
              EXPORT ENRICHED DATA (JSON)
            </button>
            <button className="w-full bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-4 rounded-xl border border-border transition-all">
              CLEAR LOCAL CACHE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
