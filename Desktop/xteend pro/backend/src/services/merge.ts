import {
  NormalizedCurrentWeather,
  NormalizedForecast,
  NormalizedForecastDay,
  ProviderCurrentObservation,
  ProviderForecastDaily,
  coalesceNumber,
  coalesceString,
  median
} from './normalize.js';

export const mergeCurrentObservations = (
  observations: ProviderCurrentObservation[]
): NormalizedCurrentWeather => {
  const tempC = median(observations.map((o) => o.tempC));
  const humidity = median(observations.map((o) => o.humidity));
  const windKph = median(observations.map((o) => o.windKph));
  const condition = coalesceString(observations.map((o) => o.condition));
  const warnings = Array.from(
    new Set(observations.flatMap((o) => o.warnings ?? []))
  );

  return {
    tempC,
    humidity,
    windKph,
    condition,
    sourceBreakdown: observations,
    fetchedAtISO: new Date().toISOString(),
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

export const mergeForecasts = (
  forecasts: ProviderForecastDaily[][],
  days: number
): NormalizedForecast => {
  const grouped = new Map<string, ProviderForecastDaily[]>();
  for (const result of forecasts) {
    for (const entry of result) {
      grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
    }
  }

  const normalized: NormalizedForecastDay[] = Array.from(grouped.entries())
    .map(([date, entries]) => {
      const minC = median(entries.map((e) => e.minC));
      const maxC = median(entries.map((e) => e.maxC));
      const pop = coalesceNumber(entries.map((e) => e.pop));
      const summary = coalesceString(entries.map((e) => e.summary));
      return { date, minC, maxC, pop, summary };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, days);

  return { days: normalized };
};
