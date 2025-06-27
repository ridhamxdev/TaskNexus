import { Table, Column, Model, DataType, HasMany, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserSubscription } from './user-subscription.entity';
import { User } from '../../users/entities/user.entity';

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
}

export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

@Table({
  tableName: 'subscription_plans',
  timestamps: true,
})
export class SubscriptionPlan extends Model<SubscriptionPlan> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // null for system-wide plans
  })
  declare userId?: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description?: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  declare price: number;

  @Column({
    type: DataType.ENUM(...Object.values(BillingCycle)),
    allowNull: false,
  })
  declare billingCycle: BillingCycle;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare features?: Record<string, any>;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare emailQuota?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare transactionLimit?: number;

  @Column({
    type: DataType.ENUM(...Object.values(PlanStatus)),
    allowNull: false,
    defaultValue: PlanStatus.ACTIVE,
  })
  declare status: PlanStatus;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare sortOrder: number;

  @BelongsTo(() => User)
  declare user?: User;

  @HasMany(() => UserSubscription)
  declare userSubscriptions: UserSubscription[];
} 