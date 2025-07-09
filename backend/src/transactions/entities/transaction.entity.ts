import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';

@Table({
  tableName: 'transactions',
  timestamps: true,
  underscored: true,
})
export class Transaction extends Model<Transaction> {
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
    field: 'user_id',
  })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  declare amount: number;

  @Column({
    type: DataType.ENUM('DEBIT', 'CREDIT'),
    allowNull: false,
  })
  declare type: 'DEBIT' | 'CREDIT';

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare description: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'transaction_date',
  })
  declare transactionDate: Date;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    field: 'fee_amount',
    comment: 'Fee amount for this transaction',
  })
  declare feeAmount?: number;

  @Column({
    type: DataType.ENUM('SEND_MONEY', 'ADD_MONEY', 'SUBSCRIPTION'),
    allowNull: true,
    field: 'fee_type',
    comment: 'Type of fee applied',
  })
  declare feeType?: 'SEND_MONEY' | 'ADD_MONEY' | 'SUBSCRIPTION';

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_fee_transaction',
    comment: 'Whether this transaction is a fee transaction',
  })
  declare isFeeTransaction: boolean;

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