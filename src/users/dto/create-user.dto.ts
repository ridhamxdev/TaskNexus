import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsDateString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6) // Assuming a minimum password length
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsDateString()
  @IsOptional() // Or IsNotEmpty based on your requirements
  dob?: string; // Or Date, if you prefer to transform it early
} 