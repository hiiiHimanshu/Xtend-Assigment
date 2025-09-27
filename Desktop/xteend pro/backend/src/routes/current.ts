import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { loadEnv } from '../config/env.js';
import { resolveLocation } from '../services/geo.js';
import { aggregateWeather } from '../services/weather.js';

const env = loadEnv();

const querySchema = z
  .object({
    location: z.string().min(1).optional(),
    lat: z.coerce.number().optional(),
    lon: z.coerce.number().optional(),
    units: z.enum(['metric', 'imperial']).default('metric'),
    lang: z.enum(['en', 'hi']).default('en')
  })
  .refine(
    (value) => value.location || (typeof value.lat === 'number' && typeof value.lon === 'number'),
    {
      message: 'Provide either location or lat/lon coordinates'
    }
  );

export default async function currentRoute(fastify: FastifyInstance) {
  fastify.get('/weather/current', {
    schema: {
      description: 'Get normalized current weather for a location',
      tags: ['weather'],
      querystring: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          lat: { type: 'number' },
          lon: { type: 'number' },
          units: { type: 'string', enum: ['metric', 'imperial'], default: 'metric' },
          lang: { type: 'string', enum: ['en', 'hi'], default: 'en' }
        }
      }
    }
  }, async (request, reply) => {
    const query = querySchema.parse(request.query);
    const location = await resolveLocation({
      location: query.location,
      lat: query.lat,
      lon: query.lon,
      lang: query.lang
    });

    const cacheKey = `current:${location.latitude}:${location.longitude}:${query.units}:${query.lang}`;
    const { value, status } = await fastify.weatherCache.getOrSet(
      cacheKey,
      { ttlSeconds: env.CACHE_TTL_CURRENT, swrSeconds: env.CACHE_SWR_WINDOW },
      async () => {
        const aggregated = await aggregateWeather(location, {
          units: query.units,
          lang: query.lang,
          days: 7
        });
        return aggregated;
      }
    );

    reply.header('X-Cache', status);
    request.log.info({ cacheHit: status, location: cacheKey }, 'Current weather lookup');

    return {
      location,
      current: value.current,
      warnings: value.warnings
    };
  });
}
