import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  static articleDtoToEntity(article: ArticleDto): Article {
    return {
        ...article
    };
  }

  async getArticles(): Promise<Article[]> {
    return this.articleRepository.find({
      where: { hidden: false },
      order: { submitted_at: 'DESC' },
    });
  }

  async getAllArticles(): Promise<Article[]> {
    return this.articleRepository.find({
      order: { submitted_at: 'DESC' },
    });
  }

  async getArticle(id: string): Promise<Article> {
    const article = await this.articleRepository.findOne({
        where: { id: +id }
    });

    if (!article) {
        throw new NotFoundException(`Article ID ${id} does not exist.`)
    }
    return article;
  }

  async saveArticle(article: ArticleDto): Promise<Article> {
    const newArticle = this.articleRepository.create(
        ArticleService.articleDtoToEntity(article)
    );
    await this.articleRepository.save(newArticle);
    return newArticle;
  }

  async updateArticle(id: string, article: Article): Promise<Article> {
    const existingArticle = await this.getArticle(id);
    const updatedArticle = this.articleRepository.create(
        ArticleService.articleDtoToEntity(article)
    );
    await this.articleRepository.update(id, {
        ...updatedArticle,
        submitted_at: existingArticle.submitted_at
    });
    return updatedArticle;
  }

  async deleteArticle(id: string) {
    const article = await this.getArticle(id);
    await this.deleteArticleMedia(article);
    await this.articleRepository.delete(+id);
  }

  private async deleteArticleMedia(article: Article): Promise<void> {
    const urls = this.collectArticleMediaUrls(article);
    if (urls.length === 0) return;

    const keys = this.mediaService.extractKeysFromUrls(urls);
    if (keys.length === 0) return;

    try {
      await this.mediaService.deleteMultipleMedia(keys);
      this.logger.log(`Deleted ${keys.length} media files for article ${article.id}`);
    } catch (err) {
      this.logger.error(`Failed to delete media for article ${article.id}: ${(err as Error).message}`);
    }
  }

  private collectArticleMediaUrls(article: Article): string[] {
    const urls: string[] = [];

    if (article.image_url) {
      urls.push(article.image_url);
    }

    if (article.content_blocks) {
      for (const block of article.content_blocks) {
        if ((block.type === 'image' || block.type === 'video') && block.content) {
          urls.push(block.content);
        }
      }
    }

    return urls;
  }
}
