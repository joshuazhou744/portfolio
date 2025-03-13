'use client'

import { useState, useEffect, useRef } from 'react'
import '98.css/dist/98.css'

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [duration, setDuration] = useState('00:00')
  const [currentTrack, setCurrentTrack] = useState({
    artist: 'Star Printer',
    title: 'Waves'
  })
  const [listeners, setListeners] = useState(124)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [likes, setLikes] = useState(2)

  // Mock audio stream URL - in a real app, this would be your radio stream
  const streamUrl = 'https://plaza.one/radio'

  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio(streamUrl)

      // Set up time update handler
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate)

      // For demo purposes, we're setting a mock duration
      // In a real streaming scenario, this would be handled differently
      setTimeout(() => {
        setDuration('06:21')
      }, 1000)

      // Update listeners count randomly to simulate real-time changes
      const listenersInterval = setInterval(() => {
        setListeners(Math.floor(Math.random() * 50) + 100)
      }, 10000)

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
        }
        clearInterval(listenersInterval)
      }
    }
  }, [])

  // Handle time updates for the player
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const minutes = Math.floor(audioRef.current.currentTime / 60)
      const seconds = Math.floor(audioRef.current.currentTime % 60)
      setCurrentTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

      drawVisualizer()
    }
  }

  // Toggle play/pause
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
          .catch(error => {
            console.error('Error playing audio:', error)
          })
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Draw a simple visualizer on the canvas
  const drawVisualizer = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set line style
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1

    // Draw a simple waveform (this is just for visual effect)
    ctx.beginPath()

    const width = canvas.width
    const height = canvas.height

    for (let i = 0; i < width; i++) {
      // Generate a simple wave pattern
      const amplitude = isPlaying ? Math.random() * 5 + 2 : 0
      const y = (height / 2) + Math.sin(i * 0.1) * amplitude

      if (i === 0) {
        ctx.moveTo(i, y)
      } else {
        ctx.lineTo(i, y)
      }
    }

    ctx.stroke()
  }

  // Handle like button click
  const handleLike = () => {
    setLikes(likes + 1)
  }

  return (
    <div className="win98">
      <div className="window" style={{ position: 'relative', width: '450px' }}>
        <div className="title-bar">
          <div className="title-bar-text">Nightwave Plaza</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
          </div>
        </div>
        <div className="window-body">
          <menu role="menubar" className="mb-4">
            <li role="menuitem"><u>A</u>bout</li>
            <li role="menuitem"><u>P</u>lay History</li>
            <li role="menuitem"><u>R</u>atings</li>
            <li role="menuitem"><u>S</u>upport Us</li>
          </menu>
          <div className="p-2">
            <div className="mb-2" style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {currentTrack.artist}
            </div>
            <div className="mb-3">
              {currentTrack.title}
            </div>
            <div className="field-row" style={{ position: 'relative' }}>
              <canvas
                ref={canvasRef}
                width="200"
                height="30"
                style={{ border: '2px inset #c0c0c0', width: '100%', marginBottom: '5px' }}
              ></canvas>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#000',
                fontSize: '12px',
                fontFamily: 'monospace',
                background: 'rgba(255, 255, 255, 0.7)',
                padding: '0 8px'
              }}>
                {currentTime} / {duration}
              </div>
            </div>
            <div className="field-row mt-3" style={{ justifyContent: 'space-between' }}>
              <button onClick={togglePlay} style={{ width: '100px' }}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button onClick={handleLike} style={{ width: '70px' }}>
                ❤ {likes}
              </button>
              <button style={{ width: '50px' }}>👤</button>
              <button style={{ width: '50px' }}>⚙️</button>
            </div>
          </div>
        </div>
        <div className="status-bar">
          <p className="status-bar-field">Listeners: {listeners}</p>
        </div>
      </div>
    </div>
  )
}
