'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import { useWindow } from '../contexts/WindowContext'

interface WindowPosition {
  x: number;
  y: number;
}

interface AboutMeProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function AboutMe({ isVisible, onVisibilityChange }: AboutMeProps) {
  const [position, setPosition] = useState<WindowPosition>(() => { 
    const x = Math.random() * (200-100) + 100;
    const y = Math.random() * (75-50) + 50;
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  
  const windowRef = useRef<HTMLDivElement>(null);
  const { bringToFront, getZIndex } = useWindow();
  
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

  const handleClose = () => {
    onVisibilityChange(false);
  };

  const handleMinimize = () => {
    onVisibilityChange(false);
  };

  useEffect(() => {
    if (isVisible) {
      const timeoutId = setTimeout(() => {
        bringToFront('about-me');
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, bringToFront]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={windowRef}
      className="window about-me-window" 
      style={{ 
        width: '500px',
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: getZIndex('about-me'),
        display: isVisible ? 'block' : 'none',
        userSelect: 'none'
      }}
      onMouseDown={(e) => {
        handleMouseDown(e);
        bringToFront('about-me');
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">About Me</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize}></button>
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body">
        <div className="content">
          <h4>Hello, I'm Joshua Zhou</h4>
          <ul>
            <li>I am a first year Software Engineering (Co-op) student at McGill University.</li>
            <li>I like making fun and cool things with code.</li>
            <li>I don't like studying subjects I find boring and uninteresting.</li>
            <li>I like bouldering and basketball and video games.</li>
            <li>I like listening to music; my favorite artists are Gorillaz, Denzel Curry, Sonder and NewJeans.</li>
          </ul>
        </div>
      </div>
      {/*<div className="status-bar">
        <p className="status-bar-field">About Me</p>
      </div>*/}
    </div>
  );
} 