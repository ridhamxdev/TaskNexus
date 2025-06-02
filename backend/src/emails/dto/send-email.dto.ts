import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;
} 