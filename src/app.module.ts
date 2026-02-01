import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { envValidationSchema } from './common/config/env.validation';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
// import { RedisThrottlerStorageService } from './common/throttler/redis-throttler-storage.service';
// import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true, // Stop validation on first error
        allowUnknown: true, // Allow unknown environment variables
      },
    }),
    // Rate Limiting - Uses in-memory storage in development
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: configService.get('RATE_LIMIT_TTL', 60) * 1000, // Convert to ms
            limit: configService.get('RATE_LIMIT_MAX', 100),
          },
          {
            name: 'long',
            ttl: 3600 * 1000, // 1 hour
            limit: 1000,
          },
        ],
        // In production, uncomment below to use Redis storage:
        // storage: new RedisThrottlerStorageService(configService),
      }),
    }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    // QueueModule, // Uncomment this when Redis is running
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
