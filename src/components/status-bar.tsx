'use client'

import { useState, useEffect } from 'react'
import '98.css/dist/98.css'

interface StatusBarProps {
  onMediaPlayerClick: () => void;
  onInfoClick: () => void;
  showMediaPlayer: boolean;
  showInfoPanel: boolean;
  onMinimizeMediaPlayer: () => void;
  onMinimizeInfoPanel: () => void;
}

export function StatusBar({ 
  onMediaPlayerClick, 
  onInfoClick, 
  showMediaPlayer, 
  showInfoPanel,
  onMinimizeMediaPlayer,
  onMinimizeInfoPanel
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
      <div className="field-row" style={{ margin: 0 }}>
        <button 
          className={`win98-toolbar-button ${showMediaPlayer ? 'active' : ''}`}
          onClick={handleMediaPlayerClick}
          style={{ 
            marginRight: '1px',
            padding: '4px 12px',
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
            background: showInfoPanel ? '#dfdfdf' : '#c0c0c0',
            border: showInfoPanel ? 'inset 2px' : 'outset 2px',
            boxShadow: showInfoPanel ? 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf' : 'outset -1px -1px #0a0a0a, outset 1px 1px #dfdfdf'
          }}
        >
          Information
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
