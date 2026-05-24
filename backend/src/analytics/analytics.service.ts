import { Injectable, Logger } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);
    private readonly meter = metrics.getMeter('droneedge');

    private readonly pageViewCounter = this.meter.createCounter('page.view', {
        description: 'Total page views',
    });

    private readonly articleViewCounter = this.meter.createCounter('article.view', {
        description: 'Article page views by article ID and title',
    });

    private readonly courseViewCounter = this.meter.createCounter('course.view', {
        description: 'Course page views by course ID and title',
    });

    private readonly loginCounter = this.meter.createCounter('auth.login', {
        description: 'Successful user logins',
    });

    private readonly loginFailedCounter = this.meter.createCounter('auth.login_failed', {
        description: 'Failed login attempts',
    });

    private readonly tokenRefreshCounter = this.meter.createCounter('auth.token_refresh', {
        description: 'Token refresh operations',
    });

    private readonly registrationCounter = this.meter.createCounter('auth.registration', {
        description: 'New user registrations',
    });

    recordPageView(path: string, referrer?: string): void {
        this.pageViewCounter.add(1, { path, referrer: referrer || 'direct' });
    }

    recordArticleView(articleId: string, title: string): void {
        this.articleViewCounter.add(1, { article_id: articleId, title });
        this.pageViewCounter.add(1, { path: `/articles/${articleId}` });
    }

    recordCourseView(courseId: string, title: string): void {
        this.courseViewCounter.add(1, { course_id: courseId, title });
        this.pageViewCounter.add(1, { path: `/courses/${courseId}` });
    }

    recordLogin(userId: number, username: string): void {
        this.loginCounter.add(1, { user_id: String(userId), username });
    }

    recordLoginFailed(username: string): void {
        this.loginFailedCounter.add(1, { username });
    }

    recordTokenRefresh(userId: number): void {
        this.tokenRefreshCounter.add(1, { user_id: String(userId) });
    }

    recordRegistration(username: string): void {
        this.registrationCounter.add(1, { username });
    }
}
