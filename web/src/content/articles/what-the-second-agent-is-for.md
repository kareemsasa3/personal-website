---
slug: what-the-second-agent-is-for
title: What the Second Agent Is For
subtitle: Multi-agent work is being named by headcount. The distinctions that matter are relations.
kind: essay
published: 2026-09-28
description: >-
  “Multi-agent” now names incompatible working arrangements. What matters is
  how agents are related, not how many of them are running.
---

# What the Second Agent Is For

### Multi-agent work is being named by headcount. The distinctions that matter are relations.

---

The phrase is doing too much work.

Ask someone how they are using agents now and you will hear, often in the same week, that they have a multi-agent workflow. Sometimes that means several processes inspecting different parts of one repository so a shared picture comes together faster. Sometimes it means two sessions that never speak, pointed at unrelated projects, while a person hops between them. Sometimes it means one session that implements a change and another, in the same working tree, whose job is not to finish the change but to distrust it.

Those are not three intensities of the same method. They are different answers to a set of older questions: who shares a goal, who shares a workspace, who may act, who may only look, who has to agree before the world changes, and who is allowed to stop the others. The current habit is to skip those questions and report the headcount.

This essay is about that habit, and about what becomes visible if you drop it. The claim I want to test is not that organizations of machines have arrived. It is narrower. “Multi-agent” has become a bag. What distinguishes one working arrangement from another is not how many agents are present. It is the coordination architecture: the designed relations among goals, context, authority, evidence, and the right to halt. Cheap autonomous actors make those relations inexpensive to stand up. They do not make them sound.

“Architecture” here is ordinary systems language, not a term of art, and the underlying point is not new. In 2004, Bryan Horling and Victor Lesser surveyed the ways multi-agent systems can be organized — hierarchies, teams, federations, markets — and treated the choice as a variable that changes performance. What is new is the price. One operator can now stand up in an afternoon arrangements that used to require a second salary, and the results mostly go by one name.

## Several systems, one slogan

In the older research sense, a multi-agent system is not “more than one program running.” Michael Wooldridge and Nicholas Jennings’s account centers on interaction: autonomous agents that coordinate, compete, negotiate, or jointly commit. Two workers that never share a message, a workspace, or a goal are not that object. They are two single-agent systems and a person with a calendar.

Product copy does not keep the distinction. The same word covers an orchestrator that spawns researchers, a prompted cast of specialists, a debate loop, a generator watched by a judge, and a user who opened a second terminal. Recent surveys of language-model agents pull apart what the product pages flatten — cooperative versus competitive goals, flat versus hierarchical authority, shared versus isolated context — but the everyday word has not followed them.

The flattening would be harmless if it were only marketing. It is not. If you describe an arrangement by counting sessions, you cannot tell whether you bought parallelism, coverage, a second opinion, or a second way to be wrong in the same direction. Nor can you tell whether the human is decomposing one problem, managing a portfolio, or sitting as the court of appeal between an implementer and a critic. Those are different jobs. “Using multiple agents” hides which one you have.

The three opening scenes are examples, not a taxonomy, but they show the problem. Parallel inspection of one system is close to what the research field meant: a shared objective, a shared artifact, work that has to be integrated. Two sessions on unrelated repositories, unaware of each other, are usually not a multi-agent system at all; the coordination layer is the operator. An implementer paired with a watcher is something else again — not more workers on the same task, not two jobs open at once, but a split between action and appraisal.

I have used the last two. One session can be reconciling a workstation record while another revises a separate standard for what a portfolio of projects may claim. The projects matter locally and not here. Sometimes the agents are teammates. Sometimes they are employees in different buildings. Sometimes one of them exists to make the other uncomfortable. A vocabulary that cannot tell those apart is not a vocabulary for design.

## Old structures, cheaper actors

None of these relations were invented for language models.

