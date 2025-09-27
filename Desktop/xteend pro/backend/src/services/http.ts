import { request as undiciRequest, Dispatcher } from 'undici';

import { loadEnv } from '../config/env.js';

import { ProviderError } from './errors.js';

const env = loadEnv();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FetchRetryOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  jitterMinMs?: number;
  jitterMaxMs?: number;
}

const defaultOptions = {
  timeoutMs: env.REQUEST_TIMEOUT_MS,
  retries: env.REQUEST_RETRY_ATTEMPTS,
  retryDelayMs: env.REQUEST_RETRY_MIN_JITTER_MS,
  jitterMinMs: env.REQUEST_RETRY_MIN_JITTER_MS,
  jitterMaxMs: env.REQUEST_RETRY_MAX_JITTER_MS
};

const withAbort = async <T>(
  cb: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await cb(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

type RequestInit = Partial<Dispatcher.RequestOptions> & FetchRetryOptions;

export const fetchJSON = async <T>(
  url: string,
  init: RequestInit = {}
): Promise<T> => {
  const {
    timeoutMs = defaultOptions.timeoutMs,
    retries = defaultOptions.retries,
    retryDelayMs = defaultOptions.retryDelayMs,
    jitterMinMs = defaultOptions.jitterMinMs,
    jitterMaxMs = defaultOptions.jitterMaxMs,
    ...requestInit
  } = init;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await withAbort(
        async (signal) => {
          const requestOptions = {
            ...requestInit,
            method: (requestInit.method ?? 'GET') as Dispatcher.HttpMethod,
            signal
          } as Dispatcher.RequestOptions;

          return undiciRequest(url, requestOptions);
        },
        timeoutMs
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new ProviderError(`Upstream responded with ${response.statusCode}`, {
          url,
          statusCode: response.statusCode
        });
      }

      const body = await response.body.json();
      return body as T;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      if (isLastAttempt) {
        throw error;
      }

      const jitterRange = Math.max(jitterMaxMs - jitterMinMs, 0);
      const jitter = Math.random() * jitterRange + jitterMinMs;
      await sleep(retryDelayMs + jitter);
    }
  }

  throw new ProviderError('Failed to fetch upstream data', { url });
};
