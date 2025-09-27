import { describe, expect, it } from 'vitest';

import { mergeCurrentObservations, mergeForecasts } from '../../src/services/merge.js';
import { ProviderCurrentObservation, ProviderForecastDaily } from '../../src/services/normalize.js';

describe('mergeCurrentObservations', () => {
  it('produces medians and carries source breakdown', () => {
    const observations: ProviderCurrentObservation[] = [
      {
        source: 'open-meteo',
        tempC: 10,
        humidity: 40,
        windKph: 15,
        condition: 'Clear'
      },
      {
        source: 'met-no',
        tempC: 14,
        humidity: 50,
        windKph: 17,
        condition: 'Partly cloudy'
      },
      {
        source: 'met-no-fallback',
        tempC: 12,
        humidity: 60,
        windKph: 20,
        condition: undefined,
        warnings: ['fallback used']
      }
    ];

    const result = mergeCurrentObservations(observations);

    expect(result.tempC).toBe(12);
    expect(result.humidity).toBe(50);
    expect(result.windKph).toBe(17);
    expect(result.sourceBreakdown).toHaveLength(3);
    expect(result.warnings).toEqual(['fallback used']);
  });
});

describe('mergeForecasts', () => {
  it('merges provider days by date and sorts ascending', () => {
    const providerA: ProviderForecastDaily[] = [
      { source: 'open-meteo', date: '2024-01-01', minC: 5, maxC: 12, pop: 40, summary: 'Clear' },
      { source: 'open-meteo', date: '2024-01-02', minC: 6, maxC: 14, pop: 30, summary: 'Cloudy' }
    ];
    const providerB: ProviderForecastDaily[] = [
      { source: 'met-no', date: '2024-01-01', minC: 4, maxC: 11, pop: 50, summary: 'Clear' },
      { source: 'met-no', date: '2024-01-02', minC: 7, maxC: 15, pop: 20, summary: 'Sunny' }
    ];

    const merged = mergeForecasts([providerA, providerB], 7);

    expect(merged.days).toEqual([
      { date: '2024-01-01', minC: 4.5, maxC: 11.5, pop: 40, summary: 'Clear' },
      { date: '2024-01-02', minC: 6.5, maxC: 14.5, pop: 30, summary: 'Cloudy' }
    ]);
  });
});
