import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  BadRequestException,
  ForbiddenException 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UserTenantRole } from './entities/user-tenant.entity';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Create a new tenant (SuperAdmin only)
   */
  @Post()
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() createTenantDto: CreateTenantDto, @Request() req) {
    return this.tenantsService.createTenant(createTenantDto, req.user.userId);
  }

  /**
   * Get all tenants (SuperAdmin only)
   */
  @Get()
  @Roles(UserRole.SUPERADMIN)
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return this.tenantsService.findAll(pageNum, limitNum);
  }

  /**
   * Get tenants for current user
   */
  @Get('my-tenants')
  @Roles(UserRole.USER, UserRole.TENANT, UserRole.SUPERADMIN)
  async getMyTenants(@Request() req) {
    return this.tenantsService.findTenantsForUser(req.user.userId);
  }

  /**
   * Get tenant by subdomain (public endpoint for tenant resolution)
   */
  @Get('by-subdomain/:subdomain')
  async findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.tenantsService.findBySubdomain(subdomain);
  }

  /**
   * Get specific tenant details
   */
  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // Allow superadmin access to any tenant
    if (req.user.role === UserRole.SUPERADMIN || req.user.role === 'superadmin') {
      return this.tenantsService.findOne(id);
    }

    // For tenant users, check if they have access to this specific tenant
    if (req.user.role === UserRole.TENANT || req.user.role === 'tenant') {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, id);
      if (!userTenant) {
        throw new ForbiddenException('Access denied to this tenant');
      }
      return this.tenantsService.findOne(id);
    }

    throw new ForbiddenException('Access denied to this tenant');
  }

  /**
   * Get tenant statistics
   */
  @Get(':id/stats')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async getTenantStats(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // Allow superadmin access to any tenant stats
    if (req.user.role === UserRole.SUPERADMIN || req.user.role === 'superadmin') {
      return this.tenantsService.getTenantStats(id);
    }

    // For tenant users, check if they have access to this tenant
    if (req.user.role === UserRole.TENANT || req.user.role === 'tenant') {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, id);
      if (!userTenant) {
        throw new ForbiddenException('Access denied to this tenant');
      }
      return this.tenantsService.getTenantStats(id);
    }

    throw new ForbiddenException('Access denied to this tenant');
  }

  /**
   * Update tenant
   */
  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenantDto: UpdateTenantDto,
    @Request() req
  ) {
    // Allow superadmin access to update any tenant
    if (req.user.role === UserRole.SUPERADMIN || req.user.role === 'superadmin') {
      return this.tenantsService.update(id, updateTenantDto, req.user.userId);
    }

    // For tenant users, check if they are admin of this tenant
    if (req.user.role === UserRole.TENANT || req.user.role === 'tenant') {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, id);
      if (!userTenant || !userTenant.isAdmin()) {
        throw new ForbiddenException('Only tenant administrators can update tenant settings');
      }
      return this.tenantsService.update(id, updateTenantDto, req.user.userId);
    }

    throw new ForbiddenException('Access denied to update this tenant');
  }

  /**
   * Delete tenant (SuperAdmin only)
   */
  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.tenantsService.remove(id, req.user.userId);
    return { message: 'Tenant deleted successfully' };
  }

  /**
   * Activate a tenant manually (SuperAdmin only)
   */
  @Patch(':id/activate')
  @Roles(UserRole.SUPERADMIN)
  async activate(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.tenantsService.activateTenant(id, req.user.userId);
  }

  /**
   * Get tenant users
   */
  @Get(':id/users')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async getTenantUsers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Request() req
  ) {
    // Allow superadmin access to view any tenant users
    if (req.user.role === UserRole.SUPERADMIN || req.user.role === 'superadmin') {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException('Invalid pagination parameters');
      }

      return this.tenantsService.getTenantUsers(id, pageNum, limitNum);
    }

    // For tenant users, check if they have access to view users
    if (req.user.role === UserRole.TENANT || req.user.role === 'tenant') {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, id);
      if (!userTenant || !userTenant.canViewUsers()) {
        throw new ForbiddenException('Access denied to view tenant users');
      }
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException('Invalid pagination parameters');
      }

      return this.tenantsService.getTenantUsers(id, pageNum, limitNum);
    }

    throw new ForbiddenException('Access denied to view tenant users');
  }

  /**
   * Add user to tenant
   */
  @Post(':id/users/:userId')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async addUserToTenant(
    @Param('id', ParseIntPipe) tenantId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body('role') role: UserTenantRole = UserTenantRole.MEMBER,
    @Request() req
  ) {
    // Allow superadmin access to manage any tenant users
    if (req.user.role === UserRole.SUPERADMIN || req.user.role === 'superadmin') {
      return this.tenantsService.addUserToTenant(tenantId, userId, role, req.user.userId);
    }

    // For tenant users, check if they have permission to manage users
    if (req.user.role === UserRole.TENANT || req.user.role === 'tenant') {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, tenantId);
      if (!userTenant || !userTenant.canManageUsers()) {
        throw new ForbiddenException('Access denied to manage tenant users');
      }
      return this.tenantsService.addUserToTenant(tenantId, userId, role, req.user.userId);
    }

    throw new ForbiddenException('Access denied to manage tenant users');
  }

  /**
   * Remove user from tenant
   */
  @Delete(':id/users/:userId')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async removeUserFromTenant(
    @Param('id', ParseIntPipe) tenantId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req
  ) {
    // Check permissions
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, tenantId);
      if (!userTenant || !userTenant.canManageUsers()) {
        throw new ForbiddenException('Access denied to manage tenant users');
      }
    }

    await this.tenantsService.removeUserFromTenant(tenantId, userId, req.user.userId);
    return { message: 'User removed from tenant successfully' };
  }

  /**
   * Update user role in tenant
   */
  @Patch(':id/users/:userId/role')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT)
  async updateUserTenantRole(
    @Param('id', ParseIntPipe) tenantId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body('role') newRole: UserTenantRole,
    @Request() req
  ) {
    // Check permissions
    if (req.user.role !== UserRole.SUPERADMIN) {
      const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, tenantId);
      if (!userTenant || !userTenant.canManageUsers()) {
        throw new ForbiddenException('Access denied to manage tenant users');
      }
    }

    return this.tenantsService.updateUserTenantRole(tenantId, userId, newRole, req.user.userId);
  }



  /**
   * Check user permissions for a tenant
   */
  @Get(':id/permissions')
  @Roles(UserRole.SUPERADMIN, UserRole.TENANT, UserRole.USER)
  async checkUserPermissions(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.role === UserRole.SUPERADMIN) {
      return {
        hasAccess: true,
        role: 'superadmin',
        permissions: ['all']
      };
    }

    const userTenant = await this.tenantsService.getUserTenantRole(req.user.userId, id);
    if (!userTenant) {
      return {
        hasAccess: false,
        role: null,
        permissions: []
      };
    }

    return {
      hasAccess: true,
      role: userTenant.role,
      permissions: userTenant.permissions || {}
    };
  }

  /**
   * Assign a user as tenant admin (SuperAdmin only)
   */
  @Post(':id/assign-admin')
  @Roles(UserRole.SUPERADMIN)
  async assignAdmin(
    @Param('id', ParseIntPipe) tenantId: number, 
    @Body() assignAdminDto: { userId: number },
    @Request() req
  ) {
    return this.tenantsService.assignTenantAdmin(tenantId, assignAdminDto.userId, req.user.userId);
  }

  /**
   * Clear all tenants (SuperAdmin only - use with extreme caution)
   */
  @Delete('bulk/clear-all')
  @Roles(UserRole.SUPERADMIN)
  async clearAllTenants(@Request() req) {
    const result = await this.tenantsService.clearAllTenants(req.user.userId);
    return {
      message: `Successfully deleted ${result.deletedCount} tenants`,
      ...result
    };
  }

  /**
   * Create multiple tenants at once (SuperAdmin only)
   */
  @Post('bulk/create')
  @Roles(UserRole.SUPERADMIN)
  async createMultipleTenants(@Body() bulkCreateDto: { tenants: CreateTenantDto[] }, @Request() req) {
    if (!bulkCreateDto.tenants || !Array.isArray(bulkCreateDto.tenants) || bulkCreateDto.tenants.length === 0) {
      throw new BadRequestException('Invalid tenant data: tenants array is required and must not be empty');
    }

    if (bulkCreateDto.tenants.length > 50) {
      throw new BadRequestException('Cannot create more than 50 tenants at once');
    }

    const result = await this.tenantsService.createMultipleTenants(bulkCreateDto.tenants, req.user.userId);
    
    return {
      message: `Bulk tenant creation completed: ${result.summary.successful}/${result.summary.total} successful`,
      ...result
    };
  }
} 