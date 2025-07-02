import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { SubscriptionPlan } from '../../subscriptions/entities/subscription-plan.entity';

export enum FeeConfigurationType {
  SEND_MONEY = 'send_money',
  SUBSCRIPTION = 'subscription'
}

@Table({ tableName: 'fee_configurations', timestamps: true })
export class FeeConfiguration extends Model<FeeConfiguration> {
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
    type: DataType.ENUM(...Object.values(FeeConfigurationType)),
    allowNull: false,
    defaultValue: FeeConfigurationType.SEND_MONEY,
  })
  declare type: FeeConfigurationType;

  // For send money fees
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true, // nullable for subscription fees
  })
  declare minAmount?: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true, // nullable for subscription fees
  })
  declare maxAmount?: number;

  // For subscription fees
  @ForeignKey(() => SubscriptionPlan)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // nullable for send money fees
    field: 'subscriptionPlanId', // explicit mapping to database column
  })
  declare subscriptionPlanId?: number;

  @BelongsTo(() => SubscriptionPlan)
  declare subscriptionPlan?: SubscriptionPlan;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  declare fee: number;
} 