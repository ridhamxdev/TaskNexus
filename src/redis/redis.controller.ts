import { Controller, Get, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
  private readonly logger = new Logger(RedisController.name);

  constructor(private readonly redisService: RedisService) {}

  @Get('health')
  async checkHealth() {
    try {
      const pingResponse = await this.redisService.ping();
      return {
        status: 'ok',
        message: 'Redis connection is healthy',
        ping: pingResponse
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        status: 'error',
        message: 'Redis connection is not healthy',
        error: error.message
      };
    }
  }
} 