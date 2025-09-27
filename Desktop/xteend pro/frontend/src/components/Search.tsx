import { ChangeEvent } from 'react';

import { LocationSuggestion } from '../api';

interface SearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  suggestions: LocationSuggestion[];
  onSelect: (suggestion: LocationSuggestion) => void;
  loading: boolean;
}

const Search = ({ query, onQueryChange, suggestions, onSelect, loading }: SearchProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onQueryChange(event.target.value);
  };

  return (
    <section className="card" style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }} htmlFor="search">
        Search for a city
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id="search"
          type="text"
          placeholder="e.g. New Delhi"
          value={query}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            border: '1px solid #cbd5f5',
            fontSize: '1rem'
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
            …
          </span>
        )}
      </div>

      {suggestions.length > 0 && query.length > 1 && (
        <ul
          style={{
            listStyle: 'none',
            margin: '0.75rem 0 0',
            padding: 0,
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.name}-${suggestion.latitude}-${suggestion.longitude}`}>
              <button
                type="button"
                onClick={() => onSelect(suggestion)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  background: 'white',
                  border: 'none'
                }}
              >
                <div style={{ fontWeight: 600 }}>{suggestion.name}</div>
                <small style={{ color: '#64748b' }}>
                  {suggestion.country ?? 'Unknown'} ({suggestion.latitude.toFixed(2)},{' '}
                  {suggestion.longitude.toFixed(2)})
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default Search;
