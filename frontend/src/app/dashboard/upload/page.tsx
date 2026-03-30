'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFile = (f: File) => {
    if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      setFile(null);
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50 MB.');
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [title]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Please provide a title and select a PDF file.');
      return;
    }

    setUploading(true);
    setError('');

    // Simulate smooth progress until the fetch completes
    const interval = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 5 : p));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());

      const res = await authFetch('/documents', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Upload failed. Please try again.');
      }

      setProgress(100);
      setSuccess(true);

      setTimeout(() => router.push('/dashboard/documents'), 1500);
    } catch (err: any) {
      clearInterval(interval);
      setProgress(0);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>Upload Document</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Upload a PDF document for digital signing. Maximum file size: 50 MB.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !file && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-accent)' : file ? 'var(--color-success)' : 'var(--color-border)'}`,
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: file ? 'default' : 'pointer',
          transition: 'all 0.25s',
          background: dragging ? 'rgba(59,130,246,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'var(--glass-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          marginBottom: '1.5rem',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {file ? (
          <div>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p style={{ fontWeight: '600', margin: '0 0 0.25rem', fontSize: '0.95rem' }}>{file.name}</p>
            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 1rem', fontSize: '0.8rem' }}>{formatSize(file.size)}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(''); setProgress(0); }}
              style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Remove file
            </button>
          </div>
        ) : (
          <div>
            <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: dragging ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', transition: 'all 0.2s' }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={dragging ? 'var(--color-accent)' : 'var(--color-text-muted)'} strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p style={{ fontWeight: '600', margin: '0 0 0.375rem', fontSize: '1rem' }}>
              {dragging ? 'Drop your PDF here' : 'Drag & drop or click to browse'}
            </p>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.8rem' }}>
              PDF files only · Up to 50 MB
            </p>
          </div>
        )}
      </div>

      {/* Title input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-muted)' }}>
          Document Title <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Student Enrollment Agreement 2025"
          maxLength={255}
          style={{
            width: '100%', padding: '0.875rem 1rem', borderRadius: '12px',
            border: '1px solid var(--color-border)', background: 'var(--glass-bg)',
            backdropFilter: 'blur(8px)', color: 'var(--color-text-main)',
            fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
        />
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
          {title.length}/255
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', marginBottom: '1.25rem', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', marginBottom: '1.25rem', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          Upload successful! Redirecting to documents...
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--color-accent), #8b5cf6)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleUpload}
        disabled={!file || !title.trim() || uploading || success}
        className="btn-primary"
        style={{
          width: '100%', padding: '0.9rem', borderRadius: '12px', fontSize: '0.95rem',
          opacity: (!file || !title.trim() || uploading || success) ? 0.5 : 1,
          cursor: (!file || !title.trim() || uploading || success) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
        }}
      >
        {uploading ? (
          <>
            <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Uploading...
          </>
        ) : (
          <>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Document
          </>
        )}
      </button>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
