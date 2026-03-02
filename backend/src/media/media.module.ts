import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { SignedUrlService } from './signed-url.service';

@Module({
    controllers: [MediaController],
    providers: [MediaService, SignedUrlService],
    exports: [MediaService, SignedUrlService],
})
export class MediaModule {}
