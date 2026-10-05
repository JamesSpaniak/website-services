import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Current password, re-entered to confirm.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;
}
