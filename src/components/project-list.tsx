'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'

interface WindowPosition {
  x: number;
  y: number;
}

interface ProjectListProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

interface Project {
  id: number;
  name: string;
  description: string;
  technologies: string[];
  year: number;
}

export function ProjectList({ isVisible, onVisibilityChange }: ProjectListProps) {
  const [position, setPosition] = useState<WindowPosition>({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  
  const windowRef = useRef<HTMLDivElement>(null);
  
  // Sample project data
  const projects: Project[] = [
    {
      id: 1,
      name: "Portfolio Website",
      description: "Personal portfolio website with Windows 98 theme using Next.js and React.",
      technologies: ["React", "Next.js", "TypeScript", "CSS"],
      year: 2023
    },
    {
      id: 2,
      name: "Music Streaming App",
      description: "Music streaming application with API integration and custom audio player.",
      technologies: ["React", "FastAPI", "MongoDB", "WaveSurfer.js"],
      year: 2023
    },
    {
      id: 3,
      name: "Data Visualization Dashboard",
      description: "Interactive dashboard for visualizing complex datasets with filtering capabilities.",
      technologies: ["D3.js", "React", "Node.js", "PostgreSQL"],
      year: 2022
    },
    {
      id: 4,
      name: "E-commerce Platform",
      description: "Full-stack e-commerce platform with product management and order processing.",
      technologies: ["React", "Express", "MongoDB", "Stripe"],
      year: 2022
    }
  ];
  
  useEffect(() => {
    const x = (window.innerWidth - 450) / 2;
    const y = (window.innerHeight - 400) / 3;
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

  const handleProjectSelect = (id: number) => {
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
        zIndex: isDragging ? 1000 : 100,
        display: isVisible ? 'block' : 'none'
      }}
      onMouseDown={handleMouseDown}
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
          <h4>My Projects</h4>
          <div className="projects-container" style={{ maxHeight: '300px', overflow: 'auto', border: '2px inset #c0c0c0', padding: '5px' }}>
            {projects.map(project => (
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
            ))}
          </div>
          <div className="field-row" style={{ justifyContent: 'space-around', marginTop: '5px' }}>
            <button disabled={!selectedProject}>View Details</button>
            <button disabled={!selectedProject}>GitHub</button>
            <button disabled={!selectedProject}>Live Demo</button>
          </div>
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">Projects: {projects.length}</p>
      </div>
    </div>
  );
} 