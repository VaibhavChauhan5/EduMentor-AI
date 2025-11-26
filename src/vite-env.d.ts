/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_APP_ENV: string;
    readonly VITE_APP_NAME: string;
    readonly VITE_APP_VERSION: string;
    readonly VITE_AUTH_METHOD: 'backend' | 'env' | 'cognito';
    readonly VITE_DEMO_USERS: string;
    readonly VITE_SESSION_TIMEOUT: string;
    // AWS Cognito (if using)
    readonly VITE_AWS_REGION: string;
    readonly VITE_USER_POOL_ID: string;
    readonly VITE_USER_POOL_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}