import { IsNumber, IsPositive, Max, Min } from 'class-validator';

export class AddMoneyDto {
  @IsNumber()
  @IsPositive({ message: 'Amount must be greater than 0' })
  @Min(1, { message: 'Minimum amount is ₹1' })
  @Max(100000, { message: 'Maximum amount is ₹1,00,000' })
  amount: number;
} 