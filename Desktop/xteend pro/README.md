# Weather Aggregation Platform

Aggregated weather API backed by Fastify (Node 20, TypeScript) and a lightweight React client. The API fans out to Open-Meteo and MET Norway, normalizes responses, caches results with stale-while-revalidate semantics, and exposes a tiny React dashboard for quick inspection.

```
          ┌─────────────┐       ┌────────────────────┐
Request ─▶│ Fastify API │──────▶│ Providers (HTTP)   │
          │  Cache + SWR│       │  • Open-Meteo      │
          │  Rate Limit │       │  • MET Norway      │
          └─────┬───────┘       └────────────────────┘
                │
                ▼
        ┌────────────────┐
        │ React Frontend │
        │ (Vite, TS)     │
        └────────────────┘
```

## Quick start

### Local development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

The API listens on `http://localhost:8080` (`/docs` for Swagger UI) and the frontend on `http://localhost:5173` (uses `VITE_API_BASE`, defaults to the API above).

Environment variables are defined in `backend/.env.example` – copy to `.env` to tweak TTLs, upstream URLs, metrics, etc.

### Docker compose

```bash
docker-compose up --build
```

* API: `http://localhost:8080`
* Docs: `http://localhost:8080/docs`
* Frontend: `http://localhost:5173`

### CI

GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, lints, tests, and builds both applications on push/PR to `main`.

## API Overview

OpenAPI spec lives in [`openapi.yaml`](openapi.yaml). Key endpoints:

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/weather/current` | Current conditions (query by `location` or `lat`/`lon`) |
| `GET` | `/weather/forecast` | Up to 7-day forecast |
| `GET` | `/locations/search` | Typeahead search via Open-Meteo geocoding |
| `GET` | `/health` | Health probe |
| `GET` | `/metrics` | Prometheus metrics when `METRICS_ENABLED=true` |

### Sample requests

```bash
# Resolve current conditions in Delhi
curl "http://localhost:8080/weather/current?location=Delhi&units=metric"

# Fetch forecast using coordinates
curl "http://localhost:8080/weather/forecast?lat=28.61&lon=77.21&days=5"

# Locations search
curl "http://localhost:8080/locations/search?q=San"
```

Responses include `X-Cache` (`HIT`/`MISS`/`STALE`) and rate-limit headers (`X-RateLimit-*`).

## Testing

Backend uses Vitest + Supertest. Unit coverage focuses on cache SWR behaviour and merge logic; e2e tests spin up the Fastify server with undici `MockAgent` to simulate upstream providers (happy path, partial outages, timeouts, invalid params, rate limiting).

```bash
cd backend
npm test
```

Frontend is covered by linting and type safety; Vite-powered dev server offers an interactive playground. You can extend with component tests if desired.

## Implementation notes & trade-offs

- **Weather providers**: both Open-Meteo and MET Norway are queried in parallel with configurable timeout, jittered retry, and partial failure handling. If one provider fails or times out, the response still flows with warnings.
- **Normalization**: provider-specific values are converted to Celsius / kmh and merged via medians to dampen outliers. Source breakdown is returned for transparency.
- **Caching**: `tiny-lru` stores responses with `ttl` + stale-while-revalidate. Stale hits return cached data immediately and revalidate in the background. Cache metrics surface via `/metrics`.
- **Rate limiting**: `@fastify/rate-limit` enforces `60 req/min/IP` by default and emits `X-RateLimit-*` headers. Configuration is environment-driven.
- **Logging**: Pino JSON logs include trace IDs, routes, latency, and cache status. The request ID middleware honours upstream `X-Request-Id` or generates UUIDs.
- **Metrics**: Optional Prometheus plaintext output counts requests and cache states without introducing heavy dependencies.
- **Frontend**: Minimal React app with debounced search, optimistic loading states, and graceful error banners. Keeps to TypeScript strictness and uses fetch-based API module.

### Possible extensions

1. Add persistent caching (Redis) and scheduled warmups for popular locations.
2. Implement unit/component tests for the frontend (e.g., Vitest + Testing Library).
3. Enrich metrics (histograms, upstream latency) and integrate with Grafana dashboards.
4. Introduce user preferences (imperial units, language selector) persisted to local storage.

## Project layout

```
repo/
├── backend/            # Fastify API (TypeScript)
│   ├── src/
│   ├── test/
│   ├── Dockerfile
│   └── package.json
├── frontend/           # React + Vite client (TypeScript)
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── openapi.yaml
├── .github/workflows/ci.yml
└── README.md (this file)
```

Enjoy building on top of it!
