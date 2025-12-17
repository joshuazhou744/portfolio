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
import { ExperienceList } from '@/components/experience-list'
import { MobileFallback } from '@/components/mobile-fallback'
import { WindowProvider, useWindow } from '@/contexts/WindowContext'
import '98.css/dist/98.css'
import '../styles/mobile-responsive.css'

// small screen size alert
function MobileAlert({ onClose }: { onClose: () => void }) {
  return (
    <div className="window mobile-alert-window" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      width: '90%',
      maxWidth: '300px',
      minWidth: '250px',
      boxSizing: 'border-box'
    }}>
      <div className="title-bar">
        <div className="title-bar-text">Notice</div>
      </div>
      <div className="window-body" style={{ textAlign: 'center', padding: '1rem', fontSize: '14px' }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>This site is designed for larger screens.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9em', marginBottom: '1rem' }}>For the best experience, please view on a desktop.</p>
        <button 
          style={{
            width: 'fit-content', 
            padding: '0.5em 1em',
            fontSize: '12px',
            minWidth: '120px'
          }} 
          onClick={() => {
            document.cookie = "hideMobileAlert=true; max-age=86400"
            onClose()
          }}
        >
          Don't show again today
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [showAboutMe, setShowAboutMe] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showProjectList, setShowProjectList] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [showExperience, setShowExperience] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showMobileAlert, setShowMobileAlert] = useState(false)
  
  // Client-side state management to avoid hydration errors
  const [isMounted, setIsMounted] = useState(false)
  const [windowDimensions, setWindowDimensions] = useState({ width: 1024, height: 768 })
  
  const { bringToFront } = useWindow()

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

  useEffect(() => {
    if (isMounted) {
      const checkMobile = () => {
        const isMobile = windowDimensions.width <= 768
        const alertHidden = document.cookie.includes('hideMobileAlert=true')
        setShowMobileAlert(isMobile && !alertHidden)
      }

      checkMobile()
    }
  }, [isMounted, windowDimensions.width])

  const isMobile = isMounted && windowDimensions.width <= 768
  
  useEffect(() => {
    if (showInfoPanel) bringToFront('info-panel');
  }, [showInfoPanel, bringToFront]);
  
  useEffect(() => {
    if (showAboutMe) bringToFront('about-me');
  }, [showAboutMe, bringToFront]);
  
  useEffect(() => {
    if (showContact) bringToFront('contact');
  }, [showContact, bringToFront]);
  
  useEffect(() => {
    if (showProjectList) bringToFront('project-list');
  }, [showProjectList, bringToFront]);
  
  useEffect(() => {
    if (showResume) bringToFront('resume');
  }, [showResume, bringToFront]);

  const showWindow = (windowId: string, setVisibility: (visible: boolean) => void) => {
    setVisibility(true);
    setTimeout(() => {
      bringToFront(windowId);
    }, 50);
  };

  const handleInfoClick = () => showWindow('info-panel', setShowInfoPanel);
  const handleAboutMeClick = () => showWindow('about-me', setShowAboutMe);
  const handleContactClick = () => showWindow('contact', setShowContact);
  const handleProjectListClick = () => showWindow('project-list', setShowProjectList);
  const handleResumeClick = () => showWindow('resume', setShowResume);
  const handleExperienceClick = () => showWindow('experience', setShowExperience);

  const handleLoaderComplete = () => {
    setIsLoading(false);
    bringToFront('media-player');
    setTimeout(() => {
      setShowInfoPanel(true);
      setTimeout(() => {
        bringToFront('info-panel');
      }, 100);
    }, 1000);
  };

  return (
    isMobile ? (
      <MobileFallback />
    ) : (
    <main 
      className={`flex min-h-screen flex-col items-center relative main-container ${isMounted && isMobile ? 'mobile-main' : ''}`}
    >
      {showMobileAlert && <MobileAlert onClose={() => setShowMobileAlert(false)} />}
      {isLoading ? (
        <Loader onComplete={handleLoaderComplete} />
      ) : (
        <>
          <MediaPlayer 
            onAboutMeClick={handleAboutMeClick}
            onContactClick={handleContactClick}
            onProjectListClick={handleProjectListClick}
            onResumeClick={handleResumeClick}
            onExperienceClick={handleExperienceClick}
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
          <ExperienceList
            isVisible={showExperience}
            onVisibilityChange={setShowExperience}
          />
          <StatusBar 
            onInfoClick={handleInfoClick}
            onAboutMeClick={handleAboutMeClick}
            onContactClick={handleContactClick}
            onProjectListClick={handleProjectListClick}
            onResumeClick={handleResumeClick}
            onExperienceClick={handleExperienceClick}
            showInfoPanel={showInfoPanel}
            showAboutMe={showAboutMe}
            showContact={showContact}
            showProjectList={showProjectList}
            showResume={showResume}
            showExperience={showExperience}
            onMinimizeInfoPanel={() => setShowInfoPanel(false)}
            onMinimizeAboutMe={() => setShowAboutMe(false)}
            onMinimizeContact={() => setShowContact(false)}
            onMinimizeProjectList={() => setShowProjectList(false)}
            onMinimizeResume={() => setShowResume(false)}
            onMinimizeExperience={() => setShowExperience(false)}
          />
        </>
      )}
    </main>
    )
  )
}

export default function Home() {
  return (
    <WindowProvider>
      <AppContent />
    </WindowProvider>
  )
}
