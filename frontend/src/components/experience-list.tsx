'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import { useWindow } from '../contexts/WindowContext'

interface WindowPosition {
  x: number;
  y: number;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string[];
}

interface ExperienceListProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function ExperienceList({ isVisible, onVisibilityChange }: ExperienceListProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    const x = Math.random() * (200-150) + 150;
    const y = window.innerHeight - (Math.random() * (300-200) + 200);
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const { bringToFront, getZIndex } = useWindow();
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_API_KEY;

  useEffect(() => {
    if (isVisible) {
      setIsLoading(true);
      fetch(`/api/experiences`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch experiences');
          }
          return response.json();
        })
        .then(data => {
          setExperiences(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching experiences:', error);
          setError(error.message);
          setIsLoading(false);
        });
    }
  }, [isVisible, API_URL]);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        bringToFront('experience');
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
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 500;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 500;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      const width = windowRef.current?.offsetWidth || 450;
      const height = windowRef.current?.offsetHeight || 400;
      
      const constrainedX = Math.min(Math.max(newX, -width + 300), windowWidth - 300);
      const constrainedY = Math.min(Math.max(newY, 0), windowHeight - 200);

      setPosition({
        x: constrainedX,
        y: constrainedY
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

  const handleExperienceSelect = (id: string) => {
    setSelectedExperience(id === selectedExperience ? null : id);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={windowRef}
      className="window experience-list-window" 
      style={{ 
        width: '35vw',
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: getZIndex('experience'),
        display: isVisible ? 'block' : 'none',
        userSelect: 'none',
        wordSpacing: '0.1em',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onMouseDown={(e) => {
        handleMouseDown(e);
        bringToFront('experience');
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Experiences</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize}></button>
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body">
        <div className="content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="experiences-container" style={{ maxHeight: '300px', overflow: 'auto', border: '2px inset #c0c0c0', padding: '5px' }}>
            {isLoading ? (
              <div style={{ padding: '10px', textAlign: 'center' }}>Loading experiences...</div>
            ) : error ? (
              <div style={{ padding: '10px', color: 'red' }}>{error}</div>
            ) : experiences.length === 0 ? (
              <div style={{ padding: '10px' }}>No experiences found.</div>
            ) : (
              experiences.map(experience => (
                <div 
                  key={experience.id} 
                  className={`experience-item ${selectedExperience === experience.id ? 'selected' : ''}`}
                  style={{ 
                    padding: '8px', 
                    marginBottom: '5px', 
                    cursor: 'pointer',
                    background: selectedExperience === experience.id ? '#000080' : 'transparent',
                    color: selectedExperience === experience.id ? 'white' : 'black'
                  }}
                  onClick={() => handleExperienceSelect(experience.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '1em' }}>
                    <strong>{experience.title}</strong>
                    <span>{experience.start_date} - {experience.end_date}</span>
                  </div>
                  <div style={{ fontSize: '1.1em', color: selectedExperience === experience.id ? '#cccccc' : '#666666' }}>
                      {experience.company} • {experience.location}
                  </div>
                  {selectedExperience === experience.id && (
                    <div style={{ marginTop: '8px', fontSize: '1em' }}>
                      {experience.description.map((bullet, index) => (
                        <div key={index} style={{ marginBottom: '4px' }} 
                          dangerouslySetInnerHTML={{ __html: `• ${bullet}` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 