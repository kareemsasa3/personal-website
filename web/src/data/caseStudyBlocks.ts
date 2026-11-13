import type { CaseStudy } from "./caseStudies";
import { DETAILED_PROMPT, SIMPLE_PROMPT } from "./specificationExperimentPrompts";

/**
 * Long-form section blocks, kept out of caseStudies.ts so the main bundle (which
 * loads case-study metadata on every route) does not carry them. Only the case
 * study pages and the build-time route shells import this module.
 */
const whereTheSpecificationLived: NonNullable<CaseStudy["blocks"]> = {
  problem: {
    after: [
      {
        kind: "prose",
        heading: "Where specification can live",
        paragraphs: [
          "A mature repository already specifies a great deal: AGENTS.md, tests, neighbouring implementations, types, names, documentation, route machinery, and visual conventions. What a prompt adds is the residual specification on top of that environment.",
        ],
      },
      {
        kind: "list",
        items: [
          "Durable project invariants belong in the repository, where every task inherits them.",
          "Task-specific non-negotiables belong in the invocation, because the repository cannot know them.",
          "Genuinely open design decisions belong to the agent's judgment; specifying them in advance spends that judgment.",
        ],
      },
      {
        kind: "prose",
        paragraphs: [
          "So the question is not whether short prompts beat long ones. It is where each part of the specification lived, and which copy of it each agent obeyed.",
        ],
      },
    ],
  },
  constraints: {
    after: [
      {
        kind: "prompts",
        heading: "The two prompts",
        prompts: [
          { label: "Simple prompt", summary: "38 words, 2 paragraphs", text: SIMPLE_PROMPT },
          { label: "Detailed prompt", summary: "615 words, 15 paragraphs", text: DETAILED_PROMPT },
        ],
      },
    ],
  },
  architecture: {
    after: [
      {
        kind: "images",
        caption:
          "The two experimental artifacts at phone width, captured from production builds of their final commits. Left: the Simple artifact's signal corridor, folded into rows. Right: the Detailed artifact zoomed to one intersection in rush hour.",
        images: [
          {
            src: "/media/spec-experiment-simple-corridor.webp",
            width: 718,
            height: 1058,
            density: 2,
            label: "simple prompt · signal corridor",
            alt: "The Simple artifact's signal corridor at phone width: the 1.1 km road folded into five rows of two lanes, blue vehicles shaded by speed, and signal bars S1 and S2 green and S3 red, above a five-step speed legend.",
          },
          {
            src: "/media/spec-experiment-detailed-signal.webp",
            width: 718,
            height: 1462,
            density: 2,
            label: "detailed prompt · signal 1",
            alt: "The Detailed artifact zoomed to signal 1 at phone width: the arterial, two lanes each way, runs top to bottom with moving cars in white; the one-lane cross street runs left to right with stopped cars in red queued at the signal heads.",
          },
        ],
      },
      {
        kind: "comparison",
        caption: "What the blinded evaluation measured",
        columns: ["Simple prompt", "Detailed prompt"],
        rows: [
          { label: "Prompt length", values: ["38 words", "615 words"] },
          { label: "Wall time, prompt to closing report", values: ["26 min 55 s", "56 min 34 s"] },
          { label: "Change size", values: ["27 files, +2,622 / −9 lines", "30 files, +3,235 / −10 lines"] },
          { label: "Model tests", values: ["14", "26, plus a browser regression script"] },
          { label: "Typecheck, lint, build, smoke suite", values: ["Pass", "Pass"] },
          { label: "30-minute invariant probes", values: ["51 configurations, no violations", "60 configurations, no violations"] },
          { label: "Phenomena", values: ["Signal coordination, merge bottleneck, ring-road stop-and-go wave", "Signal coordination in both directions, oversaturation, fixed vs actuated control"] },
          { label: "Single-rule breakages the suite missed", values: ["25 of 51, about 5 of them no-ops", "Red, yellow, intersection, sequence, and actuation rules caught; metric definitions and some parameters missed"] },
          { label: "Correctness defect found", values: ["Red-light crossings after abrupt timing edits", "None; two rules never fire in its presets"] },
          { label: "Documented claims re-measured", values: ["All reproduce at the default seed; one holds in 6 of 10 seeds", "Coordination and actuation claims hold across 10 seeds; capacity stated as ~1,500 veh/h, measured 1,440"] },
        ],
        note:
          "Rows are comparable only where the same measurement was applied to both. The mutation counts are not: each suite was tested against breakages of its own model's rules.",
      },
    ],
  },
  decisions: {
    before: [
      {
        kind: "prose",
        heading: "What the agents reported",
        paragraphs: [
          "Each run ended with a careful, specific closing report. The Simple run listed tests for “red lights obeyed” and said an independent code review it ran “found no engine bugs.” The Detailed run reported that the eastbound approach “saturates at about 1,500 vehicles/hour,” and that switching off each driver rule in turn made a test fail.",
          "Those reports were self-reports: each author's account of its own work, checked by reviewers it chose itself. They are evidence of what was claimed. They are not validation, so the artifacts were judged directly.",
        ],
      },
    ],
  },
  implementation: {
    after: [
      {
        kind: "images",
        caption:
          "The Simple artifact's time-space diagrams for the same arriving traffic, at phone width. Each dot is one vehicle at one moment: time runs left to right, position bottom to top, so rising streaks are moving traffic and the lines at 250, 550, and 850 m are the signals' stop lines. With a green wave, platoons that clear the first signal mostly meet green at the next ones. With a reverse wave, they stop again at every signal, and the stops appear as bright bands on each stop line.",
        images: [
          {
            src: "/media/spec-experiment-simple-greenwave.webp",
            width: 618,
            height: 520,
            density: 2,
            label: "simple prompt · green wave",
            alt: "Time-space diagram, green wave: blue diagonal streaks of moving vehicles cross the signal lines at 250, 550, and 850 m, with fewer and shorter bright queue bands than the reverse wave.",
          },
          {
            src: "/media/spec-experiment-simple-reversewave.webp",
            width: 618,
            height: 520,
            density: 2,
            label: "simple prompt · reverse wave",
            alt: "Time-space diagram, reverse wave: the same streaks bend flat into long bright queue bands at every signal line, showing vehicles stopping at each signal.",
          },
        ],
      },
      {
        kind: "recording",
        label: "simple prompt · ring road",
        media: {
          poster: {
            src: "/media/spec-experiment-simple-ring.webp",
            width: 1296,
            height: 972,
            alt: "The Simple artifact's ring road with a stop-and-go jam: stopped vehicles bunched on one side of the loop, and a backward-sloping band in the time-space diagram below.",
          },
          video: {
            src: "/media/spec-experiment-simple-ring.mp4",
            width: 1296,
            height: 972,
            label:
              "The Simple artifact's ring road at 2× playback: 34 evenly spaced cars, then one press of Brake one car. Stopped cars bunch up on the loop and a band slides backward in the time-space diagram while every car keeps moving forward.",
            significance:
              "The jam comes from the same car-following rule every driver uses; nothing scripts it. Left alone, this ring also jams by itself after about 15 to 20 simulated minutes, which the clip does not show.",
          },
        },
      },
      {
        kind: "recording",
        label: "detailed prompt · rush hour",
        media: {
          poster: {
            src: "/media/spec-experiment-detailed-rush.webp",
            width: 1296,
            height: 732,
            alt: "The Detailed artifact zoomed to signal 1 in rush hour: an eastbound queue stretching back to the entrance, cross-street cars waiting, and the demand and signal settings panel beside it.",
          },
          video: {
            src: "/media/spec-experiment-detailed-rush.mp4",
            width: 1296,
            height: 732,
            label:
              "The Detailed artifact's rush-hour preset at 4× playback, zoomed to signal 1: queues build on red on both streets, discharge on green, and the eastbound queue reaches back to the entrance.",
            significance:
              "It shows the deeper signal model: two streets competing for one intersection through yellow and all-red. Its rules against blocking the intersection exist but do not fire in this preset.",
          },
        },
      },
    ],
  },
  outcome: {
    after: [
      {
        kind: "list",
        heading: "What changed before publication",
        items: [
          "The live Traffic Simulator is a reviewed derivative of the Simple artifact, not an untouched copy. The experimental commit 7420cc7 is preserved unchanged by the tag traffic-sim-experiment-simple, and each change below was made on top of it.",
          "Signal lights now step only green → yellow → red → green. A timing edit that jumps the schedule shows a full 3 s yellow first. A regression test replays the same 49 abrupt edits and allows no red crossings. With no edits, the lights match the original schedule exactly, so the artifact's documented results are unchanged.",
          "The ring-road text now says the dense ring jams by itself after roughly 15 to 20 simulated minutes; the brake tap sets the wave off early.",
          "A paused simulator no longer runs animation loops or re-renders ten times a second.",
          "The time-space diagram draws only new samples: about 4.4 ms per sample instead of 100 to 165 ms for each full repaint, measured with 4× CPU throttling at phone width.",
          "The diagram has a data table listing where traffic is slow now and 30, 60, and 90 s ago, so its content is available as text and from the keyboard.",
          "The model suite grew from 14 to 21 tests aimed at rules the original suite passed by accident. Against the same 51 single-rule breakages, it misses 7 instead of 25: five change nothing the model can show, one is a gap check that another safety check already covers, and one changes how stops are counted without any effect the tests or probes could find. Three new breakages aimed at the post-evaluation code are all caught.",
        ],
      },
      {
        kind: "prose",
        heading: "What this says about repository-resident specification",
        paragraphs: [
          "The Simple prompt said almost nothing about this repository, and the Simple run still reconstructed nearly all of its integration requirements: the route, simulation card, metadata, sitemap, static route shell, smoke tests, theme tokens, reduced-motion handling, and the existing split between model and renderer. That part of the specification came from the repository.",
          "The Detailed prompt asked for things the repository did not require on its own, such as meaningful tests of the model's invariants and browser-level checks, and the Detailed run delivered them: a stronger test suite and a browser regression script. Those are task-specific non-negotiables, and the invocation is where they had to live. Its safer signal transitions were not in the prompt; they were the run's own design choice.",
          "The Detailed prompt also listed signals, queuing, and throughput as minimum requirements, and the Detailed run built deeply around exactly those, while the Simple run, given no list, ranged wider. One pair of runs cannot show that the list caused the narrower scope. It is consistent with detail consuming decisions that could have stayed open.",
          "Nor does this show that the repository always suffices. The Simple run shipped a red-light bug that its own tests and review missed, and the repository contained no traffic model from which to inherit the rule that a light never skips yellow.",
        ],
      },
      {
        kind: "list",
        heading: "Limitations",
        items: [
          "One pair of runs, not a crossover: each prompt ran once.",
          "Agent variance and tool-use luck are uncontrolled; a second run of either prompt could produce a different artifact.",
          "The agents collided in a shared worktree before separating, so the runs were not fully independent.",
          "Wall time measures cost, not quality.",
          "The closing reports are self-reports and were not treated as validation.",
          "The evaluator was a separate session of the same model. Blinding hid which prompt produced which branch; it did not remove tendencies the evaluator may share with the authors.",
          "The mutation counts compare each suite against its own model's rules, so they are not a like-for-like score.",
        ],
      },
      {
        kind: "prose",
        heading: "The principle",
        paragraphs: [
          "Put durable invariants in the repository, where every task inherits them. Put the task's non-negotiables in the invocation. Leave genuinely open decisions open. Then judge what comes back by the artifact, not the report. This experiment does not show that shorter prompts are better. It shows that the useful question about a prompt is which of those three places each requirement belongs in.",
        ],
      },
    ],
  },
};

