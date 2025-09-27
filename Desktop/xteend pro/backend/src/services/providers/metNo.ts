import { loadEnv } from '../../config/env.js';
import { GeoLocation } from '../geo.js';
import { fetchJSON } from '../http.js';

import { ProviderRequestOptions, ProviderWeatherResult } from './types.js';

const env = loadEnv();

interface MetNoTimeseriesEntry {
  time: string;
  data: {
    instant: {
      details?: {
        air_temperature?: number;
        relative_humidity?: number;
        wind_speed?: number;
      };
    };
    next_1_hours?: {
      summary?: {
        symbol_code?: string;
      };
    };
  };
}

interface MetNoResponse {
  properties?: {
    timeseries?: MetNoTimeseriesEntry[];
  };
}

const symbolMap: Record<string, string> = {
  clearsky_day: 'Clear sky',
  clearsky_night: 'Clear sky',
  fair_day: 'Fair',
  fair_night: 'Fair',
  partlycloudy_day: 'Partly cloudy',
  partlycloudy_night: 'Partly cloudy',
  cloudy: 'Cloudy',
  lightrain: 'Light rain',
  rain: 'Rain',
  heavyrain: 'Heavy rain',
  lightsnow: 'Light snow',
  snow: 'Snow',
  heavysnow: 'Heavy snow',
  fog: 'Fog',
  thunderstorms: 'Thunderstorms'
};

const describeSymbol = (symbol?: string) => {
  if (!symbol) return undefined;
  return symbolMap[symbol] ?? symbol.replace(/_/g, ' ');
};

export const fetchMetNoWeather = async (
  location: GeoLocation,
  options: ProviderRequestOptions
): Promise<ProviderWeatherResult> => {
  const url = `${env.MET_NO_BASE}/weatherapi/locationforecast/2.0/compact?lat=${location.latitude}&lon=${location.longitude}`;
  const payload = await fetchJSON<MetNoResponse>(url, {
    headers: {
      'User-Agent': 'WeatherAggregator/1.0 support@example.com',
      Accept: 'application/json'
    }
  });

  const timeseries = payload.properties?.timeseries ?? [];
  const current = timeseries[0];
  const currentDetails = current?.data.instant.details ?? {};
  const condition = describeSymbol(current?.data.next_1_hours?.summary?.symbol_code);

  const groupedByDate = new Map<string, { min: number; max: number }>();
  for (const point of timeseries) {
    const temp = point.data.instant.details?.air_temperature;
    if (typeof temp !== 'number') continue;
    const date = point.time.split('T')[0];
    const existing = groupedByDate.get(date);
    if (!existing) {
      groupedByDate.set(date, { min: temp, max: temp });
    } else {
      existing.min = Math.min(existing.min, temp);
      existing.max = Math.max(existing.max, temp);
    }
  }

  const forecast = Array.from(groupedByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, options.days)
    .map(([date, entry]) => ({
      source: 'met-no',
      date,
      minC: entry.min,
      maxC: entry.max,
      pop: undefined,
      summary: condition,
      raw: entry
    }));

  return {
    source: 'met-no',
    current: {
      source: 'met-no',
      tempC: currentDetails.air_temperature,
      humidity: currentDetails.relative_humidity,
      windKph:
        typeof currentDetails.wind_speed === 'number'
          ? currentDetails.wind_speed * 3.6
          : undefined,
      condition,
      fetchedAtISO: new Date().toISOString(),
      raw: current
    },
    forecast
  };
};
