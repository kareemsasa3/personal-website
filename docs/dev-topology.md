# Development Topology

## Overview

This repository runs the `web` frontend as a Vite dev server inside Docker.
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

## Container Roles

- `nginx`: public entrypoint for the dev stack. It receives HTTP traffic and proxies requests to the Vite dev server. It must also forward WebSocket upgrade headers.
- `web`: React/Vite development server. Source is bind-mounted into the container, and `node_modules` stays inside the container volume.

## Ports and Networking

- Browser-facing origin: `http://erebus:8081`
- Public entrypoint: `:8081`
- Tailscale serve listens on `:8081`
- nginx (container network): `:80`
- Vite (container network): `:5173`
- Vite runs with `server.host = 0.0.0.0`
- Vite runs with `strictPort = true`

## HMR Behavior

Vite HMR uses a WebSocket connection in addition to normal HTTP asset requests.
That WebSocket must pass through the same proxy chain as the page request.

Required constraints:

- nginx must forward the WebSocket upgrade handshake
- Vite HMR must use the same origin as the browser
- do not hardcode HMR client ports when using a reverse proxy
- do not set `VITE_HMR_CLIENT_PORT` for the proxied Tailscale workflow

## Development Workflow

- Normal startup: `./infrastructure/dev/dev.sh`
- Rebuild when needed: `./infrastructure/dev/dev.sh --build`

Expected workflow:

1. Start the stack without rebuilding for normal code edits.
2. Edit source files under `web/`.
3. Let Vite HMR push updates through nginx and Tailscale to the browser.
