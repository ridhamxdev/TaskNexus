import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsArray, IsObject } from 'class-validator';
import { InvitationType } from '../entities/tenant-invitation.entity';

export class SendInvitationDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(InvitationType)
  invitationType?: InvitationType;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    userRole?: string;
    permissions?: string[];
    welcomeMessage?: string;
    redirectUrl?: string;
  };
}

export class BulkInvitationDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @IsOptional()
  @IsEnum(InvitationType)
  invitationType?: InvitationType;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    userRole?: string;
    permissions?: string[];
    welcomeMessage?: string;
    redirectUrl?: string;
  };
}

export class AcceptInvitationDto {
  @IsString()
  invitationToken: string;

  @IsOptional()
  @IsString()
  userName?: string; // If user doesn't exist, they can provide a name

  @IsOptional()
  @IsString()
  password?: string; // If user doesn't exist, they need to set a password
}

export class RejectInvitationDto {
  @IsString()
  invitationToken: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResendInvitationDto {
  @IsNumber()
  invitationId: number;

  @IsOptional()
  @IsString()
  message?: string;
} 