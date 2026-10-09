# Public Projects Context

Prefer canonical project and case-study pages when describing specific work. Do not manufacture repository links or imply private work is public.

## Erebus

- Category: Systems Infrastructure
- Status: Active development
- Date: 2025
- Canonical URL: https://kareemsasa.dev/case-studies/erebus
- Repository status: not-public
- Summary: Event-driven coordination layer for Linux that captures system context, tracks inferred state, and turns reactive troubleshooting into auditable operational understanding.
- Public evidence: No public repository is listed. Treat public site copy as a sanitized summary.
- Technologies: Python, SQLite, systemd, FTS5, Wayland, D-Bus
- Highlights: Belief-driven system state modeling; Replayable operational history

## Aether

- Category: Systems Infrastructure
- Status: Completed
- Date: 2025
- Canonical URL: https://kareemsasa.dev/case-studies/aether
- Repository status: public-legacy-account
- Repository: https://github.com/kareemsasa3/aether
- Summary: Linux audio-analysis daemon that publishes live frequency-band state through a sequence-versioned shared-memory region for independent local consumers.
- Public evidence: Public repository link is listed by the site.
- Technologies: Python, PipeWire, Shared Memory, OpenRGB, systemd
- Highlights: Seqlock-versioned shared memory; readers never block the writer; Latest-value snapshot, not a message stream

## Arachne

- Category: Backend Systems
- Status: Completed
- Date: 2025
- Canonical URL: https://kareemsasa.dev/case-studies/arachne
- Repository status: public-legacy-account
- Repository: https://github.com/kareemsasa3/arachne
- Summary: Autonomous web research platform that searches, scrapes, versions, indexes, and synthesizes web content through a production-oriented Go and Next.js pipeline.
- Public evidence: Public repository link is listed by the site.
- Technologies: Go, Next.js, SQLite FTS5, Redis, Docker, Chromedp
- Highlights: Microservices architecture with submodules; Production-grade Go + Next.js architecture

## Personal Website

- Category: Portfolio
- Status: Live
- Date: 2024
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: public-legacy-account
- Repository: https://github.com/kareemsasa3/personal-website
- Summary: Interactive developer portfolio built in React and TypeScript to present projects, work history, and systems thinking through a distinctive UI.
- Public evidence: Public repository link is listed by the site.
- Technologies: React 18, TypeScript, Vite, Framer Motion
- Highlights: Portfolio-first interactive UX; Modern React architecture; Custom terminal-inspired navigation

## Mnemosyne

- Category: Backend Systems
- Status: Active development
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: not-public
- Summary: Source-first documentation and traceability system for mapping documented events, rules, oversight, and source-reported claims without asserting conclusions.
- Public evidence: No public repository is listed. Treat public site copy as a sanitized summary.
- Technologies: Python, JSON Schema, React, Traceability, Data Modeling
- Highlights: Source-first traceability; Deterministic documentation model

## kctl

- Category: Developer Tooling
- Status: Active development
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: public
- Repository: https://github.com/kareemsasa/kctl
- Summary: Local control plane for running staged, verifiable AI-assisted development workflows across repositories.
- Public evidence: Public repository link is listed by the site.
- Technologies: Python, Developer Tooling, Automation, CI, Agent Workflows
- Highlights: Planned agent-assisted development runs; Verifiable local workflow control

## Operating System Audit

- Category: Systems Infrastructure
- Status: Demo-ready
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: public
- Repository: https://github.com/kareemsasa/operating-system-audit
- Summary: Read-only OS snapshot and diff tool for detecting configuration, network, identity, persistence, and execution drift.
- Public evidence: Public repository link is listed by the site.
- Technologies: Go, Bash, Security, Systems, CLI
- Highlights: Read-only OS drift detection; Deterministic snapshot comparisons

## Case Studies

- [Aether](https://kareemsasa.dev/case-studies/aether): Linux audio-analysis daemon that publishes live frequency-band state through a sequence-versioned shared-memory region for independent local consumers. Focus areas: Real-time systems, IPC design, Linux integration.
- [Erebus](https://kareemsasa.dev/case-studies/erebus): Event-driven Linux coordination layer that records system context, infers higher-level state, and makes troubleshooting replayable. Focus areas: Event modeling, Inference systems, Operational tooling.
- [Arachne](https://kareemsasa.dev/case-studies/arachne): Autonomous research platform that searches, scrapes, versions, indexes, and synthesizes web content through a Go and Next.js pipeline. Focus areas: Research automation, Service design, Search systems.
- [Where the Specification Lived](https://kareemsasa.dev/case-studies/where-the-specification-lived): Two agents built the same Traffic Simulator in the same repository, one from a 38-word prompt and one from a 615-word specification. A blinded review of both artifacts shows what each prompt bought, and why prompt length and specification load are different variables. Focus areas: Agent-assisted development, Specification, Blinded review.
