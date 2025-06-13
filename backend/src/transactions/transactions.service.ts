import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from './entities/transaction.entity';
import { exec } from 'child_process';
import { EmailsService } from '../emails/emails.service';
import { User } from '../users/entities/user.entity';
import { Op } from 'sequelize';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionLog } from './entities/transaction-log.entity';

@Injectable()
export class TransactionsService implements OnModuleInit {
  private readonly logger = new Logger(TransactionsService.name);
  private isCronRunning = false;

  constructor(
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(TransactionLog)
    private transactionLogModel: typeof TransactionLog,
    private readonly emailsService: EmailsService,
    private schedulerRegistry: SchedulerRegistry
  ) {}

  async onModuleInit() {
    try {
      // Verify database connection and model initialization
      await this.transactionModel.sequelize?.authenticate();
      this.logger.log('Database connection established successfully');
      
      // Initialize models if needed
      await this.transactionModel.sync();
      await this.userModel.sync();
      await this.transactionLogModel.sync();
    } catch (error) {
      this.logger.error('Failed to initialize transaction service:', error);
      throw error;
    }
  }

  private async logTransactionOperation(operation: string, details: string, status: 'SUCCESS' | 'FAILED', errorMessage?: string, metadata?: any) {
    try {
      await this.transactionLogModel.create({
        operation,
        details,
        status,
        errorMessage,
        metadata
      } as any);
    } catch (error) {
      this.logger.error('Failed to log transaction operation:', error);
    }
  }

  @Cron('0 1 * * *') // Runs at midnight every day
  async processDeductions() {
    if (this.isCronRunning) {
      this.logger.log('Deduction process is already running');
      return;
    }

    const startTime = new Date();
    try {
      this.isCronRunning = true;
      this.logger.log('Starting daily deduction process...');

      // Check if deduction was already processed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingTransaction = await this.transactionModel.findOne({
        where: {
          type: 'DEBIT',
          description: 'Daily deduction',
          transactionDate: {
            [Op.gte]: today
          }
        }
      });

      if (existingTransaction) {
        this.logger.log('Deduction already processed for today');
        await this.logTransactionOperation(
          'DAILY_DEDUCTION_CHECK',
          'Deduction already processed for today',
          'SUCCESS'
        );
        return;
      }

      const sequelizeTransaction = await this.transactionModel.sequelize?.transaction();
      if (!sequelizeTransaction) {
        throw new Error('Failed to start database transaction');
      }

      try {
        const users = await this.userModel.findAll({
          where: {
            role: 'user',
            balance: { [Op.gte]: 50 },
          },
          transaction: sequelizeTransaction,
        });

        let totalDeducted = 0;
        const transactionPromises: Promise<Transaction>[] = [];
        const processedUsers: number[] = [];

        for (const user of users) {
          if (!user) continue;
          
          try {
            const oldBalance = Number(user.balance);
            user.balance = oldBalance - 50;
            await user.save({ transaction: sequelizeTransaction });

            totalDeducted += 50;
            processedUsers.push(user.id);

            const debitTransaction: CreateTransactionDto = {
              userId: user.id,
              amount: 50,
              type: 'DEBIT',
              description: 'Daily deduction',
              transactionDate: new Date(),
            };

            transactionPromises.push(
              this.transactionModel.create(debitTransaction as any, { transaction: sequelizeTransaction })
            );
          } catch (error) {
            this.logger.error(`Failed to process deduction for user ${user.id}:`, error);
            throw error;
          }
        }

        const createdTransactions = await Promise.all(transactionPromises);

        if (totalDeducted > 0) {
          const superadmin = await this.userModel.findOne({ 
            where: { role: 'superadmin' },
            transaction: sequelizeTransaction 
          });
          
          if (superadmin) {
            const oldBalance = Number(superadmin.balance);
            superadmin.balance = oldBalance + totalDeducted;
            await superadmin.save({ transaction: sequelizeTransaction });

            const creditTransaction: CreateTransactionDto = {
              userId: superadmin.id,
              amount: totalDeducted,
              type: 'CREDIT',
              description: 'Daily credit from user deductions',
              transactionDate: new Date(),
            };

            await this.transactionModel.create(creditTransaction as any, { transaction: sequelizeTransaction });
          }
        }

        await sequelizeTransaction.commit();
        
        // Send email notifications after the transaction is committed
        this.logger.log('Deduction transaction committed. Sending notification emails.');
        try {
          for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const transaction = createdTransactions[i];
            await this.sendTransactionNotificationToUser(user.id, transaction);
          }

          if (users.length > 0) {
            await this.sendDeductionSummaryToSuperadmin(users, totalDeducted);
          }
        } catch (emailError) {
          this.logger.error('Failed to send deduction notification emails. The deduction itself was successful.', emailError);
          await this.logTransactionOperation(
            'SEND_DEDUCTION_EMAILS',
            'Failed to send some or all deduction emails after successful transaction.',
            'FAILED',
            emailError instanceof Error ? emailError.message : String(emailError)
          );
        }
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        
        await this.logTransactionOperation(
          'DAILY_DEDUCTION',
          `Deducted 50 from ${users.length} users. Credited ${totalDeducted} to superadmin.`,
          'SUCCESS',
          undefined,
          {
            processedUsers,
            totalDeducted,
            duration,
            startTime,
            endTime
          }
        );