const personalWebsite: NonNullable<CaseStudy["blocks"]> = {
  problem: {
    after: [
      {
        kind: "list",
        items: [
          "A client-rendered app still had to be readable without JavaScript.",
          "Published writing still had to be safe to inject.",
          "A deploy must not replace a working release with a broken one.",
          "An interface styled through hundreds of literal values had to be governed.",
        ],
      },
      {
        kind: "prose",
        paragraphs: ["This study follows how each problem surfaced, and what now enforces the answer."],
      },
      {
        kind: "prose",
        heading: "From four services to one",
        paragraphs: [
          "The first commit, on 6 August 2025, wired the portfolio, the AI microservice, Arachne and Redis together, with nginx routing API paths to the backends.",
        ],
      },
      {
        kind: "list",
        items: [
          "December 2025: a branch integrated Arachne's own interface and web search into the portfolio. It was closed unmerged.",
          "16 January 2026: the AI backend and Arachne were removed from the production stack and from nginx routing.",
          "April 2026: the frontend, until then a separate submodule, moved into this repository as web/. Its earlier history is outside this study.",
        ],
      },
      {
        kind: "prose",
        paragraphs: ["The commits record what changed, not why. In the owner's retrospective account:"],
      },
      {
        kind: "list",
        items: [
          "The site should stay focused.",
          "The other projects should evolve independently.",
          "Arachne had reached the point where a dedicated interface served it better.",
          "Integrating it into the portfolio added security complexity.",
        ],
      },
      {
        kind: "prose",
        paragraphs: ["Arachne continued as its own project, with its own case study."],
      },
    ],
  },
  decisions: {
    after: [
      {
        kind: "prose",
        heading: "Darkfield began with a favicon",
        paragraphs: [
          "Darkfield did not start as a redesign. On 8 October 2026 a red dashed spiral appeared briefly on an Android phone before the site painted. The investigation traced it to the site's own favicon. The owner wanted that mark replaced with an original identity mark, and asked for a product-agnostic visual language rather than a design made for this website. On 9 October the finished R1 “Constant Seam” mark replaced the favicon, as a deliberately isolated change. Two days later the owner approved Darkfield as the governing design system for the entire site. No visitor-facing page was exempt, and independent creative work kept its own identity.",
          "When the migration plan was written, Darkfield appeared only in the favicon. The interface ran on:",
        ],
      },
      {
        kind: "list",
        items: [
          "about 250 literal greens;",
          "230 border-radius and 146 box-shadow declarations;",
          "Courier New prose and 33 keyframe animations.",
        ],
      },
      {
        kind: "prose",
        paragraphs: [
          "Over four weeks the migration replaced that layer surface by surface: restraint, grammar, identity, the governed interface, then conformance. It turned a visual language into constraints: generated tokens, an export boundary, provenance records and tests. It merged on 6 November 2026.",
        ],
      },
      {
        kind: "prose",
        heading: "Who decided what",
        paragraphs: ["From spring 2026, AI coding agents did much of the implementation:"],
      },
      {
        kind: "list",
        items: [
          "Codex: its sessions on this repository begin in April 2026, the month of the audit-remediation passes, and include part of the Darkfield migration in October.",
          "Claude Code: its commits, which carry co-author trailers, begin in May 2026 and run through the security, deployment and Darkfield work.",
          "Before April 2026: no agent records exist for the repository.",
        ],
      },
      {
        kind: "prose",
        paragraphs: [
          "The agents worked from the repository's AGENTS.md and per-task instructions. They investigated, planned, implemented and tested, with independent agent review between tasks. Authority stayed with the owner:",
        ],
      },
      {
        kind: "list",
        items: [
          "Direction and acceptance: the owner made the binding decisions: simplifying the stack, adopting Darkfield and its scope, keeping its specification private, and choosing which identity files to publish. The owner also approved the migration's final visual review.",
          "Delegation on the record: the owner delegated some bounded Darkfield design questions. The plan records the answers as delegated rulings, “not owner approvals”, each still open to review.",
          "Release approval: push, merge and deploy were reserved for the owner's authorization. The main branch accepts changes only through a code-owner-approved pull request with a passing build, with no bypass. Every pull request was merged from the owner's accounts, and production deploys only from main.",
        ],
      },
      {
        kind: "prose",
        paragraphs: [
          "The Traffic Simulator came out of a controlled comparison of two agent runs, which has its own case study.",
        ],
      },
    ],
  },
  implementation: {
    before: [
      {
        kind: "prose",
        heading: "Hardening the release path",
        paragraphs: ["Three weaknesses in the original pipeline were found and fixed:"],
      },
      {
        kind: "list",
        items: [
          "Mutable tags: the deploy requested an image by commit, but a host environment file overrode it with :latest, and the old script stopped the stack before pulling. Releases are now digest-pinned and verified, and every check runs before any container is touched.",
          "Unverified host: the deploy's SSH connection did not verify the server's identity. It now trusts only a pinned host key with strict options, and tests check every SSH option set in the repository.",
          "Fork authorization: the deploy job accepted any successful build whose branch was named main, which a fork's pull request could satisfy. It now requires a push to this repository's main.",
        ],
      },
      {
        kind: "prose",
        paragraphs: ["A dependency audit also gates the image build, so a high-severity advisory blocks deployment."],
      },
    ],
  },
};

