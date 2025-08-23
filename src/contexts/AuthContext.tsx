import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/ApiService';

interface User {
    id: string;
    username: string;
    email: string;
    profile: {
        firstName?: string;
        lastName?: string;
        avatar?: string;
        bio?: string;
        institution?: string;
        role: 'student' | 'teacher' | 'admin';
    };
    preferences: {
        theme: 'light' | 'dark' | 'blue' | 'amoled';
        language: string;
        notifications: {
            email: boolean;
            push: boolean;
        };
    };
    subscription: {
        plan: 'free' | 'premium' | 'pro';
        expiresAt?: Date;
        isActive: boolean;
    };
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

interface AuthContextType {
    state: AuthState;
    login: (email: string, password: string) => Promise<void>;
    register: (userData: RegisterData) => Promise<void>;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    clearError: () => void;
}

interface RegisterData {
    username: string;
    email: string;
    password: string;
    profile?: {
        firstName?: string;
        lastName?: string;
        role?: 'student' | 'teacher';
    };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null
    });

    // Check for existing authentication on mount
    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            const token = apiService.getAuthToken();
            
            if (!token) {
                setState(prev => ({ ...prev, isLoading: false }));
                return;
            }

            // Verify token and get user data
            const response = await apiService.verifyToken();
            
            if (response.valid && response.user) {
                setState({
                    user: response.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
                
                // Optionally sync local data to server for first-time users
                try {
                    await apiService.syncLocalDataToServer(response.user.id);
                    console.log('Local data synced to server successfully');
                } catch (syncError) {
                    console.warn('Failed to sync local data:', syncError);
                }
            } else {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Failed to initialize authentication'
            });
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));
            
            const response = await apiService.login(email, password);
            
            if (response.user) {
                setState({
                    user: response.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
                
                // Sync local data to server after successful login
                try {
                    await apiService.syncLocalDataToServer(response.user.id);
                } catch (syncError) {
                    console.warn('Failed to sync local data after login:', syncError);
                }
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Login failed'
            }));
            throw error;
        }
    };

    const register = async (userData: RegisterData) => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));
            
            const response = await apiService.register(userData);
            
            if (response.user) {
                setState({
                    user: response.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                });
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Registration failed'
            }));
            throw error;
        }
    };

    const logout = () => {
        apiService.logout();
        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
        });
    };

    const updateUser = (userData: Partial<User>) => {
        setState(prev => ({
            ...prev,
            user: prev.user ? { ...prev.user, ...userData } : null
        }));
    };

    const clearError = () => {
        setState(prev => ({ ...prev, error: null }));
    };

    const contextValue: AuthContextType = {
        state,
        login,
        register,
        logout,
        updateUser,
        clearError
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;