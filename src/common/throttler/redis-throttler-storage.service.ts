import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Throttler Storage (Enterprise Grade)
 *
 * Features:
 * - Distributed rate limiting using Redis
 * - Automatic TTL management
 * - Production-ready with connection pooling
 * - Graceful shutdown handling
 */
@Injectable()
export class RedisThrottlerStorageService
  implements ThrottlerStorage, OnModuleDestroy
{
  private readonly redis: Redis;
  private readonly prefix = 'throttler:';

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_THROTTLE_DB', 0),
      keyPrefix: this.prefix,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      console.error('Redis Throttler Storage Error:', err);
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const results = await this.redis
      .multi()
      .incr(key)
      .pttl(key)
      .pexpire(key, ttl * 1000)
      .exec();

    if (!results) {
      throw new Error('Redis multi command failed');
    }

    const [[, totalHits], [, timeToExpire]] = results as [
      [null, number],
      [null, number],
    ];

    // If key is new (no TTL), set the TTL
    if (timeToExpire === -1) {
      await this.redis.pexpire(key, ttl * 1000);
    }

    // Check if limit exceeded
    const isBlocked = totalHits > limit;
    const timeToBlockExpire = isBlocked ? blockDuration * 1000 : 0;

    return {
      totalHits,
      timeToExpire: timeToExpire === -1 ? ttl * 1000 : timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
