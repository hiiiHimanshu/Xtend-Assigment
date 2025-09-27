import { ProviderCurrentObservation, ProviderForecastDaily } from '../normalize.js';

export interface ProviderWeatherResult {
  source: string;
  current: ProviderCurrentObservation;
  forecast: ProviderForecastDaily[];
}

export interface ProviderRequestOptions {
  units: 'metric' | 'imperial';
  lang?: string;
  days: number;
}
