import { NextResponse } from 'next/server';
import { getRandomTrack } from '@/lib/spotify';

export async function GET() {
  try {
    const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Playlist ID not configured. Please set SPOTIFY_PLAYLIST_ID in your environment variables.' },
        { status: 500 }
      );
    }

    const track = await getRandomTrack(playlistId);
    return NextResponse.json(track);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch track';
    console.error('Error in Spotify API route:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 