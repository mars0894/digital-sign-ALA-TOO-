'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';

function OAuth2RedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (token) {
            // Fetch user profile based on token. Since JWT logic uses standard JWT we can fetch current user info
            const fetchUserProfile = async () => {
                try {
                    // Usually we have an endpoint like /api/v1/auth/me, but if we don't, 
                    // we could decode the JWT token payload locally to get basic info.
                    // For the sake of standard integration:
                    const res = await fetch(`${API_URL}/users/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (res.ok) {
                       const data = await res.json();
                       saveAuth(token, {
                           id: data.id,
                           email: data.email,
                           firstName: data.firstName,
                           lastName: data.lastName,
                           roles: data.roles
                       });
                       router.push('/dashboard');
                    } else {
                       // Fallback basic parse
                       const base64Url = token.split('.')[1];
                       const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                       const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                           return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                       }).join(''));
                       const decoded = JSON.parse(jsonPayload);
                       
                       saveAuth(token, {
                           id: decoded.jti || 'oauth-id',
                           email: decoded.sub,
                           firstName: 'OAuth',
                           lastName: 'User',
                           roles: []
                       });
                       router.push('/dashboard');
                    }
                } catch (e) {
                    console.error('Error fetching user profile', e);
                    router.push('/login?error=OAuthFailed');
                }
            };

            fetchUserProfile();
        } else if (error) {
            router.push('/login?error=' + error);
        } else {
            router.push('/login');
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
