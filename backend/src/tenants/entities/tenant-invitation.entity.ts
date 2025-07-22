import { Table, Column, Model, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { Tenant } from './tenant.entity';
import { User } from '../../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum InvitationType {
  EMAIL = 'email',
  PHONE = 'phone',
  BOTH = 'both',
}

@Table({
  tableName: 'tenant_invitations',
  timestamps: true,
})
export class TenantInvitation extends Model<TenantInvitation> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare tenantId: number;

  @BelongsTo(() => Tenant)
  declare tenant: Tenant;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare invitedByUserId: number; // Tenant admin who sent the invitation

  @BelongsTo(() => User, { as: 'invitedBy' })
  declare invitedBy: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // Null if user doesn't exist yet
  })
  declare invitedUserId?: number;

  @BelongsTo(() => User, { as: 'invitedUser' })
  declare invitedUser?: User;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare phone?: string;

  @Column({
    type: DataType.ENUM(...Object.values(InvitationType)),
    allowNull: false,
    defaultValue: InvitationType.EMAIL,
  })
  declare invitationType: InvitationType;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare invitationToken: string; // Unique token for accepting invitation

  @Column({
    type: DataType.ENUM(...Object.values(InvitationStatus)),
    allowNull: false,
    defaultValue: InvitationStatus.PENDING,
  })
  declare status: InvitationStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare message?: string; // Custom message from tenant

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare expiresAt: Date; // Invitation expiry

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare acceptedAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare rejectedAt?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare rejectionReason?: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata?: {
    userRole?: string; // Role to assign when accepted
    permissions?: string[];
    welcomeMessage?: string;
    redirectUrl?: string;
  };

  // Hooks
  @BeforeCreate
  static async generateInvitationToken(instance: TenantInvitation) {
    if (!instance.invitationToken) {
      instance.invitationToken = uuidv4();
    }
    if (!instance.expiresAt) {
      // Default expiry: 7 days from now
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      instance.expiresAt = expiryDate;
    }
  }

  // Instance methods
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public isPending(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired();
  }

  public canBeAccepted(): boolean {
    return this.isPending();
  }

  public async markAsAccepted(userId: number): Promise<void> {
    this.status = InvitationStatus.ACCEPTED;
    this.acceptedAt = new Date();
    this.invitedUserId = userId;
    await this.save();
  }

  public async markAsRejected(reason?: string): Promise<void> {
    this.status = InvitationStatus.REJECTED;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    await this.save();
  }

  public async markAsExpired(): Promise<void> {
    this.status = InvitationStatus.EXPIRED;
    await this.save();
  }
} 