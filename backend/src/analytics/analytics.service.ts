import { Injectable, Logger } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly meter = metrics.getMeter('droneedge');

  private readonly pageViewCounter = this.meter.createCounter('page.view', {
    description: 'Total page views',
  });

  private readonly articleViewCounter = this.meter.createCounter(
    'article.view',
    {
      description: 'Article page views by article ID and title',
    },
  );

  private readonly courseViewCounter = this.meter.createCounter('course.view', {
    description: 'Course page views by course ID and title',
  });

  private readonly loginCounter = this.meter.createCounter('auth.login', {
    description: 'Successful user logins',
  });

  private readonly loginFailedCounter = this.meter.createCounter(
    'auth.login_failed',
    {
      description: 'Failed login attempts',
    },
  );

  private readonly tokenRefreshCounter = this.meter.createCounter(
    'auth.token_refresh',
    {
      description: 'Token refresh operations',
    },
  );

  private readonly registrationCounter = this.meter.createCounter(
    'auth.registration',
    {
      description: 'New user registrations',
    },
  );

  // Labels are deliberately bounded (docs/tech/observability.md § cardinality):
  // Grafana Cloud bills and rate-limits on active series, and the free tier is
  // 10k. Per-user / per-title / raw-path dimensions belong in product_events,
  // not here. `path` is a route template, `referrer` a channel bucket.

  recordPageView(path: string, referrer?: string): void {
    this.pageViewCounter.add(1, {
      route: routeTemplate(path),
      channel: referrerChannel(referrer),
    });
  }

  recordArticleView(articleId: string): void {
    this.articleViewCounter.add(1, { article_id: articleId });
    this.pageViewCounter.add(1, {
      route: '/articles/:id',
      channel: 'internal',
    });
  }

  recordCourseView(courseId: string): void {
    this.courseViewCounter.add(1, { course_id: courseId });
    this.pageViewCounter.add(1, { route: '/courses/:id', channel: 'internal' });
  }

  recordLogin(): void {
    this.loginCounter.add(1);
  }

  recordLoginFailed(): void {
    this.loginFailedCounter.add(1);
  }

  recordTokenRefresh(): void {
    this.tokenRefreshCounter.add(1);
  }

  recordRegistration(): void {
    this.registrationCounter.add(1);
  }
}

/** Collapses ids, unit refs and slugs so a path yields one of a few dozen templates. */
export function routeTemplate(path: string): string {
  const clean = (path || '/').split('?')[0].split('#')[0];
  const parts = clean.split('/').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < parts.length && out.length < 4; i++) {
    const p = parts[i];
    const prev = out[out.length - 1];
    const dynamicParent =
      /^(articles|courses|units|exams|users|organizations|classes|verify-email|reset-password)$/.test(
        prev ?? '',
      );
    out.push(
      /^\d+$/.test(p) || /^[0-9a-f-]{20,}$/i.test(p) || dynamicParent
        ? ':id'
        : p.slice(0, 32),
    );
  }
  return '/' + out.join('/');
}

/** direct | internal | search | social | other — never the raw referrer. */
export function referrerChannel(referrer?: string): string {
  if (!referrer) return 'direct';
  let host = '';
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'other';
  }
  if (host.endsWith('thedroneedge.com') || host === 'localhost')
    return 'internal';
  if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave)\./.test(host))
    return 'search';
  if (
    /(^|\.)(facebook|instagram|linkedin|reddit|youtube|tiktok|x|twitter|t)\.(com|co)$/.test(
      host,
    )
  )
    return 'social';
  return 'other';
}
