import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// Entities
import { Tenant } from './entities/tenant.entity';
import { TenantInvitation } from './entities/tenant-invitation.entity';
import { UserTenant } from './entities/user-tenant.entity';
import { User } from '../users/entities/user.entity';

// Services
import { TenantsService } from './tenants.service';
import { TenantInvitationService } from './tenant-invitation.service';
import { TenantDatabaseService } from './tenant-database.service';

// Controllers
import { TenantsController } from './tenants.controller';
import { TenantInvitationController } from './tenant-invitation.controller';

// Other modules
import { UsersModule } from '../users/users.module';
import { EmailsModule } from '../emails/emails.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Tenant,
      TenantInvitation,
      UserTenant,
      User,
    ]),
    ConfigModule,
    JwtModule,
    forwardRef(() => UsersModule),
    forwardRef(() => EmailsModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    TenantsController,
    TenantInvitationController,
  ],
  providers: [
    TenantsService,
    TenantInvitationService,
    TenantDatabaseService,
  ],
  exports: [
    TenantsService,
    TenantInvitationService,
    TenantDatabaseService,
    SequelizeModule,
  ],
})
export class TenantsModule {} 