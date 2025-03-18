'use client'

import { useState, useEffect } from 'react'
import MediaPlayer from '@/components/media-player'
import { InfoPanel } from '@/components/info-panel'
import { StatusBar } from '@/components/status-bar'
import { Loader } from '@/components/loader'
import '98.css/dist/98.css'

export default function Home() {
  const [showMediaPlayer, setShowMediaPlayer] = useState(false)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleMediaPlayerClick = () => {
    setShowMediaPlayer(true)
  }

  const handleInfoClick = () => {
    setShowInfoPanel(true)
  }

  const handleLoaderComplete = () => {
    setIsLoading(false)
    setShowMediaPlayer(true)
    // Delay showing InfoPanel by 1 second
    setTimeout(() => {
      setShowInfoPanel(true)
    }, 1000)
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 relative"
          style={{
            backgroundColor: 'rgb(0, 128, 128)',
            backgroundImage: 'url("https://web-assets.same.dev/1418452815/388079722.gif")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '100vh',
            overflow: 'hidden'
          }}>
      {isLoading ? (
        <Loader onComplete={handleLoaderComplete} />
      ) : (
        <>
          <MediaPlayer initiallyVisible={showMediaPlayer} />
          <InfoPanel 
            isVisible={showInfoPanel}
            onVisibilityChange={setShowInfoPanel}
          />
          <StatusBar 
            onMediaPlayerClick={handleMediaPlayerClick}
            onInfoClick={handleInfoClick}
            showMediaPlayer={showMediaPlayer}
            showInfoPanel={showInfoPanel}
            onMinimizeMediaPlayer={() => setShowMediaPlayer(false)}
            onMinimizeInfoPanel={() => setShowInfoPanel(false)}
          />
        </>
      )}
    </main>
  )
}
