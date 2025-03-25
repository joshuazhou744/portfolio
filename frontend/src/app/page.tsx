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
import { WindowProvider, useWindow } from '@/contexts/WindowContext'
import '98.css/dist/98.css'

// small screen size alert
function MobileAlert({ onClose }: { onClose: () => void }) {
  return (
    <div className="window" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      width: '90%',
      maxWidth: '300px'
    }}>
      <div className="title-bar">
        <div className="title-bar-text">Notice</div>
      </div>
      <div className="window-body" style={{ textAlign: 'center', padding: '1rem' }}>
        <p>This site is designed for PC/larger screens.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9em', marginBlock: '1rem' }}>For the best experience, please view on a desktop or tablet.</p>
        <button style={{width: 'fit-content', padding: '0 1em'}} onClick={() => {
          document.cookie = "hideMobileAlert=true; max-age=86400"
          onClose()
        }}>
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
  const [isLoading, setIsLoading] = useState(true)
  const [showMobileAlert, setShowMobileAlert] = useState(false)
  const { bringToFront } = useWindow()

  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 768
      const alertHidden = document.cookie.includes('hideMobileAlert=true')
      setShowMobileAlert(isMobile && !alertHidden)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
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
    <main className="flex min-h-screen flex-col items-center p-4 relative"
          style={{
            backgroundColor: 'rgb(0, 128, 128)',
            backgroundImage: 'url("/assets/bg1.gif")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '100vh',
            overflow: 'hidden'
          }}>
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
            onInfoClick={handleInfoClick}
            onAboutMeClick={handleAboutMeClick}
            onContactClick={handleContactClick}
            onProjectListClick={handleProjectListClick}
            onResumeClick={handleResumeClick}
            showInfoPanel={showInfoPanel}
            showAboutMe={showAboutMe}
            showContact={showContact}
            showProjectList={showProjectList}
            showResume={showResume}
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

export default function Home() {
  return (
    <WindowProvider>
      <AppContent />
    </WindowProvider>
  )
}
