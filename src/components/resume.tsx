'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import { useWindow } from '../contexts/WindowContext'

interface WindowPosition {
  x: number;
  y: number;
}

interface ResumeProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function Resume({ isVisible, onVisibilityChange }: ResumeProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    const x = window.innerWidth - 650; // Right with margin for window width
    const y = window.innerHeight - 550; // Bottom with margin for window height
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [pdfExists, setPdfExists] = useState<boolean | null>(null);
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeOffset, setResizeOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [originalPosition, setOriginalPosition] = useState<WindowPosition>({ x: 120, y: 120 });
  const [originalSize, setOriginalSize] = useState({ width: 600, height: 500 });
  const { bringToFront, getZIndex } = useWindow();
  
  const windowRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isVisible) {
      // Use setTimeout to avoid calling during render
      setTimeout(() => {
        bringToFront('resume');
      }, 0);
    }
  }, [isVisible, bringToFront]);

  useEffect(() => {
    // Check if the PDF exists
    if (isVisible && pdfExists === null) {
      fetch('/resume.pdf')
        .then(response => {
          setPdfExists(response.ok);
        })
        .catch(() => {
          setPdfExists(false);
        });
    }
  }, [isVisible, pdfExists]);

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
          setResizeOffset({
            x: e.clientX - rect.right,
            y: e.clientY - rect.bottom
          });
        }
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const newWidth = e.clientX - position.x;
      const newHeight = e.clientY - position.y;
      setSize({
        width: Math.max(400, newWidth),
        height: Math.max(300, newHeight)
      });
    }
  }, [isDragging, isResizing, dragOffset, resizeOffset, position]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
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
      // Store current position and size before maximizing
      setOriginalPosition(position);
      setOriginalSize(size);
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight - 30 });
    } else {
      // Restore original position and size
      setPosition(originalPosition);
      setSize(originalSize);
    }
    setIsMaximized(!isMaximized);
  };

  const handleDownload = () => {
    // Create a link to download the PDF
    const link = document.createElement('a');
    link.href = '/resume.pdf';
    link.download = 'Joshua_Zhou_Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        userSelect: 'none'
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
      <div className="window-body" style={{ padding: '8px', height: 'calc(100% - 55px)', display: 'flex', flexDirection: 'column' }}>
        <div className="resume-toolbar field-row" style={{ marginBottom: '8px' }}>
          <button style={{ marginRight: '5px' }}>Print</button>
          <button 
            style={{ marginRight: '5px' }}
            onClick={handleDownload}
          >
            Download
          </button>
          <span style={{ flex: 1 }}></span>
          <button style={{ width: '30px', marginRight: '5px' }}>+</button>
          <button style={{ width: '30px' }}>-</button>
        </div>
        <div className="resume-container" style={{ flex: 1, border: '2px inset #c0c0c0', padding: '1px', overflow: 'auto' }}>
          {pdfExists === false ? (
            <div style={{ padding: '20px', fontFamily: 'MS Sans Serif, sans-serif', textAlign: 'center' }}>
              <h3>Resume PDF Not Found</h3>
              <p>The resume file could not be loaded.</p>
              <p>To add your resume:</p>
              <ol style={{ textAlign: 'left', display: 'inline-block' }}>
                <li>Add a PDF file named 'resume.pdf' to the 'public' folder</li>
                <li>Or update the src path in the resume component</li>
              </ol>
              <div style={{ marginTop: '20px', border: '1px solid #888', padding: '10px', backgroundColor: '#eee' }}>
                <pre style={{ textAlign: 'left', margin: '0', fontSize: '12px' }}>
                  {`// In your terminal:
mkdir -p public
cp /path/to/your/resume.pdf public/resume.pdf`}
                </pre>
              </div>
            </div>
          ) : (
            <iframe
              src="/resume.pdf#toolbar=0"
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                background: 'white'
              }}
              title="Resume"
            />
          )}
        </div>
      </div>
      <div className="resize-handle" style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: '20px',
        height: '20px',
        cursor: 'se-resize'
      }} />
      <div className="status-bar">
        <p className="status-bar-field">Resume - PDF Viewer</p>
      </div>
    </div>
  );
} 