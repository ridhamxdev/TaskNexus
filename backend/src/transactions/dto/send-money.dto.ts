import { IsEmail, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class SendMoneyDto {
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
} 