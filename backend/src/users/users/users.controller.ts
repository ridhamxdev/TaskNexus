import { Controller, Post, Body, Get, Put, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { AddMoneyDto } from '../dto/add-money.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
// LoginUserDto is no longer used in this controller
// import { LoginUserDto } from '../dto/login-user.dto';

// Import the real JwtAuthGuard
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
// import { SuperAdminGuard } from '../../auth/guards/super-admin.guard'; // Placeholder

// Placeholder for JwtAuthGuard if you haven't created it in an auth module yet - REMOVE THIS
// import { AuthGuard } from '@nestjs/passport';
// export class JwtAuthGuard extends AuthGuard('jwt') {}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async registerUser(@Body() createUserDto: CreateUserDto) {
    // Now returns only user data, no token
    const user = await this.usersService.register(createUserDto);
    return { message: 'User registered successfully', user };
  }

  // Login endpoint is removed, handled by AuthController
  /*
  @Post('login') 
  async loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto);
  }
  */

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getUserProfile(@Req() req) {
    // req.user is populated by JwtStrategy after token validation
    // Access userId from req.user as defined in JwtStrategy
    return this.usersService.findProfile(req.user.userId);
  }

  @Put('add-money')
  @UseGuards(JwtAuthGuard)
  async addMoney(@Req() req, @Body() addMoneyDto: AddMoneyDto) {
    const userId = req.user.userId;
    const { amount } = addMoneyDto;
    
    const updatedUser = await this.usersService.addMoney(userId, amount);
    return { 
      message: 'Money added successfully', 
      newBalance: updatedUser.balance,
      user: updatedUser 
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateUserProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.updateProfile(req.user.userId, updateUserDto);
    return { 
      message: 'Profile updated successfully', 
      user: updatedUser 
    };
  }

  // User Notifications Management
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  async getUserNotifications(@Req() req) {
    return this.usersService.getUserNotifications(req.user.userId);
  }

  @Put('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  async markNotificationAsRead(@Req() req, @Param('id') id: string) {
    return this.usersService.markNotificationAsRead(req.user.userId, parseInt(id));
  }

  @Put('notifications/mark-all-read')
  @UseGuards(JwtAuthGuard)
  async markAllNotificationsAsRead(@Req() req) {
    return this.usersService.markAllNotificationsAsRead(req.user.userId);
  }

  @Delete('notifications/:id')
  @UseGuards(JwtAuthGuard)
  async dismissNotification(@Req() req, @Param('id') id: string) {
    return this.usersService.dismissNotification(req.user.userId, parseInt(id));
  }

  // Fee Versioning Endpoints
  @Get('fee-versions')
  @UseGuards(JwtAuthGuard)
  async getFeeVersions(@Req() req) {
    return this.usersService.getFeeVersions(req.user.userId);
  }

  @Get('fee-versions/:feeType')
  @UseGuards(JwtAuthGuard)
  async getFeeVersionHistory(@Req() req, @Param('feeType') feeType: string) {
    return this.usersService.getFeeVersionHistory(req.user.userId, feeType);
  }

  @Get('current-fee-version/:feeType')
  @UseGuards(JwtAuthGuard)
  async getCurrentFeeVersion(@Req() req, @Param('feeType') feeType: string) {
    return this.usersService.getCurrentFeeVersion(req.user.userId, feeType);
  }

  // Global Fee Versioning Endpoints
  @Get('global-fee-version')
  @UseGuards(JwtAuthGuard)
  async getGlobalFeeVersion(@Req() req) {
    return this.usersService.getGlobalFeeVersion(req.user.userId);
  }

  // @Delete() // Original was DELETE /
  // @UseGuards(JwtAuthGuard)
  // deleteUser(@Req() req) {
  //   return this.usersService.deleteUser(req.user.id);
  // }

  // @Put(':id/role')
  // @UseGuards(JwtAuthGuard, SuperAdminGuard)
  // updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
  //   return this.usersService.updateUserRole(id, body.role);
  // }

  // @Delete(':id')
  // @UseGuards(JwtAuthGuard, SuperAdminGuard)
  // deleteUserById(@Param('id') id: string) {
  //   return this.usersService.deleteUserById(id);
  // }
}
