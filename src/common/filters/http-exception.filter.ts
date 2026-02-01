import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global Exception Filter (Enterprise Grade)
 *
 * Features:
 * - Standardized error responses
 * - Prisma error mapping
 * - No stack trace exposure in production
 * - Structured logging
 * - Request ID tracking
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: Record<string, unknown> | null = null;

    // Handle HTTP Exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        details = (responseObj.details as Record<string, unknown>) || null;
      }

      code = this.getErrorCode(status);
    }
    // Handle Prisma Errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      code = prismaError.code;
    }
    // Handle Prisma Validation Errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      code = 'VALIDATION_ERROR';
    }
    // Handle Unknown Errors
    else if (exception instanceof Error) {
      message = exception.message;
    }

    // Error response format
    const errorResponse: Record<string, unknown> = {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as unknown as Record<string, unknown>).id || 'N/A',
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      (errorResponse.error as Record<string, unknown>).stack = exception.stack;
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url} ${status} - ${message}`,
      {
        exception,
        requestId: (request as unknown as Record<string, unknown>).id,
        userId: (
          (request as unknown as Record<string, unknown>).user as
            | Record<string, unknown>
            | undefined
        )?.id,
        ip: request.ip,
      },
    );

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    code: string;
  } {
    switch (exception.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'Resource already exists',
          code: 'DUPLICATE_ERROR',
        };
      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          code: 'NOT_FOUND',
        };
      case 'P2003':
        // Foreign key constraint failed
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference',
          code: 'FOREIGN_KEY_ERROR',
        };
      case 'P2014':
        // Invalid ID
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid ID provided',
          code: 'INVALID_ID',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
          code: 'DATABASE_ERROR',
        };
    }
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return codes[status] || 'UNKNOWN_ERROR';
  }
}
