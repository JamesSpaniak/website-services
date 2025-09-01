import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleDto } from './types/article.dto';
import { Article } from './types/article.entity';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>
  ) {}

  static articleDtoToEntity(article: ArticleDto): Article {
    return {
        ...article
    };
  }

  async getArticles(): Promise<Article[]> {
    return this.articleRepository.find();
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
    const updatedArticle = await this.articleRepository.create(
        ArticleService.articleDtoToEntity(article)
    );
    await this.articleRepository.update(id, {
        ...updatedArticle,
        submitted_at: existingArticle.submitted_at
    });
    return updatedArticle;
  }

  async deleteArticle(id: string) {
    await this.getArticle(id); // checks for existance
    await this.articleRepository.delete(+id);
  }
}
