import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsInt, IsObject } from 'class-validator';
import { BillingCycle, PlanStatus } from '../entities/subscription-plan.entity';

export class CreateSubscriptionPlanDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNotEmpty()
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @IsOptional()
  @IsInt()
  emailQuota?: number;

  @IsOptional()
  @IsInt()
  transactionLimit?: number;

  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus = PlanStatus.ACTIVE;

  @IsOptional()
  @IsInt()
  sortOrder?: number = 0;
} 