'use client'

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import '../styles/mobile-responsive.css'
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
  // Use client-side state management
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

  const [position, setPosition] = useState<WindowPosition>(() => {
    if (initialPosition) return initialPosition;
    
    // Default position for SSR
    return { x: 100, y: 50 };
  });
  
  // Update position once mounted for responsive positioning
  useEffect(() => {
    if (isMounted && !initialPosition) {
      if (isMobile) {
        const estimatedWidth = parseInt(width) || 300;
        setPosition({
          x: Math.max(10, (windowDimensions.width - estimatedWidth) / 2),
          y: 20
        });
      } else {
        setPosition({
          x: Math.random() * (200-100) + 100,
          y: Math.random() * (75-50) + 50
        });
      }
    }
  }, [isMounted, isMobile, width, windowDimensions, initialPosition]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  
  const windowRef = useRef<HTMLDivElement>(null);
  const { bringToFront, getZIndex } = useWindow();
  
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.title-bar')) {
      // Don't allow dragging on mobile to prevent interference with scrolling
      if (isMobile) {
        return;
      }
      
      setIsDragging(true);
      const rect = windowRef.current?.getBoundingClientRect();
      if (rect) {
        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
        
        setDragOffset({
          x: clientX - rect.left,
          y: clientY - rect.top
        });
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (isDragging && !isMobile && isMounted) {
      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      
      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;
      
      const windowElementWidth = windowRef.current?.offsetWidth || parseInt(width) || 300;
      const windowElementHeight = windowRef.current?.offsetHeight || (height ? parseInt(height) : 300);
      
      // More generous constraints for mobile
      const minVisibleWidth = isMobile ? 50 : 200;
      const minVisibleHeight = isMobile ? 100 : 150;
      
      const constrainedX = Math.min(Math.max(newX, -windowElementWidth + minVisibleWidth), windowDimensions.width - minVisibleWidth);
      const constrainedY = Math.min(Math.max(newY, 0), windowDimensions.height - minVisibleHeight);
      
      setPosition({
        x: constrainedX,
        y: constrainedY
      });
    }
  }, [isDragging, dragOffset, width, height, isMobile, isMounted, windowDimensions]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging && !isMobile && isMounted) {
      const events = ['mousemove', 'touchmove'];
      const endEvents = ['mouseup', 'touchend'];
      
      events.forEach(event => {
        window.addEventListener(event, handleMouseMove as EventListener);
      });
      
      endEvents.forEach(event => {
        window.addEventListener(event, handleMouseUp);
      });

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleMouseMove as EventListener);
        });
        endEvents.forEach(event => {
          window.removeEventListener(event, handleMouseUp);
        });
      };
    }
  }, [isDragging, isMobile, isMounted, handleMouseMove]);

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

  // Auto-reposition on window resize for mobile
  useEffect(() => {
    if (isMounted && isMobile && windowRef.current) {
      const handleResize = () => {
        const elementWidth = windowRef.current?.offsetWidth || 0;
        
        setPosition(prev => ({
          x: Math.min(prev.x, windowDimensions.width - elementWidth - 10),
          y: Math.max(10, Math.min(prev.y, windowDimensions.height - 100))
        }));
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile, isMounted, windowDimensions]);

  if (!isVisible) {
    return null;
  }

  // Don't render mobile-specific styles until mounted to avoid hydration mismatch
  const mobileStyles = isMounted && isMobile ? {
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  } : {};

  return (
    <div 
      ref={windowRef}
      className={`window ${windowId}-window ${isMounted && isMobile ? 'mobile-window' : ''}`}
      style={{ 
        width,
        height: height || 'auto',
        position: 'fixed',
        left: Math.max(5, Math.min(position.x, windowDimensions.width - 50)),
        top: Math.max(10, position.y),
        zIndex: getZIndex(windowId),
        display: isVisible ? 'block' : 'none',
        userSelect: 'none',
        transform: isMaximized ? 'none' : undefined,
        boxSizing: 'border-box',
        ...mobileStyles
      }}
      onMouseDown={(e) => {
        handleMouseDown(e);
        bringToFront(windowId);
      }}
      onTouchStart={(e) => {
        handleMouseDown(e);
        bringToFront(windowId);
      }}
    >
      <div className="title-bar base-window-title-bar">
        <div className="title-bar-text">{title}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize}></button>
          {showMaximize && <button aria-label="Maximize" onClick={onMaximize}></button>}
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body base-window-body">
        {children}
      </div>
    </div>
  );
} 