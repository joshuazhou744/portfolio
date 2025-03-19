'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'

interface WindowPosition {
  x: number;
  y: number;
}

interface AboutMeProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function AboutMe({ isVisible, onVisibilityChange }: AboutMeProps) {
  const [position, setPosition] = useState<WindowPosition>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  
  const windowRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const x = (window.innerWidth - 400) / 2;
    const y = (window.innerHeight - 350) / 3;
    setPosition({ x, y });
  }, []);

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
      className="window about-me-window" 
      style={{ 
        width: '400px',
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: isDragging ? 1000 : 100,
        display: isVisible ? 'block' : 'none'
      }}
      onMouseDown={handleMouseDown}
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
          <p>
            I'm a software engineer specializing in web development and data engineering. 
            I have a passion for creating interactive, accessible, and responsive web applications.
          </p>
          <p>
            My technical skills include:
          </p>
          <ul>
            <li>Frontend: React, Next.js, TypeScript, HTML5/CSS3</li>
            <li>Backend: Node.js, Python, FastAPI</li>
            <li>Data: MongoDB, PostgreSQL, Data Analysis</li>
            <li>Tools: Git, Docker, AWS</li>
          </ul>
          <p>
            When I'm not coding, I enjoy listening to music, exploring new technologies, 
            and contributing to open-source projects.
          </p>
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">About Me</p>
      </div>
    </div>
  );
} 