'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWavesurfer } from '@wavesurfer/react'
import Image from 'next/image'
import '98.css/dist/98.css'
import '../styles/responsive.css'
import { useWindow } from '../contexts/WindowContext'

interface WaveSurferType {
  play: () => void;
  pause: () => void;
  playPause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  isPlaying: () => boolean;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  un: (event: string, callback: (...args: unknown[]) => void) => void;
  empty: () => void;
  seekTo: (position: number) => void;
  cancelAjax?: () => void;
  destroy: () => void;
}

interface AudioCoreProps {
  audioUrl: string;
  onReady?: (duration: number) => void;
  onPlayPause?: (isPlaying: boolean) => void;
  onTimeUpdate?: (time: number) => void;
  onError?: (error: Error) => void;
  onFinish?: () => void;
  volume: number;
  wavesurferRef: React.MutableRefObject<unknown | null>;
  key: string;
}

const AudioCore = ({ 
  audioUrl, 
  onReady, 
  onPlayPause, 
  onTimeUpdate, 
  onError, 
  onFinish,
  volume,
  wavesurferRef
}: AudioCoreProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    url: audioUrl,
    height: 1,
    waveColor: '#c0c0c0',
    progressColor: '#555',
    cursorWidth: 0,
    interact: false,
    hideScrollbar: true,
    autoplay: false,
    backend: 'WebAudio',
  });
  
  useEffect(() => {
    if (wavesurfer) {
      console.log('WaveSurfer instance created and stored in ref');
      wavesurferRef.current = wavesurfer;
    }
    

    return () => {
    };
  }, [wavesurfer, wavesurferRef]);
  
  useEffect(() => {
    if (!wavesurfer) return;
    
    console.log('Setting up WaveSurfer event handlers');
    
    wavesurfer.setVolume(volume);

    const handleReady = () => {
      console.log('WaveSurfer internal ready event fired');
      if (onReady) {
        const duration = wavesurfer.getDuration();
        console.log('WaveSurfer reporting duration on ready:', duration);
        onReady(duration);
      }
    };
    
    const handlePlay = () => {
      console.log('WaveSurfer internal play event fired');
      if (onPlayPause) {
        onPlayPause(true);
      }
    };
    
    const handlePause = () => {
      console.log('WaveSurfer internal pause event fired');
      if (onPlayPause) {
        onPlayPause(false);
      }
    };
    
    const handleAudioProcess = () => {
      if (onTimeUpdate) {
        onTimeUpdate(wavesurfer.getCurrentTime());
      }
    };
    
    const handleError = (error: Error) => {
      console.error('WaveSurfer error:', error);
      if (onError) {
        onError(error);
      }
    };
    
    const handleFinish = () => {
      console.log('WaveSurfer internal finish event fired');
      if (onFinish) {
        onFinish();
      }
    };
    
    wavesurfer.on('ready', handleReady);
    wavesurfer.on('play', handlePlay);
    wavesurfer.on('pause', handlePause);
    wavesurfer.on('audioprocess', handleAudioProcess);
    wavesurfer.on('error', handleError);
    wavesurfer.on('finish', handleFinish);
    
    if (wavesurfer.getDuration() > 0) {
      console.log('WaveSurfer already has duration, calling ready handler manually');
      handleReady();
    }
    
    return () => {
      console.log('Cleaning up WaveSurfer event handlers');
      if (wavesurfer) {
        wavesurfer.un('ready', handleReady);
        wavesurfer.un('play', handlePlay);
        wavesurfer.un('pause', handlePause);
        wavesurfer.un('audioprocess', handleAudioProcess);
        wavesurfer.un('error', handleError);
        wavesurfer.un('finish', handleFinish);
      }
    };
  }, [wavesurfer, onReady, onPlayPause, onTimeUpdate, onError, onFinish, volume]);

  useEffect(() => {
    if (!wavesurfer) return;
    
    return () => {
    };
  }, [wavesurfer]);
  
  return <div ref={containerRef} style={{ display: 'none' }} />;
};

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
  onExperienceClick?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_API_KEY;
const COLLECTION_NAME = 'study';

export default function MediaPlayer({ 
  initiallyVisible = true,
  onMinimize,
  onAboutMeClick,
  onContactClick,
  onProjectListClick,
  onResumeClick,
  onExperienceClick
}: Props) {

  // states
  const [isVisible, setIsVisible] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioKey, setAudioKey] = useState<string>('0');
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  
  // ui state
  const [position, setPosition] = useState<WindowPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  
  // refs
  const windowRef = useRef<HTMLDivElement>(null);
  const hasLoadedInitialTrack = useRef(false);
  const tracksLoadedOnce = useRef(false);
  const wavesurferRef = useRef<unknown | null>(null);
  
  const { bringToFront, getZIndex } = useWindow();
  
  const previouslyVisible = useRef(true);
  
  const loadTrackShouldPlay = useRef(false);
  
  useEffect(() => {
    console.log("Duration", duration);
  }, [duration]);

  useEffect(() => {
    const x = (window.innerWidth - 500) / 2;
    const y = (window.innerHeight - 300) / 2;
    setPosition({ x, y });
  }, []);
  
  useEffect(() => {
    if (!tracksLoadedOnce.current) {
      fetchTracks();
      tracksLoadedOnce.current = true;
    }
  }, []);
  
  // update visibility
  useEffect(() => {
    setIsVisible(true);
    previouslyVisible.current = true;
  }, []);
  
  // load initial track
  useEffect(() => {
    if (tracks.length > 0 && !hasLoadedInitialTrack.current) {
      console.log('Loading initial track');
      loadTrack(0);
      hasLoadedInitialTrack.current = true;
    }
  }, [tracks]);
  
  // window dragging
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
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 500;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 500;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      

      const width = windowRef.current?.offsetWidth || 500;
      const height = windowRef.current?.offsetHeight || 300;
      
      const constrainedX = Math.min(Math.max(newX, -width + 80), windowWidth - 80);
      const constrainedY = Math.min(Math.max(newY, 0), windowHeight - 50);
      
      setPosition({
        x: constrainedX,
        y: constrainedY
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
  
  // fetch all tracks from api
  const fetchTracks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/songs/${COLLECTION_NAME}?noshuffle=false`, {
        headers: {
          'X-API-Key': API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks: ${response.status}`);
      }
      
      const data = await response.json();
      
      // filter tracks with audio
      const tracksWithAudio = data.filter((track: Track) => track.audio_file_id);
      setTracks(tracksWithAudio);
      
      // reset track loading flag when tracks change
      hasLoadedInitialTrack.current = false;
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setError('Failed to load songs. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadTrack = useCallback((index: number, autoPlay: boolean = isPlaying) => {
    if (index < 0 || index >= tracks.length) {
      console.error('Invalid track index:', index);
      return;
    }
    
    console.log(`loadTrack called with autoPlay=${autoPlay}, userPaused=${userPaused}`);
    
    // pause and empty current audio
    if (wavesurferRef.current) {
      try {
        (wavesurferRef.current as WaveSurferType).pause();
        (wavesurferRef.current as WaveSurferType).empty();
      } catch (e) {
        console.error('Error stopping current track:', e);
      }
    }
    
    const track = tracks[index];
    console.log(`Loading track: ${track.title} (ID: ${track.id})`);
    
    // reset state and clearly set loading state
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setCurrentTrackIndex(index);
    setIsLoading(true); 
    
    // reset the userPaused flag
    if (index !== currentTrackIndex) {
      setUserPaused(false);
    }
    
    // set autoplay state before loading new audio
    setShouldAutoPlay(autoPlay);
    console.log(`Set shouldAutoPlay state to ${autoPlay}, userPaused: ${userPaused}`);
    
    const url = `${API_URL}/songs/${COLLECTION_NAME}/${track.id}/audio?t=${Date.now()}`;
    setAudioKey(track.id + Date.now());
    setAudioUrl(url);
    
    console.log(`Track ${index} loading started, autoPlay: ${autoPlay}`);
  }, [tracks, isPlaying, userPaused, currentTrackIndex]);
  
  // helper function that polls for a valid duration
  const waitForValidDuration = useCallback((
    wavesurferRef: React.MutableRefObject<unknown | null>,
    timeout: number = 10000,  // maximum wait time for polling
    interval: number = 100   // check interval
  ): Promise<number> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // check duration repeatedly
      const checkDuration = () => {
        if (!wavesurferRef.current) {
          reject(new Error('WaveSurfer instance is null'));
          return;
        }
        
        try {
          const ws = wavesurferRef.current as WaveSurferType;
          const currentDuration = ws.getDuration();
          console.log('Polling duration:', currentDuration);
          
          // check if duration is valid
          if (currentDuration > 0 && !isNaN(currentDuration)) {
            console.log('Found valid duration:', currentDuration);
            resolve(currentDuration);
            return;
          } 
          
          // check if we've exceeded timeout
          if (Date.now() - startTime >= timeout) {
            console.log('Polling timeout reached after', timeout, 'ms');
            reject(new Error('Timeout waiting for audio metadata'));
            return;
          }
          
          setTimeout(checkDuration, interval);
        } catch (err) {
          console.error('Error during duration polling:', err);
          reject(err);
        }
      };
      
      checkDuration();
    });
  }, []);

  const handleReady = useCallback((audioDuration: number) => {
    console.log('WaveSurfer ready event received, initial duration:', audioDuration);
    
    // set initial duration from event (may be 0)
    setDuration(audioDuration);
    
    // only start polling if WaveSurfer instance exists
    if (!wavesurferRef.current) {
      console.error('WaveSurfer instance not available in handleReady');
      setIsLoading(false);
      return;
    }
    
    // set loading state to true while we wait for valid duration
    setIsLoading(true);
    
    console.log('Starting duration polling, autoplay state:', shouldAutoPlay, 'userPaused:', userPaused);
    
    // use the polling function to wait for valid duration
    waitForValidDuration(wavesurferRef)
      .then((validDuration) => {
        console.log('Successfully polled valid duration:', validDuration);
        console.log('Autoplay state when duration ready:', shouldAutoPlay, 'userPaused:', userPaused);
        
        // update state with the valid duration
        setDuration(validDuration);
        setIsLoading(false);
        
        // auto-play if the flag is set AND user hasn't manually paused
        if (shouldAutoPlay && !userPaused && wavesurferRef.current) {
          try {
            const ws = wavesurferRef.current as WaveSurferType;
            console.log('Auto-playing track with confirmed duration:', validDuration);
            ws.play();
            setIsPlaying(true);
            console.log('Playback started via polling');
          } catch (e) {
            console.error('Error playing audio after valid duration found:', e);
          }
        } else {
          console.log('Not auto-playing because:', {
            autoplayState: shouldAutoPlay,
            userPaused: userPaused,
            wavesurferExists: !!wavesurferRef.current
          });
        }
      })
      .catch((error) => {
        console.error('Failed to get valid duration:', error);
        
        // continute trying to update state with whatever duration we have now from WaveSurfer
        try {
          if (wavesurferRef.current) {
            const currentDuration = (wavesurferRef.current as WaveSurferType).getDuration();
            console.log('Using fallback duration after polling failure:', currentDuration);
            setDuration(currentDuration);
          }
        } catch (e) {
          console.error('Error getting fallback duration:', e);
        }
        
        // clear loading state regardless
        setIsLoading(false);
      });
  }, [waitForValidDuration, shouldAutoPlay, userPaused]);
  
  const handlePlayPauseChange = useCallback((isPlaying: boolean) => {
    // only update the UI state if it's different from the current state
    setIsPlaying((prevState) => {
      if (prevState !== isPlaying) {
        return isPlaying;
      }
      return prevState;
    });
  }, []);
  
  const handleNextTrack = useCallback(() => {
    if (tracks.length <= 1) return;
    
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(nextIndex);
    console.log(`Auto-advancing to next track: ${nextIndex}`);
  }, [currentTrackIndex, tracks.length, loadTrack]);
  
  const handleTimeUpdate = useCallback((time: number) => {
    if (wavesurferRef.current && (wavesurferRef.current as WaveSurferType).isPlaying() && duration > 0) {
      setCurrentTime(time);
      
      if (time > duration && duration > 0) {
        console.log('Time exceeded duration, advancing to next track');
        handleNextTrack();
      }
    }
  }, [duration, handleNextTrack]);
  
  const handleAudioError = useCallback((error: Error) => {
    console.error('Audio error:', error);
    setError('Failed to load audio. Please try another track.');
    setIsLoading(false);
  }, []);
  
  const handleTrackFinish = useCallback(() => {
    console.log('Track finished, advancing to next track');
    if (tracks.length > 1) {
      // always autoplay the next one
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      
      console.log('Setting autoplay to true for next track after finish');
      // load next track with autoplay=true
      loadTrack(nextIndex, true);
    }
  }, [currentTrackIndex, tracks.length, loadTrack]);
  
  // handle UI events
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };
  
  const handleMinimizeClick = () => {
    if (onMinimize) {
      onMinimize();
    }
  };
  
  const handleClose = () => {
    if (wavesurferRef.current && isPlaying) {
      try {
        (wavesurferRef.current as WaveSurferType).pause();
        setIsPlaying(false);
      } catch (e) {
        console.error('Error pausing audio on close:', e);
      }
    }
    if (onMinimize) {
      onMinimize();
    }
  };
  
  const handleSpotifyClick = () => {
    const currentTrack = tracks[currentTrackIndex];
    if (currentTrack?.spotify_id) {
      window.open(`https://open.spotify.com/track/${currentTrack.spotify_id}`, '_blank');
    }
  };
  
  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleMenuClick = (handler: (() => void) | undefined, windowId: string) => {
    return () => {
      if (handler) {
        handler();
        setTimeout(() => {
          bringToFront(windowId);
        }, 100);
      }
    };
  };
  
  // make sure the audio is properly cleaned up when component unmounts
  useEffect(() => {
    return () => {
      // clean up wavesurfer instance when component unmounts completely
      if (wavesurferRef.current) {
        try {
          (wavesurferRef.current as WaveSurferType).pause();
          // destroy the instance to prevent memory leaks
          (wavesurferRef.current as WaveSurferType).destroy();
          wavesurferRef.current = null;
        } catch (e) {
          console.error('Error destroying WaveSurfer instance:', e);
        }
      }
    };
  }, []);

  // handle playback control
  const handlePlayPause = useCallback(() => {
    if (!wavesurferRef.current) {
      console.error('WaveSurfer instance not available');
      return;
    }

    try {
      const ws = wavesurferRef.current as WaveSurferType;
      console.log('User clicked play/pause, current state:', isPlaying ? 'playing' : 'paused');
      
      if (isPlaying) {
        ws.pause();
        setIsPlaying(false);
        setUserPaused(true); // mark that user manually paused
        console.log('User manually paused playback');
      } else {
        ws.play();
        setIsPlaying(true);
        setUserPaused(false); // clear user paused flag when manually playing
        console.log('User manually started playback');
      }
    } catch (e) {
      console.error('Error in handlePlayPause:', e);
    }
  }, [isPlaying]);
  
  const handlePrevTrack = useCallback(() => {
    if (tracks.length <= 1) return;
    
    // if more than 3 seconds into the song, restart the current song
    if (currentTime > 3 && wavesurferRef.current) {
      setCurrentTime(0);
      try {
        (wavesurferRef.current as WaveSurferType).seekTo(0);
      } catch (e) {
        console.error('Error seeking to beginning:', e);
      }
      return;
    }
    
    // otherwise, go to previous track with wraparound
    const prevIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : tracks.length - 1;
    loadTrack(prevIndex);
  }, [currentTime, currentTrackIndex, tracks.length, loadTrack]);

  const currentTrack = tracks[currentTrackIndex];

  // Use client-side state management to avoid hydration errors
  const [isMounted, setIsMounted] = useState(false)
  const [windowDimensions, setWindowDimensions] = useState({ width: 1024, height: 768 })
  
  useEffect(() => {
    setIsMounted(true)
    
    const updateDimensions = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const isMobile = isMounted && windowDimensions.width <= 768

  // Get responsive width after mount to avoid hydration mismatch
  const getResponsiveWidth = () => {
    if (!isMounted) return '500px' // SSR fallback
    if (isMobile) {
      return windowDimensions.width <= 480 ? '95vw' : '90vw';
    }
    return '500px';
  };

  return (
    <div 
      ref={windowRef}
      className={`window media-player-window ${isMounted && isMobile ? 'mobile-window' : ''}`}
      style={{ 
        width: getResponsiveWidth(),
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: getZIndex('media-player'),
        display: 'block',
        userSelect: 'none',
        maxWidth: isMounted && isMobile ? '95vw' : undefined,
        boxSizing: 'border-box'
      }}
      onMouseDown={(e) => {
        handleMouseDown(e);
        bringToFront('media-player');
      }}
    >
      {audioUrl && (
        <AudioCore 
          key={audioKey}
          audioUrl={audioUrl} 
          onReady={handleReady}
          onPlayPause={handlePlayPauseChange}
          onTimeUpdate={handleTimeUpdate}
          onError={handleAudioError}
          onFinish={handleTrackFinish}
          volume={volume}
          wavesurferRef={wavesurferRef}
        />
      )}
      
      <div className="title-bar">
        <div className="title-bar-text">Media Player</div>
        <div className="title-bar-controls">
        </div>
      </div>
      <div className="window-body">
        <menu
          role="menubar"
          className="mb-4 media-player-menu"
        >
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={handleMenuClick(onAboutMeClick, 'about-me')}
            style={{ cursor: 'pointer' }}
          >
            <u>A</u>bout Me
          </li>
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={handleMenuClick(onContactClick, 'contact')}
            style={{ cursor: 'pointer' }}
          >
            <u>C</u>ontact
          </li>
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={handleMenuClick(onProjectListClick, 'project-list')}
            style={{ cursor: 'pointer' }}
          >
            <u>P</u>rojects
          </li>
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={handleMenuClick(onExperienceClick, 'experience')}
            style={{ cursor: 'pointer' }}
          >
            <u>E</u>xperiences
          </li>
          <li 
            role="menuitem" 
            className="win98-menu-item"
            onClick={handleMenuClick(onResumeClick, 'resume')}
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
          {isLoading && !currentTrack ? (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              Loading...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
              {error}
            </div>
          ) : currentTrack ? (
            <div className="media-player-content">
              <div className="media-player-cover cover-container">
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
              <div className="media-player-track-info track-info">
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {currentTrack.title || 'Unknown Title'}
                </div>
                <div>{currentTrack.artist || 'Unknown Artist'}</div>
                <div className="media-player-time-volume time-volume-controls">
                  <div className="media-player-time-display time-display">
                    <div style={{ 
                      display: 'flex', 
                      width: '100%', 
                      justifyContent: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      {isLoading || !duration || duration <= 0 ? (
                        <span>Loading...</span>
                      ) : (
                        <>
                          <span>{formatTime(currentTime)}</span>
                          <span style={{ margin: '0 4px' }}>/</span>
                          <span>{formatTime(duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="media-player-volume volume-control">
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
                <div className="media-player-controls playback-controls field-row">
                  <button 
                    onClick={handlePlayPause}
                    className="win98-toolbar-button"
                    style={{ width: '60px' }}
                    disabled={isLoading || tracks.length === 0}
                  >
                    {isPlaying ? '⏸' : '⏵'}
                  </button>
                  <button 
                    onClick={handlePrevTrack}
                    className="win98-toolbar-button"
                    style={{ width: '40px' }}
                    disabled={isLoading || tracks.length <= 1}
                  >
                    ⏮
                  </button>
                  <button 
                    onClick={handleNextTrack}
                    className="win98-toolbar-button"
                    style={{ width: '40px' }}
                    disabled={isLoading || tracks.length <= 1}
                  >
                    ⏭
                  </button>
                  <button 
                    className="win98-toolbar-button"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}
                    onClick={handleSpotifyClick}
                    disabled={!currentTrack?.spotify_id}
                  >
                    <Image src="/assets/spotify.png" alt="Spotify" width={10} height={10} />
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
          {tracks.length} songs available {currentTrack ? `(${currentTrackIndex + 1}/${tracks.length})` : ''}
        </p>
      </div>
    </div>
  );
}
