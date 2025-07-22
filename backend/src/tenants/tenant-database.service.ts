import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { Dialect } from 'sequelize';

// Import tenant-specific entities that will be used in tenant databases
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Email } from '../emails/entities/email.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { SubscriptionPayment } from '../subscriptions/entities/subscription-payment.entity';
import { OTP } from '../auth/entities/otp.entity';

@Injectable()
export class TenantDatabaseService {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private tenantConnections: Map<string, Sequelize> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create a new database for a tenant
   */
  async createTenantDatabase(tenantKey: string, databaseName: string): Promise<void> {
    try {
      // Create the database first using the main connection
      const mainSequelize = new Sequelize({
        dialect: this.configService.get<Dialect>('DB_DIALECT', 'mysql'),
        host: this.configService.get<string>('DB_HOST', 'localhost'),
        port: this.configService.get<number>('DB_PORT', 3306),
        username: this.configService.get<string>('DB_USERNAME', 'root'),
        password: this.configService.get<string>('DB_PASSWORD', ''),
        logging: false,
      });

      // Create the database
      await mainSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
      await mainSequelize.close();

      // Create connection to the new tenant database
      const tenantSequelize = await this.createTenantConnection(tenantKey, databaseName);
      
      // Sync/create tables
      await tenantSequelize.sync({ force: false });

      this.logger.log(`Successfully created tenant database: ${databaseName}`);
    } catch (error) {
      this.logger.error(`Failed to create tenant database ${databaseName}:`, error);
      throw new InternalServerErrorException(`Failed to create tenant database: ${error.message}`);
    }
  }

  /**
   * Get or create a connection to a tenant's database
   */
  async getTenantConnection(tenantKey: string, databaseName: string): Promise<Sequelize> {
    if (!this.tenantConnections.has(tenantKey)) {
      await this.createTenantConnection(tenantKey, databaseName);
    }
    
    const connection = this.tenantConnections.get(tenantKey);
    if (!connection) {
      throw new InternalServerErrorException(`Failed to establish connection for tenant: ${tenantKey}`);
    }

    return connection;
  }

  /**
   * Create a new Sequelize connection for a tenant
   */
  private async createTenantConnection(tenantKey: string, databaseName: string): Promise<Sequelize> {
    try {
      const sequelize = new Sequelize({
        dialect: this.configService.get<Dialect>('DB_DIALECT', 'mysql'),
        host: this.configService.get<string>('DB_HOST', 'localhost'),
        port: this.configService.get<number>('DB_PORT', 3306),
        username: this.configService.get<string>('DB_USERNAME', 'root'),
        password: this.configService.get<string>('DB_PASSWORD', ''),
        database: databaseName,
        models: [
          User,
          Transaction,
          Email,
          SubscriptionPlan,
          UserSubscription,
          SubscriptionPayment,
          OTP,
        ],
        logging: false,
        define: {
          timestamps: true,
          underscored: true,
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      });

      // Test the connection
      await sequelize.authenticate();
      
      // Store the connection
      this.tenantConnections.set(tenantKey, sequelize);
      
      this.logger.log(`Successfully created connection for tenant: ${tenantKey}`);
      return sequelize;
    } catch (error) {
      this.logger.error(`Failed to create connection for tenant ${tenantKey}:`, error);
      throw new InternalServerErrorException(`Failed to create tenant connection: ${error.message}`);
    }
  }

  /**
   * Close a tenant's database connection
   */
  async closeTenantConnection(tenantKey: string): Promise<void> {
    const connection = this.tenantConnections.get(tenantKey);
    if (connection) {
      await connection.close();
      this.tenantConnections.delete(tenantKey);
      this.logger.log(`Closed connection for tenant: ${tenantKey}`);
    }
  }

  /**
   * Close all tenant connections
   */
  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.tenantConnections.entries()).map(
      async ([tenantKey, connection]) => {
        try {
          await connection.close();
          this.logger.log(`Closed connection for tenant: ${tenantKey}`);
        } catch (error) {
          this.logger.error(`Error closing connection for tenant ${tenantKey}:`, error);
        }
      }
    );

    await Promise.all(closePromises);
    this.tenantConnections.clear();
    this.logger.log('All tenant connections closed');
  }

  /**
   * Delete a tenant's database (use with caution)
   */
  async deleteTenantDatabase(databaseName: string): Promise<void> {
    try {
      const mainSequelize = new Sequelize({
        dialect: this.configService.get<Dialect>('DB_DIALECT', 'mysql'),
        host: this.configService.get<string>('DB_HOST', 'localhost'),
        port: this.configService.get<number>('DB_PORT', 3306),
        username: this.configService.get<string>('DB_USERNAME', 'root'),
        password: this.configService.get<string>('DB_PASSWORD', ''),
        logging: false,
      });

      await mainSequelize.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      await mainSequelize.close();

      this.logger.log(`Successfully deleted tenant database: ${databaseName}`);
    } catch (error) {
      this.logger.error(`Failed to delete tenant database ${databaseName}:`, error);
      throw new InternalServerErrorException(`Failed to delete tenant database: ${error.message}`);
    }
  }

  /**
   * Get connection status for all tenants
   */
  getConnectionStatus(): { tenantKey: string; connected: boolean }[] {
    return Array.from(this.tenantConnections.entries()).map(([tenantKey, connection]) => ({
      tenantKey,
      connected: connection.connectionManager !== undefined,
    }));
  }

  /**
   * Health check for tenant connections
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any[] }> {
    const details: any[] = [];
    let allHealthy = true;

    for (const [tenantKey, connection] of this.tenantConnections.entries()) {
      try {
        await connection.authenticate();
        details.push({ tenantKey, status: 'healthy' });
      } catch (error: any) {
        allHealthy = false;
        details.push({ 
          tenantKey, 
          status: 'unhealthy', 
          error: error.message 
        });
      }
    }

    return {
      healthy: allHealthy,
      details,
    };
  }
} 