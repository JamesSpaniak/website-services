import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ArticleDto } from './types/article.dto';
import { Article } from './types/article.entity';
import { MediaService } from 'src/media/media.service';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    private readonly mediaService: MediaService,
  ) {}

  /** Same rule as migration 1765000013000's backfill (lowercase, non-alphanumerics → "-", max 80 chars), plus accent folding (é → e). */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '');
  }

  /** Trim, drop blanks and case-insensitive duplicates; keeps the editor's casing. */
  static normalizeTags(tags: string[] | undefined): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of tags ?? []) {
      const tag = raw.trim().replace(/\s+/g, ' ');
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
    return out;
  }

  /** ~230 words per minute over the body HTML plus text content blocks. */
  static readMinutes(
    article: Pick<Article, 'body' | 'content_blocks'>,
  ): number {
    const blocks = (article.content_blocks ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.content);
    const text = [article.body ?? '', ...blocks]
      .join(' ')
      .replace(/<[^>]*>/g, ' ');
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 230));
  }

  private withReadMinutes(
    article: Article,
  ): Article & { read_minutes: number } {
    return { ...article, read_minutes: ArticleService.readMinutes(article) };
  }

  static articleDtoToEntity(article: ArticleDto): Article {
    return {
      ...article,
      slug: article.slug ?? '',
      tags: ArticleService.normalizeTags(article.tags),
    };
  }

  async getArticles(): Promise<Article[]> {
    const articles = await this.articleRepository.find({
      where: { hidden: false },
      order: { submitted_at: 'DESC' },
    });
    return articles.map((a) => this.withReadMinutes(a));
  }

  async getAllArticles(): Promise<Article[]> {
    const articles = await this.articleRepository.find({
      order: { submitted_at: 'DESC' },
    });
    return articles.map((a) => this.withReadMinutes(a));
  }

  async getArticle(id: string): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: { id: +id },
    });

    if (!article) {
      throw new NotFoundException(`Article ID ${id} does not exist.`);
    }
    return this.withReadMinutes(article);
  }

  async getArticleBySlug(slug: string): Promise<Article> {
    const article = await this.articleRepository.findOne({ where: { slug } });
    if (!article) {
      throw new NotFoundException(`Article "${slug}" does not exist.`);
    }
    return this.withReadMinutes(article);
  }

  /** Explicit slug must be free; a generated one gets "-2", "-3"… until it is. */
  private async resolveSlug(
    requested: string | undefined,
    title: string,
    excludeId?: number,
  ): Promise<string> {
    const taken = (slug: string) =>
      this.articleRepository.exists({
        where: excludeId != null ? { slug, id: Not(excludeId) } : { slug },
      });

    if (requested) {
      if (await taken(requested)) {
        throw new ConflictException(
          `Another article already uses the slug "${requested}".`,
        );
      }
      return requested;
    }

    const base = ArticleService.slugify(title) || 'article';
    let candidate = base;
    for (let n = 2; await taken(candidate); n++) {
      candidate = `${base}-${n}`;
    }
    return candidate;
  }

  async saveArticle(article: ArticleDto): Promise<Article> {
    const newArticle = this.articleRepository.create({
      ...ArticleService.articleDtoToEntity(article),
      slug: await this.resolveSlug(article.slug, article.title),
    });
    await this.articleRepository.save(newArticle);
    return this.withReadMinutes(newArticle);
  }

  async updateArticle(id: string, article: ArticleDto): Promise<Article> {
    const existingArticle = await this.getArticle(id);
    // Omitted slug keeps the current one, so editing a title never breaks a published URL.
    const slug =
      article.slug && article.slug !== existingArticle.slug
        ? await this.resolveSlug(
            article.slug,
            article.title,
            existingArticle.id,
          )
        : existingArticle.slug;
    const tags =
      article.tags !== undefined
        ? ArticleService.normalizeTags(article.tags)
        : existingArticle.tags;
    const updatedArticle = this.articleRepository.create({
      ...ArticleService.articleDtoToEntity(article),
      slug,
      tags,
    });
    await this.articleRepository.update(id, {
      ...updatedArticle,
      submitted_at: existingArticle.submitted_at,
    });
    return this.withReadMinutes({
      ...updatedArticle,
      id: existingArticle.id,
      submitted_at: existingArticle.submitted_at,
    });
  }

  async deleteArticle(id: string) {
    const article = await this.getArticle(id);
    await this.articleRepository.delete(+id);
    void this.deleteArticleMedia(article).catch((err) =>
      this.logger.error(
        `Post-delete media cleanup failed for article ${id}: ${(err as Error).message}`,
      ),
    );
  }

  private async deleteArticleMedia(article: Article): Promise<void> {
    const urls = this.collectArticleMediaUrls(article);
    if (urls.length === 0) return;

    const keys = this.mediaService.extractKeysFromUrls(urls);
    if (keys.length === 0) return;

    await this.mediaService.deleteMultipleMedia(keys);
    this.logger.log(
      `Deleted ${keys.length} media files for article ${article.id}`,
    );
  }

  private collectArticleMediaUrls(article: Article): string[] {
    const urls: string[] = [];

    if (article.image_url) {
      urls.push(article.image_url);
    }

    if (article.content_blocks) {
      for (const block of article.content_blocks) {
        if (
          (block.type === 'image' || block.type === 'video') &&
          block.content
        ) {
          urls.push(block.content);
        }
      }
    }

    return urls;
  }
}
