import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID Middleware (Enterprise Grade)
 *
 * Features:
 * - Generates unique UUID v4 for each request
 * - Adds X-Request-Id to response headers
 * - Attaches requestId to request object for logging
 * - Preserves existing request ID if provided by client
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use existing request ID or generate new one
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Attach to request object for access in controllers/filters
    (req as unknown as Record<string, unknown>).id = requestId;

    // Add to response headers for client tracking
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
