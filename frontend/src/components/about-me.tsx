'use client'

import { BaseWindow } from './base-window'

interface AboutMeProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function AboutMe({ isVisible, onVisibilityChange }: AboutMeProps) {
  return (
    <BaseWindow
      isVisible={isVisible}
      onVisibilityChange={onVisibilityChange}
      title="About Me"
      width="500px"
      windowId="about-me"
      initialPosition={{
        x: Math.random() * (200-100) + 100,
        y: Math.random() * (75-50) + 50
      }}
    >
      <div className="content">
        <h4>Hello, I'm Joshua Zhou</h4>
        <br/>
        <ul>
          <li>I am a Software Engineering (Co-op) student at McGill University.</li>
          <li>I have worked at IBM as a Data Scientist Intern.</li>
          <li>My favorite artists are Gorillaz, Malcolm Todd, and Sonder.</li>
        </ul>
      </div>
    </BaseWindow>
  );
} 