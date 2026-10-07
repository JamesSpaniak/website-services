import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  // Same rule as ResetPasswordDto and the signup forms.
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  picture_url?: string;

  @ApiPropertyOptional({
    description:
      'One-time invite code to join an organization on registration.',
  })
  @IsOptional()
  @IsString()
  invite_code?: string;

  @ApiPropertyOptional({
    description:
      'Admin-generated signup link code (promo) granting course access on registration.',
  })
  @IsOptional()
  @IsString()
  signup_code?: string;
}
