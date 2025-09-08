'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import { useWindow } from '../contexts/WindowContext'

interface WindowPosition {
  x: number;
  y: number;
}

interface ResumeMetadata {
  id: string;
  filename: string;
  file_id: string;
  upload_date: string;
  content_type: string;
}

interface ResumeProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function Resume({ isVisible, onVisibilityChange }: ResumeProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    const x = window.innerWidth - (Math.random() * (700-600) + 600);
    const y = window.innerHeight - (Math.random() * (500-400) + 400);
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [resumeMetadata, setResumeMetadata] = useState<ResumeMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState<'se' | 'sw' | null>(null);
  const [resizeOffset, setResizeOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [originalPosition, setOriginalPosition] = useState<WindowPosition>({ x: 120, y: 120 });
  const [originalSize, setOriginalSize] = useState({ width: 600, height: 500 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const { bringToFront, getZIndex } = useWindow();
  
  const windowRef = useRef<HTMLDivElement>(null);
  
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prevZoom => Math.min(prevZoom + 25, 300));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prevZoom => Math.max(prevZoom - 25, 50));
  }, []);
  
  const scale = zoomLevel / 100;

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        bringToFront('resume');
      }, 0);
    }
  }, [isVisible, bringToFront]);

  useEffect(() => {
    if (!isVisible) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        }
        else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, handleZoomIn, handleZoomOut]);

  useEffect(() => {
    if (isVisible && !resumeMetadata) {
      setIsLoading(true);
      fetch(`/api/resume`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Resume not found');
          }
          return response.json();
        })
        .then(data => {
          setResumeMetadata(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching resume:', error);
          setIsLoading(false);
        });
    }
  }, [isVisible, resumeMetadata]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (e.target.closest('.title-bar')) {
        setIsDragging(true);
        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }
      } else if (e.target.closest('.resize-handle')) {
        setIsResizing(true);
        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) {
          const targetEl = e.target as HTMLElement;
          if (targetEl.classList.contains('se-handle')) {
            setActiveResizeHandle('se');
            setResizeOffset({
              x: e.clientX - rect.right,
              y: e.clientY - rect.bottom
            });
          } else if (targetEl.classList.contains('sw-handle')) {
            setActiveResizeHandle('sw');
            setResizeOffset({
              x: rect.left - e.clientX,
              y: e.clientY - rect.bottom
            });
          }
        }
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 500;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 500;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      const width = windowRef.current?.offsetWidth || 600;
      const height = windowRef.current?.offsetHeight || 500;
      
      const constrainedX = Math.min(Math.max(newX, -width + 400), windowWidth - 400);
      const constrainedY = Math.min(Math.max(newY, 0), windowHeight - 300);
      
      setPosition({
        x: constrainedX,
        y: constrainedY
      });
    } else if (isResizing) {
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 500;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 500;
      
      if (activeResizeHandle === 'se') {
        let newWidth = Math.max(400, e.clientX - position.x);
        let newHeight = Math.max(300, e.clientY - position.y);
        
        newWidth = Math.min(newWidth, windowWidth - position.x);
        newHeight = Math.min(newHeight, windowHeight - position.y);
        
        setSize({
          width: newWidth,
          height: newHeight
        });
      } else if (activeResizeHandle === 'sw') {
        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) {
          const rightEdgeX = position.x + size.width;
          let newWidth = Math.max(400, rightEdgeX - e.clientX);
          let newHeight = Math.max(300, e.clientY - position.y);

          let newX = rightEdgeX - newWidth;
          
          newX = Math.max(0, newX);
          newWidth = Math.min(newWidth, rightEdgeX);
          newHeight = Math.min(newHeight, windowHeight - position.y);
          
          if (newWidth >= 400 && newWidth <= windowWidth) {
            setPosition(prev => ({
              ...prev,
              x: newX
            }));
            setSize(prev => ({
              ...prev,
              width: newWidth,
              height: newHeight
            }));
          } else {
            setSize(prev => ({
              ...prev,
              height: newHeight
            }));
          }
        }
      }
    }
  }, [isDragging, isResizing, dragOffset, position, activeResizeHandle, size.width]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setActiveResizeHandle(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove]);

  const handleClose = () => {
    onVisibilityChange(false);
  };

  const handleMinimize = () => {
    onVisibilityChange(false);
  };

  const handleMaximize = () => {
    if (!isMaximized) {
      setOriginalPosition(position);
      setOriginalSize(size);
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight - 30 });
    } else {
      setPosition(originalPosition);
      setSize(originalSize);
    }
    setIsMaximized(!isMaximized);
  };

  const handleDownload = () => {
    if (!resumeMetadata) return;
    
    fetch(`/api/resume/download`)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = resumeMetadata.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Error downloading resume:', error);
      });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={windowRef}
      className="window resume-window" 
      style={{ 
        width: size.width,
        height: size.height,
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: getZIndex('resume'),
        display: isVisible ? 'block' : 'none',
        userSelect: 'none',
        transform: isMaximized ? 'none' : undefined
      }}
      onMouseDown={(e) => {
        handleMouseDown(e);
        bringToFront('resume');
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Resume</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize}></button>
          <button aria-label="Maximize" onClick={handleMaximize}></button>
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body" style={{ padding: '0px 10px', height: 'calc(100% - 55px)', display: 'flex', flexDirection: 'column' }}>
        <div className="resume-toolbar field-row" style={{ marginBottom: '8px' }}>
          <button 
            style={{ marginRight: '5px' }}
            onClick={handleDownload}
          >
            Download
          </button>
          <span style={{ flex: 1 }}></span>
          <span style={{ marginRight: '10px', fontSize: '13px' }}>{zoomLevel}%</span>
          <button style={{ width: '30px', marginRight: '5px' }} onClick={handleZoomIn}>+</button>
          <button style={{ width: '30px', marginRight: '5px' }} onClick={handleZoomOut}>-</button>
        </div>
        <div className="resume-container" style={{ flex: 1, border: '2px inset #c0c0c0', padding: '1px', overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              Loading...
            </div>
          ) : !resumeMetadata ? (
            <div style={{ padding: '16px' }}>
              <p>No resume found. Please upload a resume PDF file.</p>
            </div>
          ) : (
            <div style={{ 
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              overflow: 'auto',
              position: 'relative'
            }}>
              <div style={{
                transformOrigin: 'top center',
                transform: `scale(${scale})`,
                width: `${100/scale}%`,
                height: `${100/scale}%`,
                display: 'flex',
                justifyContent: 'center',
                marginTop: '10px'
              }}>
                <iframe
                  src={`/api/resume/view#toolbar=0&navpanes=0&scrollbar=0&statusbar=0`}
                  style={{ 
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: 'white'
                  }}
                  title="Resume"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="resizer-container">
        <div className="resize-handle se-handle" style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '20px',
          height: '20px',
          cursor: 'se-resize'
        }}/>
        <div className="resize-handle sw-handle" style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '20px',
          height: '20px',
          cursor: 'sw-resize'
        }}/>
      </div>
      {/*<div className="status-bar">
        <p className="status-bar-field">Resume - PDF Viewer</p>
      </div>*/}
    </div>
  );
} 