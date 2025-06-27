import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

export enum FeeType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE'
}

@Table({
  tableName: 'default_fee_configurations',
  timestamps: true,
})
export class DefaultFeeConfiguration extends Model<DefaultFeeConfiguration> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  })
  declare feeAmount: number;

  @Column({
    type: DataType.ENUM(...Object.values(FeeType)),
    allowNull: false,
    defaultValue: FeeType.FIXED,
  })
  declare feeType: FeeType;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  })
  declare minAmount: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  declare maxAmount: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare isActive: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
} 