import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../services/supabaseService';

export const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Finishing sign-in with Google...');

    useEffect(() => {
        const client = getSupabaseClient();
        if (!client) {
            setStatus('Supabase is not configured.');
            return;
        }

        const exchangeParams = window.location.search || (window.location.hash ? `?${window.location.hash.slice(1)}` : '');
        if (!exchangeParams) {
            setStatus('Missing authentication details in the callback URL.');
            setTimeout(() => navigate('/', { replace: true }), 1200);
            return;
        }

        const handleRedirect = async () => {
            try {
                const { error } = await client.auth.exchangeCodeForSession(exchangeParams);
                if (error) {
                    console.error('Failed to exchange OAuth code for session.', error);
                    setStatus('Unable to complete sign-in. Please try again.');
                    return;
                }

                setStatus('Signed in! Redirecting to your dashboard...');
                setTimeout(() => navigate('/dashboard', { replace: true }), 800);
            } catch (error) {
                console.error('Unexpected error during OAuth callback handling.', error);
                setStatus('Something went wrong while finishing sign-in.');
            }
        };

        void handleRedirect();
    }, [navigate]);

    return (
        <div className="layout-container flex h-screen grow flex-col bg-background-light dark:bg-background-dark">
            <main className="flex flex-1 justify-center items-center py-5">
                <div className="layout-content-container flex flex-col w-full max-w-md flex-1 p-6 md:p-0 text-center bg-white dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{status}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">You will be redirected shortly.</p>
                </div>
            </main>
        </div>
    );
};
