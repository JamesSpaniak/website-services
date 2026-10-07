import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetWithCodeDto {
  @ApiProperty({ description: 'Username or email.' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'K7QM-3XPD',
    description: 'Code from the teacher; case, spaces and dashes are ignored.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
