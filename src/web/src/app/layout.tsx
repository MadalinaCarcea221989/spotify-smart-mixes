"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { spotifyAuth } from "@/lib/spotifyAuth";
import Sidebar from "@/components/Sidebar";
import { SyncProvider } from "@/context/SyncContext";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const authenticated = spotifyAuth.isAuthenticated();
    setIsAuth(authenticated);
    if (!authenticated && !isLoginPage && pathname !== "/callback") {
      router.push("/login");
    }
  }, [pathname, router, isLoginPage]);

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground font-sans antialiased">
        <SyncProvider>
          <div className="flex flex-col min-h-screen">
            {!isLoginPage && <Sidebar />}
            <main className={`flex-1 overflow-y-auto bg-gradient-to-b from-background via-background to-black ${isLoginPage ? "" : "p-8"}`}>
              {children}
            </main>
          </div>
        </SyncProvider>
        <Analytics />
      </body>
    </html>
  );
}
