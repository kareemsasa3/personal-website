# Deployment and Rollback

How a release reaches production, and how to put a previous release back.

## What triggers a deploy

`.github/workflows/deploy.yml` has two triggers.

- **`workflow_run`** after "Build & Publish Images" completes. The deploy job runs only when that build succeeded, was a `push`, was on `main`, and came from this repository. Every other completed build skips the job, including pull requests and pull requests from forks. A push to `main` builds and publishes `ghcr.io/kareemsasa3/personal-website/web:<sha>`, and then deploys that commit.
- **`workflow_dispatch`** on `main` deploys a release you choose. It takes a commit SHA and, optionally, the digest that SHA's image must have. This is the rollback path. Anyone with write access to the repository can dispatch it. The workflow refuses to run when it is dispatched from any other ref.

Both triggers run the same steps:

1. The `ssh-deploy` action syncs `infrastructure/` to the host.
2. It streams `infrastructure/prod/deploy-release.sh` to the host.

## What a deploy does on the host

`deploy-release.sh` runs every check that can fail before it touches anything that is running.

1. It validates the inputs. The SHA must be 40 hex characters, and the digest, when given, must be `sha256:` plus 64 hex characters.
2. It loads `infrastructure/.env`. It ignores any `WEB_IMAGE` in that file. Production's copy sets `WEB_IMAGE` to `:latest`, and that value used to override the release image.
3. It logs in to GHCR, pulls `web:<sha>`, and reads the image's digest from the pull. If `expected_digest` was given and the digests differ, it stops.
4. It writes a compose override that names the web image as a literal `ghcr.io/…/web@sha256:…` reference. It then renders the compose configuration and confirms that the web service would run exactly that reference.
5. It pulls every other service image.
6. It checks that the TLS certificate exists.
   - Certbot keeps `ssl/live` and `ssl/archive` root-owned with mode 700, so the deploy user cannot see the certificate files from the host.
   - The check therefore runs inside a short-lived `nginx:alpine` container, with a read-only mount and no network, and tests only the file sizes. It needs no privilege beyond the Docker access that the deploy already uses.
   - If the certificate is absent, or the check cannot run, the deploy stops. It never issues certificates. See [Certificates](#certificates).
7. It records the image that the running web container uses.
8. It runs `docker compose up -d`. Compose recreates only the services whose configuration changed. For a normal release, that is only `web`, so nginx and monitoring keep running. The old deploy ran `docker compose down` first.
9. It waits for the web container to report three things:
   - it runs the pinned image;
   - its healthcheck reports healthy;
   - nginx serves `/` from it over HTTPS.

   The proxy's `/health` endpoint is answered by nginx itself, so it does not show that the web container is up.
10. If the release does not become healthy, the script switches `web` back to the previously recorded image and fails the deploy.
11. It runs `nginx -t` and the monitoring health checks.
12. It appends the release to `~/personal-website/.deploy/releases.log` and writes `~/personal-website/.deploy/current-web-image`. These files live outside `infrastructure/`, so a sync does not overwrite them.

A failed pull, an unavailable or mismatched image, an invalid compose configuration, or a missing certificate fails the deploy and leaves the running stack untouched.

A web release still causes a short gap while the new `web` container starts. This is not a zero-downtime deploy.

## Known-good recovery reference

Recorded 2026-10-19. Production was serving this release, and the running container matched this registry digest.

| | |
|---|---|
| Commit | `a16c70fefc1e577b3bdfdef102d961a4b775b017` |
| Image | `ghcr.io/kareemsasa3/personal-website/web:a16c70fefc1e577b3bdfdef102d961a4b775b017` |
| Digest | `sha256:4230f431f3802bea55306f65c334f9e0b8de0bbdfae990352b8d963aaebaff07` |
| Deployed by | run `38113456726`, 2026-10-11 |

## Rolling back

1. Choose the release to restore.
   - Commit SHAs of past releases are in the history of `main`. The deploy runs record them too.
   - After the first deploy made with this procedure, the host's `~/personal-website/.deploy/releases.log` also lists each release's digest and the release it replaced.
2. Find the release's digest. Each published SHA tag can be inspected without credentials:

   ```bash
   docker buildx imagetools inspect ghcr.io/kareemsasa3/personal-website/web:<sha>
   ```

3. Dispatch the deploy from `main`. Use the GitHub UI, or:

   ```bash
   gh workflow run deploy.yml -R kareemsasa3/personal-website --ref main \
     -f sha=<sha> -f expected_digest=sha256:<digest>
   ```

   Always pass `expected_digest` for a rollback. The deploy then runs only that exact image, even if the tag were ever moved.

4. Watch the run. On success, the log ends with `Deployed ghcr.io/…/web@sha256:… (<sha>)`. Then confirm that the live site's build identifier shows the restored commit.

No new commit or history rewrite is needed. The next push to `main` deploys that commit as usual.

You can also re-run a past deploy run within GitHub's 30-day window. The re-run deploys that run's commit, pinned. This only works for runs made after this procedure reached `main`. A re-run uses the workflow and script from its original commit, and older scripts pulled `:latest`.

### Limits

- **Not yet exercised against production.** The procedure was rehearsed on a non-production machine, using the production compose files and real published images (see Tests). The first production use should be a controlled exercise.
- **Only the web image is rolled back.** `infrastructure/` (nginx and compose configuration) is always synced from the commit that the workflow runs on, which is `main`. Rolling back an infrastructure change still means reverting it on `main`.
- **A restore needs the old image in GHCR.** Every past SHA tag is still published, and the host keeps only what it last pulled. Do not delete package versions that you may need for a restore.

## Certificates

Deploys no longer provision certificates. Renewal is handled by the daily cron job `infrastructure/prod/renew-ssl.sh` (`certbot renew --webroot`), which nginx's ACME location serves.

A new host, or a host whose certificate is missing, needs a one-time provisioning step before the first deploy, for example with `infrastructure/prod/lets-encrypt-setup.sh`. A deploy that finds no certificate stops and names that step, instead of stopping port 80 and requesting a certificate on its own.

## Tests

- `infrastructure/tests/deploy-workflow.test.mjs` evaluates the deploy job's own `if:` and `with:` expressions against push, pull-request, fork, failed-build, and dispatch events. It runs in CI.
- `infrastructure/tests/deploy-release.test.sh` runs `deploy-release.sh` against a simulated host. It covers digest pinning against `.env`, each failure that must happen before disruption, the certificate states, rollback, and restoring the previous image when a release is unhealthy. One case renders the real production compose files with the real Docker Compose. It runs in CI.
- `infrastructure/tests/deploy-rehearsal.sh` runs the script against real Docker, using the production compose files and two published releases. It deploys, rolls forward, rolls back, and checks that failures leave every running container untouched. It is not run in CI. It pulls the full image set, uses local ports, and refuses to run where `portfolio-*-prod` containers exist.
