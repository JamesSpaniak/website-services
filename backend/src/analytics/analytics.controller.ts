import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AnalyticsService } from './analytics.service';

enum EventType {
    PAGE_VIEW = 'page_view',
    ARTICLE_VIEW = 'article_view',
    COURSE_VIEW = 'course_view',
}

class AnalyticsEventDto {
    @IsOptional() @IsString()
    //@IsEnum(EventType) TODO fix
    event: EventType;

    //@IsString() @IsNotEmpty()
    @IsOptional() @IsString()
    path: string;

    @IsOptional() @IsString()
    referrer?: string;

    @IsOptional() @IsString()
    contentId?: string;

    @IsOptional() @IsString()
    title?: string;
}

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
    private readonly logger = new Logger(AnalyticsController.name);

    constructor(private readonly analyticsService: AnalyticsService) {}

    @ApiOperation({ summary: 'Record a frontend analytics event' })
    @Post('event')
    @HttpCode(HttpStatus.NO_CONTENT)
    recordEvent(@Body() dto: AnalyticsEventDto): void {
        this.logger.log("enter recordEvent");
        this.logger.log('recordEventTest=' + JSON.stringify(dto));
        switch (dto.event) {
            case EventType.ARTICLE_VIEW:
                if (dto.contentId) {
                    this.analyticsService.recordArticleView(dto.contentId, dto.title || '');
                }
                break;
            case EventType.COURSE_VIEW:
                if (dto.contentId) {
                    this.analyticsService.recordCourseView(dto.contentId, dto.title || '');
                }
                break;
            case EventType.PAGE_VIEW:
            default:
                this.analyticsService.recordPageView(dto.path, dto.referrer);
                break;
        }
    }
}
