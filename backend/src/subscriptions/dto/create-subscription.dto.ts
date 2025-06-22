import { IsNotEmpty, IsInt, IsOptional, IsBoolean } from 'class-validator';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsInt()
  planId: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = true;
} 