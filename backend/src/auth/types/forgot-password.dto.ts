import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  username?: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}