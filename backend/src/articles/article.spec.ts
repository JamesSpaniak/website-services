import { ConflictException, NotFoundException } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { Article } from './types/article.entity';
import { ArticleDto } from './types/article.dto';

describe('ArticleService.slugify', () => {
  it('lowercases and joins words with single hyphens', () => {
    expect(
      ArticleService.slugify('Drone Careers in 2026: Where the Jobs Are'),
    ).toBe('drone-careers-in-2026-where-the-jobs-are');
    expect(ArticleService.slugify('  Part 107 — CTE!! ')).toBe('part-107-cte');
  });

  it('folds accents and caps length without a trailing hyphen', () => {
    expect(ArticleService.slugify('Café drones')).toBe('cafe-drones');
    const long = ArticleService.slugify('word '.repeat(40));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith('-')).toBe(false);
  });
});

describe('ArticleService.normalizeTags', () => {
  it('trims, drops blanks and case-insensitive duplicates, keeps casing', () => {
    expect(
      ArticleService.normalizeTags([' Schools ', 'schools', '', 'Part  107']),
    ).toEqual(['Schools', 'Part 107']);
    expect(ArticleService.normalizeTags(undefined)).toEqual([]);
  });
});

describe('ArticleService.readMinutes', () => {
  it('counts body text and text blocks at ~230 wpm, minimum 1', () => {
    expect(ArticleService.readMinutes({ body: '<p>short</p>' })).toBe(1);
    const body = `<p>${'word '.repeat(690)}</p>`;
    expect(ArticleService.readMinutes({ body })).toBe(3);
    expect(
      ArticleService.readMinutes({
        body: '',
        content_blocks: [
          { id: 'a', type: 'text', content: 'word '.repeat(460) },
          { id: 'b', type: 'image', content: 'https://x/y.png' },
        ],
      }),
    ).toBe(2);
  });
});

describe('ArticleService slug handling', () => {
  const existing: Article = {
    id: 7,
    title: 'Old title',
    sub_heading: 's',
    body: '<p>b</p>',
    hidden: false,
    slug: 'old-title',
    tags: ['Schools'],
    submitted_at: new Date('2026-10-01'),
  };

  function makeService(takenSlugs: string[]) {
    const repo = {
      exists: jest.fn(({ where }: { where: { slug: string } }) =>
        Promise.resolve(takenSlugs.includes(where.slug)),
      ),
      create: jest.fn((a: Article) => a),
      save: jest.fn((a: Article) => Promise.resolve(a)),
      update: jest.fn(() => Promise.resolve()),
      findOne: jest.fn(() => Promise.resolve({ ...existing })),
    };
    const service = new ArticleService(repo as never, {} as never);
    return { service, repo };
  }

  const dto = (over: Partial<ArticleDto> = {}): ArticleDto => ({
    title: 'Drone Careers 2026',
    sub_heading: 's',
    body: '<p>b</p>',
    hidden: false,
    ...over,
  });

  it('generates a slug from the title and suffixes on collision', async () => {
    const { service } = makeService([
      'drone-careers-2026',
      'drone-careers-2026-2',
    ]);
    const saved = await service.saveArticle(dto());
    expect(saved.slug).toBe('drone-careers-2026-3');
  });

  it('rejects an explicit slug that is taken', async () => {
    const { service } = makeService(['taken']);
    await expect(
      service.saveArticle(dto({ slug: 'taken' })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps slug and tags on update when they are omitted', async () => {
    const { service, repo } = makeService([]);
    const updated = await service.updateArticle(
      '7',
      dto({ title: 'New title' }),
    );
    expect(updated.slug).toBe('old-title');
    expect(updated.tags).toEqual(['Schools']);
    expect(repo.update).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({ slug: 'old-title', title: 'New title' }),
    );
  });

  it('changes slug and tags on update when given', async () => {
    const { service } = makeService([]);
    const updated = await service.updateArticle(
      '7',
      dto({ slug: 'drone-careers-2026', tags: ['Careers', ' careers '] }),
    );
    expect(updated.slug).toBe('drone-careers-2026');
    expect(updated.tags).toEqual(['Careers']);
  });
});

describe('ArticleController GET :idOrSlug', () => {
  const article = (hidden: boolean) =>
    ({ id: 5, slug: 'draft-piece', hidden }) as Article;

  function makeController(found: Article | null) {
    const service = {
      getArticle: jest.fn(() =>
        found ? Promise.resolve(found) : Promise.reject(new Error('nope')),
      ),
      getArticleBySlug: jest.fn(() =>
        found ? Promise.resolve(found) : Promise.reject(new Error('nope')),
      ),
    };
    return new ArticleController(service as never);
  }

  it('serves published articles to anyone, by id or slug', async () => {
    const c = makeController(article(false));
    await expect(c.getArticleByIdOrSlug('5', {})).resolves.toMatchObject({
      id: 5,
    });
    await expect(
      c.getArticleByIdOrSlug('draft-piece', {}),
    ).resolves.toMatchObject({ id: 5 });
  });

  it('404s hidden articles for anonymous and non-admin users', async () => {
    const c = makeController(article(true));
    await expect(
      c.getArticleByIdOrSlug('draft-piece', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      c.getArticleByIdOrSlug('5', { user: { role: 'user' } }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('serves hidden articles to admins (admin editor)', async () => {
    const c = makeController(article(true));
    await expect(
      c.getArticleByIdOrSlug('5', { user: { role: 'admin' } }),
    ).resolves.toMatchObject({ hidden: true });
  });

  it('gives hidden and missing the same 404 message', async () => {
    const hidden = await makeController(article(true))
      .getArticleByIdOrSlug('draft-piece', {})
      .catch((e: Error) => e.message);
    const missing = await makeController(null)
      .getArticleByIdOrSlug('draft-piece', {})
      .catch((e: Error) => e.message);
    expect(hidden).toBe(missing);
  });

  it('404s malformed params without a lookup', async () => {
    const c = makeController(article(false));
    await expect(c.getArticleByIdOrSlug('Bad_Slug', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
