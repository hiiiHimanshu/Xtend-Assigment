import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CurrentWeatherResponse,
  ForecastDay,
  LocationSuggestion,
  fetchCurrentWeather,
  fetchForecast,
  searchLocations
} from './api';
import CurrentCard from './components/CurrentCard';
import ErrorBanner from './components/ErrorBanner';
import ForecastGrid from './components/ForecastGrid';
import Search from './components/Search';

const debounceDelay = 350;

const App = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | undefined>();
  const [current, setCurrent] = useState<CurrentWeatherResponse['current'] | undefined>();
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    let isActive = true;
    setSearchLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const results = await searchLocations(query.trim());
        if (isActive) {
          setSuggestions(results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isActive) {
          setSearchLoading(false);
        }
      }
    }, debounceDelay);

    return () => {
      isActive = false;
      window.clearTimeout(handle);
    };
  }, [query]);

  const loadWeather = useCallback(async (location: LocationSuggestion) => {
    setLoadingCurrent(true);
    setLoadingForecast(true);
    setError(null);

    try {
      const [currentResponse, forecastResponse] = await Promise.all([
        fetchCurrentWeather(location),
        fetchForecast(location)
      ]);

      setCurrent(currentResponse.current);
      setForecast(forecastResponse.forecast);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setLoadingCurrent(false);
      setLoadingForecast(false);
    }
  }, []);

  const handleSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      setSelectedLocation(suggestion);
      setQuery(suggestion.name);
      setSuggestions([]);
      void loadWeather(suggestion);
    },
    [loadWeather]
  );

  const warningMessages = useMemo(() => current?.warnings ?? [], [current]);

  return (
    <main>
      <h1>Weather aggregation dashboard</h1>

      <Search
        query={query}
        onQueryChange={setQuery}
        suggestions={suggestions}
        onSelect={handleSelect}
        loading={searchLoading}
      />

      {error && (
        <ErrorBanner>
          {error}
          {current?.warnings?.length ? ' • Some data may be stale.' : ''}
        </ErrorBanner>
      )}

      {warningMessages.length > 0 && !error && (
        <ErrorBanner>
          {warningMessages.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </ErrorBanner>
      )}

      <CurrentCard
        data={current}
        locationName={selectedLocation?.name}
        loading={loadingCurrent}
      />

      <ForecastGrid days={forecast} loading={loadingForecast} />
    </main>
  );
};

export default App;
