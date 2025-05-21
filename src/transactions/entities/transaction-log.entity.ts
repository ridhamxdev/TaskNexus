import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'transaction_logs',
  timestamps: true,
})
export class TransactionLog extends Model<TransactionLog> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare operation: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare details: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare status: 'SUCCESS' | 'FAILED';

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare errorMessage?: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata?: any;
} 