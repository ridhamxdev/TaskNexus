import { Controller, Post, Body, UseGuards, Get, Param, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(
    @Body() body: { 
      email: string; 
      password: string; 
      name: string;
      initialBalance?: number;
    }
  ) {
    return this.usersService.register(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('update-role')
  async updateRole(
    @Body() body: { userId: number; role: UserRole }
  ) {
    return this.usersService.updateRole(body.userId, body.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req) {
    const userId = req.user.userId;
    // ...rest of your logic
  }
} 