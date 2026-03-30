"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated background blobs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%',
        transform: 'translateX(-50%)', width: '60vw', height: '60vw',
        background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', zIndex: 0,
        animation: 'pulse 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '10%',
        width: '35vw', height: '35vw',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', zIndex: 0,
        animation: 'pulse 10s ease-in-out infinite 2s',
      }} />

      {/* Hero card */}
      <div className="glass-panel" style={{
        textAlign: 'center', padding: '4rem 3rem',
        maxWidth: '820px', width: '100%', position: 'relative', zIndex: 1,
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 1rem', borderRadius: '999px',
          border: '1px solid rgba(59,130,246,0.3)',
          background: 'rgba(59,130,246,0.08)',
          fontSize: '0.78rem', fontWeight: '600', color: 'var(--color-accent)',
          marginBottom: '1.75rem', letterSpacing: '0.04em',
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-accent)', animation: 'blink 1.5s ease-in-out infinite' }} />
          Ala-Too International University
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', lineHeight: '1.15', marginBottom: '1.25rem' }}>
          Secure &amp; Official <br />
          <span className="text-gradient">Digital Signatures</span>
        </h1>

        <p style={{
          color: 'var(--color-text-muted)', fontSize: '1.15rem',
          marginBottom: '3rem', maxWidth: '560px', margin: '0 auto 3rem',
          lineHeight: '1.7',
        }}>
          Legally binding documents and internal academic processes — signed,
          verified, and audited on one secure platform.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
          <Link href="/login" className="btn-primary" style={{ minWidth: '160px', textDecoration: 'none', borderRadius: '12px', padding: '0.875rem 2rem', fontSize: '0.95rem' }}>
            Sign In
          </Link>
          <Link href="/register" className="btn-secondary" style={{ minWidth: '160px', textDecoration: 'none', borderRadius: '12px', padding: '0.875rem 2rem', fontSize: '0.95rem' }}>
            Create Account
          </Link>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2.5rem' }} />

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', flexWrap: 'wrap', color: 'var(--color-text-muted)' }}>
          {[
            { value: '100%', label: 'PAdES Compliant' },
            { value: 'SSO', label: 'Seamless Integration' },
            { value: 'Immutable', label: 'Audit Trails' },
            { value: '50MB', label: 'Max Document Size' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: '700', color: 'var(--color-text-main)', fontFamily: 'var(--font-display)' }}>
                {s.value}
              </span>
              <span style={{ fontSize: '0.82rem' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
          50% { transform: translateX(-50%) scale(1.08); opacity: 0.8; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
