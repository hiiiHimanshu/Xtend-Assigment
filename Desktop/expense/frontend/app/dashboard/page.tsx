"use client";
import useSWR from 'swr';
import { api, getToken, setToken } from '../../lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function DashboardPage() {
  // ensure token set
  const token = getToken();
  setToken(token);

  const { data, error, isLoading } = useSWR('/analytics/summary', fetcher);

  return (
    <div>
      <h1>Dashboard</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-error">Failed to load analytics</p>}
      {data && (
        <div className="card">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
