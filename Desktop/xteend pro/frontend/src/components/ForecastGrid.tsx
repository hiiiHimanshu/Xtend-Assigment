import { ForecastDay } from '../api';

interface ForecastGridProps {
  days?: ForecastDay[];
  loading: boolean;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const ForecastGrid = ({ days, loading }: ForecastGridProps) => {
  return (
    <section className="card">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>7-day forecast</h2>
        {loading && <span style={{ color: '#64748b' }}>Loading…</span>}
      </header>

      {days && days.length > 0 ? (
        <div className="grid" style={{ marginTop: '1.5rem' }}>
          {days.map((day) => (
            <article
              key={day.date}
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ fontWeight: 600 }}>{formatDate(day.date)}</div>
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {day.maxC !== null && day.maxC !== undefined ? `${Math.round(day.maxC)}°` : '—'}
                </span>
                <span style={{ color: '#64748b', marginLeft: '0.25rem' }}>
                  {day.minC !== null && day.minC !== undefined ? `${Math.round(day.minC)}°` : '—'}
                </span>
              </div>
              <div style={{ color: '#475569', marginTop: '0.5rem' }}>{day.summary ?? '—'}</div>
              <div style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Chance of rain: {day.pop !== null && day.pop !== undefined ? `${day.pop}%` : '—'}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p style={{ color: '#64748b', marginTop: '1.5rem' }}>
          Forecast will appear once a location is selected.
        </p>
      )}
    </section>
  );
};

export default ForecastGrid;
