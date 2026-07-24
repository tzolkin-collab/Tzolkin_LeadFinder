import { Redis } from 'ioredis';
import { CoreLogger } from '../utils/logger.js';

export interface CacheService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  close?(): Promise<void>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCacheService implements CacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly logger = new CoreLogger('InMemoryCache');

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    this.logger.debug('Cache set', { key, ttlSeconds });
  }
}

export class RedisCacheService implements CacheService {
  private readonly redis: Redis;
  private readonly logger = new CoreLogger('RedisCache');
  private connected = false;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });

    this.redis.on('error', (err: Error) => {
      this.logger.error('Redis connection error', err);
    });

    this.redis.on('connect', () => {
      this.connected = true;
      this.logger.info('Redis connected');
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      if (!this.connected) {
        await this.redis.connect().catch(() => {});
      }
      const raw = await this.redis.get(key);
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.error('Redis get failed', error, { key });
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    try {
      if (!this.connected) {
        await this.redis.connect().catch(() => {});
      }
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      this.logger.debug('Redis cache set', { key, ttlSeconds });
    } catch (error) {
      this.logger.error('Redis set failed', error, { key });
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export function createCacheService(redisUrl?: string): CacheService {
  const logger = new CoreLogger('CacheService');

  if (redisUrl) {
    logger.info('Using Redis cache', { redisUrl: redisUrl.replace(/:\/\/.*@/, '://***@') });
    return new RedisCacheService(redisUrl);
  }

  logger.warn('REDIS_URL not configured; falling back to in-memory cache');
  return new InMemoryCacheService();
}
