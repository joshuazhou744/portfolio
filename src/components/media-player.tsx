'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWavesurfer } from '@wavesurfer/react'
import Image from 'next/image'
import '98.css/dist/98.css'
import '../styles/responsive.css'

interface Track {
  id: string;
  title: string;
  artist: string;
  cover_image_url: string;
  audio_file_id?: string;
  spotify_id?: string;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface Props {
  initiallyVisible?: boolean;
  onMinimize?: () => void;
  onAboutMeClick?: () => void;
  onContactClick?: () => void;
  onProjectListClick?: () => void;
  onResumeClick?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'study';

export default function MediaPlayer({ 
  initiallyVisible = false, 
  onMinimize,
  onAboutMeClick,
  onContactClick,
  onProjectListClick,
  onResumeClick
}: Props) {
  const [isVisible, setIsVisible] = useState(initiallyVisible);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<WindowPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedInitialTrack = useRef(false);
  const isLoadingTrack = useRef(false);
  const wasPlayingBeforeLoad = useRef(false);
  const preloadedTracksCache = useRef<Map<number, string>>(new Map());
  
  // Hidden WaveSurfer container for audio processing
  const hiddenWaveformContainerRef = useRef<HTMLDivElement | null>(null);
  
  // WaveSurfer setup
  const { wavesurfer, isReady } = useWavesurfer({
    container: hiddenWaveformContainerRef,
    url: audioUrl || undefined,
    height: 1, // Make it tiny since we're not displaying it
    waveColor: '#c0c0c0',
    progressColor: '#555',
    cursorWidth: 0,
    interact: false,
    hideScrollbar: true,
    // Use built-in options that improve loading speed
    autoplay: false,
    backend: 'WebAudio',
  });
  
  // Update visibility when initiallyVisible prop changes
  useEffect(() => {
    setIsVisible(initiallyVisible);
  }, [initiallyVisible]);

  useEffect(() => {
    const x = (window.innerWidth - 500) / 2;
    const y = (window.innerHeight - 300) / 2;
    setPosition({ x, y });
  }, []);

  useEffect(() => {
    if (isVisible) {
      fetchAllTracks();
    }
  }, [isVisible]);
  
  // Set up WaveSurfer event listeners
  useEffect(() => {
    if (!wavesurfer) return;
    
    // Reset state when wavesurfer changes
    setIsPlaying(false);
    
    const handlePlayPause = () => {
      setIsPlaying(wavesurfer.isPlaying());
    };
    
    const handleReady = () => {
      const audioDuration = wavesurfer.getDuration();
      console.log('WaveSurfer ready, duration:', audioDuration, 'wasPlayingBeforeLoad:', wasPlayingBeforeLoad.current);
      setDuration(audioDuration);
      setIsLoading(false);
      
      if (wasPlayingBeforeLoad.current) {
        console.log('Auto-playing after track loaded');
        // Force immediate play without waiting
        try {
          wavesurfer.play();
          // Backup check to ensure play started
          setTimeout(() => {
            if (wavesurfer && !wavesurfer.isPlaying()) {
              console.log('Backup play attempt');
              wavesurfer.play();
            }
          }, 300);
        } catch (e) {
          console.error('Error auto-playing:', e);
        }
      }
    };
    
    const handleAudioProcess = () => {
      const time = wavesurfer.getCurrentTime();
      setCurrentTime(time);
    };
    
    const handleError = (error: Error) => {
      console.error('WaveSurfer error:', error);
      setError('Failed to load audio. Please try another track.');
      setIsLoading(false);
    };
    
    // Enhanced finish handler with more robust auto-play mechanism
    const handleFinish = () => {
      console.log('Track finished, preparing to auto-play next track');
      
      // Only proceed if we have more than one track
      if (filteredTracks.length <= 1) {
        console.log('No more tracks to play');
        return;
      }
      
      // Calculate the next track index
      const nextIndex = (currentTrackIndex + 1) % filteredTracks.length;
      console.log(`Will load next track at index ${nextIndex}`);
      
      // CRITICAL: Set auto-play flag to TRUE
      wasPlayingBeforeLoad.current = true;
      
      try {
        // Apply state updates in a predictable order
        setIsLoading(true);
        setCurrentTrackIndex(nextIndex);
        
        // Get the next track
        const nextTrack = filteredTracks[nextIndex];
        if (nextTrack && nextTrack.audio_file_id) {
          setCurrentTrack(nextTrack);
          
          // Get the audio URL (from cache or create it)
          let url = preloadedTracksCache.current.get(nextIndex);
          if (!url) {
            url = `${API_URL}/songs/${COLLECTION_NAME}/${nextTrack.id}/audio`;
            preloadedTracksCache.current.set(nextIndex, url);
          }
          
          // Set the audio URL to trigger loading
          console.log('Setting next track audio URL for auto-play:', url);
          setAudioUrl(url);
        } else {
          console.error('Invalid next track or missing audio file ID');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error in finish handler:', error);
        setIsLoading(false);
      }
    };
    
    // Add event listeners
    wavesurfer.on('play', handlePlayPause);
    wavesurfer.on('pause', handlePlayPause);
    wavesurfer.on('ready', handleReady);
    wavesurfer.on('audioprocess', handleAudioProcess);
    wavesurfer.on('error', handleError);
    wavesurfer.on('finish', handleFinish);
    
    console.log('WaveSurfer event listeners set up');
    
    // Clean up function is critical for proper event handling
    return () => {
      console.log('Cleaning up WaveSurfer event listeners');
      if (wavesurfer) {
        if (wavesurfer.isPlaying()) {
          wavesurfer.pause();
        }
        wavesurfer.un('play', handlePlayPause);
        wavesurfer.un('pause', handlePlayPause);
        wavesurfer.un('ready', handleReady);
        wavesurfer.un('audioprocess', handleAudioProcess);
        wavesurfer.un('error', handleError);
        wavesurfer.un('finish', handleFinish);
      }
    };
  }, [wavesurfer, filteredTracks, currentTrackIndex]);
  
  // Separate useEffect for volume changes to avoid re-creating the entire wavesurfer
  useEffect(() => {
    if (wavesurfer) {
      console.log('Setting volume to:', volume);
      wavesurfer.setVolume(volume);
    }
  }, [wavesurfer, volume]);

  // Function to preload tracks in the background
  const preloadTrack = useCallback((index: number) => {
    if (preloadedTracksCache.current.has(index) || index < 0 || index >= filteredTracks.length) {
      return;
    }
    
    const track = filteredTracks[index];
    if (!track || !track.audio_file_id) {
      return;
    }
    
    try {
      const url = `${API_URL}/songs/${COLLECTION_NAME}/${track.id}/audio`;
      console.log('Preloading track:', track.title);
      
      // Store URL in cache
      preloadedTracksCache.current.set(index, url);
      
      // Actually preload the audio file by creating a hidden audio element
      const audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';
      audio.load();
      
    } catch (error) {
      console.error('Error preloading track:', error);
    }
  }, [filteredTracks]);
  
  // Preload next and previous tracks when current track changes
  useEffect(() => {
    if (currentTrackIndex >= 0 && filteredTracks.length > 1) {
      // Preload next track
      const nextIndex = (currentTrackIndex + 1) % filteredTracks.length;
      preloadTrack(nextIndex);
      
      // Preload previous track
      const prevIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : filteredTracks.length - 1;
      preloadTrack(prevIndex);
    }
  }, [currentTrackIndex, filteredTracks, preloadTrack]);

  const loadTrack = useCallback(async (index: number) => {
    if (isLoadingTrack.current) {
      console.log('Already loading a track, skipping...');
      return;
    }
    
    isLoadingTrack.current = true;
    console.log('Loading track at index:', index);
    
    // Remember if we were playing before loading the new track
    wasPlayingBeforeLoad.current = isPlaying;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Reset time display
      setCurrentTime(0);
      setDuration(0);
      
      // Stop current audio if playing
      if (wavesurfer && wavesurfer.isPlaying()) {
        wavesurfer.pause();
      }

      // Validate track index
      if (index < 0 || index >= filteredTracks.length) {
        console.error('Invalid track index:', index, 'filteredTracks length:', filteredTracks.length);
        setIsLoading(false);
        isLoadingTrack.current = false;
        return;
      }

      const track = filteredTracks[index];
      if (!track) {
        console.error('Track not found at index:', index);
        setIsLoading(false);
        isLoadingTrack.current = false;
        return;
      }

      console.log('Setting up track:', track.title);
      setCurrentTrack(track);
      setCurrentTrackIndex(index);
      
      if (track.audio_file_id) {
        try {
          // Check if this track is already preloaded
          let url = preloadedTracksCache.current.get(index);
          
          if (!url) {
            // If not preloaded, create the URL
            url = `${API_URL}/songs/${COLLECTION_NAME}/${track.id}/audio`;
            preloadedTracksCache.current.set(index, url);
          }
          
          console.log('Setting audio URL:', url);
          
          // Set the audio URL for WaveSurfer to load
          setAudioUrl(url);
          
        } catch (error) {
          console.error('Error setting up audio:', error);
          setError('Failed to set up audio. Please try again.');
          setIsLoading(false);
        }
      } else {
        console.error('No audio available for track:', track);
        setError('No audio available for this track.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading track:', error);
      setError('Failed to load track. Please try again.');
      setIsLoading(false);
    } finally {
      console.log('Track loading process completed');
      isLoadingTrack.current = false;
    }
  }, [filteredTracks, isPlaying, wavesurfer]);

  useEffect(() => {
    console.log('Filtering tracks:', {
      total: tracks.length,
      withAudio: tracks.filter(track => track.audio_file_id).length
    });
    const tracksWithAudio = tracks.filter(track => track.audio_file_id);
    setFilteredTracks(tracksWithAudio);
  }, [tracks]);

  useEffect(() => {
    if (filteredTracks.length > 0 && !currentTrack && !hasLoadedInitialTrack.current) {
      console.log('Loading initial track:', {
        filteredTracksLength: filteredTracks.length,
        hasCurrentTrack: !!currentTrack,
        hasLoadedInitial: hasLoadedInitialTrack.current
      });
      const randomIndex = Math.floor(Math.random() * filteredTracks.length);
      loadTrack(randomIndex);
      hasLoadedInitialTrack.current = true;
    }
  }, [filteredTracks, currentTrack, loadTrack]);

  const fetchAllTracks = async () => {
    try {
      console.log('Starting to fetch tracks...');
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/songs/${COLLECTION_NAME}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Tracks fetched successfully:', {
        total: data.length,
        withAudio: data.filter((t: Track) => t.audio_file_id).length,
        firstTrack: data[0]
      });
      setTracks(data);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setError('Failed to load songs. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.title-bar')) {
      setIsDragging(true);
      const rect = windowRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, handleMouseMove]);

  const handlePrevTrack = () => {
    if (filteredTracks.length <= 1) {
      console.log('No previous tracks to play');
      return;
    }
    
    console.log('Manual previous track requested');
    
    // CRITICAL: Set auto-play flag to TRUE - explicitly set for consistency
    wasPlayingBeforeLoad.current = true;
    
    try {
      // Calculate previous index with wraparound
      const prevIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : filteredTracks.length - 1;
      console.log(`Will load previous track at index ${prevIndex}`);
      
      // Apply state updates in same order as other handlers
      setIsLoading(true);
      setCurrentTrackIndex(prevIndex);
      
      const prevTrack = filteredTracks[prevIndex];
      if (prevTrack && prevTrack.audio_file_id) {
        setCurrentTrack(prevTrack);
        
        // Get the audio URL (from cache or create it)
        let url = preloadedTracksCache.current.get(prevIndex);
        if (!url) {
          url = `${API_URL}/songs/${COLLECTION_NAME}/${prevTrack.id}/audio`;
          preloadedTracksCache.current.set(prevIndex, url);
        }
        
        // Set the audio URL to trigger loading
        console.log('Setting previous track audio URL:', url);
        setAudioUrl(url);
      } else {
        console.error('Invalid previous track or missing audio file ID');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in previous track handler:', error);
      setIsLoading(false);
    }
  };

  const handleNextTrack = () => {
    if (filteredTracks.length <= 1) {
      console.log('No more tracks to play');
      return;
    }
    
    console.log('Manual next track requested');
    
    // CRITICAL: Set auto-play flag to TRUE - explicitly set to true for consistency
    wasPlayingBeforeLoad.current = true;
    
    try {
      // Calculate next index with wraparound
      const nextIndex = (currentTrackIndex + 1) % filteredTracks.length;
      console.log(`Will load next track at index ${nextIndex}`);
      
      // Apply state updates in same order as finish handler
      setIsLoading(true);
      setCurrentTrackIndex(nextIndex);
      
      const nextTrack = filteredTracks[nextIndex];
      if (nextTrack && nextTrack.audio_file_id) {
        setCurrentTrack(nextTrack);
        
        // Get the audio URL (from cache or create it)
        let url = preloadedTracksCache.current.get(nextIndex);
        if (!url) {
          url = `${API_URL}/songs/${COLLECTION_NAME}/${nextTrack.id}/audio`;
          preloadedTracksCache.current.set(nextIndex, url);
        }
        
        // Set the audio URL to trigger loading
        console.log('Setting next track audio URL (manual next):', url);
        setAudioUrl(url);
      } else {
        console.error('Invalid next track or missing audio file ID');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in next track handler:', error);
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!wavesurfer) {
      console.log('WaveSurfer not ready');
      return;
    }
    
    console.log('Play/pause button clicked, current state:', wavesurfer.isPlaying() ? 'playing' : 'paused');
    wavesurfer.playPause();
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={windowRef}
      className="window" 
      style={{ 
        width: '500px',
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: isDragging ? 1000 : 1,
        display: isVisible ? 'block' : 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="title-bar">
        <div className="title-bar-text">Joshua Zhou</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={onMinimize}></button>
          <button aria-label="Maximize"></button>
        </div>
      </div>
      <div className="window-body">
        <menu
          role="menubar"
          className="mb-4"
          style={{ display: 'flex', gap: '0px', margin: '-7px 0 5px -7px' }}
        >
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={onAboutMeClick}
            style={{ cursor: 'pointer' }}
          >
            <u>A</u>bout Me
          </li>
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={onContactClick}
            style={{ cursor: 'pointer' }}
          >
            <u>C</u>ontact
          </li>
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={onProjectListClick}
            style={{ cursor: 'pointer' }}
          >
            <u>P</u>roject List
          </li>
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={onResumeClick}
            style={{ cursor: 'pointer' }}
          >
            <u>R</u>esume
          </li>
        </menu>
        <div
          className="p-2"
          style={{ 
            border: '1px solid #888', 
            background: '#AFAFAF', 
            margin: '-5px',
            minHeight: '140px' 
          }}
        >
          {/* Hidden WaveSurfer container */}
          <div 
            ref={hiddenWaveformContainerRef} 
            style={{ display: 'none' }}
          />
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              Loading...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
              {error}
            </div>
          ) : currentTrack ? (
            <div className="media-player-content" style={{ display: 'flex', gap: '12px' }}>
              <div className="cover-container" style={{ width: '25%', minWidth: '100px' }}>
                {currentTrack.cover_image_url && (
                  <Image 
                    src={currentTrack.cover_image_url}
                    alt={currentTrack.title || 'Album cover'}
                    width={100}
                    height={100}
                    priority
                    style={{ 
                      width: '100%',
                      height: 'auto',
                      aspectRatio: '1',
                      objectFit: 'cover',
                      border: '2px inset #c0c0c0'
                    }}
                  />
                )}
              </div>
              <div className="track-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {currentTrack.title || 'Unknown Title'}
                </div>
                <div>{currentTrack.artist || 'Unknown Artist'}</div>
                <div className="time-volume-controls" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '14px' }}>
                  <div className="time-display"
                    style={{ 
                      fontFamily: 'monospace',
                      border: '2px inset #c0c0c0',
                      padding: '2px 6px',
                      boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.3)',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '140px',
                      width: '250px',
                      height: '25px'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      width: '100%', 
                      justifyContent: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      <span>{formatTime(currentTime)}</span>
                      <span style={{ margin: '0 4px' }}>/</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  <div className="volume-control" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    maxWidth: '80px'
                  }}>
                    <span style={{ marginLeft: '-75px' }}>♪</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      style={{ width: '50px' }}
                    />
                  </div>
                </div>
                <div className="playback-controls field-row" style={{ gap: '4px', margin: '4px 0 0 0', justifyContent: 'space-between' }}>
                  <button 
                    onClick={handlePlayPause}
                    className="win98-toolbar-button"
                    style={{ width: '60px' }}
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button 
                    onClick={handlePrevTrack}
                    className="win98-toolbar-button"
                    style={{ width: '40px' }}
                    disabled={isLoading || filteredTracks.length <= 1}
                  >
                    ⏮
                  </button>
                  <button 
                    onClick={handleNextTrack}
                    className="win98-toolbar-button"
                    style={{ width: '40px' }}
                    disabled={isLoading || filteredTracks.length <= 1}
                  >
                    ⏭
                  </button>
                  <button 
                    className="win98-toolbar-button"
                    style={{ width: '40px' }}
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              No tracks available with audio. Please add audio to your tracks.
            </div>
          )}
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">
          {filteredTracks.length} songs available ({currentTrackIndex + 1}/{filteredTracks.length})
        </p>
      </div>
    </div>
  );
}
