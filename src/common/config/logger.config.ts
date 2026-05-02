import { Params } from 'nestjs-pino';
import { Request } from 'express';

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              singleLine: false,
              messageFormat: '{req.method} {req.url} - {msg}',
            },
          }
        : undefined,
    customProps: (req: Request) => ({
      requestId: req.headers['x-request-id'],
      userId: (req as any).user?.sub,
      userEmail: (req as any).user?.email,
    }),
    serializers: {
      req: (req: Request) => ({
        id: req.headers['x-request-id'],
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        // Don't log sensitive data
        // body: req.body,
        // headers: req.headers,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.confirmPassword',
        'req.body.oldPassword',
        'req.body.newPassword',
      ],
      remove: true,
    },
    autoLogging: {
      ignore: (req: Request) => {
        // Don't log health check requests
        return req.url === '/api/health' || req.url === '/health';
      },
    },
  },
};
