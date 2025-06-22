import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionCronService } from './subscription-cron.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private subscriptionCronService: SubscriptionCronService,
  ) {}

  // Public endpoints for subscription plans
  @Get('plans')
  async getPlans() {
    const plans = await this.subscriptionsService.getActivePlans();
    return {
      success: true,
      data: plans,
    };
  }

  @Get('plans/:id')
  async getPlan(@Param('id', ParseIntPipe) id: number) {
    const plan = await this.subscriptionsService.subscriptionPlanModel.findByPk(id);
    if (!plan) {
      throw new BadRequestException('Subscription plan not found');
    }

    return {
      success: true,
      data: plan,
    };
  }

  // User subscription management
  @Post('subscribe')
  async subscribe(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    const userId = req.user.userId;
    const subscription = await this.subscriptionsService.subscribe(userId, createSubscriptionDto);
    
    // Set up dynamic scheduling for the new subscription (Amazon Prime-like experience)
    if (subscription.status === 'active') {
      await this.subscriptionCronService.setupSubscriptionSchedules(subscription.id);
    }
    
    return {
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    };
  }

  @Get('my-subscriptions')
  async getUserSubscriptions(@Request() req) {
    const userId = req.user.userId;
    const subscriptions = await this.subscriptionsService.getUserSubscriptions(userId);
    
    return {
      success: true,
      data: subscriptions,
    };
  }

  @Get('current')
  async getCurrentSubscription(@Request() req) {
    const userId = req.user.userId;
    const subscription = await this.subscriptionsService.getUserActiveSubscription(userId);
    
    return {
      success: true,
      data: subscription,
    };
  }

  @Put(':id')
  async updateSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    
    // Verify the subscription belongs to the user (unless admin)
    const subscription = await this.subscriptionsService.userSubscriptionModel.findByPk(id);
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }
    
    if (req.user.role !== UserRole.SUPERADMIN && subscription.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    const updatedSubscription = await this.subscriptionsService.updateSubscription(id, updateSubscriptionDto);
    
    return {
      success: true,
      message: 'Subscription updated successfully',
      data: updatedSubscription,
    };
  }

  @Post(':id/cancel')
  async cancelSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    const userId = req.user.userId;
    
    // Verify the subscription belongs to the user (unless admin)
    const subscription = await this.subscriptionsService.userSubscriptionModel.findByPk(id);
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }
    
    if (req.user.role !== UserRole.SUPERADMIN && subscription.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    const cancelledSubscription = await this.subscriptionsService.cancelSubscription(id, reason);
    
    // Cancel all scheduled jobs for this subscription
    await this.subscriptionCronService.cancelSubscriptionSchedules(id);
    
    return {
      success: true,
      message: 'Subscription cancelled successfully',
      data: cancelledSubscription,
    };
  }

  // Admin-only endpoints
  @Post('plans')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async createPlan(@Body() createPlanDto: CreateSubscriptionPlanDto) {
    const plan = await this.subscriptionsService.createPlan(createPlanDto);
    
    return {
      success: true,
      message: 'Subscription plan created successfully',
      data: plan,
    };
  }

  @Get('admin/plans')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getAllPlans() {
    const plans = await this.subscriptionsService.getAllPlans();
    
    return {
      success: true,
      data: plans,
    };
  }

  @Get('admin/subscriptions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getAllSubscriptions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('planId') planId?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (planId) {
      whereClause.planId = parseInt(planId, 10);
    }

    const { rows: subscriptions, count: total } = await this.subscriptionsService.userSubscriptionModel.findAndCountAll({
      where: whereClause,
      include: [
        { model: this.subscriptionsService.userModel, as: 'user' },
        { model: this.subscriptionsService.subscriptionPlanModel, as: 'plan' },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    return {
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    };
  }

  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getSubscriptionAnalytics() {
    // Get subscription statistics
    const totalSubscriptions = await this.subscriptionsService.userSubscriptionModel.count();
    const activeSubscriptions = await this.subscriptionsService.userSubscriptionModel.count({
      where: { status: 'active' },
    });
    const cancelledSubscriptions = await this.subscriptionsService.userSubscriptionModel.count({
      where: { status: 'cancelled' },
    });
    const expiredSubscriptions = await this.subscriptionsService.userSubscriptionModel.count({
      where: { status: 'expired' },
    });

    return {
      success: true,
      data: {
        totals: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          cancelled: cancelledSubscriptions,
          expired: expiredSubscriptions,
        },
      },
    };
  }

  @Post('admin/run-renewal')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async triggerRenewalProcess() {
    // Manually trigger renewal process (for testing/emergency)
    const subscriptionsForRenewal = await this.subscriptionsService.getSubscriptionsForRenewal();
    
    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptionsForRenewal) {
      try {
        const renewed = await this.subscriptionsService.renewSubscription(subscription);
        if (renewed) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        failureCount++;
      }
    }

    return {
      success: true,
      message: 'Renewal process completed',
      data: {
        total: subscriptionsForRenewal.length,
        success: successCount,
        failures: failureCount,
      },
    };
  }
} 