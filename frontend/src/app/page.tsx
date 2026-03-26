import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      
      {/* Decorative background blob */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60vw',
        height: '60vw',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%',
        zIndex: -1,
      }}></div>

      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 3rem', maxWidth: '800px', width: '100%' }}>
        <h1 style={{ fontSize: '3.5rem', lineHeight: '1.2', marginBottom: '1.5rem' }}>
          Secure & Official <br/>
          <span className="text-gradient">Digital Signatures</span>
        </h1>
        
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
          Platform for legally binding documents and internal academic processes at Ala-Too International University.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ minWidth: '160px' }}>
            SSO Login
          </button>
          <button className="btn-secondary" style={{ minWidth: '160px' }}>
            Verify Document
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: '5rem', display: 'flex', gap: '4rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)' }}>100%</span>
          PAdES Compliant
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)' }}>SSO</span>
          Seamless Integration
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)' }}>Immutable</span>
          Audit Trails
        </div>
      </div>

    </div>
  );
}
