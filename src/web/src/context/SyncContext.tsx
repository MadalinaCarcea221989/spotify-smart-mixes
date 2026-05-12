"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { spotifyAuth } from '@/lib/spotifyAuth';

interface SyncContextType {
  isSyncing: boolean;
  syncProgress: number;
  syncStatus: string;
  startSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001/api/v1';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);

  const pollSyncStatus = useCallback(async (tokenId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sync_status/${tokenId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.total > 0) {
          setSyncProgress(Math.round((data.current / data.total) * 100));
        }
        setSyncStatus(data.status);
        
        if (data.status === 'completed') {
          setIsSyncing(false);
          setActiveTokenId(null);
          return true;
        }
        if (data.status === 'not_found' || data.status === 'error') {
          setIsSyncing(false);
          setActiveTokenId(null);
          return true;
        }
      }
    } catch (e) {
      console.error("Polling error", e);
    }
    return false;
  }, []);

  useEffect(() => {
    if (activeTokenId) {
      const interval = setInterval(async () => {
        const finished = await pollSyncStatus(activeTokenId);
        if (finished) clearInterval(interval);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTokenId, pollSyncStatus]);

  const startSync = async () => {
    const token = spotifyAuth.getToken();
    if (!token) return;
    
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus('starting');
    
    try {
      const res = await fetch(`${API_BASE}/sync_library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTokenId(data.token_id);
      } else {
        setIsSyncing(false);
      }
    } catch (e) {
      console.error("Sync trigger failed", e);
      setIsSyncing(false);
    }
  };

  return (
    <SyncContext.Provider value={{ isSyncing, syncProgress, syncStatus, startSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
