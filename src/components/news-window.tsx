'use client'

import { useState } from 'react'
import '98.css/dist/98.css'

export function NewsWindow() {
  const [isOpen, setIsOpen] = useState(true)

  // Mock news data
  const news = [
    {
      title: "Welcome to Nightwave Plaza",
      date: "2025-03-12",
      content: "Nightwave Plaza is an advertisement-free 24/7 radio station dedicated to Vaporwave; bringing aesthetics and dream-like music to your device wherever you have Internet connectivity."
    }
  ]

  if (!isOpen) return null

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <div className="win98">
      <div className="window" style={{ position: 'relative', width: '350px' }}>
        <div className="title-bar">
          <div className="title-bar-text">News</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Close" onClick={handleClose}></button>
          </div>
        </div>
        <div className="window-body p-2">
          <div
            className="sunken-panel"
            style={{
              padding: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              marginBottom: '10px',
              background: '#fff'
            }}
          >
            {news.map((item, index) => (
              <div key={index} className="mb-4">
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {item.title} - {new Date(item.date).toLocaleDateString()}
                </div>
                <p>{item.content}</p>
              </div>
            ))}
          </div>
          <div className="field-row" style={{ justifyContent: 'flex-end' }}>
            <button onClick={handleClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
