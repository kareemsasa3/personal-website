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
7. It makes sure three directories exist: `infrastructure/nginx/certbot/www`, `infrastructure/logs/nginx` and `infrastructure/logs/certbot`.
   - nginx bind-mounts the first two. The renewal cron job appends its log to the third, and it does not run if that directory is missing.
   - A missing directory is created. If it cannot be created, for example because its parent is owned by root, the deploy stops before anything changes and names the directory.
   - Existing directories are left alone. If `logs/certbot` is not writable by the deploy user, the deploy logs a warning.
8. It records the image that the running web container uses.
9. It runs `docker compose up -d`. Compose recreates only the services whose configuration changed. For a normal release, that is only `web`, so nginx and monitoring keep running. The old deploy ran `docker compose down` first.
10. It waits for the web container to report three things:
   - it runs the pinned image;
   - its healthcheck reports healthy;
   - nginx serves `/` from it over HTTPS.

   The proxy's `/health` endpoint is answered by nginx itself, so it does not show that the web container is up.
11. If the release does not become healthy, the script switches `web` back to the previously recorded image and fails the deploy.
12. It runs `nginx -t` and the monitoring health checks.
13. It appends the release to `~/personal-website/.deploy/releases.log` and writes `~/personal-website/.deploy/current-web-image`. These files live outside `infrastructure/`, so a sync does not overwrite them.

A failed pull, an unavailable or mismatched image, an invalid compose configuration, a missing certificate, or a directory that cannot be created fails the deploy and leaves the running stack untouched.

A web release still causes a short gap while the new `web` container starts. This is not a zero-downtime deploy.

## Known-good recovery reference

Recorded 2026-10-19. Production was serving this release, and the running container matched this registry digest.

| | |
|---|---|
| Commit | `a16c70fefc1e577b3bdfdef102d961a4b775b017` |
| Image | `ghcr.io/kareemsasa3/personal-website/web:a16c70fefc1e577b3bdfdef102d961a4b775b017` |
| Digest | `sha256:4230f431f3802bea55306f65c334f9e0b8de0bbdfae990352b8d963aaebaff07` |
| Deployed by | run `38113456726`, 2026-10-11 |
| Reference for `restore-web-release.sh` | `ghcr.io/kareemsasa3/personal-website/web@sha256:4230f431f3802bea55306f65c334f9e0b8de0bbdfae990352b8d963aaebaff07` |

## Two ways to restore a release

| | Automated rollback | Emergency recovery |
|---|---|---|
| When to use it | GitHub Actions and `deploy-release.sh` work. The problem is the release itself. | Actions is unavailable, the deploy workflow or its secrets are broken, or `deploy-release.sh` is the suspected cause. |
| Who starts it | Anyone with write access, by dispatching the deploy workflow | An operator with SSH and Docker access to the host, after explicit authorization |
| What it runs | `deploy-release.sh`, with every pre-disruption check | `infrastructure/prod/restore-web-release.sh` on the host |
| What it needs | Actions, the deploy secrets, and GHCR | The image already on the host. No GitHub, no registry, no production secrets |
| What it changes | Pulls and pins the release, recreates changed services, and runs the monitoring checks | Recreates `web` on a digest and starts `nginx` if it is stopped. Nothing else |

Neither path runs automatically. A failed deploy only switches `web` back to the image that was running before, as described above.

## Rolling back (automated, through GitHub Actions)

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

## Emergency recovery (operator-initiated, without GitHub Actions)

Use this path when a deploy has left production broken and the automated rollback cannot be used. Running it on production requires explicit authorization from the owner. No workflow, build, or deploy script ever invokes it.

`infrastructure/prod/restore-web-release.sh` runs on the host as the deploy user. Every deploy syncs it into `~/personal-website/infrastructure/prod/`.

- **No default image.** You must name the release with `--image ghcr.io/<owner>/<repo>/web@sha256:<digest>`. Tags, including `:latest`, are refused.
- **Checks before changing anything.** It confirms Docker Compose v2, the compose files, `.env` and its `DOMAIN_NAME`, and the `portfolio-network-prod` network. It confirms that the image is **already on the host**, because it never pulls. It confirms that compose resolves `web` to exactly that digest: the digest is written as a literal override, so `WEB_IMAGE` in `.env` or the shell cannot replace it. If any check fails, it stops and nothing has changed.
- **Read-only by default.** Without `--execute` it runs only these checks and reports what it would do. With `--execute` it runs `docker compose up -d --no-build --pull never web nginx`, and then waits until three things hold:
  - the web container runs that image;
  - the container reports healthy;
  - nginx serves `/` from it over HTTPS.
- **No production secrets.** Compose interpolates the monitoring file even when only `web` and `nginx` are started. If `GRAFANA_ADMIN_*` are not set, placeholders are used for that interpolation only. Monitoring containers are not recreated.
- **Recorded.** A successful restore is appended to `~/personal-website/.deploy/releases.log` as `manual-restore`.

### First hardened deployment: what can need restoring

Merging the hardened deploy into `main` deploys through the new path for the first time. The change was checked against the 2026-10-11 deploy.

