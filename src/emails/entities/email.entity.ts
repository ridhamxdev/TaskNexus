import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity'; // Adjust path if User entity is elsewhere

export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DLQ = 'DLQ', // Moved to Dead Letter Queue
}

@Table({
  tableName: 'emails',
  timestamps: true,
})
export class Email extends Model<Email> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => User) // Define foreign key
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare senderUserId: number;

  @BelongsTo(() => User) // Define relationship
  sender: User;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare recipient: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare subject: string;

  @Column({
    type: DataType.TEXT, // Use TEXT for potentially long email bodies
    allowNull: false,
  })
  declare body: string;
  
  @Column({
    type: DataType.TEXT, // Use TEXT for potentially long HTML bodies
    allowNull: true,
  })
  declare htmlBody: string;

  @Column({
    type: DataType.ENUM(...Object.values(EmailStatus)),
    allowNull: false,
    defaultValue: EmailStatus.PENDING,
  })
  declare status: EmailStatus;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare attempts: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare sentAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare lastAttemptAt?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare failureReason?: string;
} 