import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  // Email only. A stray required `username` field here 400'd every request
  // until Oct 2026 (the form never sends one).
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}
