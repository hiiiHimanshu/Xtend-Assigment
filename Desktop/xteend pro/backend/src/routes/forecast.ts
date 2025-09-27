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
    lang: z.enum(['en', 'hi']).default('en'),
    days: z.coerce.number().int().min(1).max(7).default(7)
  })
  .refine(
    (value) => value.location || (typeof value.lat === 'number' && typeof value.lon === 'number'),
    {
      message: 'Provide either location or lat/lon coordinates'
    }
  );

export default async function forecastRoute(fastify: FastifyInstance) {
  fastify.get('/weather/forecast', {
    schema: {
      description: 'Get a multi-day forecast for a location',
      tags: ['weather'],
      querystring: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          lat: { type: 'number' },
          lon: { type: 'number' },
          units: { type: 'string', enum: ['metric', 'imperial'] },
          lang: { type: 'string', enum: ['en', 'hi'] },
          days: { type: 'integer', minimum: 1, maximum: 7 }
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

    const cacheKey = `forecast:${location.latitude}:${location.longitude}:${query.units}:${query.lang}:${query.days}`;
    const { value, status } = await fastify.weatherCache.getOrSet(
      cacheKey,
      { ttlSeconds: env.CACHE_TTL_FORECAST, swrSeconds: env.CACHE_SWR_WINDOW },
      async () => {
        const aggregated = await aggregateWeather(location, {
          units: query.units,
          lang: query.lang,
          days: query.days
        });
        return aggregated;
      }
    );

    reply.header('X-Cache', status);
    request.log.info({ cacheHit: status, location: cacheKey }, 'Forecast lookup');

    return {
      location,
      forecast: value.forecast.days
    };
  });
}
