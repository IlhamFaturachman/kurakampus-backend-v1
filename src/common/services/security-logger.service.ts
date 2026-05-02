import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  TWO_FACTOR_FAILED = 'TWO_FACTOR_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
}

export interface SecurityEventData {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success: boolean;
  message?: string;
}

@Injectable()
export class SecurityLoggerService {
  constructor(
    private prisma: PrismaService,
    private logger: PinoLogger,
  ) {
    this.logger.setContext(SecurityLoggerService.name);
  }

  async logSecurityEvent(data: SecurityEventData): Promise<void> {
    const {
      type,
      userId,
      email,
      ipAddress,
      userAgent,
      metadata,
      success,
      message,
    } = data;

    // Log to Pino (structured logging)
    this.logger.info(
      {
        eventType: type,
        userId,
        email,
        ipAddress,
        userAgent,
        success,
        metadata,
      },
      message || `Security event: ${type}`,
    );

    // Store in database for audit trail
    try {
      await this.prisma.securityEvent.create({
        data: {
          type,
          userId,
          email,
          ipAddress,
          userAgent,
          metadata: metadata || {},
          success,
          message,
        },
      });
    } catch (error) {
      this.logger.error(
        { error },
        'Failed to store security event in database',
      );
    }
  }

  async logLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    reason?: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      type: success
        ? SecurityEventType.LOGIN_SUCCESS
        : SecurityEventType.LOGIN_FAILED,
      userId,
      email,
      ipAddress,
      userAgent,
      success,
      message: success
        ? 'User logged in successfully'
        : `Login failed: ${reason || 'Invalid credentials'}`,
    });
  }

  async logPasswordChange(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      type: SecurityEventType.PASSWORD_CHANGED,
      userId,
      ipAddress,
      userAgent,
      success: true,
      message: 'Password changed successfully',
    });
  }

  async logAccountLockout(
    userId: string,
    email: string,
    reason: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      type: SecurityEventType.ACCOUNT_LOCKED,
      userId,
      email,
      success: true,
      message: `Account locked: ${reason}`,
      metadata: { reason },
    });
  }

  async logPermissionDenied(
    userId: string,
    resource: string,
    action: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      type: SecurityEventType.PERMISSION_DENIED,
      userId,
      ipAddress,
      success: false,
      message: `Permission denied: ${action} on ${resource}`,
      metadata: { resource, action },
    });
  }

  async log2FAEvent(
    userId: string,
    type: SecurityEventType,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      type,
      userId,
      ipAddress,
      userAgent,
      success,
      message: `2FA event: ${type}`,
    });
  }
}
