'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveAuth, verify2fa } from '@/lib/auth';
import { API_URL } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.message === '2FA_REQUIRED') {
        setPreAuthToken(data.preAuthToken);
        setShow2fa(true);
        setLoading(false);
        return;
      }

      saveAuth(data.token, {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: data.roles,
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await verify2fa(email, twoFactorCode, preAuthToken);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid verification code');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative background blobs */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', zIndex: -1 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '35vw', height: '35vw', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', zIndex: -1 }}></div>

      <div className="glass-panel" style={{ maxWidth: '450px', width: '100%', padding: '3rem 2.5rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center', fontWeight: '700' }}>Welcome Back</h2>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '2.5rem' }}>Sign in to continue to Ala-Too Sign</p>

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {show2fa ? (
          <form onSubmit={handleVerify2fa} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>Verification Code</label>
              <input 
                type="text" 
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="form-input"
                placeholder="000000"
                maxLength={6}
                style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-main)', fontSize: '1.25rem', letterSpacing: '0.5rem', textAlign: 'center', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                We've sent a 6-digit code to {email}
              </p>
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '0.875rem', marginTop: '1rem', borderRadius: '12px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button 
              type="button"
              onClick={() => setShow2fa(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="name@alatoo.edu.kg"
                style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-main)', fontSize: '1rem', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>Password</label>
                <Link href="#" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '500', transition: 'color 0.2s' }}>Forgot?</Link>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-main)', fontSize: '1rem', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '0.875rem', marginTop: '1rem', borderRadius: '12px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>Create Account</Link>
        </p>

        <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-main)', width: '100%', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem', fontWeight: '500' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => window.location.href = 'http://localhost:8081/oauth2/authorization/google'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10 5.523 0 10-4.477 10-10C22 6.477 17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 7.5v9M7.5 12h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Continue with Google SSO
          </button>
          
          <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-main)', width: '100%', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem', fontWeight: '500', marginTop: '1rem' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => window.location.href = 'http://localhost:8081/oauth2/authorization/microsoft'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" fill="currentColor"/>
            </svg>
            Continue with Microsoft SSO
          </button>
        </div>
      </div>
    </div>
  );
}
