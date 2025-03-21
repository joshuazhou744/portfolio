'use client'

import { BaseWindow } from './base-window'
import { useState } from 'react'

interface ContactProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

export function Contact({ isVisible, onVisibilityChange }: ContactProps) {
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: string }>({});

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus({ [field]: 'Copied!' });
      setTimeout(() => {
        setCopyStatus({ [field]: '' });
      }, 2000);
    } catch (err) {
      setCopyStatus({ [field]: 'Failed to copy' });
    }
  };

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
        <div className="field-row-stacked" style={{ marginBottom: '10px' }}>
          <label htmlFor="email">Email:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p>joshua.c.zhou@gmail.com</p>
            <button
              className="win98-button"
              onClick={() => handleCopy('joshua.c.zhou@gmail.com', 'email')}
              style={{ whiteSpace: 'nowrap', minWidth: '60px', marginBottom: '8px' }}
            >
              {copyStatus['email'] || 'Copy'}
            </button>
          </div>
        </div>
        <div className="field-row-stacked" style={{ marginBottom: '10px' }}>
          <label htmlFor="phone-number">Phone Number:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p>587-926-9574</p>
            <button
              className="win98-button"
              onClick={() => handleCopy('587-926-9574', 'phone')}
              style={{ whiteSpace: 'nowrap', minWidth: '60px', marginBottom: '8px' }}
            >
              {copyStatus['phone'] || 'Copy'}
            </button>
          </div>
        </div>
        <div className="field-row-stacked" style={{ marginBottom: '10px' }}>
          <label htmlFor="linkedin">LinkedIn:</label>
          <a 
            href="https://www.linkedin.com/in/joshuazhou1" 
            id="linkedin" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#0000EE',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            linkedin.com/in/joshuazhou1
          </a>
        </div>
        <div className="field-row-stacked">
          <label htmlFor="github">Github:</label>
          <a 
            href="https://github.com/joshuazhou744" 
            id="github" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#0000EE',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            github.com/joshuazhou744
          </a>
        </div>
      </div>
    </BaseWindow>
  );
} 