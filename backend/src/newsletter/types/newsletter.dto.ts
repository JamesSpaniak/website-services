import { IsString, MaxLength, MinLength } from 'class-validator';

/** The whole issue file (front matter + markdown), as uploaded. */
export class IssueFileDto {
  @IsString()
  @MinLength(20)
  @MaxLength(100_000)
  source: string;
}
