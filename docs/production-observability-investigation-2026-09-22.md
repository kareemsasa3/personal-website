# Production Observability Investigation — 2026-09-22

Status: dated investigation record. This is documentation only. No monitoring, analytics, nginx, Cloudflare, or application changes were made as part of this investigation.

Durable current-state facts and follow-up candidates are in [`docs/infrastructure/MONITORING_SETUP.md`](infrastructure/MONITORING_SETUP.md). This note keeps the point-in-time evidence behind them.

Evidence sources: the production host (container, config, and log inspection) plus the Cloudflare and UptimeRobot dashboards. Log timestamps are in UTC, so the latest record at inspection time is dated 2026-09-23.

Evidence labels:

- **Config**: verified current configuration.
- **Runtime**: observed runtime behavior.
- **Aggregate**: historical aggregate observation.
- **Inference**: an interpretation, not a verified fact.

## Omitted On Purpose

This repository is public. The following were deliberately left out, following the repository's rule against publishing private infrastructure details:

- the host's hostname
- exact kernel and package detail
- host patch-state detail
- raw visitor IPs and raw access-log lines
- account identities, credentials, and tokens
- screenshots

## Host (Runtime)

- The host is a DigitalOcean KVM droplet running Ubuntu 22.04 LTS, with about 1 GiB RAM, 2 GiB swap, and a ~25 GB root filesystem (about half used).
- It had been up for about five months.
- No systemd units had failed.
- Host maintenance was observed separately and was not part of this observability reconciliation.

## Containers (Runtime)

Running containers:

- `portfolio-nginx-prod`
- `portfolio-web-prod`
- `portfolio-prometheus-prod`
- `portfolio-grafana-prod`
- `portfolio-grafana-admin-prod`
- `portfolio-node-exporter-prod`
- `portfolio-nginx-exporter-prod`

The deployment uses `infrastructure/prod/docker-compose.prod.yml` together with `infrastructure/prod/docker-compose.monitoring.prod.yml`.

## Prometheus (Runtime + Config)

`/api/v1/targets` showed:

- **Up:** `prometheus`, `node-exporter`, `nginx-exporter`
- **Down:** `web`

A direct request to `http://web:80/metrics` returned HTTP 200 with `text/html` (the SPA `index.html`). Prometheus rejected the response with `"INVALID" is not a valid start token`.

Interpretation (Inference, strongly supported by config): the `web` target is an unfulfilled placeholder, not a failed application health check.

## Grafana (Config + Runtime)

- Grafana loaded two dashboards: `Node Exporter Full` and `1 SLS主机监控 v2020.08.08`. The second comes from the file named `nginx-exporter.json`.
- The nginx exporter was observed to emit only the basic stub-status `nginx_*` metric set.
- No public route to `grafana-admin` was found in the inspected nginx config.

## nginx Logs (Runtime + Aggregate)

At inspection time:

- The access log was ~197 MB and the error log ~7.5 MB.
- The access log held ~1.335 million lines, running from 2025-08-06 UTC to 2026-09-23 UTC.
- No matching rule was found in `/etc/logrotate.conf` or `/etc/logrotate.d`.

### Traffic makeup (Aggregate)

About 480k parsed requests were for `/health`, and most returned `301`. The port-80 redirect explains this (see Known Gaps in `MONITORING_SETUP.md`). Inference: this traffic comes from the internal Docker healthcheck, not from UptimeRobot.

Many nonexistent paths, including common scanner probes, got 2xx responses. These are the SPA shell served through the fallback. **They do not show that any sensitive resource existed or was exposed.**

The traffic is dominated by automation:

- UptimeRobot
- curl
- zgrab
- Censys
- Palo Alto scan traffic
- generic Go and Python clients
- WordPress, `.env`, and router/device exploit probes
- malformed and TLS-on-HTTP requests
- crawlers, including Googlebot and Claude SearchBot
- browser-like user agents that cannot safely be assumed to be human

### 30-day route analysis (Aggregate)

- About 21,030 requests hit routes in the current sitemap. About 20,327 of those were for `/`, and about 703 were for all other sitemap routes combined.
- These are request counts, **not page views and not visitors**. Monitoring and scanning explain most of the `/` traffic.
- UptimeRobot sent about 8,491 `HEAD` requests in that window. That closely matches the ~8,640 checks a 5-minute interval produces in 30 days.

## UptimeRobot (Config + Aggregate)

- The UptimeRobot configuration is an HTTP/S monitor on `https://kareemsasa.dev` at a 5-minute interval.
- It showed 100% uptime over the last 30 days.
- The UI showed earlier 2026 incidents in the Cloudflare 521/522 classes. Root causes were not investigated and are not inferred here.

## Cloudflare Edge (Runtime + Config)

- DNS resolves to Cloudflare anycast IPv4 and IPv6 addresses.
- Response headers included `server: cloudflare` and `cf-ray`, with a DFW edge during the check. `alt-svc` advertised HTTP/3.
- The homepage returned `cf-cache-status: DYNAMIC`.
- The SSL/TLS mode is **Full (strict)**.

### HTTP Traffic, previous 24h (Aggregate)

Cloudflare reported ~5.09k requests: ~58 cached and ~5.03k uncached.

Inference: in this window, Cloudflare acted mainly as a proxy and security edge, not a cache. A single window does not establish a caching misconfiguration.

## Cloudflare Web Analytics (Aggregate)

- Web Analytics was enabled with automatic setup. The analytics site was created about five months before the inspection.

Values observed in the two reporting windows:

| Window | Visits | Page views | Page load | LCP | INP | CLS |
|---|---|---|---|---|---|---|
| Previous 24h (one reading) | 6 | 34 | ~773 ms | 100% good | — | — |
| Previous 30d | 10 | 220 | ~408 ms | 67% good / 33% poor; P50 ~1.13 s, P75 ~5.60 s, P90/P99 ~6.00 s | 100% good | 100% good |

Caveats:

- The sample is tiny, and it includes the site owner actively navigating, testing, and reloading. "10 visits" is not 10 external people.
- `/.env` appeared as a measured URL in the 24h view, which is soft-404 contamination.
- `/writing` and `/writing/` appeared as separate entries.
- Cloudflare's SPA soft-navigation accounting is still changing.
- The LCP upper percentiles are not evidence of a broad regression.
- The inspected UI showed no standalone top-pages or referrer table below the Core Web Vitals section. The account-level site selector led back to the same view.

## Resulting Model

Four layers were found: external availability, infrastructure/runtime health, request/security visibility, and browser/site-use visibility. `MONITORING_SETUP.md` records them, the known gaps, and the follow-up candidates. None of those candidates were accepted as work in this investigation.
