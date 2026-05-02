import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
}

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLoggerService {
  constructor(
    private prisma: PrismaService,
    private logger: PinoLogger,
  ) {
    this.logger.setContext(AuditLoggerService.name);
  }

  async log(data: AuditLogData): Promise<void> {
    const {
      userId,
      action,
      entity,
      entityId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    } = data;

    // Log to Pino
    this.logger.info(
      {
        userId,
        action,
        entity,
        entityId,
        ipAddress,
        hasOldValues: !!oldValues,
        hasNewValues: !!newValues,
      },
      `Audit: ${action} ${entity} ${entityId}`,
    );

    // Store in database
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          oldValues: oldValues || undefined,
          newValues: newValues || undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to store audit log in database');
    }
  }

  async logCreate(
    entity: string,
    entityId: string,
    newValues: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.CREATE,
      entity,
      entityId,
      newValues,
      ipAddress,
      userAgent,
    });
  }

  async logUpdate(
    entity: string,
    entityId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.UPDATE,
      entity,
      entityId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    });
  }

  async logDelete(
    entity: string,
    entityId: string,
    oldValues: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.DELETE,
      entity,
      entityId,
      oldValues,
      ipAddress,
      userAgent,
    });
  }
}