        this.logger.log(`Deducted 50 from ${users.length} users. Credited ${totalDeducted} to superadmin.`);
      } catch (error) {
        await sequelizeTransaction.rollback();
        await this.logTransactionOperation(
          'DAILY_DEDUCTION',
          'Failed to process deductions',
          'FAILED',
          error instanceof Error ? error.message : String(error),
          { startTime, endTime: new Date() }
        );
        throw error;
      }
    } catch (error) {
      this.logger.error('Error in deduction process:', error);
      throw error;
    } finally {
      this.isCronRunning = false;
    }
  }

  private async sendDeductionSummaryToSuperadmin(users: User[], totalDeducted: number) {
    try {
      const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
      if (!superadmin) {
        throw new Error('Superadmin not found');
      }

      const userCount = users.length;
      const userListHtml = users.map(user => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${user.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${user.email}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">50</td>
        </tr>
      `).join('');

      const userListText = users.map(user => 
        `- Name: ${user.name}, Email: ${user.email}, Amount: 50`
      ).join('\\n');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Daily Deduction Summary</h2>
          <p>Dear Superadmin,</p>
          <p>Here is the summary of the daily automated deductions:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd;">Details</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Value</th>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Number of Users Deducted</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${userCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Total Amount Deducted</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${totalDeducted}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Date & Time</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
            </tr>
          </table>

          <h3 style="color: #333; margin-top: 30px;">Deducted Users:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; border: 1px solid #ddd;">Name</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Email</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Amount Deducted</th>
              </tr>
            </thead>
            <tbody>
              ${userListHtml}
            </tbody>
          </table>

          <p style="margin-top: 20px;">This amount has been credited to your balance.</p>
          <p style="margin-top: 20px;">Best regards,<br>Banking System</p>
        </div>
      `;

      const textContent = `
        Dear Superadmin,

        Daily deduction summary:
        - Number of Users Deducted: ${userCount}
        - Total Amount Deducted: ${totalDeducted}
        - Date & Time: ${new Date().toLocaleString()}
        
        Deducted Users:
        ${userListText}
        
        This amount has been credited to your balance.

        Best regards,
        Banking System
      `;

      await this.emailsService.sendEmailDirect({
        to: superadmin.email,
        subject: `Daily Deduction Summary`,
        text: textContent,
        html: htmlContent,
        senderUserId: superadmin.id
      });

      await this.logTransactionOperation(
        'SEND_DEDUCTION_SUMMARY',
        `Sent daily deduction summary to superadmin.`,
        'SUCCESS'
      );
    } catch (error) {
      this.logger.error('Error sending deduction summary email:', error);
      await this.logTransactionOperation(
        'SEND_DEDUCTION_SUMMARY',
        'Failed to send deduction summary to superadmin',
        'FAILED',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async findAll() {
    try {
      return await this.transactionModel.findAll({
        include: [{
          model: User,
          attributes: ['email', 'name']
        }]
      });
    } catch (error) {
      this.logger.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async sendTransactionEmailsToSuperadmin(loggedInUserId: number) {
    try {
      const loggedInUser = await this.userModel.findByPk(loggedInUserId);
      if (!loggedInUser) {
        throw new Error('Logged in user not found');
      }

      const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
      if (!superadmin) {
        throw new Error('Superadmin not found');
      }

      // Get recent transactions for the logged-in user
      const recentTransactions = await this.transactionModel.findAll({
        where: { userId: loggedInUserId },
        order: [['transactionDate', 'DESC']],
        limit: 5,
      });

      if (recentTransactions.length === 0) {
        return;
      }

      // Format transaction details with better HTML formatting
      const transactionDetails = recentTransactions
        .map(t => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${t.amount}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${t.type}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${t.description}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${t.transactionDate.toLocaleString()}</td>
          </tr>
        `)
        .join('');

      // Create HTML email content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Transaction Notification</h2>
          <p>Dear Superadmin,</p>
          <p>This is to inform you about recent transactions made by ${loggedInUser.name} (${loggedInUser.email}):</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; border: 1px solid #ddd;">Amount</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Type</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Description</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${transactionDetails}
            </tbody>
          </table>

          <p>Current user balance: ${loggedInUser.balance}</p>
          
          <p style="margin-top: 20px;">Best regards,<br>${loggedInUser.name}</p>
        </div>
      `;

      // Send email to superadmin with both text and HTML content
      await this.emailsService.sendEmailDirect({
        to: superadmin.email,
        subject: `Transaction Notification from ${loggedInUser.name}`,
        text: `
          Dear Superadmin,

          This is to inform you about recent transactions made by ${loggedInUser.name} (${loggedInUser.email}):

          ${recentTransactions.map(t => `
            Amount: ${t.amount}
            Type: ${t.type}
            Description: ${t.description}
            Date: ${t.transactionDate.toLocaleString()}
          `).join('\n')}

          Current user balance: ${loggedInUser.balance}

          Best regards,
          ${loggedInUser.name}
        `,
        html: htmlContent,
        senderUserId: loggedInUserId
      });

      await this.logTransactionOperation(
        'SEND_TRANSACTION_EMAIL',
        `Sent transaction email to superadmin for user ${loggedInUserId}`,
        'SUCCESS',
        undefined,
        { loggedInUserId, transactionCount: recentTransactions.length }
      );
    } catch (error) {
      this.logger.error('Error sending transaction emails:', error);
      await this.logTransactionOperation(
        'SEND_TRANSACTION_EMAIL',
        'Failed to send transaction email',
        'FAILED',
        error instanceof Error ? error.message : String(error),
        { loggedInUserId }
      );
      throw error;
    }
  }

  async triggerDeductionScript(loggedInUserId: number) {
    if (this.isCronRunning) {
      return 'Deduction process is already running';
    }

    try {
      this.isCronRunning = true;
      await this.processDeductions();
      return 'Deduction process completed successfully';
    } catch (error) {
      this.logger.error('Error in deduction process:', error);
      throw error;
    } finally {
      this.isCronRunning = false;
    }
  }

  /**
   * Implements the logic from the old script: deduct 50 from all users with balance >= 50,
   * credit the total to the superadmin, and create transaction records. This is separate from processDeductions.
   */
  async manualScriptDeduction(): Promise<string> {
    const startTime = new Date();
    const sequelize = this.transactionModel.sequelize;
    if (!sequelize) throw new Error('Sequelize instance not found');
    const transaction = await sequelize.transaction();
    try {
      // Find all users with role 'user' and balance >= 50
      const users = await this.userModel.findAll({
        where: { role: 'user', balance: { [Op.gte]: 50 } },
        transaction,
      });
      let totalDeducted = 0;
      const transactionPromises: Promise<Transaction>[] = [];
      for (const user of users) {
        const oldBalance = Number(user.balance);
        user.balance = oldBalance - 50;
        await user.save({ transaction });
        totalDeducted += 50;
        transactionPromises.push(
          this.transactionModel.create({
            userId: user.id,
            amount: 50,
            type: 'DEBIT',
            description: 'Manual script deduction',
            transactionDate: new Date(),
          } as any, { transaction })
        );
      }
      await Promise.all(transactionPromises);
      // Credit the total to the superadmin
      if (totalDeducted > 0) {
        const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' }, transaction });
        if (superadmin) {
          const oldBalance = Number(superadmin.balance);
          superadmin.balance = oldBalance + totalDeducted;
          await superadmin.save({ transaction });
          await this.transactionModel.create({
            userId: superadmin.id,
            amount: totalDeducted,
            type: 'CREDIT',
            description: 'Manual script credit from user deductions',
            transactionDate: new Date(),
          } as any, { transaction });
        }
      }
      await transaction.commit();
      const endTime = new Date();
      return `Manual script: Deducted 50 from ${users.length} users. Credited ${totalDeducted} to superadmin. Duration: ${endTime.getTime() - startTime.getTime()}ms`;
    } catch (error) {
      await transaction.rollback();
      this.logger.error('Error in manualScriptDeduction:', error);
      throw error;
    }
  }

  private async sendTransactionNotificationToUser(userId: number, transaction: Transaction) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Transaction Confirmation</h2>
          <p>Dear ${user.name},</p>
          <p>This is to confirm your recent transaction:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd;">Details</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Value</th>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Transaction Type</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${transaction.type}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Amount</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${transaction.amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Description</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${transaction.description}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Date & Time</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${transaction.transactionDate.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Current Balance</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${user.balance}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;">If you did not authorize this transaction, please contact support immediately.</p>
          
          <p style="margin-top: 20px;">Best regards,<br>Your Banking System</p>
        </div>
      `;

      await this.emailsService.sendEmailDirect({
        to: user.email,
        subject: `Transaction Confirmation - ${transaction.type} of ${transaction.amount}`,
        text: `
          Dear ${user.name},

          This is to confirm your recent transaction:

          Transaction Type: ${transaction.type}
          Amount: ${transaction.amount}
          Description: ${transaction.description}
          Date & Time: ${transaction.transactionDate.toLocaleString()}
          Current Balance: ${user.balance}

          If you did not authorize this transaction, please contact support immediately.

          Best regards,
          Your Banking System
        `,
        html: htmlContent,
        senderUserId: userId
      });

      await this.logTransactionOperation(
        'SEND_USER_NOTIFICATION',
        `Sent transaction notification to user ${userId}`,
        'SUCCESS',
        undefined,
        { userId, transactionId: transaction.id }
      );
    } catch (error) {
      this.logger.error('Error sending user notification:', error);
      await this.logTransactionOperation(
        'SEND_USER_NOTIFICATION',
        'Failed to send user notification',
        'FAILED',
        error instanceof Error ? error.message : String(error),
        { userId }
      );
    }
  }

  private async sendTransactionNotificationToSuperadmin(userId: number, transaction: Transaction) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
      if (!superadmin) {
        throw new Error('Superadmin not found');
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Transaction Alert</h2>
          <p>Dear Superadmin,</p>
          <p>A new transaction has been processed:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd;">Details</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Value</th>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">User Name</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${user.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">User Email</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Transaction Type</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${transaction.type}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Amount</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${transaction.amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Description</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${transaction.description}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Date & Time</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${transaction.transactionDate.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">User's Current Balance</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${user.balance}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;">Best regards,<br>Banking System</p>
        </div>
      `;

      await this.emailsService.sendEmailDirect({
        to: superadmin.email,
        subject: `Transaction Alert - ${user.name} - ${transaction.type} of ${transaction.amount}`,
        text: `
          Dear Superadmin,

          A new transaction has been processed:

          User Name: ${user.name}
          User Email: ${user.email}
          Transaction Type: ${transaction.type}
          Amount: ${transaction.amount}
          Description: ${transaction.description}
          Date & Time: ${transaction.transactionDate.toLocaleString()}
          User's Current Balance: ${user.balance}

          Best regards,
          Banking System
        `,
        html: htmlContent,
        senderUserId: userId
      });

      await this.logTransactionOperation(
        'SEND_SUPERADMIN_NOTIFICATION',
        `Sent transaction notification to superadmin for user ${userId}`,
        'SUCCESS',
        undefined,
        { userId, transactionId: transaction.id }
      );
    } catch (error) {
      this.logger.error('Error sending superadmin notification:', error);
      await this.logTransactionOperation(
        'SEND_SUPERADMIN_NOTIFICATION',
        'Failed to send superadmin notification',
        'FAILED',
        error instanceof Error ? error.message : String(error),
        { userId }
      );
    }
  }

  async createTransaction(createTransactionDto: CreateTransactionDto) {
    try {
      const transaction = await this.transactionModel.create(createTransactionDto as any);
      
      // Send notifications to both user and superadmin
      await Promise.all([
        this.sendTransactionNotificationToUser(createTransactionDto.userId, transaction),
        this.sendTransactionNotificationToSuperadmin(createTransactionDto.userId, transaction)
      ]);
      
      await this.logTransactionOperation(
        'CREATE_TRANSACTION',
        `Created new transaction for user ${createTransactionDto.userId}`,
        'SUCCESS',
        undefined,
        { transactionId: transaction.id, userId: createTransactionDto.userId }
      );
      
      return transaction;
    } catch (error) {
      this.logger.error('Error creating transaction:', error);
      await this.logTransactionOperation(
        'CREATE_TRANSACTION',
        'Failed to create transaction',
        'FAILED',
        error instanceof Error ? error.message : String(error),
        { userId: createTransactionDto.userId }
      );
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<Transaction[]> {
    try {
      return await this.transactionModel.findAll({
        where: { userId },
        include: [{
          model: User,
          attributes: ['email', 'name']
        }],
        order: [['transactionDate', 'DESC']]
      });
    } catch (error) {
      this.logger.error(`Error fetching transactions for user ${userId}:`, error);
      throw error;
    }
  }
}