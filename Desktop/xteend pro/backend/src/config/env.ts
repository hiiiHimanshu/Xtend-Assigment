import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CACHE_TTL_CURRENT: z.coerce.number().int().min(60).default(300),
  CACHE_TTL_FORECAST: z.coerce.number().int().min(60).default(900),
  CACHE_SWR_WINDOW: z.coerce.number().int().min(0).default(60),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(500).default(2000),
  REQUEST_RETRY_ATTEMPTS: z.coerce.number().int().min(0).max(3).default(1),
  REQUEST_RETRY_MIN_JITTER_MS: z.coerce.number().int().min(0).default(150),
  REQUEST_RETRY_MAX_JITTER_MS: z.coerce.number().int().min(0).default(400),
  OPEN_METEO_BASE: z.string().url().default('https://api.open-meteo.com'),
  MET_NO_BASE: z.string().url().default('https://api.met.no'),
  METRICS_ENABLED: z.enum(['true', 'false']).default('false'),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_TIME_WINDOW_SEC: z.coerce.number().int().min(1).default(60)
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export const loadEnv = (): AppEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};

export const resetEnvCache = () => {
  cachedEnv = undefined;
};

export const isMetricsEnabled = (): boolean => loadEnv().METRICS_ENABLED === 'true';
