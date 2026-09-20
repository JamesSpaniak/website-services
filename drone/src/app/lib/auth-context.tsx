'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile, login as apiLogin, logout as apiLogout } from './api-client';
import { UserDto } from '@/app/lib/types/profile';
import { identifyUser } from './analytics';

interface AuthContextType {
    user: UserDto | null;
    setUser: React.Dispatch<React.SetStateAction<UserDto | null>>;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkLoggedIn() {
            try {
                const userData = await getProfile();
                setUser(userData);
            } catch {
                console.log('No active session found.');
                setUser(null);
            }
            setIsLoading(false);
        };
        checkLoggedIn();
    }, []);

    // Stitch this browser's pre-login analytics to the account (once per user per browser).
    useEffect(() => {
        if (user?.id != null) identifyUser(user.id);
    }, [user?.id]);

    const login = async (username: string, password: string) => {
        const userData = await apiLogin(username, password);
        setUser(userData);
    };

    const logout = async () => {
        await apiLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, isLoading, login, logout }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
