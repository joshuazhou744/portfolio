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

// Internal component to use window context
function AppContent() {
  // Remove showMediaPlayer state since media player is always visible
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [showAboutMe, setShowAboutMe] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showProjectList, setShowProjectList] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { bringToFront } = useWindow()

  // No need for media player effect since it's always visible
  
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

  // Consolidated window display handler
  const showWindow = (windowId: string, setVisibility: (visible: boolean) => void) => {
    setVisibility(true);
    
    // Add a small delay to ensure the window is rendered before bringing to front
    setTimeout(() => {
      bringToFront(windowId);
    }, 50);
  };

  // Remove media player handler
  const handleInfoClick = () => showWindow('info-panel', setShowInfoPanel);
  const handleAboutMeClick = () => showWindow('about-me', setShowAboutMe);
  const handleContactClick = () => showWindow('contact', setShowContact);
  const handleProjectListClick = () => showWindow('project-list', setShowProjectList);
  const handleResumeClick = () => showWindow('resume', setShowResume);

  const handleLoaderComplete = () => {
    setIsLoading(false);
    
    // Set media player to front without needing to set visibility
    bringToFront('media-player');
    
    // Delay showing InfoPanel by 1 second
    setTimeout(() => {
      setShowInfoPanel(true);
      
      // Bring info panel to front after media player
      setTimeout(() => {
        bringToFront('info-panel');
      }, 100);
    }, 1000);
  };

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

// Main app component
export default function Home() {
  return (
    <WindowProvider>
      <AppContent />
    </WindowProvider>
  )
}
