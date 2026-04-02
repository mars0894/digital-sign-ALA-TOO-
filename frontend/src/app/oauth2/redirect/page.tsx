'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';

function OAuth2RedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const error = searchParams.get('error');

        const fetchUserProfile = async () => {
            try {
                // The cookies are now automatically sent with this request
                const res = await fetch(`${API_URL}/users/me`, {
                    credentials: 'include'
                });
                
                if (res.ok) {
                   const data = await res.json();
                   // saveAuth now only saves the user object to localStorage,
                   // the token is already in the HttpOnly cookie.
                   saveAuth('', {
                       id: data.id,
                       email: data.email,
                       firstName: data.firstName,
                       lastName: data.lastName,
                       roles: data.roles
                   });
                   router.push('/dashboard');
                } else {
                   router.push('/login?error=SessionExpired');
                }
            } catch (e) {
                console.error('Error fetching user profile', e);
                router.push('/login?error=OAuthFailed');
            }
        };

        if (error) {
            router.push('/login?error=' + error);
        } else {
            fetchUserProfile();
        }
    }, [router, searchParams]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--color-accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
                <h2>Authenticating with SSO...</h2>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Please wait while we verify your credentials.</p>
                <style jsx>{`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        </div>
    );
}

export default function OAuth2RedirectPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OAuth2RedirectHandler />
        </Suspense>
    );
}
