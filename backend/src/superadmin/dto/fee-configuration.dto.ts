import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class FeeConfigurationDto {
  @IsNumber()
  @Min(0)
  minAmount: number;

  @IsNumber()
  @IsNotEmpty()
  maxAmount: number;

  @IsNumber()
  @Min(0)
  fee: number;
} 