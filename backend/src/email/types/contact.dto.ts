import { IsString, IsEmail, MinLength } from 'class-validator';

export class ContactDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  contact: string;

  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  message: string;
}