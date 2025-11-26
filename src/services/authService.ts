import { User, LoginCredentials } from '../types';

export interface AuthService {
    login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; token?: string; error?: string }>;
    validateToken(token: string): Promise<{ valid: boolean; user?: User }>;
    refreshToken(token: string): Promise<{ success: boolean; token?: string }>;
    logout(token: string): Promise<void>;
}

// Backend API Authentication Service
export class BackendAuthService implements AuthService {
    private baseUrl: string;

    constructor(baseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000') {
        this.baseUrl = baseUrl;
    }

    async login(credentials: LoginCredentials) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.message || 'Login failed' };
            }

            return {
                success: true,
                user: data.user,
                token: data.access_token,
            };
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    async validateToken(token: string) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                return { valid: false };
            }

            const user = await response.json();
            return { valid: true, user };
        } catch {
            return { valid: false };
        }
    }

    async refreshToken(token: string) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                return { success: false };
            }

            const data = await response.json();
            return { success: true, token: data.access_token };
        } catch {
            return { success: false };
        }
    }

    async logout(token: string) {
        try {
            await fetch(`${this.baseUrl}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        } catch {
            // Ignore logout errors
        }
    }
}

// Environment-based Authentication Service (for development)
export class EnvAuthService implements AuthService {
    private getValidUsers(): Array<LoginCredentials & { name: string; role: 'admin' | 'user' }> {
        const envUsers = import.meta.env.VITE_DEMO_USERS;
        if (envUsers) {
            try {
                return JSON.parse(envUsers);
            } catch {
                console.warn('Failed to parse VITE_DEMO_USERS from environment');
            }
        }

        // Fallback users if env not configured
        return [
            { email: 'admin@example.com', password: 'admin123', name: 'Admin', role: 'admin' },
            { email: 'user@example.com', password: 'user123', name: 'User', role: 'user' },
        ];
    }

    async login(credentials: LoginCredentials) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const validUsers = this.getValidUsers();
        const user = validUsers.find(
            u => u.email === credentials.email && u.password === credentials.password
        );

        if (!user) {
            return { success: false, error: 'Invalid email or password' };
        }

        const authUser: User = {
            id: Date.now().toString(),
            email: user.email,
            name: user.name,
            role: user.role,
        };

        const token = btoa(`${authUser.id}:${Date.now()}`);

        return { success: true, user: authUser, token };
    }

    async validateToken(token: string) {
        try {
            const [userId] = atob(token).split(':');
            return { valid: !!userId };
        } catch {
            return { valid: false };
        }
    }

    async refreshToken() {
        return { success: false };
    }

    async logout() {
        // Nothing to do for env-based auth
    }
}

// Factory function to get the appropriate auth service
export function createAuthService(): AuthService {
    const authMethod = import.meta.env.VITE_AUTH_METHOD || 'backend';

    switch (authMethod) {
        case 'env':
            return new EnvAuthService();
        case 'backend':
        default:
            return new BackendAuthService();
    }
}