Aerospace pays a second, institutionally separate team to check software it did not write, and calls it independent verification and validation; NASA requires it on its highest-risk software, and cost has always been the argument against using it everywhere. Payment controls often require two signatures, a control that fails in obvious ways: if both signers share a password, there was only one person, and if the second never reads the document, there was only a ceremony. Thomas Sheridan’s supervisory control describes a human who sets a process running, then plans, monitors, and intervenes while the machine closes the inner loop.

The precedent that matters most for what follows is less comfortable. When several programs are written from one specification and a voter compares their outputs, software engineers call it N-version programming. The hope was statistical: versions developed independently would fail independently, so majority agreement would be safer than any single version. In 1986, John Knight and Nancy Leveson tested the hope — twenty-seven versions, a million tests. Individually, the programs were very reliable. Together, they failed on the same inputs more often than the independence model allowed. Later analysis of the faults pointed to one reason. Some parts of a problem are simply hard, and different people, given the same hard place, make mistakes that coincide even when their written logic looks different. A 2026 preprint that ran a related protocol with coding agents reports the same shape: substantial common-mode failure, and some benefit from voting anyway, less than independence would have promised.

Independence, in other words, was not something the experiment could arrange by seating the programmers apart. It had to be measured, and it came up short.

Language-model systems have rediscovered these shapes and given them product names: orchestrator and workers, planner and executor, generator and critic, debate, crews. Anthropic’s writeup of its parallel research agents is explicit about why its shape helps: some questions are too large for one context window and split cleanly. That is a coverage argument, and a good one for that class of work. It is not an argument that a second agent is a second mind.

What changed is the price of standing a shape up. A resident reviewer, a second implementer, a watcher who reads along all afternoon — each used to be a staffing decision, and in most software the watcher was correctly judged a waste. Tokens are not free and integration is not free, but the marginal cost of another actor has fallen far enough that I now run role-split arrangements on tasks that would never have justified a second person, and current tools offer reviewer and sub-agent roles as built-in features. That is the interesting economic change, and the easiest to overstate. I have not found a clean measurement of how often the cheap second actor catches errors a careful single actor would have missed, on work of comparable difficulty, net of the extra coordination. That continuous machine oversight is now “worth it” in general is a hypothesis with a plausible cost story and a thin reliability story.

Cheap actors change which old architectures get used on ordinary days. They do not supply what made those architectures worth their cost, which was never the second body. It was the separation.

## The second agent is not automatically a check

The arrangement that most needs skepticism is the one that looks like the obvious answer to model error: let one agent do the work, and let another watch.

On paper this is IV&V with the budget constraint relaxed. In practice it is easy to build a pair that shares a model family, a prompt dialect, a view of the working tree, and an incentive to be helpful. That is two signers with one password. Each overlap is a way to produce agreement that carries little information.

Same-family evaluation is already a known measurement problem. The 2023 study that made “LLM as a judge” look viable also documented its distortions: position bias, verbosity bias, and a tendency for models to favor their own answers. Later survey work treats “do not let a model grade its own output” as ordinary hygiene. A watcher built on the implementer’s weights is close to that setup, however stern its system prompt. Sternness is not a different training distribution.

Shared context is a quieter leak. A watcher handed the implementer’s plan, rationale, and play-by-play is not inspecting the artifact. It is editing a narrative. Human reviewers know the difference between reading a diff and reading the author’s account of the diff. Agent watchers are often fed the account, because it is sitting in the transcript and it looks like context. It is context for coordination and contamination for independence.

Shared difficulty does the rest. Knight and Leveson’s hard regions have a prompt-shaped cousin: the ambiguous request, the missing constraint, the specification that never said what to do with the ugly case. A second instance reading the same prompt meets the same fog. Two instances may meet it more alike than two people would, since they draw on overlapping pretraining and the same defaults — plausible, and as far as I know unmeasured.

A 2025 study of failing multi-agent runs by Berkeley researchers, MAST, is useful here for a mundane reason. Its annotators sorted fourteen failure modes into three categories: specification and system design, misalignment between agents, and task verification and termination. That last category includes runs that ended before the work was done and runs whose checking was incomplete or absent. A category like that is a reminder that a role name is not an activity. The lesson is not that multi-agent systems cannot work. It is that naming a second role is different design work from giving that role different evidence, different permissions, and a way to block completion.

