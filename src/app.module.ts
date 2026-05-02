import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { envValidationSchema } from './common/config/env.validation';
import { loggerConfig } from './common/config/logger.config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RedisThrottlerStorageService } from './common/throttler/redis-throttler-storage.service';
// import { QueueModule } from './queue/queue.module';
import { UsersModule } from './users/users.module';
import { RbacModule } from './rbac/rbac.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
    }),

    // Structured Logging with Pino
    LoggerModule.forRoot(loggerConfig),

    // Rate Limiting with Redis Storage
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const useRedis = configService.get('REDIS_URL');
        return {
          throttlers: [
            {
              name: 'short',
              ttl: configService.get('RATE_LIMIT_TTL', 60) * 1000,
              limit: configService.get('RATE_LIMIT_MAX', 100),
            },
            {
              name: 'long',
              ttl: 3600 * 1000,
              limit: 1000,
            },
          ],
          storage: useRedis
            ? new RedisThrottlerStorageService(configService)
            : undefined,
        };
      },
    }),

    // Core Modules
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    RbacModule,
    HealthModule,
    // QueueModule, // Uncomment when needed
  ],
  providers: [
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply Request ID middleware to all routes
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
