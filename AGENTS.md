# AGENTS.md

## Purpose

This file guides AI-assisted work on this personal website repository. Use it as the operating guide for inspecting, changing, verifying, and reporting work safely in future Codex or agent sessions.

## Repository Overview

This repository contains a frontend-only personal website and the Docker/nginx infrastructure used to serve and deploy it.

- `web/` is the website application: React 18, Vite, TypeScript, React Router, Framer Motion, Font Awesome, and CSS modules/files by feature.
- `web/src/App.tsx` wires the route tree through `react-router-dom` and wraps routes with `AppProviders` and `Layout`.
- `web/src/routes/index.tsx` defines the public route table and lazy-loads pages with `lazyWithMinTime`.
- `web/src/pages/` contains route/page implementations such as `Home`, `Projects`, `CaseStudies`, individual case studies, `Work`/`Experience`, `Games`, and `Terminal`.
- `web/src/components/` contains shared UI and feature components, including layout, navigation, terminal, project/work details, games, backgrounds, and settings.
- `web/src/data/` contains site content, navigation, route metadata, structured data, case studies, projects, work experience, games data, terminal file-system data, and related content models.
- `web/src/contexts/`, `web/src/hooks/`, `web/src/providers/`, `web/src/utils/`, and `web/src/types/` contain shared application state, helpers, and types.
- `web/src/index.css`, `web/src/App.css`, `web/src/styles/components.css`, and feature CSS files provide styling. The current visual language is a dark, terminal/Matrix-inspired portfolio with responsive route pages.
- `infrastructure/` contains Docker Compose, nginx, SSL, production, and optional monitoring support. Production serves the built frontend behind nginx; there is no active backend API, database, queue, or session service.
- `docs/`, `web/docs/`, and `website-audit-report.md` contain project, infrastructure, architecture, audit, and remediation notes.

## Operating Rules

- Inspect the relevant files before editing. Prefer `rg`, `rg --files`, and small targeted reads.
- Keep changes small and scoped to the request. Avoid opportunistic cleanup.
- Do not rewrite copy, positioning, or visual direction unless the user explicitly asks.
- Preserve the existing dark terminal/Matrix design language unless explicitly asked to change it.
- Do not perform broad refactors during audit or remediation tasks.
- Keep docs/audits separate from implementation unless instructed.
- Do not modify infrastructure, deployment, package scripts, dependencies, or generated assets unless the task explicitly requires it.
- When touching route behavior, check `web/src/routes/index.tsx`, navigation data, route metadata, sitemap behavior, and any static route-shell generation in `web/vite.config.ts`.
- When touching profile or portfolio content, prefer the centralized data files in `web/src/data/` over scattering copy through components.
- Respect existing user changes in the worktree. Do not revert unrelated edits.

## Common Commands

Run app commands from `web/` unless noted otherwise.

- `npm install` - install frontend dependencies from `web/package-lock.json` after a fresh checkout or dependency change.
- `npm run dev` - start the Vite development server for normal frontend development.
- `npm run typecheck` - run TypeScript without emitting files; use for TypeScript, route, component, data model, and config changes.
- `npm run lint` - run ESLint on `src`, `eslint.config.js`, and `vite.config.ts`; use for code changes before reporting completion.
- `npm run build` - create a production build; use for route/page, metadata, sitemap, asset, Vite config, or deployment-sensitive frontend changes.
- `npm run preview` - preview the production build locally after `npm run build` when runtime behavior needs checking.
- `npm run test:smoke` - build and run the smoke test script in `web/scripts/smoke-test.mjs`; use for metadata, sitemap, route-shell, or deploy-regression changes.
- `npm test` - runs the smoke test via `npm run test:smoke`.

Infrastructure commands are documented in `README.md` and `infrastructure/README.md`; do not run or change them unless the task is about Docker, nginx, SSL, monitoring, or deployment.

## Verification Expectations

