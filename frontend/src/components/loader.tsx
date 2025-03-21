'use client'

import { useEffect, useState } from 'react'
import '98.css/dist/98.css'
import "../styles/loader.css"

interface LoaderProps {
  onComplete: () => void;
}

export function Loader({ onComplete }: LoaderProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const duration = 1000
    const interval = 50
    const steps = duration / interval
    const increment = 100 / steps

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + increment, 100)
        if (newProgress >= 100) {
          clearInterval(timer)
          return 100
        }
        return newProgress
      })
    }, interval)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      onComplete()
    }
  }, [progress, onComplete])

  return (
    <div className="loader-container">
      <div className="title-bar">
        <div className="title-bar-text">Loading...</div>
      </div>
      <div className="window-body" style={{ padding: '10px' }}>
        <div className="loader-bar">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="loader-block"
              style={{
                left: `${(progress + (index * 9))}px`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
} 