- **Configuration does not change.** `infrastructure/` on `main` is identical to what the 2026-10-11 deploy synced. The hardened change only adds files: `prod/deploy-release.sh`, `prod/restore-web-release.sh` and the tests. It also changes a comment in `env.example`. The sync extracts files and never deletes any.
- **Only `web` is recreated.** In a local rehearsal, nginx and monitoring containers created by the old deploy flow were not recreated by the first hardened deploy.
- **The registry tags move.** The merge build moves the GHCR `:latest` and `:main` tags to the new image. Anything that pulls `:latest` no longer gets the known-good release.

So the only state that may need restoring is the web image. Work through these in order:

1. **The deploy log ends before `Starting services`.** Nothing that was running changed. Verify (step 5 below) and stop.
2. **The log says the previous web image is serving again.** The deploy restored it automatically. Verify and stop.
3. **Actions works, and the release, not the script, is at fault.** Use the [automated rollback](#rolling-back-automated-through-github-actions) with the known-good SHA and digest.
4. **Otherwise, run the emergency recovery on the host:**

   ```bash
   cd ~/personal-website
   IMAGE=ghcr.io/kareemsasa3/personal-website/web@sha256:4230f431f3802bea55306f65c334f9e0b8de0bbdfae990352b8d963aaebaff07
   infrastructure/prod/restore-web-release.sh --image "$IMAGE"            # checks only
   infrastructure/prod/restore-web-release.sh --image "$IMAGE" --execute  # restore
   ```

   If the image is not on the host and GHCR is reachable, run `docker pull "$IMAGE"` first. The package is public, so no credentials are needed. If the script is missing, take it from the repository at the branch or commit being recovered. It depends only on the compose files that are already on the host.

5. **Verify.**
   - `docker inspect --format '{{.Image}}' portfolio-web-prod` equals `docker image inspect --format '{{.Id}}' "$IMAGE"`.
   - The container reports healthy.
   - From outside, the live site's build identifier shows `a16c70fefc1e577b3bdfdef102d961a4b775b017`.

### Optional: return the files and the repository to the known-good state

- **Infrastructure files.** The added files are inert. To return the host to exactly the `a16c70f` set, remove the files that the hardened change added and extract `a16c70f` over the directory from any clone:

  ```bash
  git archive a16c70fefc1e577b3bdfdef102d961a4b775b017 infrastructure | ssh <host> 'tar -xf - -C ~/personal-website'
  ```

- **The repository.** Revert the merge on `main` with `[skip ci]` in the merge commit message. A push carrying `[skip ci]` starts no workflow, so nothing deploys. (`3c533b6` was such a push.) Without `[skip ci]`, the revert would deploy through the old flow, which brings the stack down first and runs `:latest`.

### Do not use these to recover after the merge

Each one pulls `:latest`, which by then is the new build.

- `infrastructure/prod/prod.sh`, which also runs `down` first.
- Re-running a deploy run from before the merge.
- A revert of the merge pushed without `[skip ci]`.
- A bare `docker compose up` with no services named.

### What has and has not been exercised

- **Exercised locally against real Docker**, using the production compose files and real published images:
  - the restore with the site down, with no GHCR or Grafana credentials and `--pull never`;
  - its read-only preflight;
  - the refusal of a tag;
  - the transition from a stack started by the old deploy flow.
- **Not exercised on the production host.** These are prerequisites to confirm with read-only checks before the merge:
  1. The known-good image is present by digest: `docker image inspect "$IMAGE"`.
  2. `docker compose version` reports v2.
  3. The three directories in step 7 of the deploy exist.
  4. The host's `infrastructure/` files match `a16c70f`.

  Running the script without `--execute` on the host performs the first two checks and changes nothing.

## Certificates

Deploys no longer provision certificates. Renewal is handled by the daily cron job `infrastructure/prod/renew-ssl.sh` (`certbot renew --webroot`), which nginx's ACME location serves.

A new host, or a host whose certificate is missing, needs a one-time provisioning step before the first deploy, for example with `infrastructure/prod/lets-encrypt-setup.sh`. A deploy that finds no certificate stops and names that step, instead of stopping port 80 and requesting a certificate on its own.

## Tests

- `infrastructure/tests/deploy-workflow.test.mjs` evaluates the deploy job's own `if:` and `with:` expressions against push, pull-request, fork, failed-build, and dispatch events. It runs in CI.
- `infrastructure/tests/deploy-release.test.sh` runs `deploy-release.sh` against a simulated host. It covers digest pinning against `.env`, each failure that must happen before disruption, the certificate states, rollback, and restoring the previous image when a release is unhealthy. One case renders the real production compose files with the real Docker Compose. It runs in CI.
- `infrastructure/tests/restore-web-release.test.sh` runs the emergency restore against a simulated host. It checks the refusals (no image, a tag, a short digest, an image missing from the host, no Compose v2, no network, no `.env` or `DOMAIN_NAME`, compose resolving another image), the read-only preflight, a restore that never pulls or logs in, an unhealthy result, and a real Compose render against `WEB_IMAGE=:latest`. It also checks that nothing automated references the script. It runs in CI.
- `infrastructure/tests/deploy-rehearsal.sh` runs the script against real Docker, using the production compose files and two published releases. It deploys, rolls forward and rolls back, and checks that failures leave every running container untouched. It then removes the web container, stops nginx, and restores with `restore-web-release.sh`, without GitHub, registry credentials or Grafana values. It is not run in CI. It pulls the full image set, uses local ports, and refuses to run where `portfolio-*-prod` containers exist.
