import { lru as createLru } from 'tiny-lru';

export type CacheStatus = 'MISS' | 'HIT' | 'STALE';

export interface CacheOptions {
  ttlSeconds: number;
  swrSeconds: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleAt: number;
}

export class CacheMetricsTracker {
  private hits = 0;
  private misses = 0;
  private stale = 0;

  record(status: CacheStatus): void {
    if (status === 'HIT') this.hits += 1;
    if (status === 'MISS') this.misses += 1;
    if (status === 'STALE') this.stale += 1;
  }

  asRecord() {
    return {
      hits: this.hits,
      misses: this.misses,
      stale: this.stale
    };
  }
}

export class WeatherCache {
  private readonly store = createLru<CacheEntry<unknown>>(512);
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly metrics?: CacheMetricsTracker) {}

  async getOrSet<T>(
    key: string,
    options: CacheOptions,
    fetcher: () => Promise<T>
  ): Promise<{ value: T; status: CacheStatus }> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();
    const freshLimit = options.ttlSeconds * 1000;
    const staleLimit = freshLimit + options.swrSeconds * 1000;

    if (entry && entry.expiresAt > now) {
      this.metrics?.record('HIT');
      return { value: entry.value, status: 'HIT' };
    }

    if (entry && entry.staleAt > now) {
      this.metrics?.record('STALE');
      void this.revalidate(key, options, fetcher);
      return { value: entry.value, status: 'STALE' };
    }

    this.metrics?.record('MISS');
    const inflight = this.inFlight.get(key);
    if (inflight) {
      const value = (await inflight) as T;
      return { value, status: 'MISS' };
    }

    const fetchPromise = (async () => {
      try {
        const value = await fetcher();
        const updated = {
          value,
          expiresAt: Date.now() + freshLimit,
          staleAt: Date.now() + staleLimit
        } satisfies CacheEntry<T>;
        this.store.set(key, updated);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    const value = (await fetchPromise) as T;
    return { value, status: 'MISS' };
  }

  private async revalidate<T>(
    key: string,
    options: CacheOptions,
    fetcher: () => Promise<T>
  ): Promise<void> {
    if (this.inFlight.has(key)) {
      return;
    }

    const promise = (async () => {
      try {
        const value = await fetcher();
        const now = Date.now();
        this.store.set(key, {
          value,
          expiresAt: now + options.ttlSeconds * 1000,
          staleAt: now + (options.ttlSeconds + options.swrSeconds) * 1000
        });
      } catch (error) {
        // keep stale value if refresh fails
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    await promise;
  }
}
