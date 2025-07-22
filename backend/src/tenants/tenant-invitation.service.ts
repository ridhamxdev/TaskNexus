import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  BadRequestException, 
  ConflictException,
  UnauthorizedException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Entities
import { TenantInvitation, InvitationStatus, InvitationType } from './entities/tenant-invitation.entity';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserTenant, UserTenantRole, UserTenantStatus } from './entities/user-tenant.entity';

// DTOs
import { 
  SendInvitationDto, 
  BulkInvitationDto, 
  AcceptInvitationDto, 
  RejectInvitationDto,
  ResendInvitationDto 
} from './dto/tenant-invitation.dto';

// Services
import { EmailsService } from '../emails/emails.service';
import { TenantsService } from './tenants.service';

@Injectable()
export class TenantInvitationService {
  private readonly logger = new Logger(TenantInvitationService.name);

  constructor(
    @InjectModel(TenantInvitation) private invitationModel: typeof TenantInvitation,
    @InjectModel(Tenant) private tenantModel: typeof Tenant,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(UserTenant) private userTenantModel: typeof UserTenant,
    private emailsService: EmailsService,
    private tenantsService: TenantsService,
  ) {}

  /**
   * Send invitation to a user to join a tenant
   */
  async sendInvitation(
    tenantId: number,
    sendInvitationDto: SendInvitationDto,
    invitedByUserId: number
  ): Promise<TenantInvitation> {
    const tenant = await this.tenantModel.findByPk(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.isActive()) {
      throw new BadRequestException('Cannot send invitations for inactive tenant');
    }

    if (!tenant.canInviteUsers()) {
      throw new BadRequestException('Tenant has reached maximum user limit');
    }

    // Check if user is already invited or part of tenant
    const existingInvitation = await this.invitationModel.findOne({
      where: {
        tenantId,
        email: sendInvitationDto.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation && !existingInvitation.isExpired()) {
      throw new ConflictException('User already has a pending invitation');
    }

    // Check if user is already part of tenant
    const existingUser = await this.userModel.findOne({
      where: { email: sendInvitationDto.email },
    });

    if (existingUser) {
      const existingUserTenant = await this.userTenantModel.findOne({
        where: { userId: existingUser.id, tenantId },
      });
      if (existingUserTenant) {
        throw new ConflictException('User is already part of this tenant');
      }
    }

    // Create invitation
    const invitationToken = uuidv4();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    const invitation = await this.invitationModel.create({
      tenantId,
      invitedByUserId,
      invitedUserId: existingUser?.id || undefined,
      email: sendInvitationDto.email,
      phone: sendInvitationDto.phone,
      invitationType: sendInvitationDto.invitationType || InvitationType.EMAIL,
      message: sendInvitationDto.message,
      metadata: sendInvitationDto.metadata,
      invitationToken,
      expiresAt: expiryDate,
    } as any);

    // Send invitation email
    await this.sendInvitationEmail(invitation, tenant);

    // TODO: Send SMS if phone number provided and invitationType includes PHONE

    this.logger.log(`Invitation sent to ${sendInvitationDto.email} for tenant ${tenant.name}`);
    return invitation;
  }

  /**
   * Send bulk invitations
   */
  async sendBulkInvitations(
    tenantId: number,
    bulkInvitationDto: BulkInvitationDto,
    invitedByUserId: number
  ): Promise<{
    successful: TenantInvitation[];
    failed: Array<{ email: string; reason: string }>;
  }> {
    const successful: TenantInvitation[] = [];
    const failed: Array<{ email: string; reason: string }> = [];

    for (const email of bulkInvitationDto.emails) {
      try {
        const invitation = await this.sendInvitation(
          tenantId,
          { ...bulkInvitationDto, email },
          invitedByUserId
        );
        successful.push(invitation);
      } catch (error) {
        failed.push({ email, reason: error.message });
      }
    }

    this.logger.log(`Bulk invitations sent: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(acceptInvitationDto: AcceptInvitationDto): Promise<{
    userTenant: UserTenant;
    isNewUser: boolean;
    message: string;
  }> {
    const invitation = await this.invitationModel.findOne({
      where: { invitationToken: acceptInvitationDto.invitationToken },
      include: [
        { model: Tenant },
        { model: User, as: 'invitedBy' },
      ],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.canBeAccepted()) {
      throw new BadRequestException('Invitation cannot be accepted (expired or already processed)');
    }

    let user = await this.userModel.findOne({
      where: { email: invitation.email },
    });

    let isNewUser = false;

    // If user doesn't exist, create them
    if (!user) {
      if (!acceptInvitationDto.userName || !acceptInvitationDto.password) {
        throw new BadRequestException('Name and password are required for new users');
      }

      const hashedPassword = await bcrypt.hash(acceptInvitationDto.password, 10);
      
      user = await this.userModel.create({
        name: acceptInvitationDto.userName,
        email: invitation.email,
        password_hash: hashedPassword,
        role: UserRole.USER,
        balance: 0,
      } as any);

      isNewUser = true;
    }

    // Create UserTenant association
    const userTenant = await this.tenantsService.addUserToTenant(
      invitation.tenantId,
      user.id,
      (invitation.metadata?.userRole as UserTenantRole) || UserTenantRole.MEMBER,
      invitation.invitedByUserId
    );

    // Mark invitation as accepted
    await invitation.markAsAccepted(user.id);

    // Send welcome email
    await this.sendWelcomeEmail(user, invitation.tenant, invitation);

    this.logger.log(`Invitation accepted by ${user.email} for tenant ${invitation.tenant.name}`);

    return {
      userTenant,
      isNewUser,
      message: isNewUser 
        ? 'Account created and invitation accepted successfully' 
        : 'Invitation accepted successfully',
    };
  }

  /**
   * Reject invitation
   */
  async rejectInvitation(rejectInvitationDto: RejectInvitationDto): Promise<void> {
    const invitation = await this.invitationModel.findOne({
      where: { invitationToken: rejectInvitationDto.invitationToken },
      include: [{ model: Tenant }],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.canBeAccepted()) {
      throw new BadRequestException('Invitation cannot be rejected (expired or already processed)');
    }

    await invitation.markAsRejected(rejectInvitationDto.reason);

    this.logger.log(`Invitation rejected by ${invitation.email} for tenant ${invitation.tenant.name}`);
  }

  /**
   * Get invitations for a tenant
   */
  async getTenantInvitations(
    tenantId: number,
    page: number = 1,
    limit: number = 10,
    status?: InvitationStatus
  ): Promise<{
    invitations: TenantInvitation[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    const whereClause: any = { tenantId };
    
    if (status) {
      whereClause.status = status;
    }

    const { rows: invitations, count: total } = await this.invitationModel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      include: [
        { model: User, as: 'invitedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'invitedUser', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return {
      invitations,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get invitation by token (for public access)
   */
  async getInvitationByToken(token: string): Promise<{
    invitation: TenantInvitation;
    tenant: Tenant;
    canAccept: boolean;
  }> {
    const invitation = await this.invitationModel.findOne({
      where: { invitationToken: token },
      include: [
        { model: Tenant },
        { model: User, as: 'invitedBy', attributes: ['id', 'name'] },
      ],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return {
      invitation,
      tenant: invitation.tenant,
      canAccept: invitation.canBeAccepted(),
    };
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: number, cancelledByUserId: number): Promise<void> {
    const invitation = await this.invitationModel.findByPk(invitationId);
    
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    invitation.status = InvitationStatus.CANCELLED;
    await invitation.save();

    this.logger.log(`Invitation ${invitationId} cancelled by user ${cancelledByUserId}`);
  }

  /**
   * Resend invitation
   */
  async resendInvitation(
    resendInvitationDto: ResendInvitationDto,
    resentByUserId: number
  ): Promise<TenantInvitation> {
    const invitation = await this.invitationModel.findByPk(resendInvitationDto.invitationId, {
      include: [{ model: Tenant }],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only resend pending invitations');
    }

    // Update message if provided
    if (resendInvitationDto.message) {
      invitation.message = resendInvitationDto.message;
    }

    // Extend expiry
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);
    invitation.expiresAt = newExpiry;

    await invitation.save();

    // Resend email
    await this.sendInvitationEmail(invitation, invitation.tenant);

    this.logger.log(`Invitation ${invitation.id} resent by user ${resentByUserId}`);
    return invitation;
  }

  /**
   * Expire old invitations (cleanup job)
   */
  async expireOldInvitations(): Promise<number> {
    const expiredInvitations = await this.invitationModel.findAll({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { [Op.lt]: new Date() },
      },
    });

    for (const invitation of expiredInvitations) {
      await invitation.markAsExpired();
    }

    this.logger.log(`Expired ${expiredInvitations.length} old invitations`);
    return expiredInvitations.length;
  }

  /**
   * Delete all invitations for a tenant
   */
  async deleteAllInvitationsForTenant(tenantId: number): Promise<{ deleted: number }> {
    const deleted = await this.invitationModel.destroy({ where: { tenantId } });
    this.logger.log(`Deleted ${deleted} invitations for tenant ${tenantId}`);
    return { deleted };
  }

  /**
   * Private method to send invitation email
   */
  private async sendInvitationEmail(invitation: TenantInvitation, tenant: Tenant): Promise<void> {
    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invitation/${invitation.invitationToken}`;
    const rejectUrl = `${process.env.FRONTEND_URL}/reject-invitation/${invitation.invitationToken}`;

    const subject = `Invitation to join ${tenant.name}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join ${tenant.name}</h2>
        
        ${invitation.message ? `<p><strong>Message:</strong> ${invitation.message}</p>` : ''}
        
        <p>You have been invited to join <strong>${tenant.name}</strong> as a team member.</p>
        
        <div style="margin: 30px 0;">
          <a href="${acceptUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 10px;">
            Accept Invitation
          </a>
          
          <a href="${rejectUrl}" 
             style="background-color: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reject Invitation
          </a>
        </div>
        
        <p><small>This invitation will expire on ${invitation.expiresAt.toLocaleDateString()}.</small></p>
        
        <hr style="margin: 30px 0;">
        <p><small>If you're having trouble with the buttons above, copy and paste these URLs into your browser:</small></p>
        <p><small>Accept: ${acceptUrl}</small></p>
        <p><small>Reject: ${rejectUrl}</small></p>
      </div>
    `;

    // Use the existing email service to send the invitation
    await this.emailsService.sendEmail({
      to: invitation.email,
      subject,
      html: htmlBody,
    });
  }

  /**
   * Find invitation by ID
   */
  async findOne(id: number): Promise<TenantInvitation | null> {
    return this.invitationModel.findByPk(id, {
      include: [
        { model: Tenant },
        { model: User, as: 'invitedBy', attributes: ['id', 'name'] },
      ],
    });
  }

  /**
   * Get invitation statistics for a tenant
   */
  async getInvitationStats(tenantId: number): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
    cancelled: number;
  }> {
    const stats = await this.invitationModel.findAll({
      where: { tenantId },
      attributes: [
        'status',
        [this.invitationModel.sequelize!.fn('COUNT', '*'), 'count'],
      ],
      group: ['status'],
      raw: true,
    }) as any[];

    const result = {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      cancelled: 0,
    };

    stats.forEach((stat: any) => {
      const status = stat.status.toLowerCase();
      const count = parseInt(stat.count);
      result.total += count;
      
      if (status in result) {
        (result as any)[status] = count;
      }
    });

    return result;
  }

  /**
   * Get all invitations (SuperAdmin only)
   */
  async getAllInvitations(
    page: number = 1,
    limit: number = 10,
    status?: string,
    tenantId?: number
  ): Promise<{
    invitations: TenantInvitation[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const { rows: invitations, count: total } = await this.invitationModel.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: Tenant, attributes: ['id', 'name', 'subdomain'] },
        { model: User, as: 'invitedBy', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return {
      invitations,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Private method to send welcome email
   */
  private async sendWelcomeEmail(
    user: User, 
    tenant: Tenant, 
    invitation: TenantInvitation
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const tenantUrl = `${process.env.FRONTEND_URL}/tenant/${tenant.subdomain}`;

    const subject = `Welcome to ${tenant.name}!`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ${tenant.name}!</h2>
        
        <p>Hi ${user.name},</p>
        
        <p>Welcome to <strong>${tenant.name}</strong>! Your invitation has been accepted and you now have access to the tenant dashboard.</p>
        
        ${invitation.metadata?.welcomeMessage ? `<p>${invitation.metadata.welcomeMessage}</p>` : ''}
        
        <div style="margin: 30px 0;">
          <a href="${tenantUrl}" 
             style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Access Dashboard
          </a>
        </div>
        
        <p>You can log in at any time using: <a href="${loginUrl}">${loginUrl}</a></p>
        
        <p>If you have any questions, please don't hesitate to reach out.</p>
        
        <p>Best regards,<br>The ${tenant.name} Team</p>
      </div>
    `;

    await this.emailsService.sendEmail({
      to: user.email,
      subject,
      html: htmlBody,
    });
  }

  /**
   * Debug: List all invitation tokens for a tenant
   */
  async listInvitationTokensForTenant(tenantId: number): Promise<any[]> {
    const invitations = await this.invitationModel.findAll({
      where: { tenantId },
      attributes: ['id', 'email', 'invitationToken', 'status', 'createdAt', 'expiresAt'],
      order: [['createdAt', 'DESC']]
    });
    return invitations;
  }
} 