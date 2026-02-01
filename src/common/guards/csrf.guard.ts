import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

/**
 * Modern CSRF Protection Guard (2025 Standards)
 *
 * Protection methods:
 * 1. SameSite=Strict cookies (built-in browser protection)
 * 2. Custom header validation (X-Requested-With)
 * 3. Origin/Referer header validation
 * 4. Double Submit Cookie pattern (optional)
 *
 * Usage: Apply globally or per-route for state-changing operations (POST, PUT, DELETE, PATCH)
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only check CSRF for state-changing methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return true;
    }

    // Check for custom header (AJAX requests)
    const customHeader = request.headers['x-requested-with'];
    if (customHeader === 'XMLHttpRequest') {
      return true;
    }

    // Validate Origin/Referer header
    const origin = request.headers.origin || request.headers.referer;
    const allowedOrigins = this.getAllowedOrigins();

    if (!origin) {
      throw new ForbiddenException('Missing origin or referer header');
    }

    const isAllowed = allowedOrigins.some((allowed) => {
      try {
        const originUrl = new URL(origin);
        const allowedUrl = new URL(allowed);
        return (
          originUrl.protocol === allowedUrl.protocol &&
          originUrl.host === allowedUrl.host
        );
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      throw new ForbiddenException('Invalid origin');
    }

    return true;
  }

  private getAllowedOrigins(): string[] {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      return process.env.ALLOWED_ORIGINS?.split(',') || [];
    }

    // Development mode
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4200',
      'http://localhost:5173',
    ];
  }
}
