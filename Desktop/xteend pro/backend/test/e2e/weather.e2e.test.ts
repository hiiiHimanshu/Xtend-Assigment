import request from 'supertest';
import { MockAgent, MockPool, setGlobalDispatcher } from 'undici';
import { afterEach, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../../src/config/env.js';
import { buildServer } from '../../src/server.js';

const buildGeocodeResponse = (name: string, latitude: number, longitude: number) => ({
  results: [
    {
      name,
      latitude,
      longitude,
      country: 'Testland',
      timezone: 'UTC'
    }
  ]
});

const openMeteoForecast = {
  current_weather: {
    temperature: 12,
    windspeed: 15,
    weathercode: 1,
    time: '2024-01-01T00:00:00Z'
  },
  hourly: {
    time: ['2024-01-01T00:00:00Z'],
    relativehumidity_2m: [55]
  },
  daily: {
    time: ['2024-01-01', '2024-01-02'],
    temperature_2m_min: [10, 9],
    temperature_2m_max: [15, 16],
    precipitation_probability_max: [40, 20]
  }
};

const metNoForecast = {
  properties: {
    timeseries: [
      {
        time: '2024-01-01T00:00:00Z',
        data: {
          instant: {
            details: {
              air_temperature: 11,
              relative_humidity: 60,
              wind_speed: 3
            }
          },
          next_1_hours: {
            summary: { symbol_code: 'partlycloudy_day' }
          }
        }
      },
      {
        time: '2024-01-02T00:00:00Z',
        data: {
          instant: {
            details: {
              air_temperature: 13,
              relative_humidity: 58,
              wind_speed: 4
            }
          },
          next_1_hours: {
            summary: { symbol_code: 'partlycloudy_day' }
          }
        }
      }
    ]
  }
};

describe('Weather aggregation API (e2e)', () => {
  let mockAgent: MockAgent;
  let openMeteoMock: MockPool;
  let metNoMock: MockPool;

  const setupMocks = () => {
    mockAgent = new MockAgent({ connections: 1 });
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    openMeteoMock = mockAgent.get('https://api.open-meteo.com');
    metNoMock = mockAgent.get('https://api.met.no');
  };

  const startServer = async (overrides: Record<string, string> = {}) => {
    const defaults: Record<string, string> = {
      OPEN_METEO_BASE: 'https://api.open-meteo.com',
      MET_NO_BASE: 'https://api.met.no',
      LOG_LEVEL: 'silent',
      METRICS_ENABLED: 'true',
      RATE_LIMIT_MAX: '5',
      RATE_LIMIT_TIME_WINDOW_SEC: '60',
      REQUEST_RETRY_ATTEMPTS: '0'
    };

    for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
      process.env[key] = value;
    }

    resetEnvCache();
    const server = await buildServer();
    await server.ready();
    return server;
  };

  afterEach(async () => {
    await mockAgent.close();
  });

  it('returns current weather with cache headers', async () => {
    setupMocks();

    openMeteoMock
      .intercept({ path: /\/v1\/search.*/, method: 'GET' })
      .reply(200, buildGeocodeResponse('Berlin', 52.52, 13.405))
      .persist();

    openMeteoMock
      .intercept({ path: /\/v1\/forecast.*/, method: 'GET' })
      .reply(200, openMeteoForecast)
      .persist();

    metNoMock
      .intercept({ path: /\/weatherapi\/locationforecast\/2.0\/compact.*/, method: 'GET' })
      .reply(200, metNoForecast)
      .persist();

    const server = await startServer();

    const first = await request(server.server)
      .get('/weather/current')
      .query({ location: 'Berlin', units: 'metric' })
      .expect(200);

    expect(first.headers['x-cache']).toBe('MISS');
    expect(first.body.current).toBeDefined();
    expect(first.body.current.tempC).not.toBeNull();

    const second = await request(server.server)
      .get('/weather/current')
      .query({ location: 'Berlin', units: 'metric' })
      .expect(200);

    expect(second.headers['x-cache']).toBe('HIT');

    await server.close();
  });

  it('handles partial provider failure gracefully', async () => {
    setupMocks();

    openMeteoMock
      .intercept({ path: /\/v1\/search.*/, method: 'GET' })
      .reply(200, buildGeocodeResponse('Oslo', 59.91, 10.75))
      .persist();

    openMeteoMock
      .intercept({ path: /\/v1\/forecast.*/, method: 'GET' })
      .reply(200, openMeteoForecast)
      .persist();

    metNoMock
      .intercept({ path: /\/weatherapi\/locationforecast\/2.0\/compact.*/, method: 'GET' })
      .replyWithError(new Error('provider unavailable'))
      .persist();

    const server = await startServer();

    const response = await request(server.server)
      .get('/weather/current')
      .query({ location: 'Oslo' })
      .expect(200);

    expect(response.body.current.warnings?.[0]).toContain('provider unavailable');

    await server.close();
  });

  it('survives upstream timeout by using the remaining provider', async () => {
    setupMocks();

    openMeteoMock
      .intercept({ path: /\/v1\/search.*/, method: 'GET' })
      .reply(200, buildGeocodeResponse('Delhi', 28.61, 77.21))
      .persist();

    openMeteoMock
      .intercept({ path: /\/v1\/forecast.*/, method: 'GET' })
      .replyWithError(Object.assign(new Error('timeout'), { code: 'UND_ERR_CONNECT_TIMEOUT' }))
      .persist();

    metNoMock
      .intercept({ path: /\/weatherapi\/locationforecast\/2.0\/compact.*/, method: 'GET' })
      .reply(200, metNoForecast)
      .persist();

    const server = await startServer({ REQUEST_TIMEOUT_MS: '500', REQUEST_RETRY_ATTEMPTS: '0' });

    const response = await request(server.server)
      .get('/weather/current')
      .query({ location: 'Delhi' })
      .expect(200);

    expect(response.body.current.warnings?.[0]).toContain('timeout');

    await server.close();
  });

  it('returns forecast payload', async () => {
    setupMocks();

    openMeteoMock
      .intercept({ path: /\/v1\/search.*/, method: 'GET' })
      .reply(200, buildGeocodeResponse('Paris', 48.8566, 2.3522))
      .persist();

    openMeteoMock
      .intercept({ path: /\/v1\/forecast.*/, method: 'GET' })
      .reply(200, openMeteoForecast)
      .persist();

    metNoMock
      .intercept({ path: /\/weatherapi\/locationforecast\/2.0\/compact.*/, method: 'GET' })
      .reply(200, metNoForecast)
      .persist();

    const server = await startServer();

    const response = await request(server.server)
      .get('/weather/forecast')
      .query({ location: 'Paris', days: 2 })
      .expect(200);

    expect(response.headers['x-cache']).toBe('MISS');
    expect(response.body.forecast).toHaveLength(2);

    await server.close();
  });

  it('rejects invalid parameters', async () => {
    setupMocks();
    const server = await startServer();

    await request(server.server).get('/weather/current').expect(400);

    await server.close();
  });

  it('enforces rate limits', async () => {
    setupMocks();

    openMeteoMock
      .intercept({ path: /\/v1\/search.*/, method: 'GET' })
      .reply(200, buildGeocodeResponse('Rome', 41.9, 12.5))
      .persist();

    openMeteoMock
      .intercept({ path: /\/v1\/forecast.*/, method: 'GET' })
      .reply(200, openMeteoForecast)
      .persist();

    metNoMock
      .intercept({ path: /\/weatherapi\/locationforecast\/2.0\/compact.*/, method: 'GET' })
      .reply(200, metNoForecast)
      .persist();

    const server = await startServer({ RATE_LIMIT_MAX: '2' });

    await request(server.server).get('/weather/current').query({ location: 'Rome' }).expect(200);
    await request(server.server).get('/weather/current').query({ location: 'Rome' }).expect(200);
    const limited = await request(server.server)
      .get('/weather/current')
      .query({ location: 'Rome' })
      .expect(429);

    expect(limited.body.error).toBeDefined();
    expect(limited.headers['x-ratelimit-remaining']).toBe('0');

    await server.close();
  });
});
