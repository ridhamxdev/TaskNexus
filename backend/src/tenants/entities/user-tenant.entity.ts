import { Table, Column, Model, DataType, ForeignKey, BelongsTo, BeforeCreate, BeforeUpdate } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { Tenant } from './tenant.entity';

export enum UserTenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum UserTenantRole {
  MEMBER = 'member',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  VIEWER = 'viewer',
}

@Table({
  tableName: 'user_tenants',
  timestamps: true,
  paranoid: true, // Soft deletes
  indexes: [
    {
      unique: true,
      fields: ['userId', 'tenantId'],
      name: 'unique_user_tenant',
    },
  ],
})
export class UserTenant extends Model<UserTenant> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare tenantId: number;

  @BelongsTo(() => Tenant)
  declare tenant: Tenant;

  @Column({
    type: DataType.ENUM(...Object.values(UserTenantRole)),
    allowNull: false,
    defaultValue: UserTenantRole.MEMBER,
  })
  declare role: UserTenantRole;

  @Column({
    type: DataType.ENUM(...Object.values(UserTenantStatus)),
    allowNull: false,
    defaultValue: UserTenantStatus.ACTIVE,
  })
  declare status: UserTenantStatus;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare joinedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare lastAccessAt?: Date;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare permissions?: {
    canViewUsers?: boolean;
    canInviteUsers?: boolean;
    canManageUsers?: boolean;
    canViewTransactions?: boolean;
    canViewEmails?: boolean;
    canViewReports?: boolean;
    canManageSettings?: boolean;
  };

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare preferences?: {
    notifications?: {
      email?: boolean;
      sms?: boolean;
      inApp?: boolean;
    };
    dashboard?: {
      defaultView?: string;
      widgets?: string[];
    };
  };

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata?: Record<string, any>;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare notes?: string; // Admin notes about this user

  // Hooks
  @BeforeCreate
  static async setDefaultPermissions(instance: UserTenant) {
    if (!instance.permissions) {
      // Set default permissions based on role
      switch (instance.role) {
        case UserTenantRole.ADMIN:
          instance.permissions = {
            canViewUsers: true,
            canInviteUsers: true,
            canManageUsers: true,
            canViewTransactions: true,
            canViewEmails: true,
            canViewReports: true,
            canManageSettings: true,
          };
          break;
        case UserTenantRole.MODERATOR:
          instance.permissions = {
            canViewUsers: true,
            canInviteUsers: true,
            canManageUsers: false,
            canViewTransactions: true,
            canViewEmails: true,
            canViewReports: true,
            canManageSettings: false,
          };
          break;
        case UserTenantRole.VIEWER:
          instance.permissions = {
            canViewUsers: true,
            canInviteUsers: false,
            canManageUsers: false,
            canViewTransactions: true,
            canViewEmails: false,
            canViewReports: true,
            canManageSettings: false,
          };
          break;
        default: // MEMBER
          instance.permissions = {
            canViewUsers: false,
            canInviteUsers: false,
            canManageUsers: false,
            canViewTransactions: false,
            canViewEmails: false,
            canViewReports: false,
            canManageSettings: false,
          };
      }
    }
  }

  @BeforeUpdate
  static async updateLastAccess(instance: UserTenant) {
    if (instance.changed('status') && instance.status === UserTenantStatus.ACTIVE) {
      instance.lastAccessAt = new Date();
    }
  }

  // Instance methods
  public isActive(): boolean {
    return this.status === UserTenantStatus.ACTIVE;
  }

  public hasPermission(permission: keyof NonNullable<UserTenant['permissions']>): boolean {
    return this.permissions?.[permission] === true;
  }

  public isAdmin(): boolean {
    return this.role === UserTenantRole.ADMIN;
  }

  public isModerator(): boolean {
    return this.role === UserTenantRole.MODERATOR;
  }

  public canManageUsers(): boolean {
    return this.hasPermission('canManageUsers');
  }

  public canViewUsers(): boolean {
    return this.hasPermission('canViewUsers');
  }

  public canInviteUsers(): boolean {
    return this.hasPermission('canInviteUsers');
  }

  public async updateLastAccess(): Promise<void> {
    this.lastAccessAt = new Date();
    await this.save();
  }
} 