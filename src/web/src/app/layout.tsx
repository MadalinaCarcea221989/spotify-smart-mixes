import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Mixes",
  description: "Advanced Spotify Library Curation",
};

import { SyncProvider } from "@/context/SyncContext";
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        <SyncProvider>
          <div className="flex flex-col min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background via-background to-black p-8">
              {children}
            </main>
          </div>
        </SyncProvider>
        <Analytics />
      </body>
    </html>
  );
}
