// src/lib/domain/media-proxy.ts

/**
 * Proxies TMDB image URLs through the local Next.js image proxy API
 * to bypass ISP blocks in India (e.g. Jio, Airtel).
 * Falls back to direct URL for non-TMDB images.
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  // If it's a TMDB image URL, proxy through our server-side API
  if (url.includes('image.tmdb.org')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
}

/**
 * Gets a TMDB image URL from a poster_path or backdrop_path
 * @param path The TMDB image path (e.g. /hu44RM7Zq2Jy8vFS3r6sNa45RL9.jpg)
 * @param size The image size: w92, w154, w185, w342, w500, w780, original
 */
export function getTMDBImageProxied(path: string | null, size: 'w200' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
  if (!path) return '';
  const tmdbUrl = `https://image.tmdb.org/t/p/${size}${path}`;
  return `/api/image-proxy?url=${encodeURIComponent(tmdbUrl)}`;
}

/**
 * Validates a YouTube embed URL
 */
export function isValidYouTubeEmbed(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]+/.test(url);
}

/**
 * Extracts YouTube video ID from an embed URL
 */
export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Gets a YouTube thumbnail URL from a video ID or embed URL
 */
export function getYouTubeThumbnail(url: string | null | undefined): string {
  const id = getYouTubeId(url);
  if (!id) return '';
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
