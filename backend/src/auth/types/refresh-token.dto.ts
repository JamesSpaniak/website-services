import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token. Optional — the HttpOnly refresh_token cookie is preferred; the body is a fallback for non-browser clients.',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
