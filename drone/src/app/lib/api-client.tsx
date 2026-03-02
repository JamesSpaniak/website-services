import { ContactPayload, CreateUserDto, UserDto } from "./types/profile";
import { CourseData, UnitData } from "./types/course";
import { ArticleCreateDto, ArticleFull, ArticleSlim } from "./types/article";
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

// --- Media Upload ---

interface PresignedUrlRequest {
    filename: string;
    contentType: string;
    folder: 'articles' | 'courses';
    subfolder?: string;
}

interface PresignedUrlResponse {
    uploadUrl: string;
    publicUrl: string;
    key: string;
}

async function getPresignedUrl(params: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    return apiClient('media/presigned-url', {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

async function uploadMediaToS3(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
    });
    if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
    }
}

async function uploadMedia(file: File, folder: 'articles' | 'courses', subfolder?: string): Promise<{ publicUrl: string; key: string }> {
    const { uploadUrl, publicUrl, key } = await getPresignedUrl({
        filename: file.name,
        contentType: file.type,
        folder,
        subfolder,
    });
    await uploadMediaToS3(uploadUrl, file);
    return { publicUrl, key };
}

async function getProfilePicturePresignedUrl(filename: string, contentType: string): Promise<PresignedUrlResponse> {
    return apiClient('media/profile-picture', {
        method: 'POST',
        body: JSON.stringify({ filename, contentType }),
    });
}

async function uploadProfilePicture(file: File): Promise<string> {
    const { uploadUrl, publicUrl } = await getProfilePicturePresignedUrl(file.name, file.type);
    await uploadMediaToS3(uploadUrl, file);
    await updateUser({ picture_url: publicUrl } as Partial<UserDto>);
    return publicUrl;
}

async function resetMemberPicture(orgId: number, userId: number): Promise<void> {
    await apiClient(`organizations/${orgId}/members/${userId}/picture`, {
        method: 'DELETE',
    });
}

async function deleteMedia(key: string): Promise<void> {
    await apiClient('media', {
        method: 'DELETE',
        body: JSON.stringify({ key }),
    });
}

async function listMedia(folder: 'articles' | 'courses', subfolder?: string): Promise<{ key: string; publicUrl: string; lastModified?: string; size?: number }[]> {
    const params = new URLSearchParams({ folder });
    if (subfolder) params.set('subfolder', subfolder);
    return apiClient(`media?${params.toString()}`);
}

// --- Admin Article CRUD ---

async function getAllArticlesAdmin(): Promise<ArticleFull[]> {
    return apiClient('articles/admin/all');
}

async function createArticle(article: ArticleCreateDto): Promise<ArticleFull> {
    return apiClient('articles', {
        method: 'POST',
        body: JSON.stringify(article),
    });
}

async function updateArticle(id: number, article: ArticleCreateDto): Promise<ArticleFull> {
    return apiClient(`articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(article),
    });
}

async function deleteArticle(id: number): Promise<void> {
    await apiClient(`articles/${id}`, { method: 'DELETE' });
}

// --- Admin Course CRUD ---

async function createCourse(course: CourseData): Promise<CourseData> {
    return apiClient('courses', {
        method: 'POST',
        body: JSON.stringify(course),
    });
}

async function updateCourse(id: number, course: CourseData): Promise<CourseData> {
    return apiClient(`courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(course),
    });
}

async function deleteCourse(id: number): Promise<void> {
    await apiClient(`courses/${id}`, { method: 'DELETE' });
}

// --- Organizations ---

import type {
    Organization,
    OrganizationMember,
    InviteCode,
    InviteCodeInfo,
    OrgCourse,
    MemberCourseProgressSummary,
    MemberCourseDetailedProgress,
    UserOrganization,
} from './types/organization';

import type { AuditLogEntry, UserActivityResponse, OverviewStats, DailyMetric } from './types/audit';
import type { CommentData } from './types/comment';

async function getMyOrganization(): Promise<UserOrganization | null> {
    return apiClient('organizations/my');
}

async function getInviteCodeInfo(code: string): Promise<InviteCodeInfo | null> {
    return apiClient(`organizations/invite-info?code=${encodeURIComponent(code)}`);
}

async function getOrganizations(): Promise<Organization[]> {
    return apiClient('organizations');
}

