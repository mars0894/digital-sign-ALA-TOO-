'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/auth';

interface SignModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  onSuccess: () => void;
}

export default function SignModal({ isOpen, onClose, documentId, documentTitle, onSuccess }: SignModalProps) {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [signatureName, setSignatureName] = useState('');

  if (!isOpen) return null;

  async function handleSign() {
    if (!signatureName.trim()) {
      setError('Please enter your full name as signature.');
      return;
    }

    setSigning(true);
    setError('');

    try {
      const res = await authFetch('/signatures', {
        method: 'POST',
        body: JSON.stringify({
          documentId,
          signatureData: signatureName,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to sign document.');
      }
    } catch {
      setError('A network error occurred.');
    } finally {
      setSigning(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '450px', padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Sign Document</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          You are about to sign: <strong style={{ color: 'var(--color-text-main)' }}>{documentTitle}</strong>
        </p>

        {error && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)',
            color: '#ef4444', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            TYPE YOUR FULL NAME TO SIGN
          </label>
          <input
            type="text"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="John Doe"
            style={{
              width: '100%', padding: '0.875rem', borderRadius: '10px',
              border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-main)', fontSize: '1rem', outline: 'none',
              fontFamily: 'cursive', // Optional: mimic handwriting
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            disabled={signing}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer',
              fontWeight: '600', transition: 'all 0.2s', opacity: signing ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={signing}
            style={{
              flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
              cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              opacity: signing ? 0.7 : 1
            }}
          >
            {signing ? (
              <div style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
            {signing ? 'Signing...' : 'Confirm Signature'}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
