import { ContactPayload, CreateUserDto, UserDto } from "./types/profile";
import { CourseData, UnitData } from "./types/course";
import { ArticleFull, ArticleSlim } from "./types/article";
import { v4 as uuidv4 } from 'uuid';
import { logger } from "./logger";

const BASE_URL: string = "http://localhost:3000"

interface ResetPasswordPayload {
    token: string;
    password: string;
}

// A generic request handler that adds a unique request ID for tracing
const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const requestId = uuidv4();
    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Id': requestId,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Handle responses with no content
        if (response.status === 204 || response.headers.get('Content-Length') === '0') {
            return;
        }

        return response.json();
    } catch (error) {
        // Log the API error before re-throwing it to the calling component
        logger.error(error as Error, { endpoint, options, requestId });
        throw error;
    }
};

const login = async (username: string, password: string) => {
    const params = new URLSearchParams({
        username: username,
        password: password,
    });
    // The cookie is set in the browser for subsequent requests.
    return makeRequest(`auth/login?${params.toString()}`, {
        method: 'POST',
        credentials: 'include',
    });
};

// A helper to ensure we're authenticated before making a call
const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
    return makeRequest(endpoint, {
        ...options,
        credentials: 'include',
    });
};

async function logout() {
    await makeAuthenticatedRequest('auth/logout', { method: 'POST' });
}

async function getArticles(): Promise<ArticleSlim[]> {
    return makeRequest('articles');
}

async function getArticleById(id: number): Promise<ArticleFull> {
    return makeRequest(`articles/${id}`);
}

async function getCourses(): Promise<CourseData[]> { // Adjust 'any[]' to your article data type
    // This endpoint is public for listing courses
    return makeRequest('courses', { method: 'GET' });
}

async function getCourseById(id: number): Promise<CourseData> {
    return makeAuthenticatedRequest(`courses/${id}`, { method: 'GET' });
}

async function getUser(username: string): Promise<UserDto | Error> {
    return makeAuthenticatedRequest(`users/${username}`, { method: 'GET' });
}

async function getProfile() {
    return makeAuthenticatedRequest('auth/profile', { method: 'GET' });
}

async function createUser(userData: CreateUserDto): Promise<UserDto> { // TODO
    return makeRequest('users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

async function updateUser(userData: Partial<UserDto>): Promise<UserDto> {
    return makeAuthenticatedRequest('users/me', {
        method: 'PATCH',
        body: JSON.stringify(userData),
    });
}

async function resetCourseProgress(courseId: number): Promise<void> {
    await makeAuthenticatedRequest(`progress/courses/${courseId}/reset`, { method: 'POST' });
}

async function getCoursesWithProgress(): Promise<CourseData[]> {
    return makeAuthenticatedRequest('progress/courses');
}

async function forgotPassword(email: string): Promise<void> {
    const requestId = uuidv4();
    try {
        // This is a public endpoint, but we still want to trace it.
        // We don't use makeRequest because we don't want to throw an error on failure for security reasons.
        await fetch(`${BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Id': requestId,
            },
            body: JSON.stringify({ email }),
        });
    } catch (error) {
        // Log the error but don't re-throw to the UI.
        logger.error(error as Error, { endpoint: 'auth/forgot-password', requestId });
    }
}

async function updateCourseProgress(courseId: number, status: string): Promise<void> {
    await makeAuthenticatedRequest(`progress/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

async function updateUnitProgress(courseId: number, unitId: string, status: string): Promise<UnitData> {
    return makeAuthenticatedRequest(`progress/courses/${courseId}/units/${unitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

async function sendContactMessage(payload: ContactPayload): Promise<{ success: boolean; message: string }> {
    // This is a public endpoint, so no auth needed.
    return makeRequest('email/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function resetPassword(payload: ResetPasswordPayload) {
    return makeRequest('auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
async function purchaseCourse(courseId: number): Promise<void> {
    await makeAuthenticatedRequest('purchases/course', {
        method: 'POST',
        body: JSON.stringify({ courseId }),
    });
}

async function logToServer(level: string, message: string, context: object) {
    const requestId = uuidv4(); // A unique ID for the log submission request itself.
    // This is a fire-and-forget call. We don't await it or handle errors
    // to prevent the logger from causing issues in the main application flow.
    fetch(`${BASE_URL}/logs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
        },
        body: JSON.stringify({ level, message, context }),
        // keepalive allows the request to complete even if the page is unloading.
        keepalive: true,
    }).catch(() => { 
        console.error("Error logging to server. Please notify admin.");
    });
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
    purchaseCourse,
    logToServer
}
