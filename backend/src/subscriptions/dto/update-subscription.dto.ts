import { IsOptional, IsEnum, IsBoolean, IsString, IsInt } from 'class-validator';
import { SubscriptionStatus } from '../entities/user-subscription.entity';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsInt()
  planId?: number;
} 