import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

export const Welcome = () => {
    const navigate = useNavigate();
    const { signInWithGoogle, isAuthenticating, user } = useAuth();
    const { startGuestExperience } = useApp();

    const handleGuestStart = () => {
        startGuestExperience();
        navigate('/dashboard');
    };

    return (
        <div className="layout-container flex h-screen grow flex-col bg-background-light dark:bg-background-dark">
            <main className="flex flex-1 justify-center items-center py-5">
                <div className="layout-content-container flex flex-col w-full max-w-md flex-1 p-4 md:p-0">
                    <div className="flex justify-center items-center w-full grow bg-white dark:bg-slate-800/50 p-4 aspect-[2/3] max-h-[24rem] rounded-xl mb-8 shadow-sm border border-gray-100 dark:border-white/5">
                        <div className="w-full h-full bg-center bg-no-repeat bg-contain" 
                             style={{ 
                                backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDkjKp28VzLtXAhSOzXx9hhtplrxgRzPk7Y03Mfh_ZlO18xewIWvgsvgY2gAldk8LtVOkp5k-Az33115WvgjN8MmkHpPfY5RlgYIs_oZTAOXPEeIF89Pg7WqciSzDhcBUeXOUmoxrQfqoVv_7RAe24JZran1sD28a9wCZD07eMAeMdDEGjU5pmlGcsdtxnD10L4cHoTvLBdV8XzoyWa1E8RvkLDI6_7CZiInb9uGa0TOH-ZVOlrhPHn0FK3yuiKXdY9hT87S5YYaX4")`,
                                maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                             }}></div>
                    </div>
                    <div className="px-4 text-center">
                        <h1 className="text-slate-900 dark:text-white tracking-light text-[32px] font-bold leading-tight pb-3 pt-6">Welcome to NIVEST</h1>
                        <p className="text-slate-700 dark:text-white/80 text-base font-normal leading-normal pb-3 pt-1">Your voice-based financial coach for managing money.</p>
                    </div>
                    <div className="flex px-4 py-3 justify-center mt-4">
                        <button
                            onClick={handleGuestStart}
                            className="flex w-full min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-primary hover:bg-blue-600 transition-all text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/30"
                        >
                            <span className="truncate">Start with voice / WhatsApp / Call</span>
                        </button>
                    </div>
                    <div className="flex px-4 py-2 justify-center">
                        <button
                            onClick={() => void signInWithGoogle()}
                            disabled={isAuthenticating}
                            className="flex w-full min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full h-14 px-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-semibold leading-normal tracking-[0.015em] shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-xl">account_circle</span>
                            <span className="truncate">
                                {isAuthenticating ? 'Connecting to Google...' : 'Continue with Google'}
                            </span>
                        </button>
                    </div>
                    <p className="text-primary/80 dark:text-primary/70 text-sm font-normal leading-normal pb-3 pt-1 px-4 text-center underline cursor-pointer hover:text-primary" onClick={() => void signInWithGoogle()}>
                        {user ? `Signed in as ${user.email}` : 'Already have an account? Log in'}
                    </p>
                </div>
            </main>
        </div>
    );
};