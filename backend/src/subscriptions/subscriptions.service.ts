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
    const { planId, autoRenew } = createSubscriptionDto;
    const paymentMethod = PaymentMethod.BALANCE; // Always use wallet balance

    // Check if user exists
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if plan exists
    const plan = await this.subscriptionPlanModel.findByPk(planId);
    if (!plan || plan.status !== 'active') {
      throw new NotFoundException('Subscription plan not found or inactive');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.getUserActiveSubscription(userId);
    if (existingSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, plan.billingCycle);
    const nextBillingDate = this.calculateNextBillingDate(startDate, plan.billingCycle);

    // Check if user has sufficient balance for payment
    if (user.balance < plan.price) {
      throw new BadRequestException('Insufficient wallet balance. Please add funds to your account.');
    }

    // Create subscription
    const subscription = await this.userSubscriptionModel.create({
      userId,
      planId,
      status: SubscriptionStatus.PENDING,
      startDate,
      endDate,
      nextBillingDate,
      autoRenew: autoRenew ?? true,
    } as any);

    // Process payment using wallet balance
    const payment = await this.processPayment(subscription, plan.price, PaymentMethod.BALANCE);

    if (payment.status === PaymentStatus.COMPLETED) {
      // Activate subscription
      subscription.status = SubscriptionStatus.ACTIVE;
      await subscription.save();

      // Deduct amount from user wallet balance
      user.balance = Number(user.balance) - Number(plan.price);
      await user.save();

      // Create transaction record for subscription payment
      try {
        await this.transactionsService.createTransaction({
          userId,
          amount: plan.price,
          type: 'DEBIT',
          description: `Subscription payment - ${plan.name} (${plan.billingCycle})`,
          transactionDate: new Date(),
        });
      } catch (error) {
        this.logger.error(`Failed to create transaction record for subscription ${subscription.id}:`, error);
        // Don't fail the subscription if transaction recording fails
      }

      this.logger.log(`Subscription activated for user ${userId}, plan ${planId}`);

      // Note: Dynamic scheduling will be set up by the controller after this method returns
      // to avoid circular dependency issues
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

      // Check if user has sufficient balance
      if (user.balance < plan.price) {
        subscription.status = SubscriptionStatus.SUSPENDED;
        await subscription.save();
        this.logger.warn(`Subscription ${subscription.id} suspended due to insufficient balance`);
        return false;
      }

      // Process renewal payment
      const payment = await this.processPayment(subscription, plan.price, PaymentMethod.BALANCE);

      if (payment.status === PaymentStatus.COMPLETED) {
        // Extend subscription
        const currentEndDate = subscription.endDate;
        const newEndDate = this.calculateEndDate(currentEndDate, plan.billingCycle);
        const newNextBillingDate = this.calculateNextBillingDate(currentEndDate, plan.billingCycle);

        subscription.endDate = newEndDate;
        subscription.nextBillingDate = newNextBillingDate;
        subscription.status = SubscriptionStatus.ACTIVE;
        await subscription.save();

        // Deduct amount from user balance
        user.balance = Number(user.balance) - Number(plan.price);
        await user.save();

        // Create transaction record for subscription renewal
        try {
          await this.transactionsService.createTransaction({
            userId: subscription.userId,
            amount: plan.price,
            type: 'DEBIT',
            description: `Subscription renewal - ${plan.name} (${plan.billingCycle})`,
            transactionDate: new Date(),
          });
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

    // Calculate prorated amount (simplified)
    const priceDifference = Number(newPlan.price) - Number(currentPlan.price);
    
    if (priceDifference > 0) {
      // Upgrade - charge difference
      const user = await this.userModel.findByPk(subscription.userId);
      if (user && user.balance >= priceDifference) {
        user.balance = Number(user.balance) - priceDifference;
        await user.save();
        
        // Create payment record for the difference
        await this.subscriptionPaymentModel.create({
          subscriptionId: subscription.id,
          amount: priceDifference,
          paymentMethod: PaymentMethod.BALANCE,
          status: PaymentStatus.COMPLETED,
          paymentDate: new Date(),
          paymentReference: `upgrade_${Date.now()}_${subscription.id}`,
        } as any);

        // Create transaction record for plan upgrade
        try {
          await this.transactionsService.createTransaction({
            userId: subscription.userId,
            amount: priceDifference,
            type: 'DEBIT',
            description: `Plan upgrade - ${currentPlan.name} to ${newPlan.name}`,
            transactionDate: new Date(),
          });
        } catch (error) {
          this.logger.error(`Failed to create transaction record for plan upgrade of subscription ${subscription.id}:`, error);
          // Don't fail the upgrade if transaction recording fails
        }
      } else {
        throw new BadRequestException('Insufficient wallet balance for upgrade. Please add funds to your wallet.');
      }
    }
    // For downgrades, we don't refund the difference (business rule)

    subscription.planId = newPlanId;
    subscription.emailsUsed = 0; // Reset usage counters
    subscription.transactionsUsed = 0;
  }
} 