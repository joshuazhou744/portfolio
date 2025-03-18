import SpotifyWebApi from 'spotify-web-api-node';

interface PlaylistTrack {
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    preview_url: string | null;
    duration_ms: number;
    album: {
      images: Array<{ url: string }>;
    };
  } | null;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  preview_url: string | null;
  duration_ms: number;
  album: {
    images: Array<{ url: string }>;
  };
}

interface SpotifyPlaylistItem {
  track: SpotifyTrack | null;
}

// Initialize Spotify client
const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

console.log('Spotify API initialized with:', {
  clientId: clientId ? 'Present' : 'Missing',
  clientSecret: clientSecret ? 'Present' : 'Missing'
});

export interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  duration: number;
  imageUrl: string | null;
}

// Get access token using client credentials flow
export async function getAccessToken(): Promise<string> {
  try {
    const response = await fetch('/api/spotify/token');
    if (!response.ok) {
      throw new Error('Failed to get access token');
    }
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Failed to get access token');
  }
}

// Validate playlist ID format
function isValidPlaylistId(id: string): boolean {
  return /^[a-zA-Z0-9]{22}$/.test(id);
}

// Get tracks from a playlist
export async function getPlaylistTracks(playlistId: string) {
  try {
    console.log('Starting getPlaylistTracks with playlistId:', playlistId);
    
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    if (!isValidPlaylistId(playlistId)) {
      throw new Error('Invalid playlist ID format');
    }

    console.log('Getting access token...');
    const accessToken = await getAccessToken();
    
    console.log('Fetching playlist tracks...');
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch playlist tracks');
    }

    const data = await response.json();
    console.log('Playlist response:', {
      totalTracks: data.total,
      itemsLength: data.items.length,
      firstTrack: data.items[0]?.track?.name
    });
    
    if (!data.items || data.items.length === 0) {
      throw new Error('No tracks found in playlist');
    }

    console.log('Processing tracks...');
    const validTracks = data.items
      .filter((item: SpotifyPlaylistItem) => {
        const isValid = item.track !== null && item.track.artists.length > 0;
        if (!isValid) {
          console.log('Filtered out invalid track:', item.track?.name);
        }
        return isValid;
      })
      .map((item: SpotifyPlaylistItem) => {
        const track = item.track!;
        console.log('Processing track:', {
          name: track.name,
          artist: track.artists[0].name,
          hasPreviewUrl: !!track.preview_url,
          duration: track.duration_ms,
          hasImageUrl: !!track.album.images[0]?.url
        });
        return {
          id: track.id,
          name: track.name,
          artist: track.artists[0].name,
          previewUrl: track.preview_url,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
        };
      });

    console.log(`Found ${validTracks.length} valid tracks with preview URLs`);
    return validTracks;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch playlist tracks';
    console.error('Error getting playlist tracks:', errorMessage);
    throw new Error(errorMessage);
  }
}

// Get a random track from a playlist
export async function getRandomTrack(playlistId: string): Promise<Track> {
  try {
    console.log('Starting getRandomTrack with playlistId:', playlistId);
    const tracks = await getPlaylistTracks(playlistId);
    
    if (tracks.length === 0) {
      throw new Error('No valid tracks found in playlist');
    }

    const randomIndex = Math.floor(Math.random() * tracks.length);
    const track = tracks[randomIndex];
    console.log('Selected random track:', {
      name: track.name,
      artist: track.artist,
      hasPreviewUrl: !!track.previewUrl,
      hasImageUrl: !!track.imageUrl
    });
    return track;
  } catch (error) {
    console.error('Error getting random track:', error);
    throw error;
  }
} 