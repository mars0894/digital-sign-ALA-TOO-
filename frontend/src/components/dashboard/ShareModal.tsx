import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';

interface Collaborator {
  id: string;
  email: string;
  fullName: string;
  permissionLevel: 'VIEWER' | 'EDITOR' | 'ADMIN';
  addedAt: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('VIEWER');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen && documentId) loadCollaborators();
  }, [isOpen, documentId]);

  async function loadCollaborators() {
    setLoading(true);
    try {
      const res = await authFetch(`/documents/${documentId}/collaborators`);
      if (res.ok) setCollaborators(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setMessage('');
    try {
      const res = await authFetch(`/documents/${documentId}/collaborators`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), permissionLevel: permission }),
      });
      if (res.ok) {
        setEmail('');
        setMessage('Collaborator added!');
        loadCollaborators();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage(errorData.message || 'Failed to share. Please check the email.');
      }
    } catch (err: any) {
      setMessage(err.message || 'Failed to share.');
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-main)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', border: '1px solid var(--color-border)' }}>
        <h2 style={{marginTop: 0}}>Share "{documentTitle}"</h2>
        
        <form onSubmit={handleShare} style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <input 
            type="email" 
            placeholder="Colleague's email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-main)' }}
          />
          <select 
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-main)' }}
          >
            <option value="VIEWER" style={{color: '#000'}}>Viewer</option>
            <option value="EDITOR" style={{color: '#000'}}>Editor</option>
            <option value="ADMIN" style={{color: '#000'}}>Admin</option>
          </select>
          <button type="submit" disabled={sending} className="btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '6px' }}>
            {sending ? 'Sharing...' : 'Share'}
          </button>
        </form>

        {message && <div style={{color: 'var(--color-accent)', marginBottom: '1rem'}}>{message}</div>}

        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Collaborators</h3>
        {loading ? <div>Loading...</div> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {collaborators.length === 0 && <li style={{ color: 'var(--color-text-muted)' }}>No active internal collaborators yet.</li>}
            {collaborators.map(c => (
              <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div><strong>{c.fullName}</strong> ({c.email})</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Added {c.addedAt}</div>
                </div>
                <div>
                  <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(59,130,246,0.1)', color: 'var(--color-accent)', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {c.permissionLevel}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', borderRadius: '6px', cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
