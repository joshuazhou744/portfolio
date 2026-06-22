'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import '../styles/window.css';
import { useWindow } from '../contexts/WindowContext';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
    const x = window.innerWidth - (Math.random() * (700 - 600) + 600);
    const y = window.innerHeight - (Math.random() * (500 - 400) + 400);
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [resumeMetadata, setResumeMetadata] = useState<ResumeMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState<'se' | 'sw' | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [originalPosition, setOriginalPosition] = useState<WindowPosition>({ x: 120, y: 120 });
  const [originalSize, setOriginalSize] = useState({ width: 600, height: 500 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const { bringToFront, getZIndex } = useWindow();

  const windowRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const scrollRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      setContainerWidth(node.clientWidth);
      observerRef.current = new ResizeObserver(() => setContainerWidth(node.clientWidth));
      observerRef.current.observe(node);
    }
  }, []);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  }, []);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => bringToFront('resume'), 0);
    }
  }, [isVisible, bringToFront]);

  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleZoomIn, handleZoomOut]);

  useEffect(() => {
    if (isVisible && !resumeMetadata) {
      setIsLoading(true);
      fetch(`${API_URL}/resume`)
        .then((res) => {
          if (!res.ok) throw new Error('Resume not found');
          return res.json();
        })
        .then((data) => {
          setResumeMetadata(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching resume:', err);
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
          setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      } else if (e.target.closest('.resize-handle')) {
        setIsResizing(true);
        const targetEl = e.target as HTMLElement;
        if (targetEl.classList.contains('se-handle')) setActiveResizeHandle('se');
        else if (targetEl.classList.contains('sw-handle')) setActiveResizeHandle('sw');
      }
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        const width = windowRef.current?.offsetWidth || 600;
        setPosition({
          x: Math.min(Math.max(newX, -width + 400), windowWidth - 400),
          y: Math.min(Math.max(newY, 0), windowHeight - 300),
        });
      } else if (isResizing) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        if (activeResizeHandle === 'se') {
          setSize({
            width: Math.min(Math.max(400, e.clientX - position.x), windowWidth - position.x),
            height: Math.min(Math.max(300, e.clientY - position.y), windowHeight - position.y),
          });
        } else if (activeResizeHandle === 'sw') {
          const rightEdgeX = position.x + size.width;
          const newWidth = Math.min(Math.max(400, rightEdgeX - e.clientX), rightEdgeX);
          const newHeight = Math.min(Math.max(300, e.clientY - position.y), windowHeight - position.y);
          const newX = Math.max(0, rightEdgeX - newWidth);
          if (newWidth >= 400 && newWidth <= windowWidth) {
            setPosition((prev) => ({ ...prev, x: newX }));
            setSize({ width: newWidth, height: newHeight });
          } else {
            setSize((prev) => ({ ...prev, height: newHeight }));
          }
        }
      }
    },
    [isDragging, isResizing, dragOffset, position, activeResizeHandle, size.width]
  );

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

  const handleClose = () => onVisibilityChange(false);
  const handleMinimize = () => onVisibilityChange(false);

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
    fetch(`${API_URL}/resume/download`)
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = resumeMetadata.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => console.error('Error downloading resume:', err));
  };

  if (!isVisible) return null;

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
        transform: isMaximized ? 'none' : undefined,
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
      <div
        className="window-body"
        style={{
          padding: '0px 10px',
          marginBottom: 0,
          height: 'calc(100% - 55px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="resume-toolbar field-row" style={{ marginBottom: '8px' }}>
          <button style={{ marginRight: '5px' }} onClick={handleDownload}>
            Download
          </button>
          <span style={{ flex: 1 }}></span>
          <span style={{ marginRight: '10px', fontSize: '13px' }}>{zoomLevel}%</span>
          <button style={{ width: '30px', marginRight: '5px' }} onClick={handleZoomIn}>
            +
          </button>
          <button style={{ width: '30px', marginRight: '5px' }} onClick={handleZoomOut}>
            -
          </button>
        </div>
        <div
          className="resume-container"
          style={{ flex: 1, border: '2px inset #c0c0c0', padding: '1px', overflow: 'hidden' }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              Loading...
            </div>
          ) : !resumeMetadata ? (
            <div style={{ padding: '16px' }}>
              <p>No resume found. Please upload a resume PDF file.</p>
            </div>
          ) : (
            <div
              ref={scrollRefCallback}
              className="resume-scroll"
              style={{ width: '100%', height: '100%', overflow: 'auto' }}
            >
              <div
                style={{
                  minWidth: '100%',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 0,
                  boxSizing: 'border-box',
                }}
              >
                <Document
                  file={`${API_URL}/resume/view`}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={<div style={{ padding: '10px' }}>Loading PDF...</div>}
                  error={<div style={{ padding: '10px' }}>Failed to load PDF.</div>}
                >
                  {Array.from({ length: numPages }, (_, i) => (
                    <div key={i + 1} style={{ marginBottom: i < numPages - 1 ? '8px' : 0 }}>
                      <Page
                        pageNumber={i + 1}
                        width={containerWidth > 0 ? containerWidth * (zoomLevel / 100) : undefined}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  ))}
                </Document>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="resizer-container">
        <div
          className="resize-handle se-handle"
          style={{ position: 'absolute', right: 0, bottom: 0, width: '20px', height: '20px', cursor: 'se-resize' }}
        />
        <div
          className="resize-handle sw-handle"
          style={{ position: 'absolute', left: 0, bottom: 0, width: '20px', height: '20px', cursor: 'sw-resize' }}
        />
      </div>
    </div>
  );
}
