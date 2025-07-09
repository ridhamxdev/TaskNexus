import { IsNotEmpty, IsNumber, Min, IsEnum, IsOptional, ValidateIf, IsArray, ValidateNested, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FeeConfigurationType } from '../entities/fee-configuration.entity';

export class FeeConfigurationDto {
  @IsEnum(FeeConfigurationType)
  @IsNotEmpty()
  type: FeeConfigurationType;

  // For send money and add money fees
  @ValidateIf(o => o.type === FeeConfigurationType.SEND_MONEY || o.type === FeeConfigurationType.ADD_MONEY)
  @IsNumber({}, { message: 'minAmount must be a number' })
  @Min(0, { message: 'minAmount must not be less than 0' })
  minAmount?: number;

  @ValidateIf(o => o.type === FeeConfigurationType.SEND_MONEY || o.type === FeeConfigurationType.ADD_MONEY)
  @IsNumber({}, { message: 'maxAmount must be a number' })
  @Min(0, { message: 'maxAmount must not be less than 0' })
  maxAmount?: number;

  // For subscription fees - required only when type is SUBSCRIPTION
  @ValidateIf(o => o.type === FeeConfigurationType.SUBSCRIPTION)
  @IsNumber({}, { message: 'subscriptionPlanId must be a number' })
  @IsNotEmpty({ message: 'subscriptionPlanId is required for subscription fees' })
  subscriptionPlanId?: number;

  @IsNumber({}, { message: 'fee must be a number' })
  @Min(0, { message: 'fee must not be less than 0' })
  fee: number;
}

export class BulkFeeConfigurationItemDto {
  @IsOptional()
  @IsNumber({}, { message: 'id must be a number' })
  id?: number;

  @IsEnum(FeeConfigurationType, { message: 'type must be a valid fee configuration type' })
  @IsNotEmpty({ message: 'type is required' })
  type: FeeConfigurationType;

  // For send money and add money fees
  @ValidateIf(o => o.type === FeeConfigurationType.SEND_MONEY || o.type === FeeConfigurationType.ADD_MONEY)
  @IsNumber({}, { message: 'minAmount must be a number' })
  @Min(0, { message: 'minAmount must not be less than 0' })
  minAmount?: number;

  @ValidateIf(o => o.type === FeeConfigurationType.SEND_MONEY || o.type === FeeConfigurationType.ADD_MONEY)
  @IsNumber({}, { message: 'maxAmount must be a number' })
  @Min(0, { message: 'maxAmount must not be less than 0' })
  maxAmount?: number;

  // For subscription fees - required only when type is SUBSCRIPTION
  @ValidateIf(o => o.type === FeeConfigurationType.SUBSCRIPTION)
  @IsNumber({}, { message: 'subscriptionPlanId must be a number' })
  @IsNotEmpty({ message: 'subscriptionPlanId is required for subscription fees' })
  subscriptionPlanId?: number;

  @IsNumber({}, { message: 'fee must be a number' })
  @Min(0, { message: 'fee must not be less than 0' })
  fee: number;
}

export class BulkFeeConfigurationDto {
  @IsArray({ message: 'feeConfigurations must be an array' })
  @ValidateNested({ each: true })
  @Type(() => BulkFeeConfigurationItemDto)
  feeConfigurations: BulkFeeConfigurationItemDto[];
} 