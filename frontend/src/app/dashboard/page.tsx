'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUser, authFetch } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';

interface Stats {
  total: number;
  pending: number;
  signed: number;
  draft: number;
}

interface Document {
  id: string;
  title: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'REJECTED';
  createdAt: string;
  ownerEmail: string;
  ownerName: string;
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: '#a78bfa', bg: 'rgba(124, 58, 237, 0.15)' },
  PENDING_SIGNATURE: { label: 'Pending', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' },
  SIGNED: { label: 'Signed', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' },
  REJECTED: { label: 'Rejected', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' },
};

function StatCard({ label, value, icon, gradient, glow, cls }: {
  label: string; value: number | string; icon: React.ReactNode; gradient: string; glow: string; cls: string;
}) {
  return (
    <div className={`glass-panel stat-card ${cls}`} style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', '--hover-glow': glow, '--hover-light': gradient } as React.CSSProperties}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: `0 4px 20px ${glow}`
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, fontWeight: '600', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ fontSize: '2.4rem', fontWeight: '800', margin: '-0.2rem 0 0 0', lineHeight: 1.2, fontFamily: 'var(--font-display)', color: 'white' }}>{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = getUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, docsRes] = await Promise.all([
          authFetch('/documents/stats'),
          authFetch('/documents'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (docsRes.ok) setDocs(await docsRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const recentDocs = docs.filter(d => d.status !== 'REJECTED').slice(0, 5);

  return (
    <div className="animate-reveal">
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
          Welcome back, <span className="text-gradient hover:scale-105 inline-block transition-transform">{user?.firstName}</span> 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', margin: 0, fontWeight: '500' }}>
          Here is your panoramic overview for today.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
        <StatCard
          cls="stagger-1"
          label={t('docs.total_count')}
          value={loading ? '—' : (stats?.total ?? 0)}
          gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
          glow="rgba(59,130,246,0.4)"
          icon={<svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          cls="stagger-2"
          label={t('status.pending')}
          value={loading ? '—' : (stats?.pending ?? 0)}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          glow="rgba(245,158,11,0.4)"
          icon={<svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          cls="stagger-3"
          label={t('status.signed')}
          value={loading ? '—' : (stats?.signed ?? 0)}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          glow="rgba(16,185,129,0.4)"
          icon={<svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          cls="stagger-4"
          label={t('status.draft')}
          value={loading ? '—' : (stats?.draft ?? 0)}
          gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
          glow="rgba(139,92,246,0.4)"
          icon={<svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
      </div>

      {/* Recent documents */}
      <div className="glass-panel animate-reveal stagger-4" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>Recent Documents</h2>
          <Link href="/dashboard/documents" style={{
            fontSize: '0.9rem', color: 'var(--color-accent)', fontWeight: '600', textDecoration: 'none', padding: '0.4rem 1rem', background: 'rgba(59,130,246,0.1)', borderRadius: '99px', transition: 'all 0.2s',
          }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            View all &rarr;
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', color: 'var(--color-text-muted)', gap: '1rem' }}>
            <div className="loader-glow" />
            <span style={{ fontWeight: 500, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Synchronizing Vault...</span>
          </div>
        ) : recentDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 0 30px rgba(59,130,246,0.1)' }}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem', color: 'white' }}>Your vault is empty</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '2rem', maxWidth: '300px', margin: '0 auto 2rem auto' }}>
              Upload your first PDF to initiate the secure signing process.
            </p>
            <Link href="/dashboard/upload" className="btn-primary" style={{ textDecoration: 'none', padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              Upload Document
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentDocs.map((doc, i) => {
              const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.DRAFT;
              return (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents`}
                  className={`doc-row stagger-${(i%4)+1}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.2rem 1.5rem', textDecoration: 'none', color: 'var(--color-text-main)', 
                    animation: 'revealUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: 0, flex: 1 }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)', position: 'relative' }}>
                      <div style={{ position:'absolute', top:0, right:0, borderBottomLeftRadius: '10px', background: 'rgba(255,255,255,0.25)', width:'14px', height:'14px' }} />
                      <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>PDF</span>
                    </div>

                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <p style={{ fontWeight: '600', margin: 0, fontSize: '0.95rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: '500' }}>
                        <span>{new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-text-muted)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), #60a5fa)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold' }}>
                            {(doc.ownerName || 'U')[0].toUpperCase()}
                          </div>
                          <span>{doc.ownerName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                    <span style={{
                      padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`
                    }}>
                      {cfg.label}
                    </span>
                    <button style={{ color: 'var(--color-text-muted)', background: 'transparent', padding: '0.4rem', borderRadius: '50%', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
