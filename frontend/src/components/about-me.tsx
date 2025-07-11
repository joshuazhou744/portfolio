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
        <p>Hello, I'm Joshua Zhou</p>
        <br/>
        <ul>
          <li>I am a Software Engineering (Co-op) student at McGill University.</li>
          <li>I am currently a Data Scientist Intern @ IBM.</li>
          <li>I like making fun and cool things with code.</li>
          <li>I don't like studying subjects I find boring and uninteresting.</li>
          <li>I like bouldering and basketball and video games.</li>
          <li>I like listening to music; my favorite artists are Gorillaz, Denzel Curry, Sonder and NewJeans.</li>
        </ul>
      </div>
    </BaseWindow>
  );
} 