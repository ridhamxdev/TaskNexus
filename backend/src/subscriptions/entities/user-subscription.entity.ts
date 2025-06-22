import { Table, Column, Model, DataType, BelongsTo, ForeignKey, HasMany, AllowNull } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionPayment } from './subscription-payment.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

@Table({
  tableName: 'user_subscriptions',
  timestamps: true,
})
export class UserSubscription extends Model<UserSubscription> {
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

  @ForeignKey(() => SubscriptionPlan)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare planId: number;

  @Column({
    type: DataType.ENUM(...Object.values(SubscriptionStatus)),
    allowNull: false,
    defaultValue: SubscriptionStatus.PENDING,
  })
  declare status: SubscriptionStatus;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare endDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare nextBillingDate?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare cancelledAt?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare cancellationReason?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare autoRenew: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare emailsUsed: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare transactionsUsed: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata?: Record<string, any>;

  @BelongsTo(() => User)
  declare user: User;

  @BelongsTo(() => SubscriptionPlan)
  declare plan: SubscriptionPlan;

  @HasMany(() => SubscriptionPayment)
  declare payments: SubscriptionPayment[];

  // Method to check if subscription is active
  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE && 
           new Date() <= this.endDate;
  }

  // Method to check if subscription is about to expire (within 7 days)
  isExpiringSoon(): boolean {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.endDate <= sevenDaysFromNow && this.endDate > now;
  }

  // Method to check if renewal is due
  isRenewalDue(): boolean {
    return this.nextBillingDate ? new Date() >= this.nextBillingDate : false;
  }
} 