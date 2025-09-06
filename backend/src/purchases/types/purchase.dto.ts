import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

export class PurchaseCourseDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;
}

export enum ProMembershipDuration {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export class UpgradeToProDto {
  @IsEnum(ProMembershipDuration)
  @IsNotEmpty()
  duration: ProMembershipDuration;
}