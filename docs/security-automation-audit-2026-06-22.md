# Security Automation Audit

Date: June 22, 2026

Commit audited: `26c0f41` (`Fix form-data security advisory`)

Repository: `kareemsasa3/personal-website`

Scope: documentation only. This note records audit findings and follow-up
candidates for the repository's CI/security automation. It does **not** change
any workflow, deployment, or package files.

## Security automation audit summary

The repository already has recurring post-push vulnerability detection. A
scheduled GitHub Actions `Security` workflow runs `npm audit --audit-level=high`
weekly and re-evaluates the committed lockfile against newly published
advisories. That scheduled run — not a pre-push hook and not Dependabot — is
what caught the June 2026 `form-data` advisory after the dependency was already
committed.

This matters because scheduled checks catch advisories that are published
*after* code is merged, whereas local/pre-push hooks only run at commit/push
time and would never re-evaluate an unchanged lockfile. The remaining work is a
mix of small additions and genuine policy decisions; not all of it should be
implemented automatically.

## What happened

- The scheduled `Security` workflow (`.github/workflows/security.yml`, cron
  `0 9 * * 1`, weekly Mondays 09:00 UTC) ran `npm audit --audit-level=high` in
  `web/` against the already-committed `web/package-lock.json`.
- The audit failed on the newly published advisory `form-data`
  GHSA-hmw2-7cc7-3qxx (CRLF injection, severity **high**). `form-data` is a
  transitive production dependency (via `axios`).
- The fix was lockfile-only: `form-data` was updated to `4.0.6`. After the fix
  was pushed, the same `Security` workflow ran on `push` and passed.
- Root cause of the *failure trigger*: the **scheduled** `npm audit
  --audit-level=high`, re-running against an unchanged lockfile when a new
  advisory was published. It was not triggered by a pre-push hook and not by
  Dependabot (Dependabot/Renovate are absent and platform alerts appear
  disabled).

Note: the `Security` (npm audit) workflow is independent of the deploy path.
Its failure did not block deployment — see Existing controls below.

## Existing controls

- **Weekly scheduled npm audit.** `.github/workflows/security.yml` runs on
  `schedule` (cron `0 9 * * 1`): `npm ci` then `npm audit --audit-level=high` in
  `web/`. Covers all npm dependencies (prod + dev); fails only on **high** or
  above. This is the recurring post-push detection.
- **Push/PR npm audit.** The same `Security` workflow also runs on `push` and
  `pull_request` to `main`.
- **Push/PR CI checks.** `.github/workflows/ci.yml` runs `npm ci`,
  `npm run lint`, and `npm run typecheck` on push/PR to `main`.
- **Push/PR build + image scan.** `.github/workflows/web-ci.yml`
  (`Build & Publish Images`) runs lint/typecheck/build, pushes the image to
  GHCR (on `main`), and runs a Trivy image scan that fails on **CRITICAL**
  image vulnerabilities.
- **CD triggered by successful image build.** `.github/workflows/deploy.yml`
  runs on `workflow_run` completion of `Build & Publish Images` with
  `conclusion == success` on `main`. Deploy is therefore gated on the image
  build workflow (which includes the Trivy CRITICAL scan), but **not** directly
  gated on the separate `Security` npm audit workflow.
- **Runtime / server-side health checks.** The deploy verifies public `/health`,
  checks that Grafana is not publicly exposed, and validates OG image responses
  (`.github/workflows/deploy.yml`); the SSH deploy action also checks nginx
  config and Prometheus/Grafana health; the web container has a Docker
  `HEALTHCHECK`. These are runtime checks and are separate from dependency
  advisory detection.

## Gaps / follow-up candidates

- No `workflow_dispatch` manual trigger on the `Security` workflow; the audit
  can only run on push, PR, or the weekly schedule.
- No Dependabot or Renovate automation for npm or GitHub Actions
  (no security/version PRs).
- Platform Dependabot alerts / vulnerability alerts appear disabled, so there is
  no out-of-band notification independent of Actions.
- Trivy image scanning runs only on push/PR (inside `Build & Publish Images`),
  not on a schedule — a newly published image/base-image CVE is not detected
  until the next push.
- Trivy currently fails only on **CRITICAL**, not **HIGH**.
- Deploy is not gated on npm audit; a high npm advisory introduced by a commit
  fails `Security` but does not block deployment.
- Moderate/low advisories never fail the audit (threshold is `high`), so they
  can sit unaddressed in the lockfile.
- Some third-party GitHub Actions are tag-pinned (e.g. `@v5`/`@v6`) rather than
  SHA-pinned; only the Trivy action is SHA-pinned.
- Code scanning / SARIF upload is stale (last analyses from an older `ci.yml`
  job); current workflows do not upload to the Security tab.

## Policy decisions before implementation

These are decisions, not automatic tasks. In particular, hard-gating deploy on
`npm audit --audit-level=high` can block unrelated emergency deploys when a new
advisory is published against an existing dependency.

- Should high npm audit failures block deploy, or should the scheduled audit
  remain advisory (detection + manual fix) so it cannot block unrelated
  emergency deploys?
- Should moderate advisories fail CI, or remain informational?
- Should the image vulnerability threshold include **HIGH** in addition to
  **CRITICAL**?
- Should scheduled image scans pull the latest deployed/production image, or
  rebuild and scan from source?
- Should Dependabot auto-merge be allowed, or should every update require
  manual review?

## Proposed later tasks

- [ ] Add `workflow_dispatch` to `.github/workflows/security.yml`.
- [ ] Add Dependabot config for `/web` npm dependencies.
- [ ] Add Dependabot config for GitHub Actions.
- [ ] Decide whether to enable platform Dependabot/vulnerability alerts.
- [ ] Add scheduled Trivy scan for the deployed/latest image.
- [ ] Decide whether Trivy should fail on `CRITICAL,HIGH` instead of only `CRITICAL`.
- [ ] Decide whether deploy should depend on npm audit success.
- [ ] Review GitHub Actions pinning policy (SHA-pin third-party actions).
- [ ] Decide whether to upload Trivy SARIF/code-scanning results.
