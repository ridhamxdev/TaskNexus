import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { UserSubscription } from './user-subscription.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  BALANCE = 'balance',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
}

@Table({
  tableName: 'subscription_payments',
  timestamps: true,
})
export class SubscriptionPayment extends Model<SubscriptionPayment> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => UserSubscription)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare subscriptionId: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  declare amount: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  })
  declare currency: string;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentMethod)),
    allowNull: false,
  })
  declare paymentMethod: PaymentMethod;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare paymentReference?: string;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
    defaultValue: PaymentStatus.PENDING,
  })
  declare status: PaymentStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare paymentDate?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare failureReason?: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata?: Record<string, any>;

  @BelongsTo(() => UserSubscription)
  declare subscription: UserSubscription;
} 