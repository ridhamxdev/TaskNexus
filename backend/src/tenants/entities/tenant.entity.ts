import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo, BeforeCreate, BeforeUpdate } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { TenantInvitation } from './tenant-invitation.entity';
import { UserTenant } from './user-tenant.entity';
import { v4 as uuidv4 } from 'uuid';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_SETUP = 'pending_setup',
}

export enum TenantSubscriptionTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

@Table({
  tableName: 'tenants',
  timestamps: true,
  paranoid: true, // Soft deletes
})
export class Tenant extends Model<Tenant> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare description?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true, // Made optional for simplified creation
  })
  declare subdomain?: string; // For tenant-specific URLs

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare tenantKey: string; // Unique identifier for database naming

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare databaseName: string; // Tenant-specific database name

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // Made optional for simplified creation
  })
  declare adminUserId?: number; // Primary tenant administrator

  @BelongsTo(() => User)
  declare adminUser?: User;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare contactEmail: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare contactPhone?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare password_hash: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare age?: number; // Organization age in years

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare address?: string;

  @Column({
    type: DataType.ENUM(...Object.values(TenantStatus)),
    allowNull: false,
    defaultValue: TenantStatus.PENDING_SETUP,
  })
  declare status: TenantStatus;

  @Column({
    type: DataType.ENUM(...Object.values(TenantSubscriptionTier)),
    allowNull: false,
    defaultValue: TenantSubscriptionTier.BASIC,
  })
  declare subscriptionTier: TenantSubscriptionTier;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare settings?: {
    maxUsers?: number;
    allowUserRegistration?: boolean;
    enableTwoFactor?: boolean;
    dashboardStyle?: {
      theme?: 'modern-dark' | 'classic-light' | 'dark-blue' | 'minimal-gray';
      accentColor?: string;
      layout?: 'cards' | 'compact' | 'detailed';
      chartStyle?: 'modern' | 'classic' | 'minimal';
    };
    customBranding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    features?: {
      emailService?: boolean;
      transactionManagement?: boolean;
      subscriptionManagement?: boolean;
    };
  };

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata?: Record<string, any>;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare lastAccessDate?: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare userCount: number; // Cached count of associated users

  // Relationships
  @HasMany(() => TenantInvitation)
  declare invitations: TenantInvitation[];

  @HasMany(() => UserTenant)
  declare userTenants: UserTenant[];

  // Hooks
  @BeforeCreate
  static async generateTenantKey(instance: Tenant) {
    if (!instance.tenantKey) {
      instance.tenantKey = `tenant_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    }
    if (!instance.databaseName) {
      instance.databaseName = Tenant.generateDatabaseName(instance.name);
    }
  }

  @BeforeUpdate
  static async updateTimestamp(instance: Tenant) {
    instance.lastAccessDate = new Date();
  }

  // Instance methods
  public async updateUserCount(): Promise<void> {
    const count = await UserTenant.count({ where: { tenantId: this.id } });
    this.userCount = count;
    await this.save();
  }

  public isActive(): boolean {
    return this.status === TenantStatus.ACTIVE;
  }

  public canInviteUsers(): boolean {
    return this.isActive() && 
           (!this.settings?.maxUsers || this.userCount < this.settings.maxUsers);
  }

  public static sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  public static generateDatabaseName(tenantName: string): string {
    const sanitizedName = Tenant.sanitizeName(tenantName);
    return `tenant_${sanitizedName}_db`;
  }
} 