import { NextResponse } from 'next/server';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high: {
        url: string;
      };
    };
  };
  contentDetails: {
    duration: string;
  };
}

interface PlaylistItem {
  contentDetails: {
    videoId: string;
  };
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const PLAYLIST_ID = process.env.YOUTUBE_PLAYLIST_ID;

// Convert ISO 8601 duration to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = (match[1] || '').replace('H', '') || '0';
  const minutes = (match[2] || '').replace('M', '') || '0';
  const seconds = (match[3] || '').replace('S', '') || '0';

  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000
  );
}

export async function GET() {
  try {
    console.log('API Route: Starting request with:', {
      hasApiKey: !!YOUTUBE_API_KEY,
      playlistId: PLAYLIST_ID
    });

    if (!YOUTUBE_API_KEY || !PLAYLIST_ID) {
      console.error('API Route: Missing credentials');
      return NextResponse.json(
        { error: 'Missing YouTube credentials' },
        { status: 500 }
      );
    }

    // Fetch playlist items
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${PLAYLIST_ID}&key=${YOUTUBE_API_KEY}`;
    console.log('API Route: Fetching playlist items from YouTube API');

    const playlistResponse = await fetch(playlistUrl);
    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      console.error('API Route: YouTube API Error:', {
        status: playlistResponse.status,
        statusText: playlistResponse.statusText,
        body: errorText
      });
      return NextResponse.json(
        { error: 'Failed to fetch playlist items' },
        { status: playlistResponse.status }
      );
    }

    const playlistData = await playlistResponse.json();
    if (!playlistData.items || playlistData.items.length === 0) {
      console.error('API Route: No items found in playlist');
      return NextResponse.json(
        { error: 'No items found in playlist' },
        { status: 404 }
      );
    }

    // Get video IDs
    const videoIds = playlistData.items
      .map((item: PlaylistItem) => item.contentDetails.videoId)
      .join(',');

    // Fetch video details
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    console.log('API Route: Fetching video details from YouTube API');

    const videosResponse = await fetch(videosUrl);
    if (!videosResponse.ok) {
      const errorText = await videosResponse.text();
      console.error('API Route: YouTube API Error:', {
        status: videosResponse.status,
        statusText: videosResponse.statusText,
        body: errorText
      });
      return NextResponse.json(
        { error: 'Failed to fetch video details' },
        { status: videosResponse.status }
      );
    }

    const videosData = await videosResponse.json();
    if (!videosData.items || videosData.items.length === 0) {
      console.error('API Route: No videos found');
      return NextResponse.json(
        { error: 'No videos found' },
        { status: 404 }
      );
    }

    // Process and return the tracks
    const tracks = videosData.items.map((video: YouTubeVideo) => ({
      id: video.id,
      name: video.snippet.title,
      artist: video.snippet.channelTitle,
      previewUrl: `https://www.youtube.com/watch?v=${video.id}`,
      duration: parseDuration(video.contentDetails.duration),
      imageUrl: video.snippet.thumbnails.high.url,
    }));

    console.log('API Route: Successfully processed tracks:', {
      totalTracks: tracks.length,
      sampleTrack: tracks[0] ? {
        name: tracks[0].name,
        artist: tracks[0].artist,
        hasPreviewUrl: !!tracks[0].previewUrl
      } : null
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('API Route: Error in YouTube API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 