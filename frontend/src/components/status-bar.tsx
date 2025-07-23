'use client'

import { useState, useEffect } from 'react'
import '98.css/dist/98.css'
import '../styles/mobile-responsive.css'

interface StatusBarProps {
  onMediaPlayerClick?: () => void;
  onInfoClick: () => void;
  onAboutMeClick: () => void;
  onContactClick: () => void;
  onProjectListClick: () => void;
  onResumeClick: () => void;
  onExperienceClick: () => void;
  showMediaPlayer?: boolean;
  showInfoPanel: boolean;
  showAboutMe: boolean;
  showContact: boolean;
  showProjectList: boolean;
  showResume: boolean;
  showExperience: boolean;
  onMinimizeMediaPlayer?: () => void;
  onMinimizeInfoPanel: () => void;
  onMinimizeAboutMe: () => void;
  onMinimizeContact: () => void;
  onMinimizeProjectList: () => void;
  onMinimizeResume: () => void;
  onMinimizeExperience: () => void;
}

export function StatusBar({ 
  onMediaPlayerClick, 
  onInfoClick,
  onAboutMeClick,
  onContactClick,
  onProjectListClick,
  onResumeClick,
  onExperienceClick,
  showMediaPlayer, 
  showInfoPanel,
  showAboutMe,
  showContact,
  showProjectList,
  showResume,
  showExperience,
  onMinimizeMediaPlayer,
  onMinimizeInfoPanel,
  onMinimizeAboutMe,
  onMinimizeContact,
  onMinimizeProjectList,
  onMinimizeResume,
  onMinimizeExperience
}: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [windowDimensions, setWindowDimensions] = useState({ width: 1024, height: 768 })

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString())
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

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

  const handleMediaPlayerClick = () => {
    // Skip if no handlers provided
    if (!onMediaPlayerClick && !onMinimizeMediaPlayer) return;
    
    if (showMediaPlayer) {
      onMinimizeMediaPlayer?.();
    } else {
      onMediaPlayerClick?.();
    }
  }

  const handleInfoClick = () => {
    if (showInfoPanel) {
      onMinimizeInfoPanel()
    } else {
      onInfoClick()
    }
  }

  const handleAboutMeClick = () => {
    if (showAboutMe) {
      onMinimizeAboutMe()
    } else {
      onAboutMeClick()
    }
  }

  const handleContactClick = () => {
    if (showContact) {
      onMinimizeContact()
    } else {
      onContactClick()
    }
  }

  const handleProjectListClick = () => {
    if (showProjectList) {
      onMinimizeProjectList()
    } else {
      onProjectListClick()
    }
  }

  const handleResumeClick = () => {
    if (showResume) {
      onMinimizeResume()
    } else {
      onResumeClick()
    }
  }

  const handleExperienceClick = () => {
    if (showExperience) {
      onMinimizeExperience()
    } else {
      onExperienceClick()
    }
  }

  // Button data for easier responsive handling
  const buttons = [
    { label: 'Information', handler: handleInfoClick, isActive: showInfoPanel, shortLabel: 'Info' },
    { label: 'About Me', handler: handleAboutMeClick, isActive: showAboutMe, shortLabel: 'About' },
    { label: 'Contact', handler: handleContactClick, isActive: showContact, shortLabel: 'Contact' },
    { label: 'Projects', handler: handleProjectListClick, isActive: showProjectList, shortLabel: 'Projects' },
    { label: 'Experiences', handler: handleExperienceClick, isActive: showExperience, shortLabel: 'Exp.' },
    { label: 'Resume', handler: handleResumeClick, isActive: showResume, shortLabel: 'Resume' }
  ]

  return (
    <div className={`win98 status-bar ${isMounted && isMobile ? 'status-bar-mobile' : ''}`}>
      <div className="status-bar-buttons">
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`win98-toolbar-button status-bar-button ${button.isActive ? 'active' : ''}`}
            onClick={button.handler}
            title={button.label} // Tooltip for truncated text
          >
            {isMounted && isMobile && windowDimensions.width <= 480 ? button.shortLabel : button.label}
          </button>
        ))}
      </div>
      <div className="status-bar-time">
        {isMounted && isMobile ? currentTime.substring(0, 5) : currentTime}
      </div>
    </div>
  )
}
