import { useState, createContext, useContext, useEffect, ReactNode } from 'react';
import { User, AuthContextType, LoginCredentials } from '../types';
import { createAuthService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check for existing session on app load
    useEffect(() => {
        const checkExistingSession = () => {
            console.log('🔍 Checking existing session...');
            try {
                // Use sessionStorage instead of localStorage for tab-specific session
                const storedUser = sessionStorage.getItem('oreilly_user');
                const storedToken = sessionStorage.getItem('oreilly_token');
                const sessionExpiry = sessionStorage.getItem('oreilly_session_expiry');

                console.log('Stored data:', { storedUser, storedToken, sessionExpiry });

                if (storedUser && storedToken && sessionExpiry) {
                    const expiry = new Date(sessionExpiry);
                    console.log('Session expiry check:', expiry, 'vs', new Date());
                    if (expiry > new Date()) {
                        // Session is still valid
                        const userData = JSON.parse(storedUser);
                        console.log('✅ Session valid, setting user:', userData);
                        setUser(userData);
                    } else {
                        // Session expired, clear storage
                        console.log('❌ Session expired, clearing storage');
                        clearSession();
                    }
                } else {
                    console.log('📝 No existing session found');
                }
            } catch (error) {
                console.error('Error checking existing session:', error);
                clearSession();
            } finally {
                console.log('🏁 Setting loading to false');
                setIsLoading(false);
            }
        };

        checkExistingSession();
    }, []);

    const clearSession = () => {
        // Clear from both localStorage and sessionStorage
        sessionStorage.removeItem('oreilly_user');
        sessionStorage.removeItem('oreilly_token');
        sessionStorage.removeItem('oreilly_session_expiry');
        localStorage.removeItem('oreilly_user');
        localStorage.removeItem('oreilly_token');
        localStorage.removeItem('oreilly_session_expiry');
        setUser(null);
    };

    const login = async (credentials: LoginCredentials): Promise<boolean> => {
        console.log('🔐 Starting login process for:', credentials.email);
        setIsLoading(true);
        setError(null);

        try {
            const authService = createAuthService();
            console.log('🔍 Using auth service:', authService.constructor.name);
            const result = await authService.login(credentials);
            console.log('🔄 Login result:', result);

            if (!result.success) {
                console.log('❌ Login failed:', result.error);
                setError(result.error || 'Login failed');
                return false;
            }

            if (!result.user || !result.token) {
                console.log('❌ Invalid response from auth service');
                setError('Invalid response from authentication service');
                return false;
            }

            // Set session expiry (24 hours from now)
            const sessionExpiry = new Date();
            sessionExpiry.setHours(sessionExpiry.getHours() + 24);

            console.log('💾 Storing session data in sessionStorage...');
            // Store in sessionStorage so it clears when tab closes
            sessionStorage.setItem('oreilly_user', JSON.stringify(result.user));
            sessionStorage.setItem('oreilly_token', result.token);
            sessionStorage.setItem('oreilly_session_expiry', sessionExpiry.toISOString());

            console.log('✅ Login successful! Setting user:', result.user);
            setUser(result.user);
            return true;

        } catch (error) {
            console.error('Login error:', error);
            setError('Login failed. Please try again.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        clearSession();
        setError(null);
    };

    const value: AuthContextType = {
        user,
        isLoading,
        error,
        login,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};