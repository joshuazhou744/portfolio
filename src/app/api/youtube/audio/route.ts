import { NextResponse } from 'next/server';
import { stream, video_info } from 'play-dl';

interface StreamData {
  url?: string;
  stream?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('v');

    if (!videoId) {
      console.error('No video ID provided');
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    console.log('Fetching audio for video:', videoId);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
      // Get video info first
      const info = await video_info(videoUrl);
      
      // Get the stream with specific format
      const audioStream = await stream(videoUrl, {
        quality: 140, // 140 is the itag for MP4 audio
        discordPlayerCompatibility: true
      });
      
      if (!audioStream) {
        throw new Error('No audio stream available');
      }

      // Access the direct stream URL
      const streamData = (audioStream as unknown) as StreamData;
      const streamUrl = streamData?.url || streamData?.stream;
      
      if (!streamUrl) {
        throw new Error('No stream URL available');
      }

      console.log('Got audio stream URL');
      
      return NextResponse.json({ 
        audioUrl: streamUrl,
        mimeType: 'audio/mp4'
      });

    } catch (playDlError: unknown) {
      console.error('play-dl error:', playDlError);
      return NextResponse.json({ 
        error: 'Failed to get video info',
        details: playDlError instanceof Error ? playDlError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json({ 
      error: 'Failed to get audio stream',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 