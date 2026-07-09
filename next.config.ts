import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'vsmlpxldavykyyosgvia.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google avatars
      { protocol: 'https', hostname: 'image.tmdb.org' },            // TMDB posters/backdrops
      { protocol: 'https', hostname: 'images.weserv.nl' },          // Fallback image proxy
      { protocol: 'https', hostname: 'img.youtube.com' },           // YouTube thumbnails
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
};

export default nextConfig;
