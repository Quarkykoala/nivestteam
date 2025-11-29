import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../services/supabaseService';

type AuthContextValue = {
    user: User | null;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    isAuthenticating: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        const client = getSupabaseClient();
        if (!client) return;

        void client.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null);
        });

        const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        const client = getSupabaseClient();
        if (!client) {
            console.warn('Supabase credentials missing; cannot start Google sign-in.');
            return;
        }

        const siteUrl =
            import.meta.env.VITE_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
        const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/callback`;

        setIsAuthenticating(true);
        try {
            const { error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // Supabase will send the user back here after Google completes the flow.
                    redirectTo,
                },
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Failed to start Google sign-in flow.', error);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const signOut = async () => {
        const client = getSupabaseClient();
        if (!client) return;

        await client.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, signInWithGoogle, signOut, isAuthenticating }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
