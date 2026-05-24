'use client';

const getApiBase = () => {
    if (typeof window !== 'undefined') return '/api';
    return process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';
};

function sendEvent(payload: Record<string, string | undefined>): void {
    try {
        const path = (payload.path && String(payload.path).trim()) || '/';
        const normalized = { ...payload, path };
        const url = `${getApiBase()}/analytics/event`;
        const body = JSON.stringify(normalized);
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        } else {
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true,
            }).catch((err) => {
                console.error('[analytics] sendEvent fetch failed', err);
            });
        }
    } catch (err) {
        console.error('[analytics] sendEvent failed', err);
    }
}

export function trackPageView(path: string | null | undefined): void {
    const safePath = (path && String(path).trim()) || '/';
    sendEvent({
        event: 'page_view',
        path: safePath,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
}

export function trackArticleView(articleId: string | number, title: string): void {
    sendEvent({
        event: 'article_view',
        path: `/articles/${articleId}`,
        contentId: String(articleId),
        title,
    });
}

export function trackCourseView(courseId: string | number, title: string): void {
    sendEvent({
        event: 'course_view',
        path: `/courses/${courseId}`,
        contentId: String(courseId),
        title,
    });
}

export function sendExamEvent(
    event: 'exam_start' | 'exam_submit',
    courseId: number,
    examPool: string,
    scope: string,
    score?: number,
): void {
    sendEvent({
        event,
        path: `/courses/${courseId}/exams/${examPool}`,
        contentId: String(courseId),
        examPool,
        scope,
        score: score != null ? String(score) : undefined,
    });
}
