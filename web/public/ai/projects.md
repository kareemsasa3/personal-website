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
- Technologies: Python, SQLite, systemd, FTS5, Wayland
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
- Date: 2025
- Canonical URL: https://kareemsasa.dev/case-studies/personal-website
- Repository status: public-legacy-account
- Repository: https://github.com/kareemsasa3/personal-website
- Summary: Personal site built in React and TypeScript that presents projects, case studies, technical writing, and interactive simulations under Darkfield, the site's own design system.
- Public evidence: Public repository link is listed by the site.
- Technologies: React 18, TypeScript, Vite, React Router, Framer Motion, nginx, Docker
- Highlights: One design system governs the interface on every route; Content driven from centralized, typed data files; Route shells, structured data, and sitemap generated at build time

## Mnemosyne

- Category: Backend Systems
- Status: On Hold
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: not-public
- Summary: Source-first documentation and traceability system for mapping documented events, rules, oversight, and source-reported claims without asserting conclusions.
- Public evidence: No public repository is listed. Treat public site copy as a sanitized summary.
- Technologies: Python, JSON Schema, React, Traceability, Data Modeling
- Highlights: Source-first traceability; Deterministic documentation model

## kctl

- Category: Developer Tooling
- Status: On Hold
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: public
- Repository: https://github.com/kareemsasa/kctl
- Summary: Local control plane for running staged, verifiable AI-assisted development workflows across repositories. Development is on hold with known issues unresolved.
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

## Themis

- Category: Developer Tooling
- Status: Active development
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: not-public
- Summary: Governance control plane for a portfolio of projects. It keeps standards, evidence, and derived reports together so status can be inspected without treating assumptions, missing evidence, or agent output as fact.
- Public evidence: No public repository is listed. Treat public site copy as a sanitized summary.
- Technologies: Python, JSON Schema, systemd, Agent Workflows
- Highlights: Agent output is a proposition about governed truth, never governed truth itself; Human authority is never inferred from commit, repository, or agent identity

## Wardroom

- Category: Developer Tooling
- Status: On Hold
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: public
- Repository: https://github.com/kareemsasa/wardroom
- Summary: Local-first command-line group chat in which Claude and Codex deliberate over a project folder, with a moderator that summarizes when the room reaches consensus or a useful decision point.
- Public evidence: Public repository link is listed by the site.
- Technologies: TypeScript, Node.js, Agent Workflows
- Highlights: Releases tagged through v0.2.0; Bounded transcripts keep long sessions from growing without limit

## Koiné

- Category: Desktop Application
- Status: Development
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: public
- Repository: https://github.com/kareemsasa/koine
- Summary: Planned open-source Linux game library that gathers games from multiple launchers into one searchable collection while leaving installation, configuration, and launch to those launchers. The application core exists; the GTK interface and live launching are not built yet.
- Public evidence: Public repository link is listed by the site.
- Technologies: Rust, SQLite, Linux
- Highlights: External launchers stay authoritative for configuration and execution; Unknown state is never recorded as a negative fact

## Aeolus

- Category: Research
- Status: Development
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: not-public
- Summary: Experimental harness for studying whether autonomous agents can discover and interrupt a causal recurrence. So far it is a deterministic, headless simulator with a mechanical test suite; it does not show that any agent reasons or escapes.
- Public evidence: No public repository is listed. Treat public site copy as a sanitized summary.
- Technologies: Python, Simulation, Autonomous Agents
- Highlights: Passing tests validate the simulator's mechanics, not the research hypothesis; Each policy sees only its own actor's observations

## Temporal Flexibility

- Category: Research
- Status: Development
- Date: 2026
- Canonical URL: https://kareemsasa.dev/projects
- Repository status: not-public
- Summary: Systems-design research into how heterogeneous energy workloads, such as EV charging, HVAC, storage, and computing, could expose schedulable flexibility through a shared contract without surrendering local authority. The current work is an offline, deterministic experiment on synthetic workloads; it involves no live devices, markets, or grid signals.
- Public evidence: No public repository is listed. Treat public site copy as a sanitized summary.
- Technologies: Python, C++, SciPy, Simulation
- Highlights: Instantaneous feasibility does not imply trajectory feasibility; Synthetic study: no claims about real devices, emissions, or grid outcomes

## Case Studies

- [Aether](https://kareemsasa.dev/case-studies/aether): Linux audio-analysis daemon that publishes live frequency-band state through a sequence-versioned shared-memory region for independent local consumers. Focus areas: Real-time systems, IPC design, Linux integration.
- [Erebus](https://kareemsasa.dev/case-studies/erebus): Event-driven Linux coordination layer that records system context, infers higher-level state, and makes troubleshooting replayable. Focus areas: Event modeling, Inference systems, Operational tooling.
- [Arachne](https://kareemsasa.dev/case-studies/arachne): Autonomous research platform that searches, scrapes, versions, indexes, and synthesizes web content through a Go and Next.js pipeline. Focus areas: Research automation, Service design, Search systems.
- [Personal Website](https://kareemsasa.dev/case-studies/personal-website): How kareemsasa.dev went from a four-service Docker stack to a static React frontend. Its pages ship as crawlable route shells, its deploys are digest-pinned and health-checked, and its interface follows a design system that its own tests check. AI coding agents helped build it; release authority stayed with the owner. Focus areas: Static delivery, Release engineering, Design-system governance.
- [Where the Specification Lived](https://kareemsasa.dev/case-studies/where-the-specification-lived): Two agents built the same Traffic Simulator in the same repository, one from a 38-word prompt and one from a 615-word specification. A blinded review of both artifacts shows what each prompt bought, and why prompt length and specification load are different variables. Focus areas: Agent-assisted development, Specification, Blinded review.
