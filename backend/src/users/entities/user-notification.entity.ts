import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.entity';
import { FeeConfigurationVersion } from '../../superadmin/entities/fee-configuration-version.entity';

export enum NotificationType {
  FEE_CHANGE = 'FEE_CHANGE',
  FEE_ADDED = 'FEE_ADDED',
  FEE_REMOVED = 'FEE_REMOVED',
  SYSTEM = 'SYSTEM'
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  DISMISSED = 'DISMISSED'
}

@Table({ tableName: 'user_notifications', timestamps: true })
export class UserNotification extends Model<UserNotification> {
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

  @Column({
    type: DataType.ENUM(...Object.values(NotificationType)),
    allowNull: false,
  })
  declare type: NotificationType;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare message: string;

  @Column({
    type: DataType.ENUM(...Object.values(NotificationStatus)),
    allowNull: false,
    defaultValue: NotificationStatus.UNREAD,
  })
  declare status: NotificationStatus;

  @ForeignKey(() => FeeConfigurationVersion)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // nullable for non-fee-related notifications
  })
  declare feeConfigurationVersionId?: number;

  @BelongsTo(() => FeeConfigurationVersion)
  declare feeConfigurationVersion?: FeeConfigurationVersion;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata?: any;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare emailSent: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare emailSentAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare readAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare updatedAt: Date;
} 