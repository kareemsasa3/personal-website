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
          "The live Traffic Simulator is a reviewed derivative of the Simple artifact, not an untouched copy. The experimental commit 7420cc7 is preserved in the site's history, and each change below is a separate commit on top of it.",
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

export const caseStudyBlocksBySlug: Record<string, CaseStudy["blocks"]> = {
  "where-the-specification-lived": whereTheSpecificationLived,
};
