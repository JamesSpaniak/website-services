import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class FrontendLogDto {
  @ApiProperty({ enum: ['info', 'warn', 'error'] })
  @IsIn(['info', 'warn', 'error'])
  level: 'info' | 'warn' | 'error';

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
