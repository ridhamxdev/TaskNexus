import { IsDecimal, IsOptional, IsString, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { FeeType } from '../entities/default-fee-configuration.entity';

export class CreateDefaultFeeConfigurationDto {
  @IsNumber()
  feeAmount: number;

  @IsEnum(FeeType)
  feeType: FeeType;

  @IsNumber()
  minAmount: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDefaultFeeConfigurationDto {
  @IsOptional()
  @IsNumber()
  feeAmount?: number;

  @IsOptional()
  @IsEnum(FeeType)
  feeType?: FeeType;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ToggleUserDefaultFeeDto {
  @IsBoolean()
  defaultFeeEnabled: boolean;
} 