- Copy/content-only changes: review the relevant page/data file diff. Run `npm run typecheck` if TypeScript data files changed.
- CSS/layout changes: run `npm run lint` when code is touched, and visually inspect affected responsive states with the dev server or production preview. For prior mobile overflow work, check narrow widths around 320-430 CSS px.
- TypeScript/component changes: run `npm run typecheck` and `npm run lint`. Run `npm run build` when routes, lazy imports, assets, metadata, or production behavior may be affected.
- Route/page changes: run `npm run typecheck`, `npm run lint`, and `npm run build`. Also review `web/src/routes/index.tsx`, `web/src/data/navigation.ts`, `web/src/data/routeMetadata.ts`, `web/public/sitemap.xml`, and route-shell generation in `web/vite.config.ts` for drift.
- Dependency/config changes: confirm the package script or config actually exists, run `npm install` when lockfile updates are required, then run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` as applicable.
- Docs-only changes: `git diff --check` or a targeted `git diff -- <file>` is usually sufficient unless docs include executable commands that need validation.

## Project-Specific Notes

- Site-wide homepage copy and social/profile links live in `web/src/data/siteContent.ts`.
- `https://github.com/kareemsasa` is the canonical public/contact GitHub identity.
- `https://github.com/kareemsasa3` is the legacy repository/provenance account for older personal projects, including this website and related systems.
- Do not rewrite repository links from `kareemsasa3` to `kareemsasa` unless the target repository has actually been migrated.
- Contact, social, JSON-LD `sameAs`, and primary public identity links should prefer `kareemsasa`.
- Project and case-study repository links should point to the account where the repository currently lives.
- A local, gitignored private source file may exist at `docs/private/resume.md`. If present, it may be used to ground public-safe website copy, experience summaries, case-study proof, and resume/contact conversion work.
- Treat `docs/private/resume.md` as private source material, not publishable content. Do not copy it wholesale into the website.
- Use only public-safe positioning and sanitized project/experience facts from that file.
- Do not publish client-internal details, private infrastructure details, hostnames, admin routes, service inventories, secrets, private datasets, or repository links that do not actually exist.
- If `docs/private/resume.md` conflicts with public website data, pause and report the conflict instead of silently overwriting public content.
- Navigation items live in `web/src/data/navigation.ts`; route definitions live separately in `web/src/routes/index.tsx`.
- SEO, canonical paths, sitemap route metadata, and social image constants live in `web/src/data/routeMetadata.ts`.
- JSON-LD structured data lives in `web/src/data/structuredData.ts`.
- Case study content lives in `web/src/data/caseStudies.ts` and renders through page/component code under `web/src/pages/CaseStudies`, `web/src/pages/CaseStudy*`, and `web/src/components/CaseStudyPage`.
- Project, work, games, journey, terminal, and virtual file-system content are centralized under `web/src/data/`.
- Shared layout and navigation components live under `web/src/components/Layout` and `web/src/components/Navigation`.
- The terminal experience uses `web/src/components/Terminal`, terminal hooks in `web/src/hooks/`, and terminal-related types/data under `web/src/types` and `web/src/data`.
- Build output is configured in `web/vite.config.ts`; route fallback shells and generated sitemap behavior are also handled there.
- Audit/remediation history is documented in `website-audit-report.md`. Architecture and refactoring notes are under `web/docs/`. Infrastructure and CI/CD notes are under `docs/` and `infrastructure/README.md`.
- Temporary audit refresh documents may be used as working artifacts without being committed. Preserve `website-audit-report.md` as historical context unless explicitly told otherwise.
- Production deployment assumes a built frontend image served by nginx through Docker Compose, with optional Prometheus/Grafana monitoring. Public monitoring exposure and sourcemap behavior were part of prior remediation notes.

## Change Discipline

- Keep one visual fix per commit-sized unit.
- Keep one content section or data update per commit-sized unit.
- Keep one route/page concern per commit-sized unit.
- Keep docs-only updates separate from implementation changes.
- Avoid mixing infrastructure, app UI, SEO metadata, and content rewrites in one change unless the task explicitly spans them.
- When remediation requires multiple concerns, document the scope, touched files, and validation clearly.

## Reporting Format

Future agent final summaries should include:

- Files changed.
- Commands run.
- Verification results.
- Risks or manual review still needed.
- Suggested next commit message.

## Do Not Do Without Explicit Approval

- Change deployment configuration.
- Add new dependencies.
- Rename routes or remove canonical aliases.
- Reorganize large directory structures.
- Replace the visual design system.
- Delete audit history or remediation notes.
- Change package scripts.
- Modify generated/public assets unrelated to the task.
- Publish or commit private source material from `docs/private/`.
- Make unrelated cleanup changes.
