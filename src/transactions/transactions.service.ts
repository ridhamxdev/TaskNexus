import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from './entities/transaction.entity';
import { TransactionLog } from './entities/transaction-log.entity';
import { User } from '../users/entities/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Op, Optional } from 'sequelize';

interface ProcessedUser {
  userId: number;
  oldBalance: number;
  newBalance: number;
  transactionId: number;
}

type TransactionLogCreationAttributes = Optional<TransactionLog, 'id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(TransactionLog)
    private transactionLogModel: typeof TransactionLog,
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  private async createTransactionLog(
    operation: string,
    details: string,
    status: 'SUCCESS' | 'FAILED',
    errorMessage?: string,
    metadata?: any,
  ): Promise<TransactionLog> {
    return this.transactionLogModel.create({
      operation,
      details,
      status,
      errorMessage,
      metadata,
    } as any);
  }

  async updateUserBalance(userId: number, amount: number) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const newBalance = user.balance + amount;
      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }

      // Create transaction record
      const transaction = new Transaction();
      transaction.userId = userId;
      transaction.amount = Math.abs(amount);
      transaction.type = amount > 0 ? 'CREDIT' : 'DEBIT';
      transaction.description = amount > 0 ? 'Balance added' : 'Balance deducted';
      transaction.transactionDate = new Date();
      await transaction.save();

      // Update user balance
      await user.update({ balance: newBalance });

      // Log the transaction
      await this.createTransactionLog(
        'BALANCE_UPDATE',
        `Balance updated for user ${userId}`,
        'SUCCESS',
        undefined,
        {
          userId,
          oldBalance: user.balance,
          newBalance,
          amount,
          transactionId: transaction.id,
        },
      );

      return {
        message: 'Balance updated successfully',
        newBalance,
        transaction,
      };
    } catch (error) {
      await this.createTransactionLog(
        'BALANCE_UPDATE',
        `Failed to update balance for user ${userId}`,
        'FAILED',
        error.message,
        { userId, amount },
      );
      throw error;
    }
  }

  @Cron('0 1 * * *') // Run at 1 AM every day
  async processDailyDeductions() {
    this.logger.log('Starting daily deduction process...');
    
    try {
      // Get all users with role 'user'
      const users = await this.userModel.findAll({
        where: {
          role: 'user',
          balance: {
            [Op.gte]: 50, // Only users with balance >= 50
          },
        },
      });

      // Get superadmin user
      const admin = await this.userModel.findOne({
        where: { role: 'superadmin' },
      });

      if (!admin) {
        throw new Error('Superadmin user not found');
      }

      let totalDeductions = 0;
      const processedUsers: ProcessedUser[] = [];

      // Process each user
      for (const user of users) {
        try {
          // Create transaction record for user deduction
          const userTransaction = new Transaction();
          userTransaction.userId = user.id;
          userTransaction.amount = 50;
          userTransaction.type = 'DEBIT';
          userTransaction.description = 'Daily subscription fee';
          userTransaction.transactionDate = new Date();
          await userTransaction.save();

          // Update user balance
          await user.update({
            balance: user.balance - 50,
          });

          totalDeductions += 50;
          processedUsers.push({
            userId: user.id,
            oldBalance: user.balance + 50,
            newBalance: user.balance,
            transactionId: userTransaction.id,
          });
        } catch (error) {
          await this.createTransactionLog(
            'DAILY_DEDUCTION',
            `Failed to process deduction for user ${user.id}`,
            'FAILED',
            error.message,
            { userId: user.id },
          );
        }
      }

      // Credit admin account
      if (totalDeductions > 0) {
        const adminTransaction = new Transaction();
        adminTransaction.userId = admin.id;
        adminTransaction.amount = totalDeductions;
        adminTransaction.type = 'CREDIT';
        adminTransaction.description = 'Daily subscription fees collection';
        adminTransaction.transactionDate = new Date();
        await adminTransaction.save();

        await admin.update({
          balance: admin.balance + totalDeductions,
        });

        // Log successful daily deduction process
        await this.createTransactionLog(
          'DAILY_DEDUCTION',
          'Daily deduction process completed',
          'SUCCESS',
          undefined,
          {
            processedUsers,
            totalDeductions,
            adminTransactionId: adminTransaction.id,
          },
        );
      }

      this.logger.log(`Daily deduction process completed. Processed ${users.length} users.`);
      return {
        message: 'Daily deductions processed successfully',
        processedUsers: users.length,
        totalDeductions,
      };
    } catch (error) {
      this.logger.error('Error in daily deduction process:', error);
      await this.createTransactionLog(
        'DAILY_DEDUCTION',
        'Failed to complete daily deduction process',
        'FAILED',
        error.message,
      );
      throw error;
    }
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return this.transactionModel.findAll({
      where: { userId },
      order: [['transactionDate', 'DESC']],
    });
  }

  async getAllTransactions(
    page: number = 1,
    limit: number = 10,
    filters?: {
      type?: 'DEBIT' | 'CREDIT';
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: any = {};
    if (filters) {
      if (filters.type) where.type = filters.type;
      if (filters.startDate || filters.endDate) {
        where.transactionDate = {};
        if (filters.startDate) where.transactionDate[Op.gte] = filters.startDate;
        if (filters.endDate) where.transactionDate[Op.lte] = filters.endDate;
      }
    }

    const { count, rows } = await this.transactionModel.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'email'],
      }],
      order: [['transactionDate', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      transactions: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getTransactionLogs(
    page: number = 1,
    limit: number = 10,
    filters?: {
      operation?: string;
      status?: 'SUCCESS' | 'FAILED';
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: any = {};
    if (filters) {
      if (filters.operation) where.operation = filters.operation;
      if (filters.status) where.status = filters.status;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt[Op.gte] = filters.startDate;
        if (filters.endDate) where.createdAt[Op.lte] = filters.endDate;
      }
    }

    const { count, rows } = await this.transactionLogModel.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      logs: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }
} 