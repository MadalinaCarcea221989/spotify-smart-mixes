import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1'],

  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:8000', '127.0.0.1:8000'],
    },
  },

  devIndicators: {
    appIsrStatus: false,
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
