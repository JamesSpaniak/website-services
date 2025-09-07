import { ContactPayload, CreateUserDto, UserDto } from "./types/profile";
import { CourseData, UnitData } from "./types/course";
import { ArticleFull, ArticleSlim } from "./types/article";

const BASE_URL: string = "http://localhost:3000"

const login = async (username: string, password: string) => {
    const params = new URLSearchParams({
        username: username,
        password: password,
    });
    const response = await fetch(`${BASE_URL}/auth/login?${params.toString()}`, {
        method: 'POST',
        credentials: 'include',
    });
    // The cookie is now set in the browser for subsequent requests.
    if (!response.ok) {
        throw new Error('Authentication failed');
    }
    return response.json(); // body contains the user profile
    
};

// A helper to ensure we're authenticated before making a call
const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
    // The 'credentials: "include"' option tells the browser to send cookies
    // with the request to the same origin.
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

async function logout() {
    await makeAuthenticatedRequest('auth/logout', { method: 'POST' });
}

async function getArticles(): Promise<ArticleSlim[]> {
    // This endpoint is public, so we can use fetch directly.
    const response = await fetch(`${BASE_URL}/articles`);
    if (!response.ok) {
        throw new Error('Failed to fetch articles');
    }
    return response.json();
}

async function getArticleById(id: number): Promise<ArticleFull> {
    const response = await fetch(`${BASE_URL}/articles/${id}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch article with id ${id}`);
    }
    return response.json();
}

async function getCourses(): Promise<CourseData[] | Error> { // Adjust 'any[]' to your article data type
    try {
        return await makeAuthenticatedRequest('courses', { method: 'GET' }); // TODO
    } catch (error) {
        console.error('Operation failed:', error);
        return new Error("Courses API Call Failed.");
    }
}

async function getCourseById(id: number): Promise<CourseData> {
    //await getAuthCookie('james', 'password');
    return makeAuthenticatedRequest(`courses/${id}`, { method: 'GET' });
}

async function getUser(username: string): Promise<UserDto | Error> {
    return await makeAuthenticatedRequest(`users/${username}`, { method: 'GET' });
}

async function getProfile() {
    return await makeAuthenticatedRequest('auth/profile', { method: 'GET' });
}

async function createUser(userData: CreateUserDto): Promise<UserDto> { // TODO
    // This endpoint is public, so no auth token needed, and no `makeAuthenticatedRequest`
    const response = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function updateUser(userData: Partial<UserDto>): Promise<UserDto> {
    return await makeAuthenticatedRequest('users/me', {
        method: 'PATCH',
        body: JSON.stringify(userData),
    });
}

async function resetCourseProgress(courseId: number): Promise<void> {
    // Assuming this endpoint returns 204 No Content on success
    await makeAuthenticatedRequest(`progress/courses/${courseId}/reset`, { method: 'POST' });
}

async function getCoursesWithProgress(): Promise<CourseData[]> {
    return makeAuthenticatedRequest('progress/courses', { method: 'GET' });
}

async function forgotPassword(email: string): Promise<void> {
    // This is a public endpoint, so no auth needed.
    await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    // We don't throw an error if it fails, for security reasons (to not reveal if an email exists).
}

async function updateCourseProgress(courseId: number, status: string): Promise<void> {
    await makeAuthenticatedRequest(`progress/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

async function updateUnitProgress(courseId: number, unitId: string, status: string): Promise<UnitData> {
    return await makeAuthenticatedRequest(`progress/courses/${courseId}/units/${unitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

async function sendContactMessage(payload: ContactPayload): Promise<{ success: boolean; message: string }> {
    // This is a public endpoint, so no auth needed.
    const response = await fetch(`${BASE_URL}/email/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return response.json();
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
    sendContactMessage
}
