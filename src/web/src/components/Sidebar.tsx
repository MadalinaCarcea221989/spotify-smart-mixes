"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Music, LayoutDashboard, Disc, BarChart2, Settings, User, Mic2, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { spotifyAuth } from "@/lib/spotifyAuth";
import { useSync } from "@/context/SyncContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001/api/v1';

export default function Sidebar() {
  const pathname = usePathname();
  const { isSyncing, syncProgress } = useSync(); // Track sync globally in navbar
  
  const navItems = [
    { name: 'Home', icon: LayoutDashboard, path: '/' },
    { name: 'Generator', icon: Disc, path: '/generator' },
    { name: 'Insights', icon: BarChart2, path: '/insights' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const [user, setUser] = useState<{ name: string, image: string, product: string } | null>(null);

  useEffect(() => {
    if (spotifyAuth.isAuthenticated()) {
      fetchUser();
    }
  }, []);

  const fetchUser = async (retry = true) => {
    const token = spotifyAuth.getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/me?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setUser({
          name: data.display_name || data.id,
          image: data.images?.[0]?.url,
          product: data.product || 'Standard'
        });
      } else if (res.status === 401 && retry) {
        // Token might be expired, try to refresh
        console.log("🔄 Token expired, attempting refresh...");
        const newToken = await spotifyAuth.refreshAccessToken();
        if (newToken) {
          return fetchUser(false); // Retry once with new token
        } else {
          // Refresh failed, logout
          spotifyAuth.logout();
        }
      }
    } catch (e) {
      console.error("Failed to fetch user profile", e);
    }
  };

  return (
    <header className="h-20 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50 flex items-center px-8 shrink-0">
      <div className="flex items-center gap-3 mr-12">
        <div className="w-10 h-10 bg-spotify-green rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(29,185,84,0.3)]">
          <Music size={20} strokeWidth={3} />
        </div>
        <h1 className="font-bold text-xl tracking-tighter whitespace-nowrap hidden lg:block">Smart Mixes</h1>
      </div>
      
      <nav className="flex items-center gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`px-5 py-2 text-xs font-bold rounded-full transition-all flex items-center gap-2 ${
                isActive 
                ? 'bg-spotify-green text-black shadow-[0_0_20px_rgba(29,185,84,0.2)]' 
                : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={14} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Global Sync Indicator */}
      {isSyncing && (
        <div className="mx-6 hidden md:flex items-center gap-4 bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] font-bold text-spotify-green uppercase tracking-[0.2em]">Enriching Library</span>
            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-spotify-green transition-all" style={{ width: `${syncProgress}%` }} />
            </div>
          </div>
          <RefreshCw size={14} className="text-spotify-green animate-spin" />
        </div>
      )}
      
      <div className="flex items-center gap-4 pl-6 border-l border-border ml-4">
        {user ? (
          <div className="flex items-center gap-3 group">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-bold truncate max-w-[120px] text-white">{user.name}</span>
              <span className="text-[9px] text-muted font-bold uppercase tracking-widest">{user.product}</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-spotify-green/10 flex items-center justify-center border border-spotify-green/20 overflow-hidden relative group">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={18} className="text-spotify-green" />
              )}
              <button 
                onClick={() => {
                  if (spotifyAuth.isMockMode()) {
                    spotifyAuth.disableMockMode();
                  } else {
                    spotifyAuth.logout();
                  }
                }}
                className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 opacity-50">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-bold">Guest</span>
              <span className="text-[9px] text-muted font-bold uppercase">Public Mode</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <User size={18} className="text-muted" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
