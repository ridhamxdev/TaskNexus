import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
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
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SuperadminService } from '../superadmin/superadmin.service';
import { SendMoneyDto } from './dto/send-money.dto';
import { FeeConfiguration } from '../superadmin/entities/fee-configuration.entity';

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
    @InjectModel(FeeConfiguration)
    private feeConfigurationModel: typeof FeeConfiguration,
    private readonly emailsService: EmailsService,
    private schedulerRegistry: SchedulerRegistry,
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(forwardRef(() => SuperadminService))
    private readonly superadminService: SuperadminService,
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
      // Get all transactions
      const allTransactions = await this.transactionModel.findAll({
        include: [{ model: User, attributes: ['email', 'name'] }],
        order: [['transactionDate', 'DESC']]
      });

      // Identify superadmin userId
      const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
      const superadminId = superadmin ? superadmin.id : null;

      // Separate main and fee transactions
      const mainTransactions = allTransactions.filter(tx => !tx.isFeeTransaction);
      const feeTransactions = allTransactions.filter(tx => tx.isFeeTransaction);

      // Attach related fees to each main transaction
      const result = mainTransactions.map(mainTx => {
        const mainTxDate = new Date(mainTx.transactionDate).getTime();
        const senderEmail = mainTx.user?.email || '';
        // Find all related fee transactions
        const relatedFees = feeTransactions.filter(feeTx => {
          const feeTxDate = new Date(feeTx.transactionDate).getTime();
          const withinWindow = Math.abs(feeTxDate - mainTxDate) < 2 * 60 * 1000;
          if (!withinWindow) return false;
          // Fee DEBIT (from sender)
          if (
            feeTx.type === 'DEBIT' &&
            feeTx.userId === mainTx.userId &&
            feeTx.description === 'Transaction fee'
          ) {
            return true;
          }
          // Fee CREDIT (to superadmin)
          if (
            superadminId &&
            feeTx.type === 'CREDIT' &&
            feeTx.userId === superadminId &&
            feeTx.description === `Fee from transaction by ${senderEmail}`
          ) {
            return true;
          }
          return false;
        });
        // Attach fees array
        return {
          ...mainTx.toJSON(),
          fees: relatedFees.map(fee => ({
            feeType: fee.feeType,
            feeAmount: fee.feeAmount,
            description: fee.description,
            transactionDate: fee.transactionDate
          }))
        };
      });
      return result;
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
    // Check subscription limits before creating transaction
    try {
      await this.subscriptionsService.incrementTransactionUsage(createTransactionDto.userId);
    } catch (error) {
      this.logger.error(`Transaction limit exceeded for user ${createTransactionDto.userId}: ${error.message}`);
      throw error;
    }
    
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

  async createTransactionWithContext(createTransactionDto: CreateTransactionDto, dbTransaction?: any) {
    try {
      const transaction = await this.transactionModel.create(createTransactionDto as any, dbTransaction ? { transaction: dbTransaction } : {});
      
      // Only send notifications if not within a database transaction to avoid issues
      if (!dbTransaction) {
        await Promise.all([
          this.sendTransactionNotificationToUser(createTransactionDto.userId, transaction),
          this.sendTransactionNotificationToSuperadmin(createTransactionDto.userId, transaction)
        ]);
      }
      
      await this.logTransactionOperation(
        'CREATE_TRANSACTION_WITH_CONTEXT',
        `Created new transaction for user ${createTransactionDto.userId}`,
        'SUCCESS',
        undefined,
        { transactionId: transaction.id, userId: createTransactionDto.userId }
      );
      
      return transaction;
    } catch (error) {
      this.logger.error('Error creating transaction with context:', error);
      await this.logTransactionOperation(
        'CREATE_TRANSACTION_WITH_CONTEXT',
        'Failed to create transaction with context',
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

  async sendMoney(senderId: number, sendMoneyDto: SendMoneyDto) {
    const { recipientEmail, amount } = sendMoneyDto;

    // Check subscription transaction usage limits before processing
    try {
      await this.subscriptionsService.incrementTransactionUsage(senderId);
    } catch (error) {
      this.logger.error(`Transaction quota exceeded for user ${senderId}: ${error.message}`);
      throw error;
    }

    if (!this.transactionModel.sequelize) {
      throw new Error('Sequelize instance is not available.');
    }

    return this.transactionModel.sequelize.transaction(async (t) => {
      const sender = await this.userModel.findByPk(senderId, { transaction: t });
      if (!sender) {
        throw new Error('Sender not found.');
      }
      const recipient = await this.userModel.findOne({ where: { email: recipientEmail }, transaction: t });

      if (!recipient) {
        throw new Error('Recipient not found.');
      }

      if (sender.id === recipient.id) {
        throw new Error('You cannot send money to yourself.');
      }
      
      // Fee calculation using new default fee system
      const feeResult = await this.superadminService.calculateApplicableFee(senderId, amount);
      const fee = feeResult.fee;
      const totalDebit = amount + fee;

      if (sender.balance < totalDebit) {
        throw new Error('Insufficient balance to cover the amount and transaction fee.');
      }

      // Perform transactions
      sender.balance -= totalDebit;
      recipient.balance += amount;

      await sender.save({ transaction: t });
      await recipient.save({ transaction: t });

      // Main transaction log
      await this.transactionModel.create({
        userId: sender.id,
        amount: amount,
        type: 'DEBIT',
        description: `Sent money to ${recipient.email}`,
        transactionDate: new Date(),
      } as any, { transaction: t });

      await this.transactionModel.create({
        userId: recipient.id,
        amount: amount,
        type: 'CREDIT',
        description: `Received money from ${sender.email}`,
        transactionDate: new Date(),
      } as any, { transaction: t });
      
      // Fee transaction if applicable
      if (fee > 0) {
        const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' }, transaction: t });
        if (superadmin) {
          // Use Sequelize's increment method for an atomic and safe update
          await superadmin.increment('balance', { by: fee, transaction: t });

          // Fee debit from sender
          await this.transactionModel.create({
            userId: sender.id,
            amount: fee,
            type: 'DEBIT',
            description: 'Transaction fee',
            transactionDate: new Date(),
            isFeeTransaction: true,
            feeAmount: fee,
            feeType: 'SEND_MONEY',
          } as any, { transaction: t });

          // Fee credit to superadmin
          await this.transactionModel.create({
            userId: superadmin.id,
            amount: fee,
            type: 'CREDIT',
            description: `Fee from transaction by ${sender.email}`,
            transactionDate: new Date(),
            isFeeTransaction: true,
            feeAmount: fee,
            feeType: 'SEND_MONEY',
          } as any, { transaction: t });
        }
      }

      // Send notifications
      try {
        const formattedAmount = amount.toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
        });

        const formattedFee = fee.toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
        });

        const formattedTotal = (amount + fee).toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
        });

        // Email to sender with receipt
        await this.emailsService.sendEmail({
          to: sender.email,
          subject: 'Your Transaction Receipt',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #4a5568; color: white; padding: 20px;">
                <h2 style="margin: 0;">Transaction Receipt</h2>
              </div>
              <div style="padding: 20px;">
                <p>Hi ${sender.name},</p>
                <p>Here is the summary of your recent transaction.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 0;">Amount Sent:</td>
                    <td style="padding: 10px 0; text-align: right;">${formattedAmount}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 0;">Transaction Fee:</td>
                    <td style="padding: 10px 0; text-align: right;">${formattedFee}</td>
                  </tr>
                  <tr style="font-weight: bold; border-top: 2px solid #ddd;">
                    <td style="padding: 10px 0;">Total Debited:</td>
                    <td style="padding: 10px 0; text-align: right;">${formattedTotal}</td>
                  </tr>
                </table>
                <p style="margin-top: 20px;">This amount was sent to <strong>${recipient.email}</strong>.</p>
                <p>Your new balance is <strong>${sender.balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong>.</p>
              </div>
              <div style="background-color: #f7fafc; padding: 15px; text-align: center; color: #718096; font-size: 12px;">
                Thank you for using our service.
              </div>
            </div>
          `,
        });

        // Email to recipient
        await this.emailsService.sendEmail({
          to: recipient.email,
          subject: 'You Have Received Money',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #4a5568; color: white; padding: 20px;">
                <h2 style="margin: 0;">You've Received Funds!</h2>
              </div>
              <div style="padding: 20px;">
                <p>Hi ${recipient.name},</p>
                <p>You have received a payment from <strong>${sender.email}</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr style="font-weight: bold; border-top: 2px solid #ddd; border-bottom: 2px solid #ddd;">
                    <td style="padding: 10px 0;">Amount Credited:</td>
                    <td style="padding: 10px 0; text-align: right;">${formattedAmount}</td>
                  </tr>
                </table>
                <p style="margin-top: 20px;">Your new balance is <strong>${recipient.balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong>.</p>
              </div>
              <div style="background-color: #f7fafc; padding: 15px; text-align: center; color: #718096; font-size: 12px;">
                Thank you for using our service.
              </div>
            </div>
          `,
        });
      } catch (error) {
        this.logger.error('Failed to send money transfer emails', error);
        // We don't rethrow the error, so the transaction is not rolled back if emails fail.
      }

      return { newBalance: sender.balance };
    });
  }

  async getAllFeeTransactions(): Promise<Transaction[]> {
    return this.transactionModel.findAll({
      where: {
        isFeeTransaction: true
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async getTransactionsWithFees(): Promise<any[]> {
    // Get all transactions with their related user information
    const allTransactions = await this.transactionModel.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get superadmin ID for matching fee credit transactions
    const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
    const superadminId = superadmin ? superadmin.id : null;

    // Separate main transactions and fee transactions
    const mainTransactions = allTransactions.filter(t => !t.isFeeTransaction);
    const feeTransactions = allTransactions.filter(t => t.isFeeTransaction);

    // Group transactions with their fees
    const groupedTransactions: any[] = [];

    for (const mainTx of mainTransactions) {
      const mainTxTime = new Date(mainTx.createdAt).getTime();
      const mainTxUserEmail = mainTx.user?.email || '';

      // Find related fee transactions within 5 minutes of main transaction
      const relatedFees = feeTransactions.filter(feeTx => {
        const feeTxTime = new Date(feeTx.createdAt).getTime();
        const timeDiff = Math.abs(feeTxTime - mainTxTime);
        
        // Must be within 5 minutes (300,000 ms)
        if (timeDiff > 300000) return false;

        // Match fee debit from the same user
        if (feeTx.type === 'DEBIT' && 
            feeTx.userId === mainTx.userId &&
            feeTx.description.includes('fee')) {
          return true;
        }

        // Match fee credit to superadmin with reference to main transaction user
        if (superadminId &&
            feeTx.type === 'CREDIT' &&
            feeTx.userId === superadminId &&
            feeTx.description.includes('fee') &&
            feeTx.description.includes(mainTxUserEmail)) {
          return true;
        }

        return false;
      });

      const transactionData = {
        data: {
          id: mainTx.id,
          userId: mainTx.userId,
          userName: mainTx.user?.name || 'Unknown',
          userEmail: mainTx.user?.email || 'Unknown',
          amount: Number(mainTx.amount),
          type: mainTx.type,
          description: mainTx.description,
          transactionDate: mainTx.transactionDate,
          feeAmount: mainTx.feeAmount ? Number(mainTx.feeAmount) : null,
          feeType: mainTx.feeType,
          isFeeTransaction: mainTx.isFeeTransaction,
          createdAt: mainTx.createdAt,
          updatedAt: mainTx.updatedAt
        },
        children: [] as any[]
      };

      // Add fee transactions as children
      relatedFees.forEach(feeTx => {
        (transactionData.children as any[]).push({
          data: {
            id: feeTx.id,
            userId: feeTx.userId,
            userName: feeTx.user?.name || 'Unknown',
            userEmail: feeTx.user?.email || 'Unknown',
            amount: Number(feeTx.amount),
            type: feeTx.type,
            description: feeTx.description,
            transactionDate: feeTx.transactionDate,
            feeAmount: feeTx.feeAmount ? Number(feeTx.feeAmount) : null,
            feeType: feeTx.feeType,
            isFeeTransaction: feeTx.isFeeTransaction,
            createdAt: feeTx.createdAt,
            updatedAt: feeTx.updatedAt
          }
        });
      });

      groupedTransactions.push(transactionData);
    }

    return groupedTransactions;
  }

  async getUserTransactionsWithFees(userId: number): Promise<any[]> {
    // Get all transactions for this specific user with their related user information
    const allTransactions = await this.transactionModel.findAll({
      where: {
        userId: userId
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get superadmin ID for matching fee credit transactions
    const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
    const superadminId = superadmin ? superadmin.id : null;

    // Separate main transactions and fee transactions for this user
    const mainTransactions = allTransactions.filter(t => !t.isFeeTransaction);
    
    // Get all fee transactions that might be related to this user's transactions
    const allFeeTransactions = await this.transactionModel.findAll({
      where: {
        isFeeTransaction: true
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const userEmail = allTransactions[0]?.user?.email || '';

    // Group transactions with their fees
    const groupedTransactions: any[] = [];

    for (const mainTx of mainTransactions) {
      const mainTxTime = new Date(mainTx.createdAt).getTime();

      // Find related fee transactions within 5 minutes of main transaction
      const relatedFees = allFeeTransactions.filter(feeTx => {
        const feeTxTime = new Date(feeTx.createdAt).getTime();
        const timeDiff = Math.abs(feeTxTime - mainTxTime);
        
        // Must be within 5 minutes (300,000 ms)
        if (timeDiff > 300000) return false;

        // Match fee debit from the same user
        if (feeTx.type === 'DEBIT' && 
            feeTx.userId === mainTx.userId &&
            feeTx.description.includes('fee')) {
          return true;
        }

        // Match fee credit to superadmin with reference to main transaction user
        if (superadminId &&
            feeTx.type === 'CREDIT' &&
            feeTx.userId === superadminId &&
            feeTx.description.includes('fee') &&
            feeTx.description.includes(userEmail)) {
          return true;
        }

        return false;
      });

      const transactionData = {
        data: {
          id: mainTx.id,
          userId: mainTx.userId,
          userName: mainTx.user?.name || 'Unknown',
          userEmail: mainTx.user?.email || 'Unknown',
          amount: Number(mainTx.amount),
          type: mainTx.type,
          description: mainTx.description,
          transactionDate: mainTx.transactionDate,
          feeAmount: mainTx.feeAmount ? Number(mainTx.feeAmount) : null,
          feeType: mainTx.feeType,
          isFeeTransaction: mainTx.isFeeTransaction,
          createdAt: mainTx.createdAt,
          updatedAt: mainTx.updatedAt
        },
        children: [] as any[]
      };

      // Add fee transactions as children
      relatedFees.forEach(feeTx => {
        (transactionData.children as any[]).push({
          data: {
            id: feeTx.id,
            userId: feeTx.userId,
            userName: feeTx.user?.name || 'Unknown',
            userEmail: feeTx.user?.email || 'Unknown',
            amount: Number(feeTx.amount),
            type: feeTx.type,
            description: feeTx.description,
            transactionDate: feeTx.transactionDate,
            feeAmount: feeTx.feeAmount ? Number(feeTx.feeAmount) : null,
            feeType: feeTx.feeType,
            isFeeTransaction: feeTx.isFeeTransaction,
            createdAt: feeTx.createdAt,
            updatedAt: feeTx.updatedAt
          }
        });
      });

      groupedTransactions.push(transactionData);
    }

    return groupedTransactions;
  }
}