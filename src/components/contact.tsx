'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'

interface WindowPosition {
  x: number;
  y: number;
}

interface ContactProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function Contact({ isVisible, onVisibilityChange }: ContactProps) {
  const [position, setPosition] = useState<WindowPosition>({ x: 80, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  
  const windowRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const x = (window.innerWidth - 350) / 2;
    const y = (window.innerHeight - 300) / 3;
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
      className="window contact-window" 
      style={{ 
        width: '350px',
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: isDragging ? 1000 : 100,
        display: isVisible ? 'block' : 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="title-bar">
        <div className="title-bar-text">Contact</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize}></button>
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body">
        <div className="content">
          <h4>Get in Touch</h4>
          <div className="field-row-stacked">
            <label htmlFor="email">Email:</label>
            <a href="mailto:contact@joshuazhou.com" id="email">contact@joshuazhou.com</a>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="linkedin">LinkedIn:</label>
            <a href="https://linkedin.com/in/joshuazhou" id="linkedin" target="_blank" rel="noopener noreferrer">linkedin.com/in/joshuazhou</a>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="github">GitHub:</label>
            <a href="https://github.com/joshuazhou" id="github" target="_blank" rel="noopener noreferrer">github.com/joshuazhou</a>
          </div>
          <hr />
          <div className="field-row-stacked" style={{ marginTop: '15px' }}>
            <label htmlFor="message">Send me a message:</label>
            <textarea id="message" rows={3} placeholder="Type your message here..."></textarea>
            <div className="field-row" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
              <button disabled>Submit</button>
            </div>
          </div>
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">Contact</p>
      </div>
    </div>
  );
} 