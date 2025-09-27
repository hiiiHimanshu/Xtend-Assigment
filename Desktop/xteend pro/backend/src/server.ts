import { randomUUID } from 'node:crypto';

import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { FastifyInstance } from 'fastify';

import { loadEnv, isMetricsEnabled } from './config/env.js';
import errorHandlerMiddleware from './middlewares/errorHandler.js';
import requestIdMiddleware from './middlewares/requestId.js';
import currentRoute from './routes/current.js';
import forecastRoute from './routes/forecast.js';
import healthRoute from './routes/health.js';
import locationsRoute from './routes/locations.js';
import metricsRoute from './routes/metrics.js';
import { WeatherCache, CacheMetricsTracker } from './services/cache.js';
import { MetricsCollector } from './services/metrics.js';

declare module 'fastify' {
  interface FastifyInstance {
    weatherCache: WeatherCache;
    cacheMetrics: CacheMetricsTracker;
    metrics?: MetricsCollector;
  }
}

export const buildServer = async (): Promise<FastifyInstance> => {
  const env = loadEnv();
  const cacheMetrics = new CacheMetricsTracker();
  const cache = new WeatherCache(cacheMetrics);
  const metrics = isMetricsEnabled() ? new MetricsCollector() : undefined;

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: ['req.headers.authorization'],
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            traceId: request.traceId ?? request.id
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode
          };
        }
      }
    },
    genReqId() {
      return randomUUID();
    }
  });

  app.decorate('weatherCache', cache);
  app.decorate('cacheMetrics', cacheMetrics);
  if (metrics) {
    app.decorate('metrics', metrics);
  }

  await app.register(requestIdMiddleware);
  await app.register(errorHandlerMiddleware);

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: `${env.RATE_LIMIT_TIME_WINDOW_SEC} second`,
    hook: 'onRequest',
    continueExceeding: true,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    },
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Weather Aggregation API',
        description: 'Aggregated weather data from Open-Meteo and MET Norway',
        version: '1.0.0'
      },
      servers: [
        { url: 'http://localhost:8080', description: 'Local development' }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  app.addHook('onResponse', (request, reply, done) => {
    const latency = reply.getResponseTime();
    const route = request.routerPath ?? request.routeOptions?.url ?? request.url;
    request.log.info(
      {
        route,
        latency,
        cacheStatus: reply.getHeader('X-Cache') ?? 'MISS'
      },
      'request.completed'
    );
    metrics?.increment('requests_total', 1, {
      route,
      method: request.method
    });
    done();
  });

  app.addHook('onSend', async (request, reply, payload) => {
    const cacheStatus = reply.getHeader('X-Cache');
    if (metrics && typeof cacheStatus === 'string') {
      metrics.increment('cache_requests_total', 1, {
        status: cacheStatus
      });
    }
    return payload;
  });

  await app.register(currentRoute);
  await app.register(forecastRoute);
  await app.register(locationsRoute);
  await app.register(healthRoute);

  if (metrics) {
    await app.register(metricsRoute);
  }

  return app;
};
