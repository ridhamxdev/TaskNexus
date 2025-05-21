import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
    console.log('JWT Secret in strategy:', process.env.JWT_SECRET);
  }

  async validate(payload: any) {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);
    
    // Handle both sub and id for backward compatibility
    const userId = payload.sub || payload.id;
    
    if (!userId) {
      this.logger.error('JWT payload missing user ID');
      return null;
    }

    return {
      userId: userId,
      email: payload.email,
      role: payload.role,
    };
  }
} 