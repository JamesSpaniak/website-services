import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PurchaseCourseDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;
}

export class ConfirmPurchaseDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
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
