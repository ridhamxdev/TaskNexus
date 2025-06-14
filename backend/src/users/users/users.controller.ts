import { Controller, Post, Body, Get, Put, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { AddMoneyDto } from '../dto/add-money.dto';
// LoginUserDto is no longer used in this controller
// import { LoginUserDto } from '../dto/login-user.dto';
// import { UpdateUserDto } from '../dto/update-user.dto'; // Will create this later

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

  // @Put('profile')
  // @UseGuards(JwtAuthGuard)
  // updateUserProfile(@Req() req, @Body() updateUserDto: any /* UpdateUserDto */) {
  //   return this.usersService.updateProfile(req.user.id, updateUserDto);
  // }

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
