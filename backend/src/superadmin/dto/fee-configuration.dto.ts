import { IsNotEmpty, IsNumber, Min, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { FeeConfigurationType } from '../entities/fee-configuration.entity';

export class FeeConfigurationDto {
  @IsEnum(FeeConfigurationType)
  @IsNotEmpty()
  type: FeeConfigurationType;

  // For send money fees - required only when type is SEND_MONEY
  @ValidateIf(o => o.type === FeeConfigurationType.SEND_MONEY)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ValidateIf(o => o.type === FeeConfigurationType.SEND_MONEY)
  @IsNumber()
  @IsNotEmpty()
  maxAmount?: number;

  // For subscription fees - required only when type is SUBSCRIPTION
  @ValidateIf(o => o.type === FeeConfigurationType.SUBSCRIPTION)
  @IsNumber()
  @IsNotEmpty()
  subscriptionPlanId: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  fee: number;
} 