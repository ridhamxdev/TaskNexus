import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from '../users/dto/login-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    
    if (!user) {
      return null;
    }
    
    if (!user.password_hash) {
      return null;
    }
    
    try {
      const isMatch = await bcrypt.compare(pass, user.password_hash);
      
      if (isMatch) {
        const { password_hash, ...result } = user.get({ plain: true });
        return result;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error comparing passwords: ${error.message}`, error.stack);
      return null;
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const user = await this.validateUser(loginUserDto.email, loginUserDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
} 