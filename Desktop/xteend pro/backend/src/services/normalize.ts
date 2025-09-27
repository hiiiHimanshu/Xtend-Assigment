export type Units = 'metric' | 'imperial';

export interface ProviderCurrentObservation {
  source: string;
  tempC?: number;
  humidity?: number;
  windKph?: number;
  condition?: string;
  fetchedAtISO?: string;
  warnings?: string[];
  raw?: unknown;
}

export interface ProviderForecastDaily {
  source: string;
  date: string;
  minC?: number;
  maxC?: number;
  pop?: number;
  summary?: string;
  raw?: unknown;
}

export interface NormalizedCurrentWeather {
  tempC: number | null;
  humidity: number | null;
  windKph: number | null;
  condition: string | null;
  sourceBreakdown: ProviderCurrentObservation[];
  fetchedAtISO: string;
  warnings?: string[];
}

export interface NormalizedForecastDay {
  date: string;
  minC: number | null;
  maxC: number | null;
  pop: number | null;
  summary: string | null;
}

export interface NormalizedForecast {
  days: NormalizedForecastDay[];
}

export const toCelsius = (value: number, units: Units): number => {
  if (units === 'metric') {
    return value;
  }
  return ((value - 32) * 5) / 9;
};

export const toKph = (value: number, units: Units): number => {
  if (units === 'metric') {
    return value;
  }
  return value * 1.60934;
};

export const median = (values: Array<number | undefined>): number | null => {
  const filtered = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (filtered.length === 0) {
    return null;
  }
  const sorted = [...filtered].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

export const coalesceString = (values: Array<string | undefined>): string | null => {
  for (const value of values) {
    if (value) return value;
  }
  return null;
};

export const coalesceNumber = (values: Array<number | undefined>): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};
