'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import { useWindow } from '../contexts/WindowContext'

interface WindowPosition {
  x: number;
  y: number;
}

interface ContactProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function Contact({ isVisible, onVisibilityChange }: ContactProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    // Position at top-right of screen
    const x = window.innerWidth - 500; // Window width is 350px, with some margin
    const y = 50; // Top with margin
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  
  const windowRef = useRef<HTMLDivElement>(null);
  const { bringToFront, getZIndex } = useWindow();
  
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        bringToFront('contact');
      }, 0);
    }
  }, [isVisible, bringToFront]);

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

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={windowRef}
      className="window contact-window" 
      style={{ 
        width: '350px',
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: getZIndex('contact'),
        display: isVisible ? 'block' : 'none',
        userSelect: 'none'
      }}
      onMouseDown={(e) => {
        handleMouseDown(e);
        bringToFront('contact');
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Contact and Links</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize}></button>
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body">
        <div className="content">
          <div className="field-row-stacked">
            <label htmlFor="email">Email:</label>
            <p>joshua.c.zhou@gmail.com</p>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="phone-number">Phone Number:</label>
              <p>587-926-9574</p>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="linkedin">LinkedIn:</label>
            <a href="https://www.linkedin.com/in/joshuazhou1" id="github" target="_blank" rel="noopener noreferrer">linkedin.com/in/joshuazhou1</a>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="github">Github:</label>
            <a href="https://github.com/joshuazhou744" id="github" target="_blank" rel="noopener noreferrer">github.com/joshuazhou744</a>
          </div>
        </div>
      </div>
      {/*<div className="status-bar">
        <p className="status-bar-field">...</p>
      </div>*/}
    </div>
  );
} 