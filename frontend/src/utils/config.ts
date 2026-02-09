/**
 * Configuration utilities for the Jupiter Chat application
 * Centralizes environment variable access and API endpoint management
 */

/**
 * Get the backend base URL from environment variables
 * @throws Error if VITE_BACKEND_BASE_URL is not configured
 * @returns The backend base URL without trailing slash
 */
export const getBackendBaseUrl = (): string => {
    // Check if using Vite proxy (relative paths)
    const useProxy = (import.meta as any)?.env?.VITE_USE_VITE_PROXY === "true";
    const proxyBackendUrl = (import.meta as any)?.env?.VITE_PROXY_BACKEND_URL;

    if (useProxy && proxyBackendUrl === "") {
        // Using proxy - return empty string for relative paths
        return "";
    }

    const raw = (import.meta as any)?.env?.VITE_BACKEND_BASE_URL;
    const base = typeof raw === 'string' ? raw.replace(/"/g, '').trim() : '';

    if (!base) {
        throw new Error(
            'VITE_BACKEND_BASE_URL is not configured. Please set it in your .env file.'
        );
    }

    return base.replace(/\/$/, '');
};

/**
 * Centralized API endpoints configuration
 * All API URLs are generated dynamically based on the backend base URL
 */
export const API_ENDPOINTS = {
    auth: {
        signIn: () => `${getBackendBaseUrl()}/api/v1/auths/signin`,
        signOut: () => `${getBackendBaseUrl()}/api/v1/auths/signout`,
        signUp: () => `${getBackendBaseUrl()}/api/v1/auths/signup`,
    },
    chat: {
        completions: () => `${getBackendBaseUrl()}/api/chat/completions`,
        completed: () => `${getBackendBaseUrl()}/api/chat/completed`,
        create: () => `${getBackendBaseUrl()}/api/v1/chats/new`,
        list: (page: number = 1) => `${getBackendBaseUrl()}/api/v1/chats/?page=${page}`,
        get: (id: string) => `${getBackendBaseUrl()}/api/v1/chats/${id}`,
        pin: (id: string) => `${getBackendBaseUrl()}/api/v1/chats/${id}/pinned`,
        delete: (id: string) => `${getBackendBaseUrl()}/api/v1/chats/${id}`,
        rename: (id: string) => `${getBackendBaseUrl()}/api/v1/chats/${id}`,
    },
    models: {
        list: () => `${getBackendBaseUrl()}/api/models?`,
        create: () => `${getBackendBaseUrl()}/api/v1/models/create`,
        base: () => `${getBackendBaseUrl()}/api/v1/models/base`,
    },
    openai: {
        config: () => `${getBackendBaseUrl()}/openai/config`,
        updateConfig: () => `${getBackendBaseUrl()}/openai/config/update`,
    },
} as const;

/**
 * Get authentication configuration from environment variables
 */
export const getAuthConfig = () => {
    const SIGNUP_BEARER_TOKEN =
        (import.meta as any)?.env?.VITE_AUTH_SIGNUP_BEARER_TOKEN &&
            typeof (import.meta as any).env.VITE_AUTH_SIGNUP_BEARER_TOKEN === 'string'
            ? (import.meta as any).env.VITE_AUTH_SIGNUP_BEARER_TOKEN.replace(/"/g, '').trim()
            : '';

    const SIGNUP_API_KEY =
        (import.meta as any)?.env?.VITE_AUTH_SIGNUP_API_KEY &&
            typeof (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY === 'string'
            ? (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY.replace(/"/g, '').trim()
            : '';

    const SIGNUP_API_KEY_HEADER =
        (import.meta as any)?.env?.VITE_AUTH_SIGNUP_API_KEY_HEADER &&
            typeof (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY_HEADER === 'string'
            ? (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY_HEADER.replace(/"/g, '').trim()
            : 'x-api-key';

    return {
        SIGNUP_BEARER_TOKEN,
        SIGNUP_API_KEY,
        SIGNUP_API_KEY_HEADER,
    };
};

/**
 * Get models API configuration from environment variables
 */
export const getModelsConfig = () => {
    const MODELS_BEARER_TOKEN =
        (import.meta as any)?.env?.VITE_MODELS_BEARER_TOKEN &&
            typeof (import.meta as any).env.VITE_MODELS_BEARER_TOKEN === 'string'
            ? (import.meta as any).env.VITE_MODELS_BEARER_TOKEN.replace(/"/g, '').trim()
            : (import.meta as any)?.env?.VITE_AUTH_SIGNUP_BEARER_TOKEN &&
                typeof (import.meta as any).env.VITE_AUTH_SIGNUP_BEARER_TOKEN === 'string'
                ? (import.meta as any).env.VITE_AUTH_SIGNUP_BEARER_TOKEN.replace(/"/g, '').trim()
                : '';

    const MODELS_API_KEY =
        (import.meta as any)?.env?.VITE_MODELS_API_KEY &&
            typeof (import.meta as any).env.VITE_MODELS_API_KEY === 'string'
            ? (import.meta as any).env.VITE_MODELS_API_KEY.replace(/"/g, '').trim()
            : (import.meta as any)?.env?.VITE_AUTH_SIGNUP_API_KEY &&
                typeof (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY === 'string'
                ? (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY.replace(/"/g, '').trim()
                : '';

    const MODELS_API_KEY_HEADER =
        (import.meta as any)?.env?.VITE_MODELS_API_KEY_HEADER &&
            typeof (import.meta as any).env.VITE_MODELS_API_KEY_HEADER === 'string'
            ? (import.meta as any).env.VITE_MODELS_API_KEY_HEADER.replace(/"/g, '').trim()
            : (import.meta as any)?.env?.VITE_AUTH_SIGNUP_API_KEY_HEADER &&
                typeof (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY_HEADER === 'string'
                ? (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY_HEADER.replace(/"/g, '').trim()
                : 'x-api-key';

    return {
        MODELS_BEARER_TOKEN,
        MODELS_API_KEY,
        MODELS_API_KEY_HEADER,
    };
};

/**
 * Get stored authentication token from localStorage
 * @returns Bearer token string or empty string if not found
 */
export const getStoredBearerToken = (): string => {
    try {
        const raw = localStorage.getItem('jb_static_auth_session');
        if (!raw) return '';
        const parsed = JSON.parse(raw) as any;
        const token = typeof parsed?.token === 'string' ? parsed.token : '';
        const tokenType = typeof parsed?.token_type === 'string' ? parsed.token_type : 'Bearer';
        if (!token) return '';
        return `${tokenType} ${token}`.trim();
    } catch {
        return '';
    }
};

/**
 * Build authorization headers for API requests
 * @param bearerToken - Optional bearer token to use
 * @param apiKey - Optional API key to use
 * @param apiKeyHeader - Header name for API key (default: 'x-api-key')
 * @returns Object with authorization headers
 */
export const buildAuthHeaders = (
    bearerToken?: string,
    apiKey?: string,
    apiKeyHeader: string = 'x-api-key'
): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (bearerToken) {
        const authValue = bearerToken.toLowerCase().startsWith('bearer ')
            ? bearerToken
            : `Bearer ${bearerToken}`;
        headers.Authorization = authValue;
    }

    if (apiKey) {
        headers[apiKeyHeader] = apiKey;
    }

    return headers;
};
