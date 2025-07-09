import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { FeeConfiguration, FeeConfigurationType } from './fee-configuration.entity';

export enum VersionAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED'
}

@Table({ tableName: 'fee_configuration_versions', timestamps: true })
export class FeeConfigurationVersion extends Model<FeeConfigurationVersion> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => FeeConfiguration)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // nullable for deleted configurations
  })
  declare feeConfigurationId?: number;

  @BelongsTo(() => FeeConfiguration)
  declare feeConfiguration?: FeeConfiguration;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  declare version: number;

  @Column({
    type: DataType.ENUM(...Object.values(VersionAction)),
    allowNull: false,
  })
  declare action: VersionAction;

  @Column({
    type: DataType.ENUM(...Object.values(FeeConfigurationType)),
    allowNull: false,
  })
  declare type: FeeConfigurationType;

  // Store previous values for comparison
  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare previousValues?: any;

  // Store current values
  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  declare currentValues: any;

  // Admin who made the change
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare changedByUserId: number;

  @BelongsTo(() => User, { foreignKey: 'changedByUserId' })
  declare changedByUser: User;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare changeReason?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare userNotified: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare notifiedAt?: Date;

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