import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Allow access to notifications endpoint for any authenticated user
    const url = request.url;
    if (url && url.includes('/notifications')) {
      return true;
    }

    if (user.role !== 'superadmin') {
      throw new ForbiddenException('Access denied. Superadmin role required.');
    }

    return true;
  }
} 