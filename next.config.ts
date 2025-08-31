import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  // Vercel 배포를 위한 설정
  experimental: {
    serverComponentsExternalPackages: []
  }
};

export default nextConfig;
