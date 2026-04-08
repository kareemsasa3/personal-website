# Development Topology

## Overview

This repository runs the `workfolio` frontend as a Vite dev server inside Docker.
During development, the browser usually connects from another machine over Tailscale
rather than talking to Vite directly.

The important assumption is that the browser reaches the app through a single public
origin, and Vite HMR must reuse that same origin for its WebSocket connection.

## Architecture Diagram

```text
Browser
   ↓
Tailscale serve :8081
   ↓
nginx container
   ↓
Vite dev server :5173
```

Expanded request path:

```text
Mac browser
   ↓
http://erebus:8081
   ↓
tailscale serve
   ↓
Docker host port -> nginx :80
   ↓
nginx reverse proxy
   ↓
workfolio container :5173
```

## Container Roles

- `nginx`: public entrypoint for the dev stack. It receives HTTP traffic and proxies
  requests to the Vite dev server. It must also forward WebSocket upgrade headers.
- `workfolio`: React/Vite development server. Source is bind-mounted into the
  container, and `node_modules` stays inside the container volume.
- `redis`: part of the broader stack, but not on the frontend dev request path.
  It is not required for Vite HMR and may be disabled in dev depending on profiles.

## Ports and Networking

- Browser-facing origin: `http://erebus:8081`
- Public entrypoint: `:8081`
- Tailscale serve listens on `:8081`
- nginx (container network): `:80`
- Vite (container network): `:5173`
- Vite runs with `server.host = 0.0.0.0`, which allows connections from outside the
  container.
- Vite runs with `strictPort = true`, which keeps the dev server on `5173` instead of
  silently moving to another port.

Because nginx is the public entrypoint, the browser should not need to connect
directly to `:5173`.

## HMR Behavior

Vite HMR uses a WebSocket connection in addition to normal HTTP asset requests.
That WebSocket must pass through the same proxy chain as the page request.

Required constraints:

- nginx must forward the WebSocket upgrade handshake
- Vite HMR must use the same origin as the browser
- do not hardcode HMR client ports when using a reverse proxy
- do not set `VITE_HMR_CLIENT_PORT` for the proxied Tailscale workflow

Why this matters:

- If nginx does not forward `Upgrade` and `Connection` correctly, the HMR socket will
  fail even though the page loads.
- If Vite is told to use the wrong host or port, the browser will attempt the HMR
  socket against the wrong endpoint.
- If the HMR WebSocket cannot connect, edits fall back to manual refresh behavior or
  full page reloads instead of hot updates.

Required nginx directives:

- `proxy_set_header Upgrade $http_upgrade;`
- `proxy_set_header Connection $connection_upgrade;`
- `$connection_upgrade` must be defined by a `map` directive in `nginx.conf`

## Common Failure Modes

- Missing nginx WebSocket headers:
  `proxy_set_header Upgrade $http_upgrade;`
  `proxy_set_header Connection $connection_upgrade;`
- Undefined nginx `$connection_upgrade` because the `map` is missing from the
  top-level `http` block.
- Hardcoded HMR client port that does not match the browser origin.
  Example: page loads from `:8081`, but HMR tries `ws://host:8080/...`.
- Setting `HMR_HOST` or other overrides incorrectly, causing the browser to bypass
  nginx and attempt a direct connection.
- Vite moving to a different port if `strictPort` is disabled.
- Proxying HTTP correctly but not proxying WebSocket upgrades.

## Development Workflow

- Normal startup: `./infrastructure/dev/dev.sh`
- Rebuild when needed: `./infrastructure/dev/dev.sh --build`

Expected workflow:

1. Start the stack without rebuilding for normal code edits.
2. Edit source files under `workfolio/`.
3. Let Vite HMR push updates through nginx and Tailscale to the browser.

Rebuilds should only be needed when one of these changes:

- `workfolio/package.json`
- `workfolio/package-lock.json`
- `workfolio/Dockerfile.dev`

Operational guidance:

- `dev.sh` normally runs without rebuilding so startup stays fast.
- `dev.sh --build` should be used only when dependencies or the dev image change.
- Code edits should not require container rebuilds because the source is bind-mounted.
