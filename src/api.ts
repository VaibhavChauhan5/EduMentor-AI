import axios from 'axios';
import { ApiResponse, ContentType } from './types';

// Configure axios with base URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000', // API server endpoint
    headers: {
        'Content-Type': 'application/json',
    }
});

// Mock response for development without backend API
const mockOreillyResponse = (query: string): string => {
    // Simple mock response based on query
    if (query.toLowerCase().includes('python')) {
        return "I found several Python resources on O'Reilly:\n\n1. **Learning Python, 5th Edition** by Mark Lutz\n2. **Python Crash Course** by Eric Matthes\n3. **Fluent Python** by Luciano Ramalho\n\nWould you like more information on any of these?";
    } else if (query.toLowerCase().includes('javascript')) {
        return "Here are some JavaScript resources from O'Reilly:\n\n1. **JavaScript: The Good Parts** by Douglas Crockford\n2. **Eloquent JavaScript** by Marijn Haverbeke\n3. **You Don't Know JS** series by Kyle Simpson\n\nCan I help you narrow down your search?";
    } else {
        return `I found some resources related to "${query}" on O'Reilly. Would you like me to provide more specific information on this topic?`;
    }
};

// Store the session ID for conversation continuity
let currentSessionId: string | null = null;

// Generate a unique session ID when the app starts
const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Initialize session ID
if (!currentSessionId) {
    currentSessionId = generateSessionId();
    console.log('Generated new session ID:', currentSessionId);
}

// Heartbeat functionality
let heartbeatInterval: number | null = null;

const startHeartbeat = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }

    // Send heartbeat every 2 minutes to keep session alive
    heartbeatInterval = setInterval(async () => {
        if (currentSessionId) {
            try {
                const response = await api.post('/heartbeat', {
                    sessionId: currentSessionId
                });
                console.log('Heartbeat sent:', response.data);
            } catch (error) {
                console.warn('Heartbeat failed:', error);
            }
        }
    }, 2 * 60 * 1000); // 2 minutes
};

const stopHeartbeat = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
};

// Start heartbeat when module loads
startHeartbeat();

// Stop heartbeat when page is about to unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        stopHeartbeat();
    });

    // Handle visibility changes (tab switching, minimizing)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden, but keep heartbeat running
            console.log('Page hidden, continuing heartbeat');
        } else {
            // Page is visible again, ensure heartbeat is running
            console.log('Page visible, ensuring heartbeat is active');
            startHeartbeat();
        }
    });
}

export const sendMessage = async (message: string, contentType: ContentType = 'all'): Promise<ApiResponse> => {
    try {
        try {
            // Debug logging
            console.log('Sending message to API:', { message, sessionId: currentSessionId, contentType });

            // First try the original /chat endpoint
            const response = await api.post('/chat', {
                message,
                sessionId: currentSessionId,
                contentType
            });

            console.log('Response from /chat endpoint:', response.data);

            // Store the session ID for future requests
            if (response.data.sessionId) {
                currentSessionId = response.data.sessionId;
            }

            return response.data;
        } catch (validationError: any) {
            console.warn('Error with /chat endpoint:', validationError);
            console.log('Error response data:', validationError.response?.data);

            // First try a simple test to see if the API is working
            try {
                const testResponse = await api.post('/test-post', {
                    test: 'data',
                    message,
                    sessionId: currentSessionId
                });
                console.log('Test endpoint response:', testResponse.data);
            } catch (testError) {
                console.warn('Test endpoint failed too:', testError);
            }

            // If we get a 422 error, try the alternative endpoint
            if (validationError.response && validationError.response.status === 422) {
                console.warn('Validation error with /chat endpoint, trying alternative /chat-raw endpoint');

                // Try the raw endpoint as fallback
                const rawResponse = await api.post('/chat-raw', {
                    message,
                    sessionId: currentSessionId,
                    contentType
                });

                console.log('Response from /chat-raw endpoint:', rawResponse.data);

                // Store the session ID for future requests
                if (rawResponse.data.sessionId) {
                    currentSessionId = rawResponse.data.sessionId;
                }

                return rawResponse.data;
            }

            // If it's a different error, fall through to the mock response
            console.warn('Could not connect to backend API, using mock response instead:', validationError);

            // Fallback to mock response if API is not available
            await new Promise(resolve => setTimeout(resolve, 1000));

            return {
                message: mockOreillyResponse(message),
                status: 'success'
            };
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const resetChat = async (): Promise<ApiResponse> => {
    try {
        if (!currentSessionId) {
            return { message: "No active session to reset", status: "warning" };
        }

        const response = await api.post('/reset', { sessionId: currentSessionId });

        // Generate new session ID after reset
        currentSessionId = generateSessionId();
        console.log('Generated new session ID after reset:', currentSessionId);

        return response.data;
    } catch (error) {
        console.error('Reset Error:', error);
        return { message: "Failed to reset chat", status: "error" };
    }
};

export const getSessionStatus = async (): Promise<any> => {
    try {
        if (!currentSessionId) {
            return { error: "No active session" };
        }

        const response = await api.get(`/session/status?session_id=${currentSessionId}`);
        return response.data;
    } catch (error) {
        console.error('Session status error:', error);
        return { error: "Failed to get session status" };
    }
};

export const sendHeartbeat = async (): Promise<any> => {
    try {
        if (!currentSessionId) {
            return { error: "No active session" };
        }

        const response = await api.post('/heartbeat', {
            sessionId: currentSessionId
        });
        return response.data;
    } catch (error) {
        console.error('Heartbeat error:', error);
        return { error: "Heartbeat failed" };
    }
};

// Export session management functions
export const getCurrentSessionId = (): string | null => currentSessionId;

export const setSessionId = (sessionId: string): void => {
    currentSessionId = sessionId;
    console.log('Session ID updated to:', sessionId);
};

// Export heartbeat control functions
export const startHeartbeatExport = startHeartbeat;
export const stopHeartbeatExport = stopHeartbeat;