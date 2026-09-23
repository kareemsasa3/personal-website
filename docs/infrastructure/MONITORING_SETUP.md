# Monitoring & Observability Stack

This document describes the monitoring stack and the wider production observability posture for the current portfolio deployment.

The current-state facts below were reconciled against a production inspection on 2026-09-22. The point-in-time numbers from that inspection are in [the production observability investigation note](../production-observability-investigation-2026-09-22.md).

## Current Scope

The active monitoring setup in this repo is focused on:

- `prometheus`
- `grafana` (viewer instance)
- `grafana-admin`
- `node-exporter`
- `nginx-exporter`

`web` is a frontend app and does **not** expose Prometheus metrics. See [Known Gaps](#known-gaps).

## Observability Layers

Production has four separate observability layers. Each answers a different question, so do not treat them as one generic "analytics" source.

| Layer | Source | Good for | Not good for |
|---|---|---|---|
| External availability | UptimeRobot (outside this repo) | End-to-end public reachability and incident history | Traffic or usage |
| Infrastructure/runtime health | Prometheus + node-exporter + nginx-exporter | Host metrics, nginx connection and request totals, Prometheus self-health | Per-route, per-status, or visitor data |
| Request/security visibility | nginx access and error logs | Raw HTTP traffic, scanners, crawlers, probes, request-level debugging | Human visitor counts unless the traffic is classified first |
| Browser/site-use visibility | Cloudflare Web Analytics (outside this repo) | Browser-rendered visits and page views, Core Web Vitals, SPA soft navigations | Proven counts of external people |

### External availability: UptimeRobot

- An HTTP/S monitor checks `https://kareemsasa.dev` every 5 minutes.
- Keep it pointed at `/`, not `/health`. A request to `/` travels the full path (Cloudflare → public nginx → `web` container). Public `/health` is answered by the outer nginx without reaching `web`, so it is a weaker end-to-end check.
- Its `HEAD` requests make up a large share of the `/` requests in the nginx logs.

### Infrastructure/runtime health: Prometheus

- Prometheus scrapes `prometheus`, `node-exporter`, `nginx-exporter`, and `web` (see [Known Gaps](#known-gaps) for why `web` is down).
- The production compose file retains data for 200h, capped at 10GB.
- `nginx-exporter` reads nginx `stub_status`. It emits only the basic stub-status metrics: `nginx_connections_accepted`, `nginx_connections_active`, `nginx_connections_handled`, `nginx_connections_reading`, `nginx_connections_waiting`, `nginx_connections_writing`, `nginx_http_requests_total`, and `nginx_up`. It gives no per-route, per-status-code, or upstream breakdown.

### Request/security visibility: nginx logs

- The production nginx `main` log format records the remote address, remote user, timestamp, request line, status, bytes sent, referer, user agent, and `X-Forwarded-For`.
- Logs are written to the bind-mounted `infrastructure/logs/nginx` directory, so they survive container redeploys.
- Raw request counts are **not** audience analytics. Historical traffic is dominated by automation: uptime checks, the internal health probe, scanners, exploit probes, generic HTTP clients, and crawlers. Browser-like user agents cannot safely be assumed to be human.
- Do not copy raw IPs or raw log lines into this repository. Record aggregates only.

### Browser/site-use visibility: Cloudflare Web Analytics

- Cloudflare Web Analytics is enabled through automatic setup. It is the best existing source of basic site-use visibility.
- Caveats:
  - The sample is tiny, and it includes the site owner's own navigation and testing. A visit count is not a count of external people.
  - SPA soft-404 behavior can pollute it. A scanner path appeared as a measured URL.
  - Trailing-slash variants (for example `/writing` and `/writing/`) can show up as separate entries.
  - Cloudflare's SPA soft-navigation accounting is still changing.
  - With this little data, upper-percentile LCP values are not evidence of a broad performance regression.

## Edge: Cloudflare

- Public DNS for `kareemsasa.dev` resolves to Cloudflare, which proxies all traffic to the origin.
- The SSL/TLS mode is **Full (strict)**: Cloudflare encrypts traffic to the origin and validates the origin certificate.
- The homepage returns `cf-cache-status: DYNAMIC`. In one observed 24-hour window, Cloudflare served very little traffic from cache. That window alone does not show a global caching misconfiguration (see [Follow-up Candidates](#follow-up-candidates)).

## Quick Start

### Development

```bash
cd infrastructure
./setup-monitoring.sh
```

### Production

```bash
docker compose --env-file infrastructure/.env \
  -f infrastructure/docker-compose.yml \
  -f infrastructure/prod/docker-compose.prod.yml \
  -f infrastructure/prod/docker-compose.monitoring.prod.yml \
  up -d
```

## Access

Monitoring UIs are **not** publicly reachable from the portfolio origin.

- The production override binds these ports to host loopback only:
  - Prometheus: `127.0.0.1:9090`
  - Viewer Grafana: `127.0.0.1:3000`
  - node-exporter: `127.0.0.1:9100`
  - nginx-exporter: `127.0.0.1:9113`
- `grafana-admin` has no host port. It is reachable only on the Docker network.
- The public nginx owns host ports 80 and 443, and it returns `404` for `/monitoring/grafana/`. No public route exists for `grafana-admin`.
- Reach the UIs through an SSH tunnel, a VPN, or an authenticated edge policy.

### Grafana instances

| Instance | Container | Auth | Root URL |
|---|---|---|---|
| Viewer | `portfolio-grafana-prod` | Anonymous Viewer access, login form disabled | `/monitoring/grafana/` |
| Admin | `portfolio-grafana-admin-prod` | Anonymous access disabled, login form enabled | `/monitoring/grafana-admin/` |

The viewer instance allows anonymous access, but that does not expose it publicly: the outer nginx blocks the path, and the host port is bound to loopback.

Both instances are provisioned from `infrastructure/monitoring/grafana/`. They share one datasource, `Prometheus` at `http://prometheus:9090`, which is the default and uses a 15-second interval.

## Dashboards

Provisioned dashboard files:

- `node-exporter-full.json`: Node Exporter Full (grafana.com `1860`). This dashboard works.
- `nginx-exporter.json`: **not an nginx dashboard.** Despite its filename, it contains `1 SLS主机监控 v2020.08.08`, tagged `Logtail`, `SLS`, and `Prometheus`. It queries host metrics such as `cpu_util`, `mem_available`, `disk_space_usage`, and `system_load1`, which are not the metrics the nginx exporter emits. `fetch-grafana-dashboards.sh` still downloads grafana.com ID `12797` into this file under the label "Nginx Prometheus Exporter". The exporter itself is healthy. Only the dashboard artifact is wrong.

## Known Gaps

These are verified current defects or debt. They are not scheduled work.

- **The `web` Prometheus target is a stale placeholder.** `prometheus.yml` scrapes `web:80/metrics` every 30s. The job's comment reads "if it exposes metrics", and the app does not. Because of the SPA fallback, `/metrics` returns `index.html` (HTTP 200, `text/html`), and Prometheus reports `"INVALID" is not a valid start token`. This target being down says nothing about application health. The port-80 nginx server block also has a `/metrics` location that proxies to that same placeholder.
- **The nginx dashboard is the wrong artifact.** See [Dashboards](#dashboards).
- **Internal health probes pollute the access log.** The `portfolio-nginx-prod` Docker healthcheck calls `http://127.0.0.1/health`. `/health` (with `access_log off`) exists only in the HTTPS server block, so the probe hits the port-80 redirect and is logged as a `301`. This inflates historical request and 3xx counts. It is unrelated to UptimeRobot.
- **The SPA fallback serves soft 404s.** The outer nginx proxies unmatched paths to `web`. Inside `web`, `try_files $uri $uri/ /index.html` returns the app shell with HTTP 200 for any nonexistent path, including scanner probes such as `/.env`, `/.git/config`, and `/wp-admin/...`. Those `200` responses are the SPA shell. They do not mean such resources exist or were exposed. The fallback inflates 2xx counts, weakens status-code analysis, can pollute browser analytics, and may affect SEO.
- **No explicit nginx log rotation.** No matching host `logrotate` rule was found for the bind-mounted nginx logs. The oldest record in the access log is from August 2025.

## Follow-up Candidates

These are backlog candidates from the 2026-09-22 investigation. They are not accepted work and are not in priority order.

1. Remove or redesign the stale Prometheus `web:/metrics` scrape.
2. Replace `nginx-exporter.json` with a dashboard for the `nginx_*` metrics the exporter actually emits.
3. Set an explicit rotation and retention policy for nginx logs.
4. Stop the internal `/health` probe from producing redirects and access-log entries, while keeping correct container health semantics.
5. Design real 404 handling for unknown routes that does not break legitimate client-side routes.
6. Investigate Cloudflare caching behavior and how effectively static assets are cached.
7. Decide whether Cloudflare Web Analytics gives enough visitor and site-use visibility.
8. If deeper analytics are needed, investigate Cloudflare's filters and API before adding another analytics vendor.
9. If interaction analytics are ever added, do not record raw terminal command strings by default, because commands such as `curl` can contain arbitrary user-supplied URLs. Prefer categorical events, such as command name and success.
10. Consider browser/client error monitoring separately if it is wanted. None exists today.
11. Review host OS maintenance separately from monitoring and analytics work.

## Notes

- Redis monitoring was removed from the active monitoring stack because Redis is not part of the deployed architecture.
- If backend services are introduced later, their monitoring should be added alongside the runtime change, not documented in advance.
- `docs/ANALYTICS_METRICS.md` describes metrics for an AI-assistant backend that is not part of the current deployment. None of those metrics exist in the current stack.
