'use client'

import { BaseWindow } from './base-window'

interface ContactProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function Contact({ isVisible, onVisibilityChange }: ContactProps) {
  return (
    <BaseWindow
      isVisible={isVisible}
      onVisibilityChange={onVisibilityChange}
      title="Contact and Links"
      width="350px"
      windowId="contact"
      initialPosition={{
        x: window.innerWidth - (Math.random() * (500-300) + 300),
        y: Math.random() * (75-50) + 50
      }}
    >
      <div className="content">
        <div className="field-row-stacked">
          <label htmlFor="email">Email:</label>
          <p>joshua.c.zhou@gmail.com</p>
        </div>
        <div className="field-row-stacked">
          <label htmlFor="phone-number">Phone Number:</label>
          <p>587-926-9574</p>
        </div>
        <div className="field-row-stacked">
          <label htmlFor="linkedin">LinkedIn:</label>
          <a href="https://www.linkedin.com/in/joshuazhou1" id="github" target="_blank" rel="noopener noreferrer">linkedin.com/in/joshuazhou1</a>
        </div>
        <div className="field-row-stacked">
          <label htmlFor="github">Github:</label>
          <a href="https://github.com/joshuazhou744" id="github" target="_blank" rel="noopener noreferrer">github.com/joshuazhou744</a>
        </div>
      </div>
    </BaseWindow>
  );
} 