If a monitor is going to be more than a courtesy copy, the relationship has to be built to produce disagreement.

The precedents suggest levers, not guarantees. Different weights should help, though the evidence I found does not say how different is different enough; Knight and Leveson’s separate teams, working from one specification, were not different enough. Different inputs: the monitor sees the artifact, the tests, the logs, the spec, and as little of the implementer’s self-explanation as the job allows. Different objectives: “finish the task” and “find a reason this is not done” are not one objective in two tones. Different permissions: a watcher that can rewrite the branch is a second implementer; a watcher that can only write a dissent and freeze a merge is a watcher. Different stopping rules: if agreement is what lets the work land, both parties are paid, in whatever coin the prompt uses, to agree.

Even then, independence is an empirical outcome. You learn whether you have it by watching the pair fail on different cases, not by reading the org chart.

Some jobs ask the second agent for something else entirely, and those are less confused. Parallel search over disjoint sources is coverage. Partitioning a large inspection so each slice has a reader is throughput. Running the same suite twice to shake out nondeterminism is repetition. None of those needs a story about epistemic diversity. Each needs an honest account of what the extra compute bought. The confusion starts when repetition is sold as review.

## Coordination is a cost, not a gift of extra heads

Fred Brooks’s observation about late software projects is usually quoted as a warning about people, but its arithmetic does not care who the workers are. If every piece of work must be aligned with every other, the channels grow as n(n−1)/2. Adding capacity adds conversation, and conversation in these systems is context: extra prompt, extra summary, extra chance to drop a constraint on the floor.

That is why “more agents” has no single effect.

Give several agents disjoint read-only slices of a large question and a way to return sources rather than a shared draft, and you may buy wall-clock time; Anthropic’s research writeup is about that shape. Give them one working tree and the right to edit it, and you have bought a merge problem. Give them a fully connected discussion and a vague mandate, and you have bought a meeting. Give a single operator five unrelated sessions and no shared state among them, and you have bought multiplexing — more projects in motion — until the operator’s attention becomes the constraint that was always going to reappear.

The isolated portfolio is the case current multi-agent talk is least prepared for, because it barely is multi-agent. The agents do not coordinate; the human does. That can be the right architecture. Two standards documents that must not silently borrow each other’s assumptions should not share a context window. Sometimes the firewall is the design. The price is paid in the operator: priority, interruption, the discipline of not pasting one project’s conclusions into the other. Opening a second session does not remove that price. It only removes the need to hire someone for the other chair.

Connected arrangements pay the opposite price. Every handoff is a place to lose the spec, and MAST’s inter-agent misalignment category is what that loss looks like from inside a trace. Hierarchical orchestrators reduce some of the pairwise chaos by restoring a boss, at the cost of a single point that can mis-delegate. No topology is free. The mistake is counting actors as if the tax were zero.

## Relations, not types

I do not want a list of official species. The industry will produce a new named pattern every quarter, and many of them will be recombinations of a small number of relations. Those relations are the architecture.

Do the actors share a goal, or only a machine? A shared goal makes them a team and makes integration part of the work. Independent goals make them a portfolio and make the operator the only one who can see collisions.

Do they share context? Shared context is how teammates stay aligned and how reviewers get captured. Isolated context is how you protect a check, and how you guarantee that someone — usually the human — will have to reconcile two incomplete pictures.

Who may change the artifact, and who may only describe it? Action without observation is how work happens. Observation with the power to halt is how work is refused. Observation without that power is advice. Advice is easy to ignore, which is sometimes fine and sometimes the way a monitor becomes décor.

What counts as evidence? If the only evidence a checker receives is the worker’s summary, you have built a press office. If the checker can run the tests and read the diff, you have built a review. If two implementers vote without a shared oracle, you have built consensus, which is a social fact, not a measurement.

Who can stop completion? Authority is the relation most diagrams leave unlabeled. A critic that cannot block a merge is not in the path. A worker that can dismiss the critic is the organization, and the critic is a comment thread.

Who coordinates — the agents, an orchestrator agent, or the human? This decides whether you are looking at a multi-agent system in the older sense, a hierarchy, or a person running several tools. It also decides where failure tends to show up. Agent-to-agent coordination fails as dropped messages and polite loops. Human-mediated coordination fails as overload and crossed assumptions. Orchestrator coordination fails as a bad decomposition delivered confidently to everyone beneath it.

These questions are not a framework with validation studies behind them. They are a way to stop treating a process count as a description. If two arrangements answer them differently, they are not the same arrangement at a different volume.

## What this asks of the person who sets the arrangement up

Different answers imply different human work. That is a consequence, not a separate theory of the future of the profession.

If the agents share a problem, the human has to cut it in a way that can be rejoined, and has to notice when a locally complete slice is globally wrong. If the agents share nothing, the human is doing portfolio management: attention, sequencing, the refusal to launder conclusions across a wall that exists for a reason. If one agent acts and another appraises, the human’s job is to define the relationship before the first token — permissions, evidence, what a dissent means — and to remain available when the pair disagrees, including when they agree too quickly.

In each case the scarce act is deciding what the relations are. Prompting a single capable model is still part of the work. Once more than one actor can be aimed at the same afternoon, it is no longer a complete description of the work.

This does not relieve the operator of responsibility for the result, and it does not turn “the agents reviewed each other” into a governance story. Two similar models in a room can notarize as efficiently as a tired human clicking approve. The point of drawing the relations in the open is to make that outcome harder to mistake for a check.

## What remains unmeasured

A second session is cheap. A second independent look is not automatically what you bought.

I have not found anything that deserves to be called measurement of how often a continuously running observer agent improves outcomes over a single agent plus later human review. Nor have I seen settled how much model diversity it takes to break the Knight–Leveson pattern, or whether diversity of tools and tests matters more than diversity of weights, or where the coordination tax overtakes the parallelism gain for editing work as opposed to gathering work. The failure taxonomies are recent. The product names are ahead of them.

The honest position is smaller than the slogans. Agent count is a weak variable; the relations among agents are a better one. Cheap actors make it tempting to use relations we once reserved for expensive work, and the temptation is rational. The risk is specific: that we take agreement among cheap, similar watchers for the thing those expensive arrangements were built to produce — two looks that can fail in different places.

So before adding another session, the question is not whether more agents would help. It is four smaller ones: what this one shares with the others, what it must not share, what it may do, and what happens when it disagrees. Answer them and you have described an architecture, at any headcount. Leave them unanswered and you have a count, and a phrase that makes the pile sound like a design. If the new agent was meant as a check, the count cannot tell you the one thing you added it to learn: whether it will be wrong somewhere the first one is not.

---

## Post-article material

### Abstract

“Multi-agent” is now used for several incompatible working arrangements: cooperating agents on one artifact, isolated agents on unrelated work coordinated only by a person, and executor/observer pairs. Classical multi-agent systems research treated interaction and organizational design as the subject; much current usage treats session count as the subject. This essay argues that the better description is coordination architecture — the relations among goals, context, authority, evidence, and halt rights. The structures involved are old (supervisory control, IV&V, code review, separation of duties, N-version programming). What has changed is the cost of instantiating them with autonomous actors, including on work that would never have paid for a second human. That cost change does not establish a reliability gain. Shared models, shared context, shared specification difficulty, and named verification failures in current multi-agent traces all undermine the assumption that a second agent is an independent check. Increasing agent count can buy time, coverage, complexity, or false assurance, depending on topology. The human role is a consequence of the relations chosen, not a separate slogan.

### Sources

Inspection scope: sources identified during drafting research, with URLs as recorded in `docs/articles/coordination-architecture.drafting-notes.md`. Publication dates checked against the cited records where practical. Vendor material is used only as evidence of usage, not as theoretical authority.

| Source | Record | Locator |
|---|---|---|
| Wooldridge, M. and Jennings, N. R., “A Roadmap of Agent Research and Development” | *Autonomous Agents and Multi-Agent Systems* 1: 7–38, 1998 | https://www.cs.ox.ac.uk/people/michael.wooldridge/pubs/jaamas98.pdf |
| Horling, B. and Lesser, V., “A survey of multi-agent organizational paradigms” | *Knowledge Engineering Review* 19(4): 281–316, 2004 | https://doi.org/10.1017/S0269888905000317 |
| Knight, J. C. and Leveson, N. G., “An Experimental Evaluation of the Assumption of Independence in Multiversion Programming” | *IEEE Transactions on Software Engineering* 12(1): 96–109, 1986 | https://doi.org/10.1109/TSE.1986.6312924 |
| Brilliant, S. S., Knight, J. C., and Leveson, N. G., “Analysis of Faults in an N-Version Software Experiment” | *IEEE TSE* 16(2): 238–247, 1990 | https://doi.org/10.1109/32.44387 |
| Du, Y. et al., “Improving Factuality and Reasoning in Language Models through Multiagent Debate” | arXiv:2305.14325, 2023 | https://arxiv.org/abs/2305.14325 |
| Zheng, L. et al., “Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena” | arXiv:2306.05685, 2023 | https://arxiv.org/abs/2306.05685 |
| Guo, T. et al., “Large Language Model based Multi-Agents: A Survey of Progress and Challenges” | arXiv:2402.01680, 2024 | https://arxiv.org/abs/2402.01680 |
| Cemri, M. et al., “Why Do Multi-Agent LLM Systems Fail?” | arXiv:2503.13657, 2025 | https://arxiv.org/abs/2503.13657 |
| Moore, D. J., “A Taxonomy of Hierarchical Multi-Agent Systems” | arXiv:2508.12683, 2025 | https://arxiv.org/abs/2508.12683 |
| Anthropic, “How we built our multi-agent research system” | Engineering blog, 13 June 2025 | https://www.anthropic.com/engineering/multi-agent-research-system |
| NASA SWE-141, Software Independent Verification and Validation | NASA Software Engineering Handbook | https://swehb.nasa.gov/display/SWEHBVB/SWE-141+-+Software+Independent+Verification+and+Validation |
| Sheridan, T. B., supervisory control of automation | HFES / Wiley treatments of humans and automation | Handbook chapter record: https://onlinelibrary.wiley.com/doi/10.1002/9781119636113.ch28 |
| Brooks, F. P., *The Mythical Man-Month* | Addison-Wesley, 1975 | Book record; n(n−1)/2 communication remark |
| “N-Version Programming with Coding Agents” | arXiv:2606.20158, 2026 | https://arxiv.org/html/2606.20158 |
| LLM-as-a-Judge survey (bias / same-model hygiene) | arXiv:2411.15594 | https://arxiv.org/abs/2411.15594 |

### Fact-check table

| Claim (section) | Source | Status | Caveat |
|---|---|---|---|
| Classical MAS definitions center on situated autonomous agents and interaction | Wooldridge & Jennings 1998 | VERIFIED against source abstract and definitional section | Paraphrase, not a quotation of their full agent definition |
| Isolated non-interacting workers are not a MAS in the classical sense | Inference from the same definition | INFERENCE | Terminology position of this essay |
| Horling & Lesser treat organizational design as a performance-relevant choice and survey multiple paradigms | Horling & Lesser 2004 abstract | VERIFIED | Essay does not reproduce their full typology |
| Vendor/tooling usage of “multi-agent” spans orchestrator-worker, role crews, debate, and extra sessions | Anthropic 2025; Guo et al. 2024; public framework docs as usage evidence | QUALIFIED | Documented as a usage pattern, not a complete market survey |
| Knight & Leveson 1986: 27 versions, coincident failures above independence | Knight & Leveson 1986 abstract | VERIFIED | Exact test-count phrasing follows the paper’s abstract |
| Hard regions of a spec produce related mistakes across versions | Brilliant, Knight, Leveson 1990 abstract | VERIFIED | Mechanism summarized; no claim that all correlated faults have one cause |
| Agent-written N-version work again finds common-mode failure plus partial voting benefit | arXiv:2606.20158 | QUALIFIED | Preprint; used only as a recent echo, not as a settled replication canon |
| NASA uses IV&V where software risk is high; independence is part of the rationale | SWE-141 | VERIFIED | Cost/ROI figures intentionally kept qualitative; studies disagree |
| Sheridan’s supervisor plans, monitors, and intervenes while the machine closes the inner loop | Sheridan handbook / humans-and-automation treatments | QUALIFIED | Abbreviated from fuller function lists, which vary slightly across his writings (five vs six items) |
| LLM-as-judge work documents self-enhancement, position, verbosity biases | Zheng et al. 2023 | VERIFIED | Agreement-with-human figures exist and are not used here as a reliability proof for agent monitors |
| Advice against same-model evaluators appears in later surveys | arXiv:2411.15594 | QUALIFIED | Hygiene recommendation, not a theorem |
| MAST: 14 modes, three categories including verification; high failure rates on studied traces | Cemri et al. 2025; project page | QUALIFIED | Rates are for their framework/task sample, not all production agent use |
| Anthropic research system uses orchestrator-worker and argues from parallel coverage / context limits | Anthropic 2025 | VERIFIED against the engineering post | Company writeup, not an independent eval |
| Brooks: communication channels grow as n(n−1)/2 | *Mythical Man-Month* | VERIFIED as the standard statement of the argument | Applies to agents by analogy; no agent-specific production function is claimed |
| Cheap second agents make continuous oversight newly affordable | Economic inference | INFERENCE | Cost direction is clear; “worth it” is not established |
| A monitor with the same model, context, and incentives is not independent | Synthesis of Knight–Leveson, judge-bias, MAST | INFERENCE | Central caution of the essay |
| Anastasis/Themis used only as unnamed-optional illustration of isolated concurrent work | Prior published essays in this site’s Agent Systems sequence | QUALIFIED | No new project facts introduced |

### Editorial note: original synthesis

**Established work, not claimed as new.** Multi-agent organizational paradigms (Horling & Lesser). Agent definitions (Wooldridge & Jennings). Supervisory control (Sheridan). IV&V as rationed independent review (NASA and earlier software-assurance practice). N-version programming and the failure of the independence assumption (Knight, Leveson, Brilliant). Separation of duties. Brooks on coordination cost. LLM-MAS surveys and taxonomies (Guo et al.; Moore; later orchestration surveys). Debate and critic patterns (Du et al.). LLM-as-judge biases (Zheng et al.). MAST failure modes (Cemri et al.). Orchestrator-worker as a current product pattern (Anthropic and others).

**This draft’s synthesis.** The claim that contemporary “multi-agent” talk is now too coarse to describe work; the insistence that human-mediated isolated sessions are usually *not* multi-agent systems; the use of “coordination architecture” as an organizing phrase for relations of goal, context, authority, evidence, and halt rights; the economic hypothesis that cheap actors change the *frequency* of old role-split arrangements rather than inventing them; and the argument that fake independence is the distinctive risk of the cheap monitor.

**Narrowed after research.** The supplied cooperative / portfolio / supervisory triad is not defended as a taxonomy. The original slogan that cheap continuous oversight is newly practical is kept as a cost hypothesis and not as a demonstrated reliability improvement. Principal–agent theory, blackboard systems, and actor-model history were researched and mostly left out so they did not become decoration.

**Limits.** No new experiment. No ablation of observer agents against human review. Personal project names are illustrative only and the argument is written to survive their removal. Several 2025–2026 papers cited are preprints or engineering blogs.
