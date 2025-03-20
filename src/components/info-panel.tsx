'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import '98.css/dist/98.css'
import "../styles/info-panel.css"
import { useWindow } from '../contexts/WindowContext'

interface WindowPosition {
  x: number;
  y: number;
}

interface InfoPanelProps {
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

export function InfoPanel({ isVisible, onVisibilityChange }: InfoPanelProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    // Random position within screen bounds
    const maxX = window.innerWidth - 300  // 300px is window width
    const maxY = window.innerHeight - 200 // 200px is approximate window height
    const x = Math.random() * maxX
    const y = Math.random() * maxY
    return { x, y }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<WindowPosition>({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  const { bringToFront, getZIndex } = useWindow();

  // Handle window dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.title-bar')) {
      setIsDragging(true)
      const rect = windowRef.current?.getBoundingClientRect()
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }, [isDragging, dragOffset])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, handleMouseMove])

  const handleMinimize = () => {
    onVisibilityChange(false)
  }

  const handleClose = () => {
    onVisibilityChange(false)
  }

  useEffect(() => {
    if (isVisible) {
      // Use setTimeout to avoid calling during render
      setTimeout(() => {
        bringToFront('info-panel');
      }, 0);
    }
  }, [isVisible, bringToFront]);

  return (
    <div className="win98">
      <div 
        ref={windowRef}
        className="window info-panel" 
        style={{ 
          width: '300px',
          height: '150px',
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: getZIndex('info-panel'),
          display: isVisible ? 'block' : 'none',
          userSelect: 'none',
        }}
        onMouseDown={(e) => {
          handleMouseDown(e);
          bringToFront('info-panel');
        }}
      >
        <div className="title-bar">
          <div className="title-bar-text">Information</div>
          <div className="title-bar-controls">
            <button 
              aria-label="Minimize" 
              onClick={handleMinimize}
            ></button>
            <button 
              aria-label="Close" 
              onClick={handleClose}
            ></button>
          </div>
        </div>
        <div className="main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4>Welcome to my portfolio</h4>
          <p>Enjoy your stay</p>
          <p>(This is also my study app)</p>
        </div>
      </div>
    </div>
  )
}
