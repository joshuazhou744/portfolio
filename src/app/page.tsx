'use client'

import { useState, useEffect } from 'react'
import MediaPlayer from '@/components/media-player'
import { InfoPanel } from '@/components/info-panel'
import { StatusBar } from '@/components/status-bar'
import { Loader } from '@/components/loader'
import { AboutMe } from '@/components/about-me'
import { Contact } from '@/components/contact'
import { ProjectList } from '@/components/project-list'
import { Resume } from '@/components/resume'
import '98.css/dist/98.css'

export default function Home() {
  const [showMediaPlayer, setShowMediaPlayer] = useState(false)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [showAboutMe, setShowAboutMe] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showProjectList, setShowProjectList] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleMediaPlayerClick = () => {
    setShowMediaPlayer(true)
  }

  const handleInfoClick = () => {
    setShowInfoPanel(true)
  }

  const handleAboutMeClick = () => {
    setShowAboutMe(true)
  }

  const handleContactClick = () => {
    setShowContact(true)
  }

  const handleProjectListClick = () => {
    setShowProjectList(true)
  }

  const handleResumeClick = () => {
    setShowResume(true)
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
          <MediaPlayer 
            initiallyVisible={showMediaPlayer} 
            onMinimize={() => setShowMediaPlayer(false)}
            onAboutMeClick={handleAboutMeClick}
            onContactClick={handleContactClick}
            onProjectListClick={handleProjectListClick}
            onResumeClick={handleResumeClick}
          />
          <InfoPanel 
            isVisible={showInfoPanel}
            onVisibilityChange={setShowInfoPanel}
          />
          <AboutMe
            isVisible={showAboutMe}
            onVisibilityChange={setShowAboutMe}
          />
          <Contact
            isVisible={showContact}
            onVisibilityChange={setShowContact}
          />
          <ProjectList
            isVisible={showProjectList}
            onVisibilityChange={setShowProjectList}
          />
          <Resume
            isVisible={showResume}
            onVisibilityChange={setShowResume}
          />
          <StatusBar 
            onMediaPlayerClick={() => setShowMediaPlayer(!showMediaPlayer)}
            onInfoClick={handleInfoClick}
            onAboutMeClick={handleAboutMeClick}
            onContactClick={handleContactClick}
            onProjectListClick={handleProjectListClick}
            onResumeClick={handleResumeClick}
            showMediaPlayer={showMediaPlayer}
            showInfoPanel={showInfoPanel}
            showAboutMe={showAboutMe}
            showContact={showContact}
            showProjectList={showProjectList}
            showResume={showResume}
            onMinimizeMediaPlayer={() => setShowMediaPlayer(false)}
            onMinimizeInfoPanel={() => setShowInfoPanel(false)}
            onMinimizeAboutMe={() => setShowAboutMe(false)}
            onMinimizeContact={() => setShowContact(false)}
            onMinimizeProjectList={() => setShowProjectList(false)}
            onMinimizeResume={() => setShowResume(false)}
          />
        </>
      )}
    </main>
  )
}
