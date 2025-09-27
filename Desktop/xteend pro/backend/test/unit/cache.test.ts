import { describe, expect, it, vi } from 'vitest';

import { CacheMetricsTracker, WeatherCache } from '../../src/services/cache.js';

const ttlOptions = { ttlSeconds: 300, swrSeconds: 60 };

describe('WeatherCache', () => {
  it('supports stale-while-revalidate flow', async () => {
    const metrics = new CacheMetricsTracker();
    const cache = new WeatherCache(metrics);
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    let fetchCount = 0;
    const fetcher = vi.fn(async () => {
      fetchCount += 1;
      return { value: fetchCount };
    });

    const miss = await cache.getOrSet('key', ttlOptions, fetcher);
    expect(miss.status).toBe('MISS');
    expect(fetchCount).toBe(1);

    now = 1000;
    const hit = await cache.getOrSet('key', ttlOptions, fetcher);
    expect(hit.status).toBe('HIT');
    expect(fetchCount).toBe(1);

    now = 310_000;
    const stale = await cache.getOrSet('key', ttlOptions, fetcher);
    expect(stale.status).toBe('STALE');
    expect(fetchCount).toBe(2);

    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchCount).toBe(2);

    now = 320_000;
    const refreshed = await cache.getOrSet('key', ttlOptions, fetcher);
    expect(refreshed.status).toBe('HIT');
    expect(fetchCount).toBe(2);

    const summary = metrics.asRecord();
    expect(summary).toEqual({ hits: 2, misses: 1, stale: 1 });
  });
});
