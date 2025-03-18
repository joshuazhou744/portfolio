'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getRandomTrack } from '@/lib/youtube'
import Image from 'next/image'
import '98.css/dist/98.css'

interface Track {
  id: string;
  name: string;
  artist: string;
  imageUrl: string | null;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface Props {
  initiallyVisible?: boolean;
}

export default function MediaPlayer({ initiallyVisible = false }: Props) {
  const [isVisible, setIsVisible] = useState(initiallyVisible);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likes, setLikes] = useState(2);
  const [position, setPosition] = useState<WindowPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const x = (window.innerWidth - 450) / 2;
    const y = (window.innerHeight - 300) / 2;
    setPosition({ x, y });
  }, []);

  useEffect(() => {
    if (isVisible && !currentTrack) {
      loadRandomTrack();
    }
  }, [isVisible, currentTrack]);

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

  const loadRandomTrack = async () => {
    try {
      // Stop any existing playback
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }

      console.log('Loading random track...');
      const track = await getRandomTrack();
      console.log('Loaded track:', track);
      setCurrentTrack(track);
      
      if (audioRef.current) {
        try {
          // Get audio stream URL from our proxy endpoint
          const response = await fetch(`/api/youtube/audio?v=${track.id}`);
          const data = await response.json();
          
          if (data.audioUrl) {
            console.log('Setting up audio stream...', data.mimeType);
            
            if (audioRef.current) {
              // Update existing audio element
              audioRef.current.src = data.audioUrl;
              audioRef.current.volume = 1.0;
              
              // Set up event listeners
              const handleError = () => {
                console.error('Audio loading error:', audioRef.current?.error);
              };
              
              const handleMetadata = () => {
                console.log('Audio metadata loaded, duration:', audioRef.current?.duration);
              };

              const handleCanPlay = () => {
                console.log('Audio can play, ready state:', audioRef.current?.readyState);
              };

              audioRef.current.addEventListener('error', handleError);
              audioRef.current.addEventListener('loadedmetadata', handleMetadata);
              audioRef.current.addEventListener('canplay', handleCanPlay);
              
              await audioRef.current.load();
              console.log('Audio stream ready');

              // Clean up listeners after load
              audioRef.current.removeEventListener('error', handleError);
              audioRef.current.removeEventListener('loadedmetadata', handleMetadata);
              audioRef.current.removeEventListener('canplay', handleCanPlay);
            }
          } else {
            console.error('No audio URL received:', data.error);
          }
        } catch (error) {
          console.error('Error setting up audio:', error);
        }
      }
    } catch (error) {
      console.error('Error loading track:', error);
    }
  };

  const handlePrevTrack = () => {
    loadRandomTrack();
  };

  const handleNextTrack = () => {
    loadRandomTrack();
  };

  const handlePlayPause = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          console.log('Pausing audio...');
          audioRef.current.pause();
        } else {
          console.log('Starting playback...');
          const playPromise = audioRef.current.play();
          await playPromise;
          console.log('Playback started successfully');
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Playback error:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleTrackEnd = () => {
    loadRandomTrack();
  };

  const handleLike = () => {
    setLikes(likes + 1);
  };

  if (!currentTrack) {
    return null;
  }

  return (
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
          <button aria-label="Minimize"></button>
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
                priority
                style={{ objectFit: 'cover', border: '2px inset #c0c0c0' }}
              />
            )}
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {currentTrack?.name || 'Loading...'}
              </div>
              <div>{currentTrack?.artist || 'Loading...'}</div>
            </div>
          </div>
          <div className="field-row" style={{ justifyContent: 'space-between' }}>
            <button 
              onClick={handlePlayPause}
              className="win98-toolbar-button"
              style={{ width: '100px' }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button 
              onClick={handlePrevTrack}
              className="win98-toolbar-button"
              style={{ width: '70px' }}
            >
              ⏮
            </button>
            <button 
              onClick={handleNextTrack}
              className="win98-toolbar-button"
              style={{ width: '70px' }}
            >
              ⏭
            </button>
            <button className="win98-toolbar-button" style={{ width: '50px' }}>
              ⚙️
            </button>
          </div>
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">nothin here</p>
      </div>
      <audio
        ref={audioRef}
        onEnded={handleTrackEnd}
        controls
      />
    </div>
  );
}
