// Image proxy route — fetches TMDB images server-side to bypass ISP blocks
// GET /api/image-proxy?url=<tmdb-image-url>

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Only proxy TMDB image URLs
  if (!url.includes('image.tmdb.org')) {
    return NextResponse.json({ error: 'Only TMDB image URLs are allowed' }, { status: 403 });
  }

  try {
    const imageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'CineBook/1.0',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      return new NextResponse(null, { status: imageResponse.status });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const buffer = await imageResponse.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable', // 7-day cache
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502, statusText: 'Failed to fetch image' });
  }
}
