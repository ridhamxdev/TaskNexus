import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  tenantId: number;
  userTenant: any;
  userRole: string;
  permissions: any;
}

export const TenantCtx = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext): TenantContext | any => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      return null;
    }

    return data ? tenantContext[data] : tenantContext;
  },
); 