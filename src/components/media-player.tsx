'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getRandomTrack, getAccessToken } from '@/lib/spotify'
import Image from 'next/image'
import '98.css/dist/98.css'

interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  duration: number;
  imageUrl: string | null;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface MediaPlayerProps {
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

interface SpotifyPlayerEventData {
  device_id: string;
  position: number;
  duration: number;
  paused: boolean;
  track_window: {
    current_track: {
      name: string;
      uri: string;
      duration_ms: number;
      artists: Array<{ name: string }>;
      album: {
        name: string;
        images: Array<{ url: string }>;
      };
    };
  };
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  addListener: (event: string, callback: (data: SpotifyPlayerEventData) => void) => void;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
  }
}

export function MediaPlayer({ isVisible, onVisibilityChange }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [duration, setDuration] = useState('00:00')
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [likes, setLikes] = useState(2)
  const [isLoading, setIsLoading] = useState(false)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [position, setPosition] = useState<WindowPosition>(() => {
    const x = (window.innerWidth - 450) / 2
    const y = (window.innerHeight - 300) / 2
    return { x, y }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.title-bar')) {
      setIsDragging(true)
      const rect = windowRef.current?.getBoundingClientRect()
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }, [isDragging, dragOffset])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, handleMouseMove])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const minutes = Math.floor(audioRef.current.currentTime / 60)
      const seconds = Math.floor(audioRef.current.currentTime % 60)
      setCurrentTime(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
      drawVisualizer()
    }
  }, [])

  const handleTrackEnd = useCallback(() => {
    setIsPlaying(false)
    loadRandomTrack()
  }, [])

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate)
      audioRef.current.addEventListener('ended', handleTrackEnd)
    }

    loadRandomTrack()

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
        audioRef.current.removeEventListener('ended', handleTrackEnd)
      }
    }
  }, [handleTimeUpdate, handleTrackEnd])

  useEffect(() => {
    console.log('Initializing media player...');
    const initializePlayer = async () => {
      console.log('Checking for playlist ID...');
      const playlistId = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID;
      if (!playlistId) {
        console.error('No playlist ID found in environment variables');
        return;
      }
      console.log('Found playlist ID:', playlistId);

      try {
        console.log('Attempting to load random track...');
        await loadRandomTrack();
        console.log('Initial track load complete');
      } catch (error) {
        console.error('Failed to load initial track:', error);
      }
    };

    initializePlayer();
  }, []);

  useEffect(() => {
    console.log('Setting up Spotify Web Playback SDK...');
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('Spotify SDK is ready');
      const player = new window.Spotify.Player({
        name: 'Portfolio Web Player',
        getOAuthToken: async (cb: (token: string) => void) => {
          console.log('Getting OAuth token...');
          try {
            const token = await getAccessToken();
            console.log('Successfully obtained access token');
            cb(token);
          } catch (error) {
            console.error('Failed to get access token:', error);
          }
        },
        volume: 0.5
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify player ready with device ID:', device_id);
        setDeviceId(device_id);
        setPlayer(player);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.warn('Device ID has gone offline:', device_id);
      });

      player.addListener('player_state_changed', (state) => {
        console.log('Player state changed:', {
          track: state?.track_window?.current_track?.name,
          paused: state?.paused,
          position: state?.position,
          duration: state?.duration
        });
      });

      console.log('Connecting to Spotify player...');
      player.connect().then(success => {
        if (success) {
          console.log('Successfully connected to Spotify player');
        } else {
          console.error('Failed to connect to Spotify player');
        }
      });
    };

    return () => {
      if (player) {
        console.log('Disconnecting Spotify player...');
        player.disconnect();
      }
    };
  }, []);

  const loadRandomTrack = async () => {
    if (isLoading || retryCountRef.current >= maxRetries) {
      console.log('Skipping track load - already loading or max retries reached');
      return;
    }

    try {
      console.log('Starting to load random track...');
      setIsLoading(true);
      setIsAudioReady(false);
      retryCountRef.current++;
      
      const playlistId = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID;
      console.log('Using playlist ID:', playlistId);
      
      if (!playlistId) {
        throw new Error('Playlist ID not found in environment variables');
      }
      
      console.log('Fetching random track from playlist...');
      const track = await getRandomTrack(playlistId);
      console.log('Successfully fetched track:', {
        name: track.name,
        artist: track.artist,
        id: track.id
      });

      setCurrentTrack(track);
      setDuration(formatDuration(track.duration));
      setIsPlaying(false);

      if (deviceId) {
        console.log('Starting playback on device:', deviceId);
        const accessToken = await getAccessToken();
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: [`spotify:track:${track.id}`],
          }),
        });

        if (!response.ok) {
          console.error('Failed to start playback:', await response.text());
        } else {
          console.log('Successfully started playback');
        }
      } else {
        console.warn('No device ID available for playback');
      }
      
      retryCountRef.current = 0;
    } catch (error) {
      console.error('Error in loadRandomTrack:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Retrying track load...');
      loadRandomTrack();
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const togglePlay = async () => {
    if (!player || !currentTrack) return;

    try {
      if (isPlaying) {
        await player.pause();
      } else {
        await player.resume();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error playing audio:', error);
      loadRandomTrack();
    }
  };

  const drawVisualizer = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1

    ctx.beginPath()
    const width = canvas.width
    const height = canvas.height

    for (let i = 0; i < width; i++) {
      const amplitude = isPlaying ? Math.random() * 5 + 2 : 0
      const y = (height / 2) + Math.sin(i * 0.3) * amplitude

      if (i === 0) {
        ctx.moveTo(i, y)
      } else {
        ctx.lineTo(i, y)
      }
    }

    ctx.stroke()
  }

  const handleLike = () => {
    setLikes(likes + 1)
  }

  const handleMinimize = () => {
    onVisibilityChange(false)
  }

  return (
    <div className="win98">
      <div 
        ref={windowRef}
        className="window" 
        style={{ 
          width: '450px',
          position: 'fixed',
          left: position.x,
          top: position.y,
          display: isVisible ? 'block' : 'none',
          zIndex: isDragging ? 1000 : 1
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="title-bar">
          <div className="title-bar-text">Joshua Zhou</div>
          <div className="title-bar-controls">
            <button 
              aria-label="Minimize" 
              onClick={handleMinimize}
            ></button>
            <button aria-label="Maximize"></button>
          </div>
        </div>
        <div className="window-body">
          <menu
            role="menubar"
            className="mb-4"
            style={{ display: 'flex', gap: '0px', margin: '-7px 0 5px -7px' }}
          >
            <li role="menuitem" className="win98-menu-item">
              <u>A</u>bout Me
            </li>
            <li role="menuitem" className="win98-menu-item">
              <u>C</u>ontact
            </li>
            <li role="menuitem" className="win98-menu-item">
              <u>P</u>roject List
            </li>
            <li role="menuitem" className="win98-menu-item">
              <u>R</u>esume
            </li>
          </menu>
          <div
            className="p-2"
            style={{ border: '1px solid #888', background: '#AFAFAF', margin: '-5px' }}
          >
            <div className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentTrack?.imageUrl && (
                <Image 
                  src={currentTrack.imageUrl} 
                  alt={currentTrack.name}
                  width={50}
                  height={50}
                  style={{ objectFit: 'cover', border: '2px inset #c0c0c0' }}
                />
              )}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {currentTrack?.artist || 'Loading...'}
                </div>
                <div>{currentTrack?.name || 'Loading...'}</div>
              </div>
            </div>
            <div className="field-row" style={{ position: 'relative' }}>
              <canvas
                ref={canvasRef}
                width="200"
                height="30"
                style={{ border: '2px inset #c0c0c0', width: '100%', marginBottom: '5px' }}
              ></canvas>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#000',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  background: 'rgba(255, 255, 255, 0.7)',
                  padding: '0 8px'
                }}
              >
                {currentTime} / {duration}
              </div>
            </div>
            <div className="field-row mt-3" style={{ justifyContent: 'space-between' }}>
              <button 
                onClick={togglePlay}
                className="win98-toolbar-button"
                style={{ width: '100px' }}
                disabled={isLoading}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button 
                onClick={handleLike}
                className="win98-toolbar-button"
                style={{ width: '70px' }}
              >
                ❤ {likes}
              </button>
              <button className="win98-toolbar-button" style={{ width: '50px' }}>
                👤
              </button>
              <button className="win98-toolbar-button" style={{ width: '50px' }}>
                ⚙️
              </button>
            </div>
          </div>
        </div>
        <div className="status-bar">
          <p className="status-bar-field">footer</p>
        </div>
      </div>
    </div>
  )
}
