'use client'

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import { useWindow } from '../contexts/WindowContext'

interface WindowPosition {
  x: number;
  y: number;
}

interface BaseWindowProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
  title: string;
  width: string;
  height?: string;
  windowId: string;
  children: ReactNode;
  initialPosition?: WindowPosition;
  showMaximize?: boolean;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

export function BaseWindow({ 
  isVisible, 
  onVisibilityChange, 
  title, 
  width, 
  height,
  windowId,
  children,
  initialPosition,
  showMaximize = false,
  onMaximize,
  isMaximized = false
}: BaseWindowProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    if (initialPosition) return initialPosition;
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
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 500;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 500;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      const windowElementWidth = windowRef.current?.offsetWidth || parseInt(width);
      const windowElementHeight = windowRef.current?.offsetHeight || (height ? parseInt(height) : 300);
      
      const constrainedX = Math.min(Math.max(newX, -windowElementWidth + 200), windowWidth - 200);
      const constrainedY = Math.min(Math.max(newY, 0), windowHeight - 150);
      
      setPosition({
        x: constrainedX,
        y: constrainedY
      });
    }
  }, [isDragging, dragOffset, width, height]);

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
      setTimeout(() => {
        bringToFront(windowId);
      }, 0);
    }
  }, [isVisible, bringToFront, windowId]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={windowRef}
      className={`window ${windowId}-window`}
      style={{ 
        width,
        height,
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: getZIndex(windowId),
        display: isVisible ? 'block' : 'none',
        userSelect: 'none',
        transform: isMaximized ? 'none' : undefined
      }}
      onMouseDown={(e) => {
        handleMouseDown(e);
        bringToFront(windowId);
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">{title}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize}></button>
          {showMaximize && <button aria-label="Maximize" onClick={onMaximize}></button>}
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body">
        {children}
      </div>
    </div>
  );
} 