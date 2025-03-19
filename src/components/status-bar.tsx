'use client'

import { useState, useEffect } from 'react'
import '98.css/dist/98.css'

interface StatusBarProps {
  onMediaPlayerClick: () => void;
  onInfoClick: () => void;
  onAboutMeClick: () => void;
  onContactClick: () => void;
  onProjectListClick: () => void;
  onResumeClick: () => void;
  showMediaPlayer: boolean;
  showInfoPanel: boolean;
  showAboutMe: boolean;
  showContact: boolean;
  showProjectList: boolean;
  showResume: boolean;
  onMinimizeMediaPlayer: () => void;
  onMinimizeInfoPanel: () => void;
  onMinimizeAboutMe: () => void;
  onMinimizeContact: () => void;
  onMinimizeProjectList: () => void;
  onMinimizeResume: () => void;
}

export function StatusBar({ 
  onMediaPlayerClick, 
  onInfoClick,
  onAboutMeClick,
  onContactClick,
  onProjectListClick,
  onResumeClick,
  showMediaPlayer, 
  showInfoPanel,
  showAboutMe,
  showContact,
  showProjectList,
  showResume,
  onMinimizeMediaPlayer,
  onMinimizeInfoPanel,
  onMinimizeAboutMe,
  onMinimizeContact,
  onMinimizeProjectList,
  onMinimizeResume
}: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString())
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleMediaPlayerClick = () => {
    if (showMediaPlayer) {
      onMinimizeMediaPlayer()
    } else {
      onMediaPlayerClick()
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

  return (
    <div
      className="win98"
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2px 4px',
        backgroundColor: '#c0c0c0',
        borderTop: '1px solid #fff',
        boxShadow: 'inset 0 1px 0 0 #dfdfdf, inset 0 0 0 1px #9e9e9e'
      }}
    >
      <div className="field-row" style={{ margin: 0, overflowX: 'auto', flexWrap: 'nowrap' }}>
        <button 
          className={`win98-toolbar-button ${showMediaPlayer ? 'active' : ''}`}
          onClick={handleMediaPlayerClick}
          style={{ 
            marginRight: '1px',
            padding: '4px 12px',
            whiteSpace: 'nowrap',
            background: showMediaPlayer ? '#dfdfdf' : '#c0c0c0',
            border: showMediaPlayer ? 'inset 2px' : 'outset 2px',
            boxShadow: showMediaPlayer ? 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf' : 'outset -1px -1px #0a0a0a, outset 1px 1px #dfdfdf'
          }}
        >
          Media Player
        </button>
        <button 
          className={`win98-toolbar-button ${showInfoPanel ? 'active' : ''}`}
          onClick={handleInfoClick}
          style={{ 
            marginRight: '1px',
            padding: '4px 12px',
            whiteSpace: 'nowrap',
            background: showInfoPanel ? '#dfdfdf' : '#c0c0c0',
            border: showInfoPanel ? 'inset 2px' : 'outset 2px',
            boxShadow: showInfoPanel ? 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf' : 'outset -1px -1px #0a0a0a, outset 1px 1px #dfdfdf'
          }}
        >
          Information
        </button>
        <button 
          className={`win98-toolbar-button ${showAboutMe ? 'active' : ''}`}
          onClick={handleAboutMeClick}
          style={{ 
            marginRight: '1px',
            padding: '4px 12px',
            whiteSpace: 'nowrap',
            background: showAboutMe ? '#dfdfdf' : '#c0c0c0',
            border: showAboutMe ? 'inset 2px' : 'outset 2px',
            boxShadow: showAboutMe ? 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf' : 'outset -1px -1px #0a0a0a, outset 1px 1px #dfdfdf'
          }}
        >
          About Me
        </button>
        <button 
          className={`win98-toolbar-button ${showContact ? 'active' : ''}`}
          onClick={handleContactClick}
          style={{ 
            marginRight: '1px',
            padding: '4px 12px',
            whiteSpace: 'nowrap',
            background: showContact ? '#dfdfdf' : '#c0c0c0',
            border: showContact ? 'inset 2px' : 'outset 2px',
            boxShadow: showContact ? 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf' : 'outset -1px -1px #0a0a0a, outset 1px 1px #dfdfdf'
          }}
        >
          Contact
        </button>
        <button 
          className={`win98-toolbar-button ${showProjectList ? 'active' : ''}`}
          onClick={handleProjectListClick}
          style={{ 
            marginRight: '1px',
            padding: '4px 12px',
            whiteSpace: 'nowrap',
            background: showProjectList ? '#dfdfdf' : '#c0c0c0',
            border: showProjectList ? 'inset 2px' : 'outset 2px',
            boxShadow: showProjectList ? 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf' : 'outset -1px -1px #0a0a0a, outset 1px 1px #dfdfdf'
          }}
        >
          Projects
        </button>
        <button 
          className={`win98-toolbar-button ${showResume ? 'active' : ''}`}
          onClick={handleResumeClick}
          style={{ 
            marginRight: '1px',
            padding: '4px 12px',
            whiteSpace: 'nowrap',
            background: showResume ? '#dfdfdf' : '#c0c0c0',
            border: showResume ? 'inset 2px' : 'outset 2px',
            boxShadow: showResume ? 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf' : 'outset -1px -1px #0a0a0a, outset 1px 1px #dfdfdf'
          }}
        >
          Resume
        </button>
      </div>
      <div style={{
        minWidth: '60px',
        textAlign: 'center',
        padding: '3px 8px',
        margin: '0 -2px',
        border: '1px solid #888',
        background: '#B0B0B0',
        fontSize: '12px'
      }}>
        {currentTime}
      </div>
    </div>
  )
}
