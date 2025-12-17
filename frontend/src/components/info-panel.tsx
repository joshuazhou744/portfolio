'use client'

import { BaseWindow } from './base-window'
import { useState, useEffect } from 'react'
import '../styles/info-panel.css'

interface InfoPanelProps {
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

export function InfoPanel({ isVisible, onVisibilityChange }: InfoPanelProps) {
  const [windowDimensions, setWindowDimensions] = useState({ width: 400, height: 300 })
  
  useEffect(() => {
    // Only run on client side after hydration
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

  // Calculate responsive properties after client-side mount
  const isMobile = windowDimensions.width <= 768
  const windowWidth = isMobile ? '90vw' : '400px'
  
  const initialPosition = isMobile 
    ? {
        x: Math.max(0, (windowDimensions.width - 300) / 2),
        y: 50
      }
    : {
        x: Math.random() * (windowDimensions.width - 400) + 50,
        y: Math.random() * (windowDimensions.height - 200) + 50
      }

  return (
    <div className="win98 info-panel-container">
      <BaseWindow
        isVisible={isVisible}
        onVisibilityChange={onVisibilityChange}
        title="Enjoy your stay"
        width={windowWidth}
        height="auto"
        windowId="info-panel"
        initialPosition={initialPosition}
      >
        <div className="info-panel-main">
          <h4 className="info-panel-title">Welcome to my website</h4>
          <p className="info-panel-subtitle">This was originally my study app</p>
        </div>
      </BaseWindow>
    </div>
  );
}
