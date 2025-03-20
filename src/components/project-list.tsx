'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/window.css'
import { useWindow } from '../contexts/WindowContext'

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
  github: string;
  live?: string;
}

export function ProjectList({ isVisible, onVisibilityChange }: ProjectListProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    const x = 50; // Left with margin
    const y = window.innerHeight - 500; // Bottom with margin for window height
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 });
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const { bringToFront, getZIndex } = useWindow();
  
  // Sample project data
  const projects: Project[] = [
    {
      id: 1,
      name: "Portfolio Website",
      description: "Personal portfolio website and study app in a Windows 98 theme",
      technologies: ["React", "NextJS", "TypeScript", "FastAPI", "MongoDB"],
      year: 2025,
      github: "https://github.com/joshuazhou744/portfolio",
      live: "https://www.youtube.com/"
    },
    {
      id: 2,
      name: "ImaginArray | ConUHacks IX",
      description: "Algorithm and array manipulation visualization tool",
      technologies: ["React", "Flask", "Framer Motion"],
      year: 2025,
      github: "https://github.com/joshuazhou744/imaginarray",
      live: "https://imaginarray.vercel.app"
    },
    {
      id: 3,
      name: "McHacks 12 Live Site",
      description: "Fullstack web application and neural network to reflect sleep quality",
      technologies: ["React", "Node", "Express", "MongoDB", "Figma", "TailwindCSS"],
      year: 2025,
      github: "https://github.com/hackmcgill/mchacks12",
      live: "https://mchacks.ca"
    },
    {
      id: 4,
      name: "Snooze Scribe and Snooze Model",
      description: "Fullstack web application and neural network to reflect sleep quality",
      technologies: ["React", "PyTorch", "FastAPI", "MongoDB", "WaveSurfer"],
      year: 2024,
      github: "https://github.com/joshuazhou744/snooze_scribe",
      live: "https://snooze-scribe.vercel.app"
    },
    {
      id: 5,
      name: "CheckMate | HackTheNorth 2023",
      description: "Fullstack banking application using RBC's custom API",
      technologies: ["React", "Node", "Express"],
      year: 2023,
      github: "https://github.com/Dennisonung/CheckMate"
    },
    {
      id: 6,
      name: "GoSkye Aim Trainer",
      description: "First person aim trainer with simulated in game graphics to VALORANT",
      technologies: ["Python", "PyGame"],
      year: 2023,
      github: "https://github.com/joshuazhou744/Go_Skye-CSE3910-Project"
    },
  ];
  
  useEffect(() => {
    if (isVisible) {
      // Use setTimeout to avoid calling during render
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
              disabled={!selectedProject || !projects.find(p => p.id === selectedProject)?.live}
              onClick={() => {
                const project = projects.find(p => p.id === selectedProject);
                if (project?.live) window.open(project.live, '_blank');
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