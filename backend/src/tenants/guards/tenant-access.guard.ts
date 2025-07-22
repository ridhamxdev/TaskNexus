import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { TenantsService } from '../tenants.service';

export const TENANT_ACCESS_KEY = 'tenantAccess';

// Decorator to specify tenant access requirements
export const TenantAccess = (permissions: string[]) => SetMetadata(TENANT_ACCESS_KEY, permissions);

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantsService: TenantsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(TENANT_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No specific tenant permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SuperAdmin bypasses tenant access checks
    if (user.role === 'superadmin') {
      return true;
    }

    // Extract tenant ID from route parameters
    const tenantId = request.params.id || request.params.tenantId;
    
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID not specified');
    }

    // Get user's tenant role and permissions
    const userTenant = await this.tenantsService.getUserTenantRole(user.userId, parseInt(tenantId));
    
    if (!userTenant || !userTenant.isActive()) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    // Check if user has any of the required permissions
    const hasRequiredPermission = requiredPermissions.some(permission => {
      switch (permission) {
        case 'canViewUsers':
          return userTenant.canViewUsers();
        case 'canInviteUsers':
          return userTenant.canInviteUsers();
        case 'canManageUsers':
          return userTenant.canManageUsers();
        case 'canViewTransactions':
          return userTenant.hasPermission('canViewTransactions');
        case 'canViewEmails':
          return userTenant.hasPermission('canViewEmails');
        case 'canViewReports':
          return userTenant.hasPermission('canViewReports');
        case 'canManageSettings':
          return userTenant.hasPermission('canManageSettings');
        case 'isAdmin':
          return userTenant.isAdmin();
        case 'isModerator':
          return userTenant.isModerator();
        default:
          return userTenant.hasPermission(permission as any);
      }
    });

    if (!hasRequiredPermission) {
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredPermissions.join(' or ')}`);
    }

    // Add tenant context to request for use in controllers
    request.tenantContext = {
      tenantId: parseInt(tenantId),
      userTenant,
      userRole: userTenant.role,
      permissions: userTenant.permissions,
    };

    return true;
  }
} 