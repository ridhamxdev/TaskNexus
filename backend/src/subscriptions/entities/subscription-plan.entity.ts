import { Table, Column, Model, DataType, HasMany, AllowNull } from 'sequelize-typescript';
import { UserSubscription } from './user-subscription.entity';

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

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
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

  @HasMany(() => UserSubscription)
  declare userSubscriptions: UserSubscription[];
} 