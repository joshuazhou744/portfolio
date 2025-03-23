'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import { useWindow } from '../contexts/WindowContext'

interface WindowPosition {
  x: number;
  y: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  year: number;
  github?: string;
  demo_url?: string;
  image_url?: string;
}

interface ProjectListProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function ProjectList({ isVisible, onVisibilityChange }: ProjectListProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    const x = Math.random() * (100-50) + 50;
    const y = window.innerHeight - (Math.random() * (550-400) + 450);
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const { bringToFront, getZIndex } = useWindow();
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (isVisible) {
      setIsLoading(true);
      fetch(`${API_URL}/projects`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch projects');
          }
          return response.json();
        })
        .then(data => {
          setProjects(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching projects:', error);
          setError(error.message);
          setIsLoading(false);
        });
    }
  }, [isVisible, API_URL]);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        bringToFront('project-list');
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
      const constrainedY = Math.min(Math.max(newY, 0), windowHeight - 300);
      
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

  const handleProjectSelect = (id: string) => {
    setSelectedProject(id === selectedProject ? null : id);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={windowRef}
      className="window project-list-window" 
      style={{ 
        width: '450px',
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: getZIndex('project-list'),
        display: isVisible ? 'block' : 'none',
        userSelect: 'none',
        wordSpacing: '0.1em',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onMouseDown={(e) => {
        handleMouseDown(e);
        bringToFront('project-list');
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Project List</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize}></button>
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body">
        <div className="content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="projects-container" style={{ maxHeight: '300px', overflow: 'auto', border: '2px inset #c0c0c0', padding: '5px' }}>
            {isLoading ? (
              <div style={{ padding: '10px', textAlign: 'center' }}>Loading projects...</div>
            ) : error ? (
              <div style={{ padding: '10px', color: 'red' }}>{error}</div>
            ) : projects.length === 0 ? (
              <div style={{ padding: '10px' }}>No projects found.</div>
            ) : (
              projects.map(project => (
                <div 
                  key={project.id} 
                  className={`project-item ${selectedProject === project.id ? 'selected' : ''}`}
                  style={{ 
                    padding: '8px', 
                    marginBottom: '5px', 
                    cursor: 'pointer',
                    background: selectedProject === project.id ? '#000080' : 'transparent',
                    color: selectedProject === project.id ? 'white' : 'black'
                  }}
                  onClick={() => handleProjectSelect(project.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{project.name}</strong>
                    <span>{project.year}</span>
                  </div>
                  {selectedProject === project.id && (
                    <div style={{ marginTop: '5px' }}>
                      <p>{project.description}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                        {project.technologies.map((tech, index) => (
                          <span 
                            key={index} 
                            style={{ 
                              padding: '2px 5px', 
                              background: '#c0c0c0', 
                              color: '#000', 
                              fontSize: '12px',
                              border: '1px solid #888'
                            }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="field-row" style={{ justifyContent: 'space-around', marginTop: '5px' }}>
            <button disabled={!selectedProject}>View Details</button>
            <button 
              disabled={!selectedProject || !projects.find(p => p.id === selectedProject)?.github} 
              onClick={() => {
                const project = projects.find(p => p.id === selectedProject);
                if (project?.github) window.open(project.github, '_blank');
              }}
            >
              GitHub
            </button>
            <button 
              disabled={!selectedProject || !projects.find(p => p.id === selectedProject)?.demo_url}
              onClick={() => {
                const project = projects.find(p => p.id === selectedProject);
                if (project?.demo_url) window.open(project.demo_url, '_blank');
              }}
            >
              Live
            </button>
          </div>
        </div>
      </div>
      {/*<div className="status-bar">
        <p className="status-bar-field">Projects: {projects.length}</p>
      </div>*/}
    </div>
  );
} 