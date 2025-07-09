import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { SubscriptionPlan } from '../../subscriptions/entities/subscription-plan.entity';

export enum FeeConfigurationType {
  SEND_MONEY = 'send_money',
  ADD_MONEY = 'add_money',
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

  /**
   * Determines if the given amount falls within this fee configuration's range
   * Uses inclusive lower bound and inclusive upper bound (minAmount ≤ amount ≤ maxAmount)
   * @param amount The transaction amount to check
   * @returns boolean indicating if this fee configuration applies to the amount
   */
  isApplicableForAmount(amount: number): boolean {
    // Return false if either bound is undefined (for subscription fees)
    if (this.minAmount === undefined || this.maxAmount === undefined) {
      return false;
    }
    return amount >= this.minAmount && amount <= this.maxAmount;
  }

  /**
   * Gets the fee amount if applicable for the given amount, otherwise returns null
   * @param amount The transaction amount to check
   * @returns The fee amount if applicable, null otherwise
   */
  getFeeForAmount(amount: number): number | null {
    return this.isApplicableForAmount(amount) ? this.fee : null;
  }
} 