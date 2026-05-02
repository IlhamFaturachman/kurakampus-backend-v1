import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user || !user.permissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Support wildcard 'manage:all' for superadmins
    if (user.permissions.includes('manage:all')) {
      return true;
    }

    // Identify organization ID from request (params, query, or body)
    const orgId =
      request.params.orgId ||
      request.params.organizationId ||
      request.query.orgId ||
      request.body.organizationId;

    const hasPermission = requiredPermissions.every((permission) => {
      // Check for global permission
      if (user.permissions.includes(permission)) return true;

      // Check for organization-scoped permission
      if (orgId && user.permissions.includes(`${orgId}:${permission}`))
        return true;

      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
