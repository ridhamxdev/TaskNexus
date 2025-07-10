import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../entities/user.entity';
import { UserNotification, NotificationStatus } from '../entities/user-notification.entity';
// We will need to import the User model and Sequelize-related items later
// import { InjectModel } from '@nestjs/sequelize';
// import { User } from '../models/user.model'; // Adjust path as needed
// import { Op } from 'sequelize';
// For DTOs
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
// LoginUserDto is no longer used in this service
// import { LoginUserDto } from './dto/login-user.dto'; 
// JwtService is no longer used directly in this service for login/registration
// import { JwtService } from '@nestjs/jwt'; 
import * as bcrypt from 'bcrypt';
import { Op, FindOptions, Transaction as SequelizeTransaction } from 'sequelize';
import { TransactionsService } from '../../transactions/transactions.service';
import { SuperadminService } from '../../superadmin/superadmin.service';
import { FeeVersion, FeeConfigurationType } from '../../superadmin/entities/fee-version.entity';
import { GlobalFeeVersion } from '../../superadmin/entities/global-fee-version.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(UserNotification)
    private userNotificationModel: typeof UserNotification,
    @InjectModel(FeeVersion)
    private feeVersionModel: typeof FeeVersion,
    @InjectModel(GlobalFeeVersion)
    private globalFeeVersionModel: typeof GlobalFeeVersion,
    private transactionsService: TransactionsService,
    private superadminService: SuperadminService,
    // private jwtService: JwtService, // Removed: Handled by AuthService
  ) {}

  /**
   * @jsdoc
   * Registers a new user.
   * @param createUserDto Data for creating the user.
   * @returns The created user object (without password hash).
   * @throws ConflictException if email or phone already exists.
   * @throws InternalServerErrorException for other errors.
   */
  async register(createUserDto: CreateUserDto): Promise<Partial<User>> {
    const { name, email, password, phone, address, dob, initialBalance } = createUserDto;

    const existingUser = await this.userModel.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const newUser = await this.userModel.create({
        name,
        email,
        password_hash: hashedPassword,
        phone,
        address,
        dob,
        role: 'user', // Default role
        balance: initialBalance || 0, // Use initialBalance if provided, otherwise default to 0
      } as any);

      const { password_hash, ...result } = newUser.get({ plain: true });
      return result;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(`Error during user registration: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not register user. ' + error.message);
    }
  }

  // Login method is removed as it's now in AuthService
  /*
  async login(loginUserDto: LoginUserDto): Promise<{ message: string; token: string; user: Partial<User> }> {
    const { email, password } = loginUserDto;

    try {
      const user = await this.userModel.findOne({ where: { email } });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordMatching = await user.correctPassword(password);

      if (!isPasswordMatching) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const payload = { id: user.id, email: user.email, role: user.role };
      const token = this.jwtService.sign(payload);
      
      const { password_hash, ...userResult } = user.get({ plain: true });

      return { message: 'Login successful', token, user: userResult };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Error during user login: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not login user. ' + error.message);
    }
  }
  */

  /**
   * @jsdoc
   * Finds a single user by email or ID.
   * @param emailOrId User's email or ID.
   * @returns The user object or undefined if not found.
   */
  async findOne(emailOrId: string | number): Promise<User | null> {
    if (typeof emailOrId === 'string' && emailOrId.includes('@')) {
      // It's an email
      return this.userModel.findOne({ where: { email: emailOrId } });
    } else if (typeof emailOrId === 'number' || !isNaN(parseInt(emailOrId as string, 10))) {
      // It's an ID (either number or a string that can be parsed to a number)
      return this.userModel.findByPk(typeof emailOrId === 'number' ? emailOrId : parseInt(emailOrId as string, 10));
    }
    return null; // Or throw error if invalid input
  }

  /**
   * @jsdoc
   * Finds a single user by email.
   * @param email User's email.
   * @returns The user object or undefined if not found.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  /**
   * @jsdoc
   * Finds all users matching the given options.
   * @param options Sequelize find options.
   * @returns A list of users.
   */
  async findAll(options?: FindOptions): Promise<User[]> {
    return this.userModel.findAll(options);
  }

  /**
   * @jsdoc
   * Updates the balance for a given user.
   * @param userId The ID of the user to update.
   * @param newBalance The new balance.
   * @param dbTransaction Optional Sequelize transaction.
   */
  async updateBalance(userId: number, newBalance: number, dbTransaction?: SequelizeTransaction): Promise<[number]> {
    return this.userModel.update(
      { balance: newBalance },
      { where: { id: userId }, transaction: dbTransaction },
    );
  }

  /**
   * @jsdoc
   * Retrieves the profile of a user by their ID.
   * @param userId The ID of the user.
   * @returns The user profile (without password hash).
   * @throws NotFoundException if the user is not found.
   */
  async findProfile(userId: number): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.get({ plain: true });
  }

  /**
   * @jsdoc
   * Adds money to a user's balance.
   * @param userId The ID of the user.
   * @param amount The amount to add to the balance.
   * @returns The updated user object.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the amount is invalid.
   */
  async addMoney(userId: number, amount: number): Promise<User> {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount > 100000) {
      throw new BadRequestException('Maximum amount allowed is ₹1,00,000');
    }

    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Calculate fee for adding money
      const feeResult = await this.superadminService.calculateAddMoneyFee(userId, amount);
      const fee = feeResult.fee;

      const newBalance = parseFloat(user.balance.toString()) + parseFloat(amount.toString());
      
      // Use transaction to ensure consistency
      if (!this.userModel.sequelize) {
        throw new Error('Sequelize instance is not available.');
      }

      return this.userModel.sequelize.transaction(async (t) => {
        // Update user balance (credit full amount)
        await this.userModel.update(
          { balance: newBalance },
          { where: { id: userId }, transaction: t }
        );

        // Create main transaction record for the full amount
        await this.transactionsService.createTransactionWithContext({
          userId: userId,
          amount: amount,
          type: 'CREDIT',
          description: 'Money added to account',
          transactionDate: new Date(),
        }, t);

        // Handle fee transaction if applicable
        if (fee > 0) {
          const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' }, transaction: t });
          if (superadmin) {
            // Debit fee from user (separate transaction, does not affect credited amount)
            await this.userModel.update(
              { balance: newBalance - fee },
              { where: { id: userId }, transaction: t }
            );

            await this.transactionsService.createTransactionWithContext({
              userId: userId,
              amount: fee,
              type: 'DEBIT',
              description: 'Add money fee',
              transactionDate: new Date(),
              isFeeTransaction: true,
              feeAmount: fee,
              feeType: 'ADD_MONEY',
            }, t);

            // Credit fee to superadmin
            await superadmin.increment('balance', { by: fee, transaction: t });
            await this.transactionsService.createTransactionWithContext({
              userId: superadmin.id,
              amount: fee,
              type: 'CREDIT',
              description: `Add money fee from ${user.email}`,
              transactionDate: new Date(),
              isFeeTransaction: true,
              feeAmount: fee,
              feeType: 'ADD_MONEY',
            }, t);
          }
        }

        // Return the updated user
        const updatedUser = await this.userModel.findByPk(userId, { transaction: t });
        if (!updatedUser) {
          throw new NotFoundException('User not found after update');
        }
        
        const { password_hash, ...result } = updatedUser.get({ plain: true });
        
        this.logger.log(`Money added successfully. User ID: ${userId}, Amount: ${amount}, Fee: ${fee}, New Balance: ${updatedUser.balance}`);
        
        return result as User;
      });
    } catch (error) {
      this.logger.error(`Error adding money for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not add money to account');
    }
  }

  /**
   * @jsdoc
   * Updates a user's profile information.
   * @param userId The ID of the user to update.
   * @param updateUserDto The data to update.
   * @returns The updated user object (without password hash).
   * @throws NotFoundException if the user is not found.
   * @throws ConflictException if email already exists for another user.
   * @throws InternalServerErrorException for other errors.
   */
  async updateProfile(userId: number, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const updateData: any = {};

      // Check if email is being updated and if it already exists for another user
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userModel.findOne({ 
          where: { 
            email: updateUserDto.email,
            id: { [Op.ne]: userId } // Exclude current user
          } 
        });
        if (existingUser) {
          throw new ConflictException('Email already exists');
        }
        updateData.email = updateUserDto.email;
      }

      // Update other fields
      if (updateUserDto.name) updateData.name = updateUserDto.name;
      if (updateUserDto.phone) updateData.phone = updateUserDto.phone;
      if (updateUserDto.address) updateData.address = updateUserDto.address;
      if (updateUserDto.dob) updateData.dob = updateUserDto.dob;

      // Handle password update
      if (updateUserDto.password) {
        updateData.password_hash = await bcrypt.hash(updateUserDto.password, 10);
      }

      // Update the user
      await this.userModel.update(updateData, { where: { id: userId } });

      // Fetch and return the updated user
      const updatedUser = await this.userModel.findByPk(userId);
      if (!updatedUser) {
        throw new NotFoundException('User not found after update');
      }

      const { password_hash, ...result } = updatedUser.get({ plain: true });
      
      this.logger.log(`Profile updated successfully for user ID: ${userId}`);
      
      return result;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating profile for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not update profile');
    }
  }

  /**
   * @jsdoc
   * Updates the 2FA status for a user.
   * @param userId The ID of the user.
   * @param enabled Whether 2FA should be enabled or disabled.
   * @returns The updated user object (without password hash).
   * @throws NotFoundException if the user is not found.
   * @throws InternalServerErrorException for other errors.
   */
  async update2FAStatus(userId: number, enabled: boolean): Promise<Partial<User>> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.userModel.update(
        { twoFactorEnabled: enabled },
        { where: { id: userId } }
      );

      // Fetch and return the updated user
      const updatedUser = await this.userModel.findByPk(userId);
      if (!updatedUser) {
        throw new NotFoundException('User not found after update');
      }

      const { password_hash, ...result } = updatedUser.get({ plain: true });
      
      this.logger.log(`2FA ${enabled ? 'enabled' : 'disabled'} successfully for user ID: ${userId}`);
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating 2FA status for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not update 2FA status');
    }
  }

  /**
   * @jsdoc
   * Gets all notifications for a user.
   * @param userId The ID of the user.
   * @returns Array of user notifications ordered by creation date (newest first).
   * @throws NotFoundException if the user is not found.
   */
  async getUserNotifications(userId: number): Promise<UserNotification[]> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const notifications = await this.userNotificationModel.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 50 // Limit to 50 most recent notifications
      });

      this.logger.log(`Retrieved ${notifications.length} notifications for user ID: ${userId}`);
      return notifications;
    } catch (error) {
      this.logger.error(`Error retrieving notifications for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not retrieve notifications');
    }
  }

  /**
   * @jsdoc
   * Marks a specific notification as read for a user.
   * @param userId The ID of the user.
   * @param notificationId The ID of the notification to mark as read.
   * @returns Success message.
   * @throws NotFoundException if the user or notification is not found.
   * @throws BadRequestException if the notification doesn't belong to the user.
   */
  async markNotificationAsRead(userId: number, notificationId: number): Promise<{ message: string }> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const notification = await this.userNotificationModel.findByPk(notificationId);
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new BadRequestException('Notification does not belong to this user');
      }

      await this.userNotificationModel.update(
        { 
          status: NotificationStatus.READ,
          readAt: new Date()
        },
        { where: { id: notificationId, userId } }
      );

      this.logger.log(`Notification ${notificationId} marked as read for user ID: ${userId}`);
      return { message: 'Notification marked as read' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error marking notification as read for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not mark notification as read');
    }
  }

  /**
   * @jsdoc
   * Marks all notifications as read for a user.
   * @param userId The ID of the user.
   * @returns Success message with count of updated notifications.
   * @throws NotFoundException if the user is not found.
   */
  async markAllNotificationsAsRead(userId: number): Promise<{ message: string, updatedCount: number }> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const [updatedCount] = await this.userNotificationModel.update(
        { 
          status: NotificationStatus.READ,
          readAt: new Date()
        },
        { 
          where: { 
            userId,
            status: NotificationStatus.UNREAD
          }
        }
      );

      this.logger.log(`Marked ${updatedCount} notifications as read for user ID: ${userId}`);
      return { 
        message: 'All notifications marked as read',
        updatedCount
      };
    } catch (error) {
      this.logger.error(`Error marking all notifications as read for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not mark all notifications as read');
    }
  }

  /**
   * @jsdoc
   * Dismisses (deletes) a specific notification for a user.
   * @param userId The ID of the user.
   * @param notificationId The ID of the notification to dismiss.
   * @returns Success message.
   * @throws NotFoundException if the user or notification is not found.
   * @throws BadRequestException if the notification doesn't belong to the user.
   */
  async dismissNotification(userId: number, notificationId: number): Promise<{ message: string }> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const notification = await this.userNotificationModel.findByPk(notificationId);
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new BadRequestException('Notification does not belong to this user');
      }

      await this.userNotificationModel.update(
        { status: NotificationStatus.DISMISSED },
        { where: { id: notificationId, userId } }
      );

      this.logger.log(`Notification ${notificationId} dismissed for user ID: ${userId}`);
      return { message: 'Notification dismissed' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error dismissing notification for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not dismiss notification');
    }
  }

  // Fee Versioning Methods
  async getFeeVersions(userId: number): Promise<FeeVersion[]> {
    return this.feeVersionModel.findAll({
      where: { userId },
      order: [['feeType', 'ASC'], ['updatedAt', 'DESC']]
    });
  }

  async getFeeVersionHistory(userId: number, feeType: string): Promise<FeeVersion[]> {
    return this.feeVersionModel.findAll({
      where: { 
        userId, 
        feeType: feeType as FeeConfigurationType 
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async getCurrentFeeVersion(userId: number, feeType: string): Promise<FeeVersion | null> {
    return this.feeVersionModel.findOne({
      where: { 
        userId, 
        feeType: feeType as FeeConfigurationType 
      },
      order: [['updatedAt', 'DESC']]
    });
  }

  // Global Fee Versioning Methods
  async getGlobalFeeVersion(userId: number): Promise<GlobalFeeVersion> {
    return this.superadminService.getCurrentGlobalFeeVersion(userId);
  }
}
