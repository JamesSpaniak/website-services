'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, getUser as apiGetUser } from '@/app/lib/api_client';
import { UserDto } from '@/app/lib/data/profile';

interface AuthContextType {
    user: UserDto | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserDto | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = sessionStorage.getItem('token');
        const storedUsername = sessionStorage.getItem('username');
        if (storedToken && storedUsername) {
            setToken(storedToken);
            apiGetUser(storedUsername, storedToken).then(userData => {
                if (!(userData instanceof Error)) {
                    setUser(userData as UserDto);
                } else {
                    // Token might be invalid, clear session
                    logout();
                }
            }).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (username: string, password: string) => {
        const accessToken = await apiLogin(username, password);
        sessionStorage.setItem('token', accessToken);
        sessionStorage.setItem('username', username);
        setToken(accessToken);
        
        const userData = await apiGetUser(username, accessToken);
        if (!(userData instanceof Error)) {
            setUser(userData as UserDto);
        } else {
            logout();
            throw userData;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('username');
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
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
