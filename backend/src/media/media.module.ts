import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { SignedUrlService } from './signed-url.service';
import { OrphanMediaService } from './orphan-media.service';
import { Article } from '../articles/types/article.entity';
import { Course } from '../courses/types/course.entity';
import { User } from '../users/types/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Article, Course, User])],
    controllers: [MediaController],
    providers: [MediaService, SignedUrlService, OrphanMediaService],
    exports: [MediaService, SignedUrlService],
})
export class MediaModule {}
