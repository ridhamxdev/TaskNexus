import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SubscriptionPlan, BillingCycle } from './entities/subscription-plan.entity';
import { UserSubscription, SubscriptionStatus } from './entities/user-subscription.entity';
import { SubscriptionPayment, PaymentStatus, PaymentMethod } from './entities/subscription-payment.entity';
import { User } from '../users/entities/user.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { Op } from 'sequelize';
import { TransactionsService } from '../transactions/transactions.service';
import { FeeConfiguration, FeeConfigurationType } from '../superadmin/entities/fee-configuration.entity';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(SubscriptionPlan)
    public subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(UserSubscription)
    public userSubscriptionModel: typeof UserSubscription,
    @InjectModel(SubscriptionPayment)
    public subscriptionPaymentModel: typeof SubscriptionPayment,
    @InjectModel(User)
    public userModel: typeof User,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => TransactionsService))
    private transactionsService: TransactionsService,
    @InjectModel(FeeConfiguration)
    public feeConfigurationModel: typeof FeeConfiguration,
  ) {}

  // Add method to get subscription by ID for cron service
  async getUserSubscriptionById(subscriptionId: number): Promise<UserSubscription | null> {
    return this.userSubscriptionModel.findByPk(subscriptionId, {
      include: [
        { model: SubscriptionPlan, as: 'plan' },
        { model: User, as: 'user' },
      ],
    });
  }

  // Subscription Plan Management
  async createPlan(createPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanModel.create(createPlanDto as any);
    await this.cacheManager.del('subscription_plans');
    return plan;
  }

  async getAllPlans(): Promise<SubscriptionPlan[]> {
    const cacheKey = 'subscription_plans';
    let plans = await this.cacheManager.get<SubscriptionPlan[]>(cacheKey);
    
    if (!plans) {
      plans = await this.subscriptionPlanModel.findAll({
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      });
      await this.cacheManager.set(cacheKey, plans, 300); // Cache for 5 minutes
    }
    
    return plans;
  }

  async getActivePlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionPlanModel.findAll({
      where: { status: 'active' },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
  }

  // User Subscription Management
  async subscribe(userId: number, createSubscriptionDto: CreateSubscriptionDto): Promise<UserSubscription> {
    const { planId } = createSubscriptionDto;

    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = await this.subscriptionPlanModel.findByPk(planId);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Get applicable fee configuration
    const feeConfigs = await this.feeConfigurationModel.findAll({
      where: {
        userId: user.id,
        type: FeeConfigurationType.SUBSCRIPTION,
        subscriptionPlanId: plan.id
      }
    });

    let fee = 0;
    if (feeConfigs && feeConfigs.length > 0) {
      fee = Number(feeConfigs[0].fee);
    }

    const totalAmount = Number(plan.price) + fee;

    // Check if user has sufficient balance
    if (user.balance < totalAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create subscription
    const subscription = await this.userSubscriptionModel.create({
      userId,
      planId,
      status: SubscriptionStatus.PENDING,
      startDate: new Date(),
      endDate: this.calculateEndDate(new Date(), plan.billingCycle),
      nextBillingDate: this.calculateNextBillingDate(new Date(), plan.billingCycle),
      autoRenew: true,
      emailsUsed: 0,
      transactionsUsed: 0,
    } as any);

    // Process payment
    const payment = await this.processPayment(subscription, totalAmount, PaymentMethod.BALANCE);

    if (payment.status === PaymentStatus.COMPLETED) {
      // Activate subscription
      subscription.status = SubscriptionStatus.ACTIVE;
      await subscription.save();

      // Deduct total amount from user wallet balance
      user.balance = Number(user.balance) - totalAmount;
      await user.save();

      // Create transaction record for subscription payment
      try {
        // Subscription payment transaction
        await this.transactionsService.createTransaction({
          userId,
          amount: plan.price,
          type: 'DEBIT',
          description: `Subscription payment - ${plan.name} (${plan.billingCycle})`,
          transactionDate: new Date(),
        });

        // If there's a fee, handle fee transactions
        if (fee > 0) {
          const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
          if (superadmin) {
            // Credit fee to superadmin
            superadmin.balance = Number(superadmin.balance) + fee;
            await superadmin.save();

            // Fee debit from user
            await this.transactionsService.createTransaction({
              userId: user.id,
              amount: fee,
              type: 'DEBIT',
              description: `Subscription fee for ${plan.name}`,
              transactionDate: new Date(),
            });

            // Fee credit to superadmin
            await this.transactionsService.createTransaction({
              userId: superadmin.id,
              amount: fee,
              type: 'CREDIT',
              description: `Subscription fee from ${user.email} for ${plan.name}`,
              transactionDate: new Date(),
            });
          }
        }
      } catch (error) {
        this.logger.error(`Failed to create transaction record for subscription ${subscription.id}:`, error);
        // Don't fail the subscription if transaction recording fails
      }

      this.logger.log(`Subscription activated for user ${userId}, plan ${planId}`);
    }

    return subscription;
  }

  async getUserActiveSubscription(userId: number): Promise<UserSubscription | null> {
    return this.userSubscriptionModel.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { [Op.gt]: new Date() },
      },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
    });
  }

  async getUserSubscriptions(userId: number): Promise<UserSubscription[]> {
    return this.userSubscriptionModel.findAll({
      where: { userId },
      include: [
        { model: SubscriptionPlan, as: 'plan' },
        { model: SubscriptionPayment, as: 'payments' },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async updateSubscription(subscriptionId: number, updateDto: UpdateSubscriptionDto): Promise<UserSubscription> {
    const subscription = await this.userSubscriptionModel.findByPk(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Handle status changes
    if (updateDto.status === SubscriptionStatus.CANCELLED) {
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = updateDto.cancellationReason;
      subscription.autoRenew = false;
    }

    // Handle plan changes (upgrade/downgrade)
    if (updateDto.planId && updateDto.planId !== subscription.planId) {
      await this.changePlan(subscription, updateDto.planId);
    }

    await subscription.update(updateDto);
    return subscription;
  }

  async cancelSubscription(subscriptionId: number, reason?: string): Promise<UserSubscription> {
    return this.updateSubscription(subscriptionId, {
      status: SubscriptionStatus.CANCELLED,
      cancellationReason: reason,
      autoRenew: false,
    });
  }

  // Renewal and Billing
  async renewSubscription(subscription: UserSubscription): Promise<boolean> {
    try {
      const plan = await this.subscriptionPlanModel.findByPk(subscription.planId);
      if (!plan) {
        this.logger.error(`Plan not found for subscription ${subscription.id}`);
        return false;
      }

      const user = await this.userModel.findByPk(subscription.userId);
      if (!user) {
        this.logger.error(`User not found for subscription ${subscription.id}`);
        return false;
      }

      // Get applicable fee configuration
      const feeConfigs = await this.feeConfigurationModel.findAll({
        where: {
          userId: user.id,
          type: FeeConfigurationType.SUBSCRIPTION,
          subscriptionPlanId: plan.id
        }
      });

      let fee = 0;
      if (feeConfigs && feeConfigs.length > 0) {
        fee = Number(feeConfigs[0].fee);
      }

      const totalAmount = Number(plan.price) + fee;

      // Check if user has sufficient balance
      if (user.balance < totalAmount) {
        subscription.status = SubscriptionStatus.SUSPENDED;
        await subscription.save();
        this.logger.warn(`Subscription ${subscription.id} suspended due to insufficient balance`);
        return false;
      }

      // Process renewal payment
      const payment = await this.processPayment(subscription, totalAmount, PaymentMethod.BALANCE);

      if (payment.status === PaymentStatus.COMPLETED) {
        // Extend subscription
        const currentEndDate = subscription.endDate;
        const newEndDate = this.calculateEndDate(currentEndDate, plan.billingCycle);
        const newNextBillingDate = this.calculateNextBillingDate(currentEndDate, plan.billingCycle);

        subscription.endDate = newEndDate;
        subscription.nextBillingDate = newNextBillingDate;
        subscription.status = SubscriptionStatus.ACTIVE;
        await subscription.save();

        // Deduct total amount from user balance
        user.balance = Number(user.balance) - totalAmount;
        await user.save();

        // Create transaction record for subscription renewal
        try {
          // Subscription payment transaction
          await this.transactionsService.createTransaction({
            userId: subscription.userId,
            amount: plan.price,
            type: 'DEBIT',
            description: `Subscription renewal - ${plan.name} (${plan.billingCycle})`,
            transactionDate: new Date(),
          });

          // If there's a fee, handle fee transactions
          if (fee > 0) {
            const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
            if (superadmin) {
              // Credit fee to superadmin
              superadmin.balance = Number(superadmin.balance) + fee;
              await superadmin.save();

              // Fee debit from user
              await this.transactionsService.createTransaction({
                userId: user.id,
                amount: fee,
                type: 'DEBIT',
                description: `Subscription fee for ${plan.name}`,
                transactionDate: new Date(),
              });

              // Fee credit to superadmin
              await this.transactionsService.createTransaction({
                userId: superadmin.id,
                amount: fee,
                type: 'CREDIT',
                description: `Subscription fee from ${user.email} for ${plan.name}`,
                transactionDate: new Date(),
              });
            }
          }
        } catch (error) {
          this.logger.error(`Failed to create transaction record for renewal of subscription ${subscription.id}:`, error);
          // Don't fail the renewal if transaction recording fails
        }

        this.logger.log(`Subscription ${subscription.id} renewed successfully`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to renew subscription ${subscription.id}:`, error);
      return false;
    }
  }

  async getSubscriptionsForRenewal(): Promise<UserSubscription[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.userSubscriptionModel.findAll({
      where: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        nextBillingDate: {
          [Op.lte]: today,
        },
      },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
    });
  }

  async getExpiringSubscriptions(days: number = 7): Promise<UserSubscription[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.userSubscriptionModel.findAll({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          [Op.between]: [new Date(), futureDate],
        },
      },
      include: [
        { model: User, as: 'user' },
        { model: SubscriptionPlan, as: 'plan' },
      ],
    });
  }

  // Usage Tracking
  async incrementEmailUsage(userId: number): Promise<boolean> {
    const subscription = await this.getUserActiveSubscription(userId);
    if (!subscription) return true; // No subscription = unlimited usage for now

    const plan = subscription.plan;
    if (!plan.emailQuota) return true; // No limit

    if (subscription.emailsUsed >= plan.emailQuota) {
      throw new BadRequestException('Email quota exceeded');
    }

    subscription.emailsUsed += 1;
    await subscription.save();
    return true;
  }

  async incrementTransactionUsage(userId: number): Promise<boolean> {
    const subscription = await this.getUserActiveSubscription(userId);
    if (!subscription) return true; // No subscription = unlimited usage for now

    const plan = subscription.plan;
    if (!plan.transactionLimit) return true; // No limit

    if (subscription.transactionsUsed >= plan.transactionLimit) {
      throw new BadRequestException('Transaction limit exceeded');
    }

    subscription.transactionsUsed += 1;
    await subscription.save();
    return true;
  }

  // Helper Methods
  private calculateEndDate(startDate: Date, billingCycle: BillingCycle): Date {
    const endDate = new Date(startDate);
    
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case BillingCycle.ANNUALLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    
    return endDate;
  }

  private calculateNextBillingDate(startDate: Date, billingCycle: BillingCycle): Date {
    return this.calculateEndDate(startDate, billingCycle);
  }

  private async processPayment(
    subscription: UserSubscription,
    amount: number,
    paymentMethod: PaymentMethod,
  ): Promise<SubscriptionPayment> {
    const payment = await this.subscriptionPaymentModel.create({
      subscriptionId: subscription.id,
      amount,
      paymentMethod,
      status: PaymentStatus.PENDING,
    } as any);

    // Simulate payment processing
    // In a real app, this would integrate with payment gateways
    payment.status = PaymentStatus.COMPLETED;
    payment.paymentDate = new Date();
    payment.paymentReference = `txn_${Date.now()}_${subscription.id}`;
    await payment.save();

    return payment;
  }

  private async changePlan(subscription: UserSubscription, newPlanId: number): Promise<void> {
    const newPlan = await this.subscriptionPlanModel.findByPk(newPlanId);
    if (!newPlan || newPlan.status !== 'active') {
      throw new NotFoundException('New subscription plan not found or inactive');
    }

    const currentPlan = await this.subscriptionPlanModel.findByPk(subscription.planId);
    if (!currentPlan) {
      throw new NotFoundException('Current subscription plan not found');
    }

    const user = await this.userModel.findByPk(subscription.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get applicable fee configuration for new plan
    const feeConfigs = await this.feeConfigurationModel.findAll({
      where: {
        userId: user.id,
        type: FeeConfigurationType.SUBSCRIPTION,
        subscriptionPlanId: newPlanId
      }
    });

    let fee = 0;
    if (feeConfigs && feeConfigs.length > 0) {
      fee = Number(feeConfigs[0].fee);
    }

    // Calculate prorated amount (simplified)
    const priceDifference = Number(newPlan.price) - Number(currentPlan.price);
    const totalCharge = priceDifference + fee;
    
    if (totalCharge > 0) {
      // Upgrade - charge difference plus fee
      if (user.balance < totalCharge) {
        throw new BadRequestException('Insufficient wallet balance for upgrade. Please add funds to your wallet.');
      }

      // Deduct total charge from user
      user.balance = Number(user.balance) - totalCharge;
      await user.save();
        
      // Create payment record for the difference
      await this.subscriptionPaymentModel.create({
        subscriptionId: subscription.id,
        amount: totalCharge,
        paymentMethod: PaymentMethod.BALANCE,
        status: PaymentStatus.COMPLETED,
        paymentDate: new Date(),
        paymentReference: `upgrade_${Date.now()}_${subscription.id}`,
      } as any);

      // Create transaction record for plan upgrade
      await this.transactionsService.createTransaction({
        userId: subscription.userId,
        amount: priceDifference,
        type: 'DEBIT',
        description: `Plan upgrade - ${currentPlan.name} to ${newPlan.name}`,
        transactionDate: new Date(),
      });

      // If there's a fee, handle fee transactions
      if (fee > 0) {
        const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
        if (superadmin) {
          // Credit fee to superadmin
          superadmin.balance = Number(superadmin.balance) + fee;
          await superadmin.save();

          // Fee debit from user
          await this.transactionsService.createTransaction({
            userId: user.id,
            amount: fee,
            type: 'DEBIT',
            description: `Subscription fee for upgrade to ${newPlan.name}`,
            transactionDate: new Date(),
          });

          // Fee credit to superadmin
          await this.transactionsService.createTransaction({
            userId: superadmin.id,
            amount: fee,
            type: 'CREDIT',
            description: `Subscription fee from ${user.email} for upgrade to ${newPlan.name}`,
            transactionDate: new Date(),
          });
        }
      }
    }
    // For downgrades, we don't refund the difference (business rule)

    subscription.planId = newPlanId;
    subscription.emailsUsed = 0; // Reset usage counters
    subscription.transactionsUsed = 0;
    await subscription.save();
  }

  // User-specific Subscription Plan Management
  async createUserPlan(userId: number, planData: { 
    billingCycle: BillingCycle, 
    price: number,
    emailQuota?: number,
    transactionLimit?: number 
  }): Promise<SubscriptionPlan> {
    const { billingCycle, price, emailQuota, transactionLimit } = planData;
    
    // Check if user already has a plan for this billing cycle
    const existingPlan = await this.subscriptionPlanModel.findOne({
      where: { userId, billingCycle }
    });
    
    if (existingPlan) {
      throw new BadRequestException(`User already has a ${billingCycle} plan`);
    }

    const planName = `${billingCycle.charAt(0).toUpperCase()}${billingCycle.slice(1)} Plan`;
    const description = `User-specific ${billingCycle} subscription plan`;
    
    const features = this.getDefaultFeatures(billingCycle);
    const defaultLimits = this.getDefaultLimits(billingCycle);
    const finalEmailQuota = emailQuota !== undefined ? emailQuota : defaultLimits.emailQuota;
    const finalTransactionLimit = transactionLimit !== undefined ? transactionLimit : defaultLimits.transactionLimit;

    const plan = await this.subscriptionPlanModel.create({
      userId,
      name: planName,
      description,
      price,
      billingCycle,
      features,
      emailQuota: finalEmailQuota,
      transactionLimit: finalTransactionLimit,
      status: 'active',
      sortOrder: this.getBillingCycleSortOrder(billingCycle),
    } as any);

    await this.cacheManager.del(`user_subscription_plans_${userId}`);
    return plan;
  }

  async getUserPlans(userId: number): Promise<SubscriptionPlan[]> {
    const cacheKey = `user_subscription_plans_${userId}`;
    let plans = await this.cacheManager.get<SubscriptionPlan[]>(cacheKey);
    
    if (!plans) {
      plans = await this.subscriptionPlanModel.findAll({
        where: { userId },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      });
      await this.cacheManager.set(cacheKey, plans, 300); // Cache for 5 minutes
    }
    
    return plans;
  }

  async updateUserPlan(userId: number, billingCycle: BillingCycle, updateData: { 
    price?: number,
    emailQuota?: number,
    transactionLimit?: number 
  }): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanModel.findOne({
      where: { userId, billingCycle }
    });
    
    if (!plan) {
      throw new NotFoundException(`${billingCycle} plan not found for user`);
    }

    await plan.update(updateData);
    await this.cacheManager.del(`user_subscription_plans_${userId}`);
    return plan;
  }

  async deleteUserPlan(userId: number, billingCycle: BillingCycle): Promise<void> {
    const plan = await this.subscriptionPlanModel.findOne({
      where: { userId, billingCycle }
    });
    
    if (!plan) {
      throw new NotFoundException(`${billingCycle} plan not found for user`);
    }

    // Check if there are active subscriptions using this plan
    const activeSubscriptions = await this.userSubscriptionModel.count({
      where: { planId: plan.id, status: SubscriptionStatus.ACTIVE }
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException('Cannot delete plan with active subscriptions');
    }

    await plan.destroy();
    await this.cacheManager.del(`user_subscription_plans_${userId}`);
  }

  async getUserAvailablePlans(userId: number): Promise<SubscriptionPlan[]> {
    // Get user-specific plans
    const userPlans = await this.getUserPlans(userId);
    
    // If user doesn't have all 3 plans (monthly, quarterly, annually), create default ones
    const requiredCycles = [BillingCycle.MONTHLY, BillingCycle.QUARTERLY, BillingCycle.ANNUALLY];
    const existingCycles = userPlans.map(plan => plan.billingCycle);
    const missingCycles = requiredCycles.filter(cycle => !existingCycles.includes(cycle));

    for (const cycle of missingCycles) {
      const defaultPrice = this.getDefaultPrice(cycle);
      await this.createUserPlan(userId, { billingCycle: cycle, price: defaultPrice });
    }

    // Return fresh list of user plans
    return this.getUserPlans(userId);
  }

  private getDefaultFeatures(billingCycle: BillingCycle): Record<string, any> {
    const baseFeatures = [
      'Email management',
      'Transaction tracking',
      'Basic support'
    ];

    const additionalFeatures = billingCycle === BillingCycle.ANNUALLY 
      ? ['Priority support', 'Advanced analytics'] 
      : billingCycle === BillingCycle.QUARTERLY 
      ? ['Priority support'] 
      : [];

    return {
      features: [...baseFeatures, ...additionalFeatures],
      emailSupport: true,
      prioritySupport: billingCycle !== BillingCycle.MONTHLY,
      analyticsReports: billingCycle === BillingCycle.ANNUALLY,
    };
  }

  private getDefaultLimits(billingCycle: BillingCycle): { emailQuota: number, transactionLimit: number } {
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        return { emailQuota: 100, transactionLimit: 50 };
      case BillingCycle.QUARTERLY:
        return { emailQuota: 300, transactionLimit: 150 };
      case BillingCycle.ANNUALLY:
        return { emailQuota: 1200, transactionLimit: 600 };
      default:
        return { emailQuota: 100, transactionLimit: 50 };
    }
  }

  private getDefaultPrice(billingCycle: BillingCycle): number {
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        return 29.99;
      case BillingCycle.QUARTERLY:
        return 80.97; // 10% discount
      case BillingCycle.ANNUALLY:
        return 299.99; // 17% discount
      default:
        return 29.99;
    }
  }

  private getBillingCycleSortOrder(billingCycle: BillingCycle): number {
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        return 1;
      case BillingCycle.QUARTERLY:
        return 2;
      case BillingCycle.ANNUALLY:
        return 3;
      default:
        return 1;
    }
  }
} 