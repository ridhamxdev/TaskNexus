import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum'; // Corrected path
import { ROLES_KEY } from '../decorators/roles.decorator'; // Corrected path

/**
 * @jsdoc
 * Guard to protect routes based on user roles.
 * It checks if the user's role (from JWT payload) matches any of the roles
 * specified by the @Roles decorator on the route handler.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * @jsdoc
   * Determines if the current user has permission to access the route.
   * @param context - The execution context.
   * @returns True if the user has one of the required roles, false otherwise.
   * @throws ForbiddenException if the user does not have the required role.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles specified, access granted by default (JwtAuthGuard still applies)
    }
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException('User role not found or user not authenticated properly.');
    }

    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) {
        throw new ForbiddenException('You do not have the required role to access this resource.');
    }
    return true;
  }
} 