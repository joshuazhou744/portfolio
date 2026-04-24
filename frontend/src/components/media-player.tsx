'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MutableRefObject, MouseEvent as ReactMouseEvent, ChangeEvent } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import Image from 'next/image';
import { useWindow } from '../contexts/WindowContext';
import { useWindowDimensions } from '../hooks/useWindowDimensions';

interface WaveSurferType {
  play: () => Promise<void> | void;
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

// wavesurfer.play() may throw or return a rejecting promise when the browser
// blocks autoplay (tab was backgrounded, audio context suspended, etc.).
// Swallow the rejection and fall back to paused so the UI stays consistent.
const safePlay = (ws: WaveSurferType, onFail?: () => void) => {
  try {
    const result = ws.play();
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch((err) => {
        console.error('play() rejected:', err);
        onFail?.();
      });
    }
  } catch (err) {
    console.error('play() threw:', err);
    onFail?.();
  }
};

interface AudioCoreProps {
  audioUrl: string;
  onReady?: (duration: number) => void;
  onPlayPause?: (isPlaying: boolean) => void;
  onTimeUpdate?: (time: number) => void;
  onError?: (error: Error) => void;
  onFinish?: () => void;
  volume: number;
  wavesurferRef: MutableRefObject<unknown | null>;
}

const AudioCore = ({
  audioUrl,
  onReady,
  onPlayPause,
  onTimeUpdate,
  onError,
  onFinish,
  volume,
  wavesurferRef,
}: AudioCoreProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the latest handlers in a ref so the wavesurfer listener effect
  // below only depends on `wavesurfer` identity — otherwise parent re-renders
  // would tear down and re-subscribe every listener, creating windows where
  // 'ready' / 'finish' events can be dropped.
  const handlersRef = useRef({ onReady, onPlayPause, onTimeUpdate, onError, onFinish });
  handlersRef.current = { onReady, onPlayPause, onTimeUpdate, onError, onFinish };

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
      wavesurferRef.current = wavesurfer;
    }
  }, [wavesurfer, wavesurferRef]);

  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.setVolume(volume);
    }
  }, [wavesurfer, volume]);

  useEffect(() => {
    if (!wavesurfer) return;

    const handleReady = () => handlersRef.current.onReady?.(wavesurfer.getDuration());
    const handlePlay = () => handlersRef.current.onPlayPause?.(true);
    const handlePause = () => handlersRef.current.onPlayPause?.(false);
    const handleAudioProcess = () => handlersRef.current.onTimeUpdate?.(wavesurfer.getCurrentTime());
    const handleError = (err: unknown) => {
      console.error('WaveSurfer error:', err);
      handlersRef.current.onError?.(err instanceof Error ? err : new Error(String(err)));
    };
    const handleFinish = () => handlersRef.current.onFinish?.();

    wavesurfer.on('ready', handleReady);
    wavesurfer.on('play', handlePlay);
    wavesurfer.on('pause', handlePause);
    wavesurfer.on('audioprocess', handleAudioProcess);
    wavesurfer.on('error', handleError);
    wavesurfer.on('finish', handleFinish);

    // If wavesurfer already has duration by the time we subscribe (happens
    // when a stream finishes decoding before this effect runs), fire ready
    // manually so we don't wait forever.
    if (wavesurfer.getDuration() > 0) {
      handleReady();
    }

    return () => {
      wavesurfer.un('ready', handleReady);
      wavesurfer.un('play', handlePlay);
      wavesurfer.un('pause', handlePause);
      wavesurfer.un('audioprocess', handleAudioProcess);
      wavesurfer.un('error', handleError);
      wavesurfer.un('finish', handleFinish);
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
  onAboutMeClick?: () => void;
  onContactClick?: () => void;
  onProjectListClick?: () => void;
  onResumeClick?: () => void;
  onExperienceClick?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const COLLECTION_NAME = 'study';

export default function MediaPlayer({
  onAboutMeClick,
  onContactClick,
  onProjectListClick,
  onResumeClick,
  onExperienceClick,
}: Props) {
  // states
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // track list/network
  const [isBuffering, setIsBuffering] = useState(true); // current track readiness (start locked)
  const [isTrackReady, setIsTrackReady] = useState(false); // only true after valid duration confirmed
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
  const wavesurferRef = useRef<unknown | null>(null);
  const hasFetchedTracks = useRef(false);

  const { bringToFront, getZIndex } = useWindow();

  useEffect(() => {
    const x = (window.innerWidth - 500) / 2;
    const y = (window.innerHeight - 300) / 2;
    setPosition({ x, y });
  }, []);

  useEffect(() => {
    if (hasFetchedTracks.current) return;
    hasFetchedTracks.current = true;
    fetchTracks();
  }, []);

  // load initial track
  useEffect(() => {
    if (tracks.length > 0 && !hasLoadedInitialTrack.current) {
      loadTrack(0);
      hasLoadedInitialTrack.current = true;
    }
  }, [tracks]);

  // window dragging
  const handleMouseDown = (e: ReactMouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.title-bar')) {
      setIsDragging(true);
      const rect = windowRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 500;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 500;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      const width = windowRef.current?.offsetWidth || 500;

      const constrainedX = Math.min(Math.max(newX, -width + 80), windowWidth - 80);
      const constrainedY = Math.min(Math.max(newY, 0), windowHeight - 50);

      setPosition({
        x: constrainedX,
        y: constrainedY,
      });
    },
    [isDragging, dragOffset]
  );

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
      setIsBuffering(true);
      setIsTrackReady(false);
      setError(null);

      const response = await fetch(`${API_URL}/songs/${COLLECTION_NAME}?noshuffle=false`);

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
      // keep buffering locked until a track actually reports duration
    }
  };

  const loadTrack = useCallback(
    (index: number, autoPlay: boolean = isPlaying) => {
      if (index < 0 || index >= tracks.length) {
        console.error('Invalid track index:', index);
        return;
      }

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

      // reset state and clearly set loading state
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      setCurrentTrackIndex(index);
      setIsBuffering(true);
      setIsTrackReady(false);
      // reset the userPaused flag
      if (index !== currentTrackIndex) {
        setUserPaused(false);
      }

      // set autoplay state before loading new audio
      setShouldAutoPlay(autoPlay);

      const url = `${API_URL}/songs/${COLLECTION_NAME}/${track.id}/audio?t=${Date.now()}`;
      setAudioKey(`${track.id}-${Date.now()}`);
      setAudioUrl(url);
    },
    [tracks, isPlaying, userPaused, currentTrackIndex]
  );

  const handleReady = useCallback(
    (audioDuration: number) => {
      // wavesurfer fires 'ready' only once the asset is decoded, so the
      // duration here is authoritative. No need to re-poll.
      if (!audioDuration || audioDuration <= 0 || isNaN(audioDuration)) {
        console.error('Got invalid duration from wavesurfer:', audioDuration);
        setIsBuffering(false);
        setIsTrackReady(false);
        setError('Track failed to load. Try skipping.');
        return;
      }

      setDuration(audioDuration);
      setIsBuffering(false);
      setIsTrackReady(true);

      if (shouldAutoPlay && !userPaused && wavesurferRef.current) {
        const ws = wavesurferRef.current as WaveSurferType;
        setIsPlaying(true);
        safePlay(ws, () => setIsPlaying(false));
      }
    },
    [shouldAutoPlay, userPaused]
  );

  const handlePlayPauseChange = useCallback((isPlaying: boolean) => {
    setIsPlaying(isPlaying);
  }, []);

  const handleNextTrack = useCallback(() => {
    if (isBuffering || !isTrackReady || !duration || duration <= 0) {
      return;
    }
    if (tracks.length <= 1) return;

    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(nextIndex);
  }, [currentTrackIndex, tracks.length, loadTrack, isBuffering, isTrackReady, duration]);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (!wavesurferRef.current || duration <= 0) return;
      // isPlaying() can throw if wavesurfer is mid-teardown between tracks.
      // The 'finish' event is the single source of truth for advancing; we
      // intentionally don't double-check time >= duration here.
      try {
        if ((wavesurferRef.current as WaveSurferType).isPlaying()) {
          setCurrentTime(time);
        }
      } catch {
        // wavesurfer is being destroyed — ignore this tick
      }
    },
    [duration]
  );

  const handleAudioError = useCallback((error: Error) => {
    console.error('Audio error:', error);
    setError('Failed to load audio. Please try another track.');
    setIsBuffering(false);
    setIsTrackReady(false);
  }, []);

  const handleTrackFinish = useCallback(() => {
    if (tracks.length > 1) {
      // always autoplay the next one
      const nextIndex = (currentTrackIndex + 1) % tracks.length;

      // load next track with autoplay=true
      loadTrack(nextIndex, true);
    }
  }, [currentTrackIndex, tracks.length, loadTrack]);

  // handle UI events
  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
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

  // If a track never reports 'ready' (network hang, decode failure, audio
  // context suspended after tab was backgrounded), we'd otherwise sit on a
  // "Loading..." forever and the user has to refresh. Auto-skip to the next
  // track so playback recovers on its own.
  useEffect(() => {
    if (!audioUrl || isTrackReady || error) return;
    const timer = setTimeout(() => {
      if (isTrackReady) return;
      console.error('Track load timed out after 15s, auto-skipping:', audioUrl);
      if (tracks.length > 1) {
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        loadTrack(nextIndex, true);
      } else {
        setError('Track took too long to load. Try refreshing.');
        setIsBuffering(false);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [audioUrl, isTrackReady, error, tracks.length, currentTrackIndex, loadTrack]);

  // handle playback control
  const handlePlayPause = useCallback(() => {
    if (isBuffering || !isTrackReady || !duration || duration <= 0) return;
    if (!wavesurferRef.current) {
      console.error('WaveSurfer instance not available');
      return;
    }

    const ws = wavesurferRef.current as WaveSurferType;

    if (isPlaying) {
      try {
        ws.pause();
      } catch (e) {
        console.error('Error pausing:', e);
      }
      setIsPlaying(false);
      setUserPaused(true);
    } else {
      setIsPlaying(true);
      setUserPaused(false);
      safePlay(ws, () => setIsPlaying(false));
    }
  }, [isPlaying, isBuffering, isTrackReady, duration]);

  const handlePrevTrack = useCallback(() => {
    if (isBuffering || !isTrackReady || !duration || duration <= 0) return;
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
  }, [
    currentTime,
    currentTrackIndex,
    tracks.length,
    loadTrack,
    isBuffering,
    isTrackReady,
    duration,
  ]);

  const currentTrack = tracks[currentTrackIndex];

  // UI-only handlers that respect loading state
  const handlePlayPauseClick = useCallback(() => {
    if (isBuffering || !isTrackReady || !duration || duration <= 0) return;
    handlePlayPause();
  }, [isBuffering, isTrackReady, duration, handlePlayPause]);

  const handleNextClick = useCallback(() => {
    if (isBuffering || !isTrackReady || !duration || duration <= 0) return;
    handleNextTrack();
  }, [isBuffering, isTrackReady, duration, handleNextTrack]);

  const handlePrevClick = useCallback(() => {
    if (isBuffering || !isTrackReady || !duration || duration <= 0) return;
    handlePrevTrack();
  }, [isBuffering, isTrackReady, duration, handlePrevTrack]);

  const windowDimensions = useWindowDimensions();
  const { isMounted } = windowDimensions;

  const isMobile = isMounted && windowDimensions.width <= 768;

  // Get responsive width after mount to avoid hydration mismatch
  const getResponsiveWidth = () => {
    if (!isMounted) return '500px'; // SSR fallback
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
        boxSizing: 'border-box',
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
        <div className="title-bar-controls"></div>
      </div>
      <div className="window-body">
        <menu role="menubar" className="mb-4 media-player-menu">
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
            minHeight: '140px',
          }}
        >
          {isLoading && !currentTrack ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
                fontSize: '18px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              Loading...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>
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
                      border: '2px inset #c0c0c0',
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
                    <div
                      style={{
                        display: 'flex',
                        width: '100%',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
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
                    onClick={handlePlayPauseClick}
                    className="win98-toolbar-button"
                    style={{ width: '60px' }}
                    disabled={
                      isBuffering ||
                      !isTrackReady ||
                      !duration ||
                      duration <= 0 ||
                      tracks.length === 0
                    }
                  >
                    {isPlaying ? '⏸' : '⏵'}
                  </button>
                  <button
                    onClick={handlePrevClick}
                    className="win98-toolbar-button"
                    style={{ width: '40px' }}
                    disabled={
                      isBuffering ||
                      !isTrackReady ||
                      !duration ||
                      duration <= 0 ||
                      tracks.length <= 1
                    }
                  >
                    ⏮
                  </button>
                  <button
                    onClick={handleNextClick}
                    className="win98-toolbar-button"
                    style={{ width: '40px' }}
                    disabled={
                      isBuffering ||
                      !isTrackReady ||
                      !duration ||
                      duration <= 0 ||
                      tracks.length <= 1
                    }
                  >
                    ⏭
                  </button>
                  <button
                    className="win98-toolbar-button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
          {tracks.length} songs available{' '}
          {currentTrack ? `(${currentTrackIndex + 1}/${tracks.length})` : ''}
        </p>
      </div>
    </div>
  );
}
