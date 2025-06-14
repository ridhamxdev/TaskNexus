import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'otps',
  timestamps: true,
})
export class OTP extends Model<OTP> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare otp: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare expiresAt: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare isUsed: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare purpose: string; // 'login', 'password-reset', etc.

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
} 