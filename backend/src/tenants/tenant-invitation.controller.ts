import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  Query,
  ParseIntPipe,
  BadRequestException,
  ForbiddenException,
  NotFoundException 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TenantInvitationService } from './tenant-invitation.service';
import { TenantsService } from './tenants.service';
import { SendInvitationDto, BulkInvitationDto, AcceptInvitationDto, RejectInvitationDto, ResendInvitationDto } from './dto/tenant-invitation.dto';

@Controller('tenant-invitations')
export class TenantInvitationController {
  constructor(
    private readonly invitationService: TenantInvitationService,
    private readonly tenantsService: TenantsService,
  ) {}

  /**
   * Send invitation to join tenant
   */
  @Post('tenant/:tenantId/invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async sendInvitation(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() sendInvitationDto: SendInvitationDto,
    @Request() req
  ) {
    // Check if user has permission to invite for this tenant
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, tenantId);
      if (!userTenant || !userTenant.canInviteUsers()) {
        throw new ForbiddenException('Access denied to send invitations for this tenant');
      }
    }

    return this.invitationService.sendInvitation(tenantId, sendInvitationDto, req.user.userId);
  }

  /**
   * Send bulk invitations to join tenant
   */
  @Post('tenant/:tenantId/bulk-invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async sendBulkInvitations(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() bulkInvitationDto: BulkInvitationDto,
    @Request() req
  ) {
    // Check permissions
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, tenantId);
      if (!userTenant || !userTenant.canInviteUsers()) {
        throw new ForbiddenException('Access denied to send invitations for this tenant');
      }
    }

    return this.invitationService.sendBulkInvitations(tenantId, bulkInvitationDto, req.user.userId);
  }

  /**
   * Get invitations for a tenant
   */
  @Get('tenant/:tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async getTenantInvitations(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Request() req,
    @Query('status') status?: string
  ) {
    // Check permissions
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, tenantId);
      if (!userTenant || !userTenant.canViewUsers()) {
        throw new ForbiddenException('Access denied to view invitations for this tenant');
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return this.invitationService.getTenantInvitations(tenantId, pageNum, limitNum, status as any);
  }

  /**
   * Get invitation by token (public endpoint for invitation acceptance page)
   */
  @Get('token/:token')
  @Public()
  async getInvitationByToken(@Param('token') token: string) {
    const invitation = await this.invitationService.getInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundException('Invitation not found or expired');
    }
    return invitation;
  }

  /**
   * Accept invitation (public endpoint)
   */
  @Post('accept')
  @Public()
  async acceptInvitation(@Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.invitationService.acceptInvitation(acceptInvitationDto);
  }

  /**
   * Reject invitation (public endpoint)
   */
  @Post('reject')
  @Public()
  async rejectInvitation(@Body() rejectInvitationDto: RejectInvitationDto) {
    return this.invitationService.rejectInvitation(rejectInvitationDto);
  }

  /**
   * Cancel invitation
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async cancelInvitation(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const invitation = await this.invitationService.findOne(id);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check permissions
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, invitation.tenantId);
      if (!userTenant || !userTenant.canManageUsers()) {
        throw new ForbiddenException('Access denied to cancel this invitation');
      }
    }

    await this.invitationService.cancelInvitation(id, req.user.userId);
    return { message: 'Invitation cancelled successfully' };
  }

  /**
   * Resend invitation
   */
  @Post('resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async resendInvitation(@Body() resendInvitationDto: ResendInvitationDto, @Request() req) {
    const invitation = await this.invitationService.findOne(resendInvitationDto.invitationId);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check permissions
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, invitation.tenantId);
      if (!userTenant || !userTenant.canInviteUsers()) {
        throw new ForbiddenException('Access denied to resend this invitation');
      }
    }

    return this.invitationService.resendInvitation(resendInvitationDto, req.user.userId);
  }

  /**
   * Delete all invitations for a tenant
   */
  @Delete('tenant/:tenantId/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async deleteAllInvitationsForTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Request() req
  ) {
    // Check permissions
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, tenantId);
      if (!userTenant || !userTenant.canManageUsers()) {
        throw new ForbiddenException('Access denied to delete invitations for this tenant');
      }
    }
    return this.invitationService.deleteAllInvitationsForTenant(tenantId);
  }

  /**
   * Get invitation statistics for tenant (SuperAdmin only)
   */
  @Get('tenant/:tenantId/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getInvitationStats(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.invitationService.getInvitationStats(tenantId);
  }

  /**
   * Get all invitations (SuperAdmin only)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getAllInvitations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const tenantIdNum = tenantId ? parseInt(tenantId) : undefined;
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return this.invitationService.getAllInvitations(pageNum, limitNum, status, tenantIdNum);
  }

  /**
   * Debug: List all invitation tokens for a tenant
   */
  @Get('tenant/:tenantId/tokens')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async listInvitationTokensForTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Request() req
  ) {
    // Only allow superadmin or tenant admin to view tokens
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, tenantId);
      if (!userTenant || !userTenant.canManageUsers()) {
        throw new ForbiddenException('Access denied to view invitation tokens for this tenant');
      }
    }
    return this.invitationService.listInvitationTokensForTenant(tenantId);
  }
} 