export interface LocationSuggestion {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  timezone?: string;
}

export interface CurrentWeatherResponse {
  location: LocationSuggestion;
  current: {
    tempC: number | null;
    humidity: number | null;
    windKph: number | null;
    condition: string | null;
    fetchedAtISO: string;
    sourceBreakdown: Array<{
      source: string;
      tempC?: number;
      humidity?: number;
      windKph?: number;
      condition?: string;
    }>;
    warnings?: string[];
  };
  warnings?: string[];
}

export interface ForecastDay {
  date: string;
  minC: number | null;
  maxC: number | null;
  pop: number | null;
  summary: string | null;
}

export interface ForecastResponse {
  location: LocationSuggestion;
  forecast: ForecastDay[];
}

export interface ApiErrorShape {
  error: string;
  message: string;
  details?: unknown;
  traceId?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as ApiErrorShape | undefined;
    const error = new Error(payload?.message ?? 'Request failed');
    (error as Error & { details?: unknown; traceId?: string }).details = payload?.details;
    (error as Error & { traceId?: string }).traceId = payload?.traceId;
    throw error;
  }

  return (await response.json()) as T;
};

export const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
  const url = buildUrl('/locations/search', { q: query });
  const response = await fetch(url);
  const payload = await parseResponse<{ results: LocationSuggestion[] }>(response);
  return payload.results;
};

export const fetchCurrentWeather = async (
  location: LocationSuggestion
): Promise<CurrentWeatherResponse> => {
  const url = buildUrl('/weather/current', {
    lat: location.latitude,
    lon: location.longitude
  });
  const response = await fetch(url);
  return parseResponse<CurrentWeatherResponse>(response);
};

export const fetchForecast = async (
  location: LocationSuggestion,
  days = 7
): Promise<ForecastResponse> => {
  const url = buildUrl('/weather/forecast', {
    lat: location.latitude,
    lon: location.longitude,
    days
  });
  const response = await fetch(url);
  return parseResponse<ForecastResponse>(response);
};
