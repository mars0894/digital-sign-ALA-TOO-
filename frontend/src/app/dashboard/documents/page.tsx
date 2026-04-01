'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authFetch, getUser } from '@/lib/auth';
import SignModal from '@/components/dashboard/SignModal';
import ShareModal from '@/components/dashboard/ShareModal';

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

const ALL_STATUSES = ['ALL', 'DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'REJECTED'] as const;

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'VAULT' | 'SHARED'>('VAULT');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [signModalDoc, setSignModalDoc] = useState<Document | null>(null);
  const [shareModalDoc, setShareModalDoc] = useState<Document | null>(null);

  const currentUser = getUser();

  async function loadDocs() {
    setLoading(true);
    try {
      const endpoint = activeTab === 'VAULT' ? '/documents' : '/documents/shared';
      const res = await authFetch(endpoint);
      if (res.ok) setDocs(await res.json());
    } catch (e) {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDocs(); }, [activeTab]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this document? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`/documents/${id}`, { method: 'DELETE' });
      if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id));
      else setError('Failed to delete document.');
    } catch {
      setError('Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(id: string, title: string) {
    try {
      const res = await authFetch(`/documents/${id}/download-token`, { method: 'POST' });
      if (res.ok) {
        const { token } = await res.json();
        const downloadUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1') + `/documents/download?token=${token}`;
        window.open(downloadUrl, '_blank');
      } else {
        setError('Failed to get download token.');
      }
    } catch (e) {
      setError('Failed to download document.');
    }
  }

  const filtered = docs.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>Documents</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/dashboard/upload" className="btn-primary" style={{ textDecoration: 'none', padding: '0.7rem 1.4rem', borderRadius: '10px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload PDF
        </Link>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <button 
          onClick={() => setActiveTab('VAULT')}
          style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'VAULT' ? '2px solid var(--color-accent)' : '2px solid transparent', color: activeTab === 'VAULT' ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: activeTab === 'VAULT' ? '600' : '400', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          My Vault
        </button>
        <button 
          onClick={() => setActiveTab('SHARED')}
          style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'SHARED' ? '2px solid var(--color-accent)' : '2px solid transparent', color: activeTab === 'SHARED' ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: activeTab === 'SHARED' ? '600' : '400', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Shared Workspace
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1', minWidth: '200px', padding: '0.7rem 1rem', borderRadius: '10px',
            border: '1px solid var(--color-border)', background: 'var(--glass-bg)',
            backdropFilter: 'blur(8px)', color: 'var(--color-text-main)', fontSize: '0.875rem', outline: 'none',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '0.5rem 0.875rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '500',
                border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                borderColor: filterStatus === s ? 'var(--color-accent)' : 'var(--color-border)',
                background: filterStatus === s ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: filterStatus === s ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}
            >
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading documents...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)' }}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {docs.length === 0 ? 'No documents yet. Upload your first PDF!' : 'No documents match your search.'}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 160px 100px', gap: '1rem', padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Title</span>
              <span>Status</span>
              <span>Uploaded</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>
            {filtered.map((doc, i) => {
              const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.DRAFT;
              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 140px 160px 100px', gap: '1rem',
                    padding: '1rem 1.5rem', alignItems: 'center',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent)" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span style={{ fontWeight: '500', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title}
                    </span>
                  </div>
                  <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', color: cfg.color, background: cfg.bg, width: 'fit-content' }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      {doc.status === 'PENDING_SIGNATURE' && (
                        <button
                          title="Sign Document"
                          onClick={() => setSignModalDoc(doc)}
                          style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer', color: '#10b981', transition: 'all 0.15s', display: 'flex' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      )}
                      <button
                        title="Download"
                        onClick={() => handleDownload(doc.id, doc.title)}
                        style={{ padding: '0.4rem', borderRadius: '6px', background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'all 0.15s', display: 'flex' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                      
                      {currentUser?.email === doc.ownerEmail && (
                        <button
                          title="Share"
                          onClick={() => setShareModalDoc(doc)}
                          style={{ padding: '0.4rem', borderRadius: '6px', background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'all 0.15s', display: 'flex' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                      )}

                      {currentUser?.email === doc.ownerEmail && (
                        <button
                          title="Delete"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          style={{ padding: '0.4rem', borderRadius: '6px', background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'all 0.15s', display: 'flex', opacity: deletingId === doc.id ? 0.5 : 1 }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <SignModal
          isOpen={!!signModalDoc}
          onClose={() => setSignModalDoc(null)}
          documentId={signModalDoc?.id || ''}
          documentTitle={signModalDoc?.title || ''}
          onSuccess={() => {
            loadDocs();
            alert('Document signed successfully!');
          }}
        />

        <ShareModal
          isOpen={!!shareModalDoc}
          onClose={() => setShareModalDoc(null)}
          documentId={shareModalDoc?.id || ''}
          documentTitle={shareModalDoc?.title || ''}
        />

        <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