const themis: NonNullable<CaseStudy["blocks"]> = {
  problem: {
    after: [
      {
        kind: "list",
        items: [
          "A test that never ran, a parser that failed or an unreadable repository can each produce a confident, empty, all-clear report.",
          "A validation describes one version of a project at one time. It is not a permanent blessing.",
          "An agent can write that something was approved. That does not make it so.",
        ],
      },
      {
        kind: "prose",
        heading: "From side projects to an estate",
        paragraphs: [
          "The first workspace was a Claude project in the browser with no repository access: the owner ran commands and pasted their output back. The first standards, register and handoff were committed on 19 August. Within a week the system gained a deterministic reporting pipeline, period-activity reports and a work-control standard. Codex joined Claude as an operator on 23 August. On 15 September the reusable system was separated from the portfolio data it governs. Since late October, the standards have required that changes made on the owner's behalf be delegated by a supervising agent to separate execution agents.",
        ],
      },
    ],
  },
  decisions: {
    after: [
      {
        kind: "list",
        heading: "Where machine enforcement ends",
        items: [
          "Enforced by code: derivation never turns missing evidence into a healthy value. Work-control transitions must be legal, finished tasks are frozen, event histories must replay exactly, and the authoritative records must be committed and never rewritten. Portfolio data is checked against the system revision it pins.",
          "Checked by code, judged by people: a completed task must carry evidence references for every required evidence class. The code checks that they exist, not that they are sufficient.",
          "Defined by the standards, held by the owner: tier, material change, risk acceptance, judgment and authorization belong to the owner. The standards forbid inferring authority from a Git identity, write access or an agent's identity. No tooling yet enforces that for architecture judgments.",
          "Governed through instructions and supervision: the supervisor and executor roles and the rule against self-approval live in the standards, an agent charter and an execution-agent definition. No code stops an agent from breaking them.",
          "Confirmed by independent verification: the supervisor checks a delegated result from the resulting state, such as the diff, the test output or configuration read back from a service, not from the agent's own report.",
          "Specified, not implemented: a protocol for capturing a human decision as an attributable, confirmed record exists only as a standard. Today, decisions attributed to the owner appear in agent-written handoffs and in event actor fields that the writing scripts can set themselves. Neither is an attestation.",
        ],
      },
      {
        kind: "prose",
        heading: "Who decided what",
        paragraphs: [
          "Themis was built with AI development tools: Claude, first in a browser project and later through Claude Code, and Codex, which was introduced as an operator in the first week. Agents contributed to investigation, drafting, implementation and verification. The attribution record is incomplete. Many commits carry a Claude co-author trailer and others carry none; a missing trailer is not evidence of who wrote a commit. Codex appears in the records but in no trailer. This study does not apportion the work between people and tools.",
          "The standards reserve judgment and authorization for the owner. The project's records of the owner's decisions, however, were written by agents, and the scripts that write its event histories can set the actor themselves. Those records show what the workflow captured, not an independent record of what the owner decided. This study therefore describes what was built and how it changed, not who approved each step. Closing that gap is the purpose of the unimplemented decision-capture protocol.",
        ],
      },
    ],
  },
  implementation: {
    before: [
      {
        kind: "list",
        heading: "Corrections that tightened the contract",
        items: [
          "Day one: on the first day, a review found that a control with a zero-day validation interval could stay current forever after its code changed. The contract was repaired the same day.",
          "A broken parse read as good news: a roster parser that returned nothing once marked every project as unadmitted and reported the failure as good news. An empty portfolio must now be declared; zero entries without a declaration is an error.",
          "The observation unit's own defects: a review of the observation unit found five evidence defects. A failed Git probe was recorded as uncommitted changes. A run killed by a signal lost its whole record. The service timeout was shorter than the work it supervised. All five were corrected before the first scheduled run.",
          "A test that passed on failure: a test of the work-control gate passed while the gate was rejecting its own arguments, because it only checked that a path appeared in the output. It now parses the result. Separately, a fresh portfolio that has never set up work control now reports “unobserved” instead of failing.",
          "Two gates required, not automated: two project intakes ran the integrity gate without the unit suite, and pinned facts drifted. The standards now require both checks for any governance change, as a written obligation; nothing runs them automatically.",
        ],
      },
    ],
  },
  outcome: {
    after: [
      {
        kind: "list",
        heading: "Known limitations",
        items: [
          "No attested decisions: human decisions are not technically attested. Records of approval are agent-written prose and script-assigned actor fields.",
          "Procedural agent boundaries: the rules for supervisors and execution agents depend on instructions, supervision and verification, not enforcement.",
          "Narrow adoption: work control has been adopted by only a small part of the portfolio.",
          "Reconciliation is off: scheduled reconciliation is inactive, and nothing judges, authorizes or applies changes unattended.",
          "Uncommitted reads: observation can read uncommitted portfolio state; it records the condition but does not prevent it.",
          "No automated two-gate check: the two-gate requirement for governance changes is not automated.",
          "An open correctness defect: activity reporting can group projects whose repository location is unknown as though they shared one repository. The defect was recorded in September 2026 and is still open.",
          "Linux only: scheduled operation needs Linux and systemd; macOS and Windows have not been exercised.",
          "Nothing measured: no reduction in effort, risk or error is measured or claimed.",
          "Not independently reproducible: Themis's source code and underlying operational records are private. Public readers therefore cannot independently reproduce every claim in this case study.",
        ],
      },
      {
        kind: "prose",
        heading: "How strong each claim is",
        paragraphs: [
          "The claims here rest on three kinds of evidence, and they are not equally strong. Implementation claims, such as how derivation treats missing evidence or how work history is replayed, rest on the code and its tests. Policy claims, such as the supervisor and execution-agent rules, rest on written standards: they state what should happen, not that it always does. Operational claims, such as daily observation and delegated work, rest on the system's own run records, on agent-written handoffs and on the owner's account. Where a claim depends on policy or on agent-written records, the study says so.",
        ],
      },
    ],
  },
};

export const caseStudyBlocksBySlug: Record<string, CaseStudy["blocks"]> = {
  "personal-website": personalWebsite,
  themis,
  "where-the-specification-lived": whereTheSpecificationLived,
};
