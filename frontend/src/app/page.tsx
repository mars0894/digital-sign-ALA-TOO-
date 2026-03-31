"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'var(--color-background)',
    }}>
      {/* Dynamic Background */}
      <div className="bg-glow blob-1" />
      <div className="bg-glow blob-2" />
      <div className="bg-glow blob-3" />

      {/* Main Glass Container */}
      <div className="glass-panel" style={{
        textAlign: 'center',
        padding: '5rem 4rem',
        maxWidth: '900px',
        width: '100%',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Status Badge */}
        <div className="status-badge hover-lift">
          <span className="dot pulse" />
          Ala-Too International University System Active
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          lineHeight: '1.1',
          marginBottom: '1.5rem',
          fontWeight: '800',
        }}>
          Next-Generation <br />
          <span className="text-gradient hover-glow">Digital Signatures</span>
        </h1>

        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '1.25rem',
          marginBottom: '3.5rem',
          maxWidth: '600px',
          margin: '0 auto 3.5rem',
          lineHeight: '1.7',
          fontWeight: '400',
        }}>
          Legally binding documents, automated workflows, and internal academic
          processes — signed, verified, and audited instantly.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '5rem'
        }}>
          <Link href="/dashboard" className="btn-primary hover-lift" style={{
            padding: '1rem 2.5rem',
            fontSize: '1rem',
            borderRadius: '16px'
          }}>
            Open Dashboard
          </Link>
          <Link href="/documents" className="btn-secondary hover-lift" style={{
            padding: '1rem 2.5rem',
            fontSize: '1rem',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)'
          }}>
            Verify Document
          </Link>
        </div>

        {/* Footer Stats Structure */}
        <div style={{
          borderTop: '1px solid var(--glass-border)',
          paddingTop: '3rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '2rem',
        }}>
          {[
            { value: 'PAdES', label: '100% Compliant' },
            { value: 'SSO', label: 'Seamless Access' },
            { value: 'Audit', label: 'Immutable Logs' },
            { value: 'Instant', label: 'Verification' },
          ].map((stat, idx) => (
            <div key={idx} className="stat-card hover-lift">
              <span style={{
                display: 'block',
                fontSize: '1.8rem',
                fontWeight: '800',
                color: 'var(--color-text-main)',
                fontFamily: 'var(--font-display)',
                marginBottom: '0.25rem'
              }}>
                {stat.value}
              </span>
              <span style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .bg-glow {
          position: absolute;
          filter: blur(100px);
          opacity: 0.6;
          z-index: 0;
          border-radius: 50%;
        }
        .blob-1 {
          top: -20%;
          left: -10%;
          width: 50vw;
          height: 50vw;
          background: var(--color-accent);
          animation: float 15s ease-in-out infinite alternate;
        }
        .blob-2 {
          bottom: -10%;
          right: -10%;
          width: 40vw;
          height: 40vw;
          background: #8b5cf6;
          animation: float 20s ease-in-out infinite alternate-reverse;
        }
        .blob-3 {
          top: 30%;
          left: 50%;
          width: 30vw;
          height: 30vw;
          background: #10b981;
          opacity: 0.3;
          animation: float 12s ease-in-out infinite alternate;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1.25rem;
          border-radius: 999px;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-main);
          margin-bottom: 2rem;
          letter-spacing: 0.05em;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-accent);
        }

        .pulse {
          animation: pulse 2s infinite;
        }

        .hover-lift {
          transition: transform var(--transition-normal), box-shadow var(--transition-normal);
        }
        
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        .hover-glow:hover {
          text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          transition: text-shadow 0.3s ease;
        }

        .stat-card {
          padding: 1.5rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid transparent;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--glass-border);
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(5%, 5%) scale(1.1); }
          100% { transform: translate(-5%, -5%) scale(0.9); }
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
    </div>
  );
}
