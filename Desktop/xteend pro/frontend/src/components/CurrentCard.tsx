import { CurrentWeatherResponse } from '../api';

interface CurrentCardProps {
  data?: CurrentWeatherResponse['current'];
  locationName?: string;
  loading: boolean;
}

const formatNumber = (value: number | null | undefined, suffix = '') => {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}${suffix}`;
};

const CurrentCard = ({ data, locationName, loading }: CurrentCardProps) => {
  return (
    <section className="card">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>{locationName ?? 'Current weather'}</h2>
          <small style={{ color: '#64748b' }}>
            {data?.fetchedAtISO ? new Date(data.fetchedAtISO).toLocaleString() : ''}
          </small>
        </div>
        {loading && <span style={{ color: '#64748b' }}>Loading…</span>}
      </header>

      {data ? (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 700 }}>
              {formatNumber(data.tempC, '°C')}
            </div>
            <div style={{ color: '#475569' }}>{data.condition ?? '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Humidity</div>
              <div>{formatNumber(data.humidity, '%')}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Wind</div>
              <div>{formatNumber(data.windKph, ' km/h')}</div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: '#64748b', marginTop: '1.5rem' }}>
          Search for a location to see current conditions.
        </p>
      )}

      {data?.warnings && data.warnings.length > 0 && (
        <ul style={{ marginTop: '1.5rem', paddingLeft: '1.2rem', color: '#b45309' }}>
          {data.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      {data && (
        <footer style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
          Sources:&nbsp;
          {data.sourceBreakdown.map((source) => source.source).join(', ')}
        </footer>
      )}
    </section>
  );
};

export default CurrentCard;
