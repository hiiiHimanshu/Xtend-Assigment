import { loadEnv } from '../config/env.js';

import { NotFoundError } from './errors.js';
import { fetchJSON } from './http.js';

const env = loadEnv();

export interface GeoLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  timezone?: string;
}

interface OpenMeteoGeoResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    timezone?: string;
  }>;
}

export const resolveLocationByName = async (
  query: string,
  lang = 'en'
): Promise<GeoLocation> => {
  const url = `${env.OPEN_METEO_BASE}/v1/search?name=${encodeURIComponent(query)}&count=1&language=${lang}`;
  const response = await fetchJSON<OpenMeteoGeoResponse>(url);
  const [first] = response.results ?? [];
  if (!first) {
    throw new NotFoundError('Location could not be resolved', { query });
  }

  return {
    name: first.name,
    latitude: first.latitude,
    longitude: first.longitude,
    country: first.country,
    timezone: first.timezone
  };
};

export const searchLocations = async (
  query: string,
  lang = 'en'
): Promise<GeoLocation[]> => {
  const url = `${env.OPEN_METEO_BASE}/v1/search?name=${encodeURIComponent(query)}&count=5&language=${lang}`;
  const response = await fetchJSON<OpenMeteoGeoResponse>(url);
  return (response.results ?? []).map((item) => ({
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
    country: item.country,
    timezone: item.timezone
  }));
};

export const resolveLocation = async (
  params: { location?: string; lat?: number; lon?: number; lang?: string }
): Promise<GeoLocation> => {
  const { location, lat, lon, lang = 'en' } = params;
  if (typeof lat === 'number' && typeof lon === 'number') {
    return {
      name: location ?? `${lat.toFixed(3)},${lon.toFixed(3)}`,
      latitude: lat,
      longitude: lon
    };
  }

  if (!location) {
    throw new NotFoundError('Location must be provided');
  }

  return resolveLocationByName(location, lang);
};
