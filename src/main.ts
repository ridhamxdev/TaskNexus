import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create the app with full logging
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable global DTO validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip away properties that do not have any decorators
    forbidNonWhitelisted: true, // Throw an error if non-whitelisted values are provided
    transform: true, // Automatically transform payloads to DTO instances
  }));

  // Enable global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable shutdown hooks for graceful shutdown (e.g., for DB connections)
  app.enableShutdownHooks();

  // Get port from environment or use default
  const port = process.env.PORT || '3000';
  
  // Try to start the server with the specified port
  try {
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      // If port is in use, try the next available port
      const nextPort = (parseInt(port) + 1).toString();
      logger.log(`Port ${port} is in use, trying ${nextPort}...`);
      await app.listen(nextPort);
      logger.log(`Application is running on: http://localhost:${nextPort}`);
    } else {
      throw error;
    }
  }
}
bootstrap();
