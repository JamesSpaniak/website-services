import { ContactPayload, CreateUserDto, UserDto } from "./types/profile";
import { CourseData, UnitData } from "./types/course";
import { ArticleFull, ArticleSlim } from "./types/article";
import { v4 as uuidv4 } from 'uuid';
import { logger } from "./logger";

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        return '/api';
    }
    return process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
};

const buildUrl = (endpoint: string) => {
    const base = getApiBaseUrl().replace(/\/$/, '');
    return `${base}/${endpoint}`;
};

interface ResetPasswordPayload {
    token: string;
    password: string;
}

// --- Token Management ---
const getTokens = () => {
    if (typeof window === 'undefined') return null;
    const access_token = localStorage.getItem('access_token');
    const refresh_token = localStorage.getItem('refresh_token');
    return { access_token, refresh_token };
};

const setTokens = (access_token: string, refresh_token: string) => {
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
};

const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};

// --- Core API Function ---
const apiClient = async (endpoint: string, options: RequestInit = {}) => {
    const requestId = uuidv4();
    const startTime = Date.now();
    const shouldLogTimings = process.env.NEXT_PUBLIC_LOG_API_TIMINGS === 'true';

    const tokens = getTokens();

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-Request-Id', requestId);

    if (tokens?.access_token) {
        headers.set('Authorization', `Bearer ${tokens.access_token}`);
    }
    options.headers = headers;

    try {
        let response = await fetch(buildUrl(endpoint), options);

        if (response.status === 401) {
            const { refresh_token } = tokens || {};
            if (!refresh_token) {
                clearTokens();
                throw new Error("Session expired. Please log in again.");
            }

            try {
                const refreshResponse = await fetch(buildUrl('auth/refresh'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Request-Id': uuidv4() },
                    body: JSON.stringify({ refresh_token }),
                });

                if (!refreshResponse.ok) {
                    clearTokens();
                    throw new Error("Session expired. Please log in again.");
                }

                const newTokens = (await refreshResponse.json()) as {
                    access_token: string;
                    refresh_token: string;
                };
                setTokens(newTokens.access_token, newTokens.refresh_token);

                // Retry original request with new token
                headers.set('Authorization', `Bearer ${newTokens.access_token}`);
                response = await fetch(buildUrl(endpoint), options);

            } catch (e) {
                clearTokens();
                logger.error(e as Error, { message: 'Failed to refresh token' });
                throw new Error("Session expired. Please log in again.");
            }
        }

        if (shouldLogTimings) {
            const duration = Date.now() - startTime;
            logger.info(`API Request: ${options.method || 'GET'} ${endpoint} - ${response.status}`, {
                endpoint,
                method: options.method || 'GET',
                status: response.status,
                durationMs: duration,
                requestId,
            });
        }

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({ message: response.statusText }))) as {
                message?: string;
            };
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        if (response.status === 204 || response.headers.get('Content-Length') === '0') {
            return;
        }

        return response.json();
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(error as Error, {
            endpoint,
            options,
            requestId,
            durationMs: duration,
        });
        throw error;
    }
};

const login = async (username: string, password: string) => {
    const response = await apiClient('auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    setTokens(response.access_token, response.refresh_token);
    return response.user;
};

async function logout() {
    const { refresh_token } = getTokens() || {};
    if (refresh_token) {
        try {
            await apiClient('auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refresh_token }),
            });
        } catch (error) {
            logger.error(error as Error, { message: 'Logout failed on server' });
        }
    }
    clearTokens();
}

async function getArticles(): Promise<ArticleSlim[]> {
    return apiClient('articles');
}

async function getArticleById(id: number): Promise<ArticleFull> {
    return apiClient(`articles/${id}`);
}

async function getCourses(): Promise<CourseData[]> {
    return apiClient('courses', { method: 'GET' });
}

async function getCourseById(id: number): Promise<CourseData> {
    return apiClient(`courses/${id}`, { method: 'GET' });
}

async function getUser(username: string): Promise<UserDto | Error> {
    return apiClient(`users/${username}`, { method: 'GET' });
}

async function getProfile() {
    return apiClient('auth/profile', { method: 'GET' });
}

async function createUser(userData: CreateUserDto): Promise<{ message: string }> {
    return apiClient('auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

async function updateUser(userData: Partial<UserDto>): Promise<UserDto> {
    return apiClient('users/me', {
        method: 'PATCH',
        body: JSON.stringify(userData),
    });
}

async function resetCourseProgress(courseId: number): Promise<void> {
    await apiClient(`progress/courses/${courseId}/reset`, { method: 'POST' });
}

async function getCoursesWithProgress(): Promise<CourseData[]> {
    return apiClient('progress/courses');
}

async function forgotPassword(email: string): Promise<void> {
    try {
        await apiClient('auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    } catch (error) {
        logger.error(error as Error, { endpoint: 'auth/forgot-password' });
    }
}

async function updateCourseProgress(courseId: number, status: string): Promise<void> {
    await apiClient(`progress/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

async function updateUnitProgress(courseId: number, unitId: string, status: string): Promise<UnitData> {
    return apiClient(`progress/courses/${courseId}/units/${unitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

async function sendContactMessage(payload: ContactPayload): Promise<{ success: boolean; message: string }> {
    return apiClient('email/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function resetPassword(payload: ResetPasswordPayload) {
    return apiClient('auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function verifyEmail(token: string): Promise<{ message: string }> {
    return apiClient('auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
}

async function purchaseCourse(courseId: number): Promise<void> {
    await apiClient('purchases/course', {
        method: 'POST',
        body: JSON.stringify({ courseId }),
    });
}

async function createPaymentIntent(courseId: number): Promise<{ clientSecret: string }> {
    return apiClient('purchases/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ courseId }),
    });
}

async function logToServer(level: string, message: string, context: object) {
    try {
        await fetch(buildUrl('logs'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Id': uuidv4(),
            },
            body: JSON.stringify({ level, message, context }),
            keepalive: true,
        });
    } catch {
        console.error("Error logging to server. Please notify admin.");
    }
}

export {
    getArticleById,
    createUser,
    updateUser,
    resetCourseProgress,
    getCoursesWithProgress,
    updateCourseProgress,
    updateUnitProgress,
    getArticles,
    getCourses,
    getCourseById,
    getProfile,
    getUser,
    login,
    logout,
    forgotPassword,
    sendContactMessage,
    resetPassword,
    verifyEmail,
    purchaseCourse,
    logToServer,
    createPaymentIntent,
    getTokens, // Export token helpers for use in UI components
    clearTokens
}
