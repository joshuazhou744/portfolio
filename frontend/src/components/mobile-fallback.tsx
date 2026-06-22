'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ContactInfo {
  email: string;
  phone: string;
  linkedin: string;
  github: string;
}

interface ResumeMetadata {
  filename: string;
}

export function MobileFallback() {
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [resumeMetadata, setResumeMetadata] = useState<ResumeMetadata | null>(null);

  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/contact`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((data: ContactInfo) => setContactInfo(data))
      .catch((err) => {
        console.error('Error fetching contact info (mobile fallback):', err);
      });
  }, []);

  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/resume`)
      .then((res) => {
        if (!res.ok) throw new Error('Resume not found');
        return res.json();
      })
      .then((data: ResumeMetadata) => setResumeMetadata(data))
      .catch((err) => {
        console.error('Error fetching resume (mobile fallback):', err);
      });
  }, []);

  const handleDownloadResume = () => {
    if (!resumeMetadata) return;
    fetch(`${API_URL}/resume/download`)
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = resumeMetadata.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => console.error('Error downloading resume:', err));
  };

  const email = contactInfo?.email || '';
  const phone = contactInfo?.phone || '';
  const linkedin = contactInfo?.linkedin || '';
  const github = contactInfo?.github || '';

  return (
    <main
      className="mobile-fallback"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '24px 16px',
        gap: '20px',
        background: '#c0c0c0',
        color: '#000',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#f2f2f2',
          border: '2px solid #000',
          boxShadow: '4px 4px 0 #555',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>Desktop Site Recommended</h2>
        <p style={{ margin: 0 }}>
          This portfolio is built with a Windows 98 desktop experience. For the full effect, please
          view on a laptop or desktop. In the meantime, here are the essentials.
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#f2f2f2',
          border: '2px solid #000',
          boxShadow: '4px 4px 0 #555',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>About Me</h3>
        Joshua Zhou <br />
        Software Engineering (Co-op) student at McGill University
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#f2f2f2',
          border: '2px solid #000',
          boxShadow: '4px 4px 0 #555',
          padding: '16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>Resume</h3>
        <button
          onClick={handleDownloadResume}
          disabled={!resumeMetadata}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            background: '#c0c0c0',
            border: '2px solid #000',
            boxShadow: '2px 2px 0 #555',
            cursor: resumeMetadata ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          {resumeMetadata ? 'Download Resume' : 'Resume unavailable'}
        </button>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#f2f2f2',
          border: '2px solid #000',
          boxShadow: '4px 4px 0 #555',
          padding: '16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>Contact & Links</h3>
        <div>
          <strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a>
        </div>
        <div>
          <strong>Phone:</strong> <a href={`tel:${phone.replace(/[^\\d+]/g, '')}`}>{phone}</a>
        </div>
        <div>
          <strong>LinkedIn:</strong>{' '}
          <a
            href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkedin.replace(/^https?:\/\//, '')}
          </a>
        </div>
        <div>
          <strong>GitHub:</strong>{' '}
          <a
            href={github.startsWith('http') ? github : `https://${github}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {github.replace(/^https?:\/\//, '')}
          </a>
        </div>
      </div>
    </main>
  );
}
