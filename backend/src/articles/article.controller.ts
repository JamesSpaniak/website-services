import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ArticleService } from './article.service';
import { ArticleDto, ArticleFull, ArticleSlim } from './types/article.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { RolesGuard } from 'src/users/role.guard';
import { Roles } from 'src/users/role.decorator';
import { Role } from 'src/users/types/role.enum';

@ApiTags('Articles')
@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

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

  @ApiOperation({
    summary: 'Get article by numeric ID or slug',
    description:
      'Digits only → looked up by id (old /articles/42 links); anything else → by slug. Hidden articles are 404 except for admins (the admin editor loads through this route).',
  })
  @ApiResponse({ status: 200, description: 'Article details.' })
  @ApiResponse({ status: 404, description: 'Article not found (or hidden).' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':idOrSlug')
  async getArticleByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
    @Request() req,
  ): Promise<ArticleFull> {
    const notFound = () =>
      new NotFoundException(`Article "${idOrSlug}" does not exist.`);
    if (
      !/^(\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(idOrSlug) ||
      idOrSlug.length > 120
    ) {
      throw notFound();
    }
    const article = await (
      /^\d+$/.test(idOrSlug)
        ? this.articleService.getArticle(idOrSlug)
        : this.articleService.getArticleBySlug(idOrSlug)
    ).catch(() => null);
    // Hidden and missing get the identical 404, so hidden slugs/ids can't be probed.
    if (!article || (article.hidden && req.user?.role !== Role.Admin)) {
      throw notFound();
    }
    return article;
  }

  @ApiOperation({ summary: 'Create a new article (Admin only)' })
  @ApiResponse({ status: 201, description: 'Article created.' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async saveArticle(@Body() article: ArticleDto): Promise<ArticleFull> {
    return this.articleService.saveArticle(article);
  }

  @ApiOperation({ summary: 'Update an existing article (Admin only)' })
  @ApiResponse({ status: 200, description: 'Article updated.' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() article: ArticleDto,
  ): Promise<ArticleFull> {
    return this.articleService.updateArticle(String(id), article);
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
