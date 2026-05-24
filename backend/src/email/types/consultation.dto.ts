import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ConsultationDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(2)
  organization: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  student_count?: string;

  @IsString()
  preferred_time: string;

  @IsString()
  @MinLength(10)
  topics: string;
}
