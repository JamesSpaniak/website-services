import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleDto, ArticleFull, ArticleSlim } from './types/article.dto';

@Controller('articles')
export class ArticleController {
  constructor(
      private readonly articleService: ArticleService
  ) {}

  @Get()
  async getArticles(): Promise<ArticleSlim[]> {
    return this.articleService.getArticles();
  }

  @Get(':id')
  async getArticleById(@Param('id') id: string): Promise<ArticleFull> {
    return this.articleService.getArticle(id);
  }

  @Post()
  async saveArticle(
    @Body() article: ArticleDto
  ): Promise<ArticleFull> {
    return this.articleService.saveArticle(article)
  }

  @Patch(':id')
  async updateArticle(
    @Param('id') id: string,
    @Body() article: ArticleDto
  ): Promise<ArticleFull> {
    return this.articleService.updateArticle(id, 
        ArticleService.articleDtoToEntity(article)
    );
  }

  @Delete('id')
  async deleteArticle(@Param(':id') id: string) {
    await this.articleService.deleteArticle(id);
  }
}
