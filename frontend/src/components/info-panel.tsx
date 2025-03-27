'use client'

import { BaseWindow } from './base-window'

interface InfoPanelProps {
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

export function InfoPanel({ isVisible, onVisibilityChange }: InfoPanelProps) {
  return (
    <div className="win98">
      <BaseWindow
        isVisible={isVisible}
        onVisibilityChange={onVisibilityChange}
        title="Enjoy your stay"
        width="30vw"
        height="150px"
        windowId="info-panel"
        initialPosition={{
          x: Math.random() * (window.innerWidth - 300),
          y: Math.random() * (window.innerHeight - 200)
        }}
      >
        <div className="main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '16px', marginTop: '30px' }}>
          <h4 style={{fontSize: '1.4em'}}>Welcome to Joshua Zhou's portfolio</h4>
          <p>This was originally my study app</p>
        </div>
      </BaseWindow>
    </div>
  );
}
