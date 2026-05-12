"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { spotifyAuth } from "@/lib/spotifyAuth";
import { AlertCircle } from "lucide-react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const authError = searchParams.get("error");

    if (authError) {
      setError(`Spotify Authentication Error: ${authError}`);
      return;
    }
    
    if (code && !processing) {
      setProcessing(true);
      const verifier = localStorage.getItem('spotify_code_verifier');
      
      if (!verifier) {
        setError("Missing security verifier. Please start the login process again from the Home page.");
        return;
      }

      console.log("🧬 Starting Token Exchange...");
      spotifyAuth.exchangeCodeForToken(code)
        .then(() => {
          console.log("✅ Success! Redirecting home...");
          router.push("/");
        })
        .catch((err) => {
          console.error("❌ Token Exchange Failed:", err);
          setError(err.message || "Failed to exchange authorization code for token.");
        });
    } else if (!code && !authError) {
      // If we are on /callback but have no code, something is wrong with the redirect
      console.warn("⚠️ No code found in URL search params:", window.location.search);
      // Check if it's in the hash (sometimes happens with misconfigured flows)
      if (window.location.hash) {
        setError("Received an unexpected authentication format (Hash instead of Query). Check your Spotify App settings.");
      } else {
        setError("No authorization code received. Please try logging in again.");
      }
    }
  }, [searchParams, router, processing]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertCircle className="text-red-500" size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-red-500 tracking-tight">Handshake Failed</h2>
          <p className="text-white/70 text-sm max-w-xs mx-auto leading-relaxed font-medium">
            {error}
          </p>
        </div>
        <button 
          onClick={() => router.push("/")}
          className="bg-white text-black px-10 py-4 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all shadow-xl"
        >
          RETURN TO INITIALIZE
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-spotify-green/20 rounded-full" />
        <div className="absolute top-0 w-24 h-24 border-4 border-spotify-green border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-spotify-green rounded-full animate-ping" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Finalizing Session</h2>
        <p className="text-muted text-[10px] tracking-[0.4em] uppercase font-bold animate-pulse">
          Exchanging Secure Credentials
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-spotify-green/20 border-t-spotify-green rounded-full animate-spin" />
          <p className="text-xs text-muted font-bold uppercase tracking-widest">Loading Handshake...</p>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