async function createOrganization(data: {
    name: string;
    max_students: number;
    initial_manager_user_id?: number;
    initial_manager_email?: string;
    school_year?: string;
    semester?: string;
}): Promise<Organization> {
    return apiClient('organizations', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

async function updateOrganization(id: number, data: {
    name?: string;
    max_students?: number;
    school_year?: string;
    semester?: string;
}): Promise<Organization> {
    return apiClient(`organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

async function deleteOrganization(id: number): Promise<void> {
    await apiClient(`organizations/${id}`, { method: 'DELETE' });
}

async function getOrganizationDetails(id: number): Promise<Organization> {
    return apiClient(`organizations/${id}`);
}

async function getOrgMembers(orgId: number): Promise<OrganizationMember[]> {
    return apiClient(`organizations/${orgId}/members`);
}

async function addOrgMember(orgId: number, data: { email: string; role?: 'manager' | 'member' }): Promise<OrganizationMember> {
    return apiClient(`organizations/${orgId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

async function removeOrgMember(orgId: number, userId: number): Promise<void> {
    await apiClient(`organizations/${orgId}/members/${userId}`, { method: 'DELETE' });
}

async function updateMemberRole(orgId: number, userId: number, role: 'manager' | 'member'): Promise<void> {
    await apiClient(`organizations/${orgId}/members/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
    });
}

async function generateInviteCode(orgId: number, data: { email?: string; role?: 'manager' | 'member' }): Promise<InviteCode> {
    return apiClient(`organizations/${orgId}/invite-codes`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

async function getInviteCodes(orgId: number): Promise<InviteCode[]> {
    return apiClient(`organizations/${orgId}/invite-codes`);
}

async function bulkGenerateInviteCodes(orgId: number, data: { emails: string[]; role?: 'manager' | 'member' }): Promise<InviteCode[]> {
    return apiClient(`organizations/${orgId}/invite-codes/bulk`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

async function getOrgCourses(orgId: number): Promise<OrgCourse[]> {
    return apiClient(`organizations/${orgId}/courses`);
}

async function assignOrgCourses(orgId: number, courseIds: number[]): Promise<OrgCourse[]> {
    return apiClient(`organizations/${orgId}/courses`, {
        method: 'POST',
        body: JSON.stringify({ course_ids: courseIds }),
    });
}

async function removeOrgCourse(orgId: number, courseId: number): Promise<void> {
    await apiClient(`organizations/${orgId}/courses/${courseId}`, { method: 'DELETE' });
}

async function getOrgProgress(orgId: number): Promise<MemberCourseProgressSummary[]> {
    return apiClient(`organizations/${orgId}/progress`);
}

async function getOrgCourseProgress(orgId: number, courseId: number): Promise<MemberCourseDetailedProgress[]> {
    return apiClient(`organizations/${orgId}/progress/${courseId}`);
}

// ── Course Media (Signed URLs) ──

async function getUnitMedia(courseId: number, unitId: string): Promise<{ video_url?: string }> {
    return apiClient(`courses/${courseId}/units/${unitId}/media`);
}

// ── Audit / Activity ──

async function getMyActivity(limit = 50, offset = 0): Promise<UserActivityResponse> {
    return apiClient(`audit/my?limit=${limit}&offset=${offset}`);
}

async function getAnalyticsOverview(): Promise<OverviewStats> {
    return apiClient('audit/analytics/overview');
}

async function getAnalyticsDaily(days = 30): Promise<DailyMetric[]> {
    return apiClient(`audit/analytics/daily?days=${days}`);
}

async function getStudentActivity(userId: number, limit = 50, offset = 0): Promise<AuditLogEntry[]> {
    return apiClient(`audit/users/${userId}?limit=${limit}&offset=${offset}`);
}

// ── Comments ──

async function getArticleComments(articleId: number): Promise<CommentData[]> {
    return apiClient(`articles/${articleId}/comments`);
}

async function createComment(articleId: number, body: string, parentId?: number): Promise<CommentData> {
    return apiClient(`articles/${articleId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body, parent_id: parentId }),
    });
}

async function updateComment(commentId: number, body: string): Promise<CommentData> {
    return apiClient(`comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
    });
}

async function deleteComment(commentId: number): Promise<void> {
    await apiClient(`comments/${commentId}`, { method: 'DELETE' });
}

async function toggleCommentUpvote(commentId: number): Promise<{ upvote_count: number; has_upvoted: boolean }> {
    return apiClient(`comments/${commentId}/upvote`, { method: 'POST' });
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
    getTokens,
    clearTokens,
    uploadMedia,
    deleteMedia,
    listMedia,
    getAllArticlesAdmin,
    createArticle,
    updateArticle,
    deleteArticle,
    createCourse,
    updateCourse,
    deleteCourse,
    getMyOrganization,
    getInviteCodeInfo,
    getOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    getOrganizationDetails,
    getOrgMembers,
    addOrgMember,
    removeOrgMember,
    updateMemberRole,
    generateInviteCode,
    getInviteCodes,
    bulkGenerateInviteCodes,
    getOrgCourses,
    assignOrgCourses,
    removeOrgCourse,
    getOrgProgress,
    getOrgCourseProgress,
    getMyActivity,
    getStudentActivity,
    getAnalyticsOverview,
    getAnalyticsDaily,
    getArticleComments,
    createComment,
    updateComment,
    deleteComment,
    toggleCommentUpvote,
    uploadProfilePicture,
    resetMemberPicture,
    getUnitMedia,
}
