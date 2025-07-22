import { Table, Column, Model, DataType, HasMany, AllowNull, DeletedAt, ForeignKey, BelongsTo } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { UserSubscription } from '../../subscriptions/entities/user-subscription.entity';

export enum UserRole {
  USER = 'user',
  TENANT = 'tenant',
  SUPERADMIN = 'superadmin',
}

@Table({
  tableName: 'users',
  timestamps: true, // Adds createdAt and updatedAt fields
  paranoid: true, // This enables soft deletes and uses `deletedAt`
})
export class User extends Model<User> {
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
  declare name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare password_hash: string; // Storing the hashed password

  @Column({
    type: DataType.STRING,
    allowNull: true, // Assuming phone can be optional, adjust if not
    unique: true,
  })
  declare phone?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare address?: string;

  @Column({
    type: DataType.DATEONLY, // Using DATEONLY for date of birth
    allowNull: true,
  })
  declare dob?: string; // Sequelize handles string to DATEONLY conversion

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
    defaultValue: UserRole.USER,
  })
  declare role: UserRole;

  @Column({
    type: DataType.INTEGER,
    allowNull: true, // Nullable for users not associated with any tenant
  })
  declare tenantId?: number;

  @Column({
    type: DataType.DECIMAL(10, 2), // Assuming precision 10, scale 2 (e.g., 12345678.90)
    allowNull: false,
    defaultValue: 0.00,
  })
  declare balance: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare twoFactorEnabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare defaultFeeEnabled: boolean;

  @HasMany(() => Transaction)
  declare transactions: Transaction[];

  @HasMany(() => UserSubscription)
  declare subscriptions: UserSubscription[];

  // Sequelize-typescript handles `createdAt`, `updatedAt` automatically with `timestamps: true`
  // `deletedAt` is handled by `paranoid: true` and `@DeletedAt` decorator
  @DeletedAt
  declare deletedAt?: Date;

  // We won't have a generateAuthToken here; that will be in the UsersService/AuthService
} 