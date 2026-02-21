import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ArticleService } from './article.service';
import { ArticleDto, ArticleFull, ArticleSlim } from './types/article.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/users/role.guard';
import { Roles } from 'src/users/role.decorator';
import { Role } from 'src/users/types/role.enum';

@ApiTags('Articles')
@Controller('articles')
export class ArticleController {
  constructor(
      private readonly articleService: ArticleService
  ) {}

  @ApiOperation({ summary: 'Get all published articles' })
  @ApiResponse({ status: 200, description: 'List of published articles.' })
  @Get()
  async getArticles(): Promise<ArticleSlim[]> {
    return this.articleService.getArticles();
  }

  @ApiOperation({ summary: 'Get all articles including hidden (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all articles.' })
  @ApiBearerAuth()
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAllArticles(): Promise<ArticleFull[]> {
    return this.articleService.getAllArticles();
  }

  @ApiOperation({ summary: 'Get article by ID' })
  @ApiResponse({ status: 200, description: 'Article details.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @Get(':id')
  async getArticleById(@Param('id', ParseIntPipe) id: number): Promise<ArticleFull> {
    return this.articleService.getArticle(String(id));
  }

  @ApiOperation({ summary: 'Create a new article (Admin only)' })
  @ApiResponse({ status: 201, description: 'Article created.' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async saveArticle(
    @Body() article: ArticleDto
  ): Promise<ArticleFull> {
    return this.articleService.saveArticle(article)
  }

  @ApiOperation({ summary: 'Update an existing article (Admin only)' })
  @ApiResponse({ status: 200, description: 'Article updated.' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() article: ArticleDto
  ): Promise<ArticleFull> {
    return this.articleService.updateArticle(String(id), 
        ArticleService.articleDtoToEntity(article)
    );
  }

  @ApiOperation({ summary: 'Delete an article (Admin only)' })
  @ApiResponse({ status: 200, description: 'Article deleted.' })
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async deleteArticle(@Param('id', ParseIntPipe) id: number) {
    await this.articleService.deleteArticle(String(id));
  }
}
