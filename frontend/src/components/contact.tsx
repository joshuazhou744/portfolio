'use client'

import { BaseWindow } from './base-window'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ContactProps {
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
}

interface ContactInfo {
  email: string;
  phone: string;
  linkedin: string;
  github: string;
}

export function Contact({ isVisible, onVisibilityChange }: ContactProps) {
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: string }>({});
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!API_URL) return;
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/contact`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to load contact info');
        }
        return res.json();
      })
      .then((data: ContactInfo) => {
        setContactInfo(data);
      })
      .catch((err) => {
        console.error('Error fetching contact info:', err);
        setError('Unable to load contact info right now.');
      })
      .finally(() => setLoading(false));
  }, []);

  const email = contactInfo?.email || '';
  const phone = contactInfo?.phone || '';
  const linkedin = contactInfo?.linkedin || '';
  const github = contactInfo?.github || '';

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
      {loading && (
        <div className="content">
          <p>Loading contact info...</p>
        </div>
      )}
      {error && !loading && (
        <div className="content">
          <p style={{ color: 'red' }}>{error}</p>
        </div>
      )}
      <div className="content">
        <div className="field-row-stacked" style={{ marginBottom: '10px' }}>
          <label htmlFor="email">Email:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <p>{email}</p>
            <button
              className="win98-button"
              onClick={() => handleCopy(email, 'email')}
              style={{ whiteSpace: 'nowrap', minWidth: '60px', marginBottom: '8px' }}
            >
              {copyStatus['email'] || 'Copy'}
            </button>
          </div>
        </div>
        <div className="field-row-stacked" style={{ marginBottom: '10px' }}>
          <label htmlFor="phone-number">Phone Number:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <p>{phone}</p>
            <button
              className="win98-button"
              onClick={() => handleCopy(phone, 'phone')}
              style={{ whiteSpace: 'nowrap', minWidth: '60px', marginBottom: '8px' }}
            >
              {copyStatus['phone'] || 'Copy'}
            </button>
          </div>
        </div>
        <div className="field-row-stacked" style={{ marginBottom: '10px' }}>
          <label htmlFor="linkedin">LinkedIn:</label>
          <a 
            href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} 
            id="linkedin" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#0000EE',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            {linkedin.replace(/^https?:\/\//, '')}
          </a>
        </div>
        <div className="field-row-stacked">
          <label htmlFor="github">Github:</label>
          <a 
            href={github.startsWith('http') ? github : `https://${github}`} 
            id="github" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#0000EE',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            {github.replace(/^https?:\/\//, '')}
          </a>
        </div>
      </div>
    </BaseWindow>
  );
} 
