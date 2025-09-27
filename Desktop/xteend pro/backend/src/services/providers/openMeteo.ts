import { loadEnv } from '../../config/env.js';
import { GeoLocation } from '../geo.js';
import { fetchJSON } from '../http.js';
import { toCelsius, toKph } from '../normalize.js';

import { ProviderRequestOptions, ProviderWeatherResult } from './types.js';

const env = loadEnv();

const weatherCodeSummary: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with hail'
};

interface OpenMeteoResponse {
  current_weather?: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    time: string;
  };
  hourly?: {
    time: string[];
    relativehumidity_2m: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_probability_max?: number[];
  };
}

const describeWeatherCode = (code?: number) => {
  if (code === undefined) return undefined;
  return weatherCodeSummary[code] ?? 'Unknown conditions';
};

const findClosestHumidity = (response: OpenMeteoResponse, targetTime: string): number | undefined => {
  const hourly = response.hourly;
  if (!hourly) return undefined;
  const index = hourly.time.findIndex((time) => time === targetTime);
  if (index >= 0) {
    return hourly.relativehumidity_2m[index];
  }
  return hourly.relativehumidity_2m[0];
};

export const fetchOpenMeteoWeather = async (
  location: GeoLocation,
  options: ProviderRequestOptions
): Promise<ProviderWeatherResult> => {
  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    current_weather: 'true',
    hourly: 'relativehumidity_2m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    language: options.lang ?? 'en'
  });

  if (options.units === 'metric') {
    params.set('temperature_unit', 'celsius');
    params.set('windspeed_unit', 'kmh');
  } else {
    params.set('temperature_unit', 'fahrenheit');
    params.set('windspeed_unit', 'mph');
  }

  const url = `${env.OPEN_METEO_BASE}/v1/forecast?${params.toString()}`;
  const payload = await fetchJSON<OpenMeteoResponse>(url);

  const current = payload.current_weather;
  const humidity = current
    ? findClosestHumidity(payload, current.time)
    : payload.hourly?.relativehumidity_2m?.[0];
  const tempC = current ? toCelsius(current.temperature, options.units) : undefined;
  const windKph = current ? toKph(current.windspeed, options.units) : undefined;

  const daily = payload.daily;
  const forecast = daily
    ? daily.time.map((date, index) => ({
        source: 'open-meteo',
        date,
        minC:
          daily.temperature_2m_min?.[index] !== undefined
            ? toCelsius(daily.temperature_2m_min[index], options.units)
            : undefined,
        maxC:
          daily.temperature_2m_max?.[index] !== undefined
            ? toCelsius(daily.temperature_2m_max[index], options.units)
            : undefined,
        pop: daily.precipitation_probability_max?.[index],
        summary: describeWeatherCode(payload.current_weather?.weathercode),
        raw: daily
      }))
    : [];

  return {
    source: 'open-meteo',
    current: {
      source: 'open-meteo',
      tempC,
      humidity,
      windKph,
      condition: describeWeatherCode(current?.weathercode),
      fetchedAtISO: new Date().toISOString(),
      raw: payload
    },
    forecast
  };
};
