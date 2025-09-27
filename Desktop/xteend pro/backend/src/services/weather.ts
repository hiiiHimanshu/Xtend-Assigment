import { ProviderError } from './errors.js';
import { GeoLocation } from './geo.js';
import { mergeCurrentObservations, mergeForecasts } from './merge.js';
import { NormalizedCurrentWeather, NormalizedForecast } from './normalize.js';
import { fetchMetNoWeather } from './providers/metNo.js';
import { fetchOpenMeteoWeather } from './providers/openMeteo.js';
import { ProviderRequestOptions } from './providers/types.js';

interface AggregatedWeatherResult {
  current: NormalizedCurrentWeather;
  forecast: NormalizedForecast;
  warnings: string[];
  providers: string[];
}

export const aggregateWeather = async (
  location: GeoLocation,
  options: ProviderRequestOptions
): Promise<AggregatedWeatherResult> => {
  const providers = [fetchOpenMeteoWeather(location, options), fetchMetNoWeather(location, options)];
  const results = await Promise.allSettled(providers);

  const fulfilled = results.filter((r): r is PromiseFulfilledResult<Awaited<typeof providers[number]>> => r.status === 'fulfilled');
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

  if (fulfilled.length === 0) {
    throw new ProviderError('All weather providers failed', {
      location,
      errors: rejected.map((r) => String(r.reason))
    });
  }

  const warnings = rejected.map((r) => `Provider failure: ${String(r.reason)}`);
  const current = mergeCurrentObservations(fulfilled.map((r) => r.value.current));
  const forecast = mergeForecasts(fulfilled.map((r) => r.value.forecast), options.days);

  if (warnings.length > 0) {
    current.warnings = [...(current.warnings ?? []), ...warnings];
  }

  return {
    current,
    forecast,
    warnings,
    providers: fulfilled.map((r) => r.value.source)
  };
};
