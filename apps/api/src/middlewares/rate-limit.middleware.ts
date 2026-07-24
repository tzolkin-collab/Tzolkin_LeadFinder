import type { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { CoreLogger } from '@tzolkin/core';

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
}

interface RateLimitStore {
  increment(key: string, windowSeconds: number): Promise<{ count: number; resetAt: number }>;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowSeconds: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowSeconds * 1000;
      this.store.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    existing.count++;
    return { count: existing.count, resetAt: existing.resetAt };
  }
}

class RedisRateLimitStore implements RateLimitStore {
  private readonly redis: Redis;
  private readonly logger = new CoreLogger('RedisRateLimitStore');
  private connected = false;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });

    this.redis.on('error', (err: Error) => {
      this.logger.error('Redis rate-limit connection error', err);
    });

    this.redis.on('connect', () => {
      this.connected = true;
    });
  }

  async increment(key: string, windowSeconds: number): Promise<{ count: number; resetAt: number }> {
    try {
      if (!this.connected) {
        await this.redis.connect().catch(() => {});
      }

      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      const results = await pipeline.exec();

      const count = (results?.[0]?.[1] as number) ?? 1;
      const ttl = (await this.redis.ttl(key)) || windowSeconds;
      const resetAt = Date.now() + ttl * 1000;

      return { count, resetAt };
    } catch (error) {
      this.logger.error('Redis rate-limit increment failed', error, { key });
      // Allow request on store failure to avoid blocking users
      return { count: 1, resetAt: Date.now() + windowSeconds * 1000 };
    }
  }
}

function createStore(redisUrl?: string): RateLimitStore {
  if (redisUrl) {
    return new RedisRateLimitStore(redisUrl);
  }
  return new InMemoryRateLimitStore();
}

let sharedStore: RateLimitStore | null = null;

export function getRateLimitStore(redisUrl?: string): RateLimitStore {
  if (!sharedStore) {
    sharedStore = createStore(redisUrl);
  }
  return sharedStore;
}

export function createRateLimitMiddleware(config: RateLimitConfig, redisUrl?: string) {
  const store = getRateLimitStore(redisUrl);
  const logger = new CoreLogger('RateLimitMiddleware');

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = (req.user as { tenantId?: string } | undefined)?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const key = `${config.keyPrefix ?? 'rl'}:${tenantId}`;
    const { count, resetAt } = await store.increment(key, config.windowSeconds);

    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());

    if (count > config.maxRequests) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      logger.warn('Rate limit exceeded', { tenantId, path: req.path, count });
      res.status(429).json({
        error: 'Too many requests',
        message: `Limite de ${config.maxRequests} requisições excedido. Tente novamente em ${retryAfter}s.`,
      });
      return;
    }

    next();
  };
}
