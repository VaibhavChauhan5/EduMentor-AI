export type ContentType = 'all' | 'books' | 'courses' | 'audiobooks' | 'live-event-series';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isError?: boolean;
    isLoading?: boolean;
    contentType?: ContentType;
}

export interface ApiResponse {
    message: string;
    status?: string;
    sessionId?: string;
    searchedApi?: boolean;  // Flag to indicate if the agent searched the O'Reilly API
    contentType?: ContentType;
}

// Authentication types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
}