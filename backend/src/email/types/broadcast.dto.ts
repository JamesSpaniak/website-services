import { IsString, MinLength } from 'class-validator';

export class BroadcastDto {
  @IsString()
  @MinLength(10)
  subject: string;

  @IsString()
  @MinLength(20)
  message: string; // Can be HTML
}

