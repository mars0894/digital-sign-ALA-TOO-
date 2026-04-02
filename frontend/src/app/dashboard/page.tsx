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
  DRAFT: { label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  PENDING_SIGNATURE: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  SIGNED: { label: 'Signed', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

function StatCard({ label, value, icon, gradient }: {
  label: string; value: number | string; icon: React.ReactNode; gradient: string;
}) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px',
        background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, fontWeight: '500' }}>{label}</p>
        <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0, lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>{value}</p>
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
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>
          Welcome back, {user?.firstName} 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Here's an overview of your document activity.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <StatCard
          label={t('docs.total_count')}
          value={loading ? '—' : (stats?.total ?? 0)}
          gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
          icon={<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          label="Pending Signature"
          value={loading ? '—' : (stats?.pending ?? 0)}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          icon={<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Signed"
          value={loading ? '—' : (stats?.signed ?? 0)}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          icon={<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Drafts"
          value={loading ? '—' : (stats?.draft ?? 0)}
          gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
          icon={<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
      </div>

      {/* Recent documents */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Recent Documents</h2>
          <Link href="/dashboard/documents" style={{
            fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: '500', textDecoration: 'none',
          }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading...
          </div>
        ) : recentDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>No documents yet</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Upload your first PDF to get started.
            </p>
            <Link href="/dashboard/upload" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontSize: '0.875rem' }}>
              Upload Document
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentDocs.map((doc) => {
              const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.DRAFT;
              return (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem 1.25rem', borderRadius: '10px',
                    border: '1px solid var(--color-border)', textDecoration: 'none',
                    color: 'var(--color-text-main)', transition: 'all 0.2s',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent)" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: '500', margin: 0, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title}
                      </p>
                      <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.75rem' }}>
                        {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
                    color: cfg.color, background: cfg.bg, flexShrink: 0, marginLeft: '1rem',
                  }}>
                    {cfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
