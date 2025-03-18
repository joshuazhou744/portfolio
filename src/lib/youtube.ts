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

export interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  duration: number;
  imageUrl: string | null;
}

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

// Get tracks from a playlist
export async function getPlaylistTracks(): Promise<Track[]> {
  try {
    console.log('Client: Starting getPlaylistTracks...');
    
    const response = await fetch('/api/youtube');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Client: API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to fetch playlist tracks: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.tracks || data.tracks.length === 0) {
      console.error('Client: No tracks found in response:', data);
      throw new Error('No tracks found in playlist');
    }

    console.log('Client: Successfully fetched tracks:', {
      count: data.tracks.length,
      sampleTrack: data.tracks[0] ? {
        name: data.tracks[0].name,
        artist: data.tracks[0].artist,
        hasPreviewUrl: !!data.tracks[0].previewUrl
      } : null
    });
    return data.tracks;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch playlist tracks';
    console.error('Client: Error getting playlist tracks:', errorMessage);
    throw new Error(errorMessage);
  }
}

// Get a random track from a playlist
export async function getRandomTrack(): Promise<Track> {
  try {
    console.log('Client: Starting getRandomTrack...');
    const tracks = await getPlaylistTracks();
    
    if (tracks.length === 0) {
      console.error('Client: No valid tracks found in playlist');
      throw new Error('No valid tracks found in playlist');
    }

    const randomIndex = Math.floor(Math.random() * tracks.length);
    const track = tracks[randomIndex];
    console.log('Client: Selected random track:', {
      name: track.name,
      artist: track.artist,
      hasPreviewUrl: !!track.previewUrl,
      hasImageUrl: !!track.imageUrl,
      duration: track.duration
    });
    return track;
  } catch (error) {
    console.error('Client: Error getting random track:', error);
    throw error;
  }
} 