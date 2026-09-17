---
slug: the-work-the-agent-stopped-doing
title: The Work the Agent Stopped Doing
subtitle: After durable system structure takes over reconstruction, agent work moves toward judgment
kind: essay
published: 2026-09-17
description: >-
  How durable records of authority, intent, disposition, and provenance shift
  agent work from reconstructing decisions toward judgment.
series:
  name: Agent Systems
  part: 2
---

# The Work the Agent Stopped Doing

### After durable system structure takes over reconstruction, agent work moves toward judgment

---

I recently said to an AI collaborator, roughly:

> Setting up the Anastasis and Themis repositories feels like it has been replacing some of the heavy lifting you used to have to do—or infer answers to.

For months I had been using agents to help operate a workstation and a portfolio of projects. A substantial part of each new conversation used to be reconstruction: which source was authoritative, why a configuration existed, whether an odd state was intentional, what work was actually active. As more of those answers became explicit, I noticed a change.

The agent was doing less archaeology.

That was my experience of the collaboration, not a measured reduction in tokens or reasoning time. I was spending less of the conversation helping it recover decisions we had already made. But the change was not simply a consequence of writing more down. At one point, writing more down made the problem worse.

In [The Machine Should Explain Itself](/writing/the-machine-should-explain-itself), I argued that important operational state should be recoverable from durable, inspectable artifacts rather than private conversational memory. This essay starts after that advice has been taken.

Anastasis is the Git repository that holds my workstation's configuration and operational knowledge: how the machine is set up, how it is backed up, and what has been found wrong with it. Its README puts the ownership boundary plainly:

> Anastasis is the machine; Erebus is software running on the machine.

Erebus is one of the applications hosted there. The general rule is that configuration belongs to the component that owns its meaning. Installing an application's service on the workstation does not make that application's semantics the workstation repository's responsibility.

Themis, the other repository in that remark, governs what a portfolio of projects can justifiably claim about itself. It is not part of this story. The episode that made the limits of externalization clear came from Anastasis.

## When the record started assigning work

The machine audits had earned their place. They found backups that had never been proven restorable, SSH identities selected incorrectly despite apparently successful operations, and a silent skip path in synchronization of the boot partition. These were material defects. Recording them made it possible to investigate, fix, and verify them instead of relying on reassurance.

The recording mechanism kept going. Every finding received a numbered backlog ID. Resolved items accumulated beside unresolved ones. A cosmetic observation and a demonstrated backup defect went through the same instrument, whether or not anyone had decided to act on them.

The reference document preserved information, but determining what it asked us to do became harder. Was an entry evidence of something once noticed, a decision to fix it, or unfinished work that belonged somewhere else? The number made those distinctions look settled when they were not.

The growing finding count had started to look like progress. It was not. It was inventory.

An ID is not a promise. But the old recording convention had made it function like one. The conversion record describes the result directly: severity and intent-to-fix had become the same axis. Noticing a problem gave it a permanent place in the backlog without a separate decision about whether it deserved remediation.

On September 17, 2026, Anastasis adopted a different maintenance regime. A numbered item now means an explicit commitment: the workstation repository owns the matter, observed state diverges from stated intent, and a decision to fix it has been taken. Other findings remain dated observations in the section that owns their subject. They can matter without becoming work.

The distinction had to survive the existing backlog. A one-time pass through the twelve open second-tier findings produced **four promotions to commitments, six demotions to observations, and two transfers to the repositories that owned them**.

Two dispositions explain the change better than the count.

**The dump pruner stayed work.** A script pruned local database dumps by age, without checking that a newer dump had arrived to replace what it deleted. When the process producing new dumps lapsed for about a week, the pruner kept running, and one service's local dump shelf emptied. Separate backup archives still held the data, so this was not total loss, but it was an observed failure in the backup path. A second-tier severity label did not make it optional. The conversion preserved it as an explicit commitment to change the behavior.

**The non-executable script became an observation.** A maintenance script in the operator's personal bin directory carried a shebang line but had never been marked executable, so it ran only when passed to the shell by hand. The record described that mode and its history. What it did not establish was intent: nothing showed whether the script had been meant to run as a command or deliberately left as it was, so the record justified neither calling it defective nor calling it intentional. Demotion preserved what was known without inventing an answer to make the entry feel complete.

One case preserved a decision. The other preserved the absence of one.

The transfers enforced the ownership boundary. A camera service and its access-configuration issue belonged with the application that defined their semantics. Its presence on the workstation did not make the workstation repository the place to fix it.

What remained was a short list: the one existing top-priority recovery commitment and the four second-tier items that had survived. Retired IDs stayed explainable through a frozen conversion record. Current authority lived in the reference document's maintenance regime and commitments sections, not in that history.

The correction also changed what a review was for. Two recovery matrices—one for device loss, one for losing the machine and its nearby backup together—made the remaining exposure visible. They were a better guide to recovery work than the number of findings closed. The dominant open commitment was unchanged: the machine's only backup repository sat in the same room as the machine. Reclassifying the backlog did not improve a single row's actual recoverability.

Baseline review became bounded and semiannual, covering those matrices, current commitments, and recorded unknowns. If neither the residual-risk picture nor the commitment set changed, a dated “no material change” entry was a successful result. Checks triggered by risky changes belonged in the relevant procedure: boot-path verification alongside boot-affecting updates, for example. That is a procedure an operator must follow, not a claim that writing it down enforces it automatically.

The conversion was documentation-only. It fixed no commitment and deployed nothing. What it changed was the meaning and location of the work record. A future operator can recover the dispositions without repeating the conversion.

I mention that as a person who has watched a knowledge system start generating work for itself. The problem was not that we had failed to externalize knowledge. We had externalized it with rules that made every new observation harder to put down.

## What retrieval cannot decide for you

Imagine giving an agent every paragraph of the old backlog. Retrieval has succeeded. The agent still has to work out which numbered entries represent accepted work. More material may help explain how an item arrived there; it cannot substitute for a remediation decision that was never made.

After the conversion, the same question has a recorded answer. For the dump pruner, fixing the behavior is chosen work. For the non-executable script, no intent is asserted in either direction. The agent must understand those statements and check whether later evidence changes them. It need not infer the dispositions from severity labels, file modes, and conversational history.

This is the distinction I care about: bringing additional material into reasoning, and making important relationships explicit before that reasoning begins. Authority, ownership, intent, and disposition are relationships among facts. An accurate description of a file does not necessarily tell you who owns it, whether its contents express current intent, or whether someone has committed to changing it.

I use **inference burden** for the operational state a reader has to reconstruct indirectly because no authoritative artifact states it. The phrase is borrowed, and it names a kind of work, not a quantity.

These mechanisms can operate together. A retrieval system can return an authoritative decision instead of raw history. A memory system can preserve a conclusion already worked out. Context engineering can improve tool design, persistent state, and the clarity of instructions as well as select material for the next model call. None of those architectures is confined to delivering more text. The question is what the text and tools leave the agent to figure out. [RAG](https://arxiv.org/abs/2005.11401), [MemGPT](https://arxiv.org/html/2310.08560), and the practitioner accounts from [Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) and [LangChain](https://www.langchain.com/blog/context-engineering-for-agents) describe overlapping ways to support that work.

There is also a difference between recovering a decision and making one. The conversion did both. Some earlier reasoning could be retained; other items needed adjudication under the new rule. The durable record makes that distinction inspectable. It does not turn the outcome into a fact that was waiting in the files all along.

## This work has precedents

None of this is a new theory of how people or machines think. The useful ideas already have homes.

Hutchins's distributed cognition is the broadest. His study of naval navigation treats the team and its instruments as one cognitive system, rather than crediting everything accomplished to individual navigators. Here the unit includes the human operator, the agent, the repositories, the machine, and the procedures connecting them. The person who makes and authorizes decisions belongs in that picture as much as the artifact that preserves them. [Hutchins, 1995](https://pages.ucsd.edu/~ehutchins/citw.html); [Hutchins, 2014](https://pages.ucsd.edu/~ehutchins/documents/publishedCulturalEcosystemHumanCog.pdf)

Kirsh is the closer antecedent for the mechanism. In *Thinking with External Representations*, he asks why people draw, mark, rearrange, and annotate even when the environment supplies no information they could not in principle infer already. A different representation changes the work needed to reach a conclusion. Making a relationship explicit can make it easier to use. That is what the conversion did to the backlog. [Kirsh, 2010](https://link.springer.com/article/10.1007/s00146-010-0272-8)

AI memory research draws the same line. PREMem performs synthesis and establishes relationships while memory is being constructed, so later responses need less reconstruction across conversations, and its authors separate successful retrieval from the reasoning that remains afterward. What this essay adds is narrower: which operational conclusions are authorized, how they stay current, and when leaving a question unresolved is the correct result. [Kim et al., 2025](https://aclanthology.org/2025.findings-emnlp.1204/)

None of this requires arguing that a repository is literally part of a model's mind. Clark and Chalmers make that stronger, constitutive argument about external resources under particular coupling conditions. This case neither establishes those conditions nor needs them. We can ask who performs the work without settling the boundaries of mind. [Clark and Chalmers, 1998](https://consc.net/papers/extended.html)

## What the record still owes its reader

The new model did not remove the work of deciding what mattered. Someone had to inspect evidence, establish ownership, separate intent from observation, and choose dispositions. Someone must maintain those decisions when the world changes. Some work was done earlier so it need not be repeated at every point of use. I have not measured whether the total fell.

The resulting record is useful only if it lets the next reader distinguish a reusable conclusion from a question that needs reopening.

Provenance helps with that. A dated observation, an operator's statement of intent, and an inference from logs offer different grounds for action. Recording their basis saves the reader from first reconstructing where each claim came from. It does not establish trust by declaration. A date can be old, an attribution wrong, or the evidence narrower than the conclusion. The agent still has to evaluate the claim and reconcile it with relevant live evidence.

The non-executable script makes the point especially clearly. Explicit uncertainty is useful state. A sufficiently capable model might propose explanations for the script's mode, but capability does not confer authority to select one as the operator's intent. Guessing can be impressive. It is still guessing.

The missing second backup copy presents a different remaining task. Recording the dominant recovery exposure does not decide which offsite design best fits cost, privacy, bandwidth, and recovery needs. Those tradeoffs were not settled by the conversion. The next conversation can begin from the recorded exposure and work on the open choice.

Even the authority of a record is bounded. A historical conversion explains why an ID disappeared; it does not override a later commitment. An application-owned finding remains that application's to resolve. Permission to read the repository does not grant permission to change the live machine. These boundaries determine what an agent can conclude or do from the information it finds.

This is where the original promise of external memory needs restraint. A record that answers every question confidently is not necessarily easier to operate from. It may simply have hidden the unanswered ones.

## The next conversation

My qualitative experience was that more of the conversation became available for contradictions, diagnosis, and open choices once settled decisions were easier to recover. The conversion supplies a concrete reason to expect less repeated reconstruction: current dispositions no longer have to be inferred from the existence of old findings. It does not prove a general performance gain, and it does not tell us how much improvement came from the model, retrieval, or the surrounding process.

Agent-evaluation research makes a related point: a benchmark score reflects the tools, scaffold, environment, and scorer around a model as well as the model itself. You want the joint system to work. You should still know which part you improved. [Zhang et al., 2026 preprint](https://arxiv.org/html/2609.09218v1)

The practical benefit is just as relevant to the person opening the runbook at 1 a.m. That person also needs to know which findings are work, which decisions still stand, and which uncertainties were deliberately left open.

Writing knowledge down was the beginning. The harder lesson was deciding what the record should require of its next reader. The dump pruner should not need another conversation about whether anyone intends to fix it. The non-executable script should not acquire an invented intention merely because the next agent dislikes an unanswered question.

The record owes that next operator both things: a decision they do not have to rediscover, and an uncertainty they are not entitled to erase.

---

## Post-article material

### Abstract

This operational sequel to *The Machine Should Explain Itself* examines what happened after workstation knowledge became durable and inspectable. Useful audits produced a backlog whose recording convention conflated findings with obligations. The workstation repository's September 2026 conversion separated observations from explicit commitments, disposed twelve open second-tier findings, and bounded review around residual recovery risk. The case illustrates how authority, intent, disposition, and provenance make some repeated reconstruction unnecessary while preserving questions that were never settled. It also shows how poorly governed externalization can create new interpretive work. Distributed cognition, Kirsh's external-representation research, and PREMem already explain important parts of the mechanism. The contribution is the governed-infrastructure case, supported by inspected records and a qualitative operator account, not a new theory or a measured performance result.

### Sources

Inspection scope matters: a source's presence here does not imply full-text access or experimental reproduction. External links below were inspected during the review. Repository records were inspected locally; locators are provided without publishing private repository URLs. Anastasis facts describe commit `2c73f67` (September 17, 2026), not a fresh live-host audit. Themis facts describe system authority at `ea680ae`, not inspection of a portfolio instance.

| Source | Metadata / inspected access | Link or repository locator | Use and limit |
| --- | --- | --- | --- |
| Anastasis ownership and operating authority | README and agent instructions at `2c73f67` | `README.md`; `AGENTS.md` | Exact ownership quotation, semantic ownership, and inspection/mutation boundary |
| Anastasis current operational model | Reference at `2c73f67`; relevant sections inspected | `anastasis-reference.md`, §§15, 18–20, 28 and remediation commitments | Recovery matrices, uncertainty, verification procedures, maintenance regime, and current commitments |
| Anastasis conversion evidence | Frozen record dated September 17, 2026; preceding backlog also inspected | `docs/migrations/2026-09-17-commitment-model-conversion/README.md` | 4/6/2 disposition, the pruning-script (P2-17) and non-executable-script (P2-11) reasoning, transfers, and documentation-only scope; historical evidence, not current authority |
| Themis governance | Governing standards at `ea680ae`; relevant sections inspected | `docs/governance/PROJECT_REPORTING.md` §2; `PROJECT_WORK_CONTROL.md` §2 | Supports only the body's one-sentence description of Themis's scope; its work-state model is not discussed in the body |
| Hutchins, E. *Cognition in the Wild* | MIT Press, 1995; author's account of the book inspected | [Author's account](https://pages.ucsd.edu/~ehutchins/citw.html) | Navigation team and artifacts as unit of analysis; not full-book inspection |
| Hutchins, E. “The cultural ecosystem of human cognition” | *Philosophical Psychology* 27(1), 2014, pp. 34–49; author-posted paper inspected | [Paper](https://pages.ucsd.edu/~ehutchins/documents/publishedCulturalEcosystemHumanCog.pdf) | Distributed cognition as an analytical perspective |
| Kirsh, D. “Thinking with External Representations” | *AI & Society* 25, 2010, pp. 441–454; publisher full text inspected | [Paper](https://link.springer.com/article/10.1007/s00146-010-0272-8) | Direct conceptual antecedent: representation changes reasoning demands without necessarily adding new information |
| Kim, S., Lee, Y., Kim, S., Kim, H., and Cho, S. PREMem | arXiv submitted September 13, 2025; *Findings of EMNLP 2025*; paper introduction/methods and publication record inspected | [Publication](https://aclanthology.org/2025.findings-emnlp.1204/); [paper text](https://arxiv.org/html/2509.10852v1) | Prior AI treatment of moving synthesis into memory construction; no claim to reproduce its results |
| Clark, A., and Chalmers, D. “The Extended Mind” | *Analysis* 58(1), 1998, pp. 7–19; author text inspected; pagination checked against institutional record | [Author text](https://consc.net/papers/extended.html); [institutional record](https://www.research.ed.ac.uk/en/publications/the-extended-mind/) | Philosophical boundary, not a finding that this case either qualifies or cannot qualify |
| Lewis, P., et al. “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks” | NeurIPS 2020; original abstract inspected | [Paper record](https://arxiv.org/abs/2005.11401) | Retrieval architecture; no inferred restriction on the kinds of records a system may retrieve |
| Packer, C., et al. “MemGPT: Towards LLMs as Operating Systems” | 2023; revised February 12, 2024; paper §§1–2 inspected | [Paper](https://arxiv.org/html/2310.08560) | Persistent memory and context management, including self-directed memory edits |
| Anthropic, “Effective context engineering for AI agents” | Engineering article, September 29, 2025; inspected | [Article](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | This practitioner's treatment of context, tool clarity, external organization, and persistence |
| LangChain, “Context Engineering” | Practitioner article, July 2, 2025; inspected | [Article](https://www.langchain.com/blog/context-engineering-for-agents) | This practitioner's writing, selection, compression, and isolation strategies; not a universal definition |
| Wegner, D. M. “A Computer Network Model of Human Transactive Memory” | *Social Cognition* 13(3), 1995, pp. 319–339; original publisher abstract inspected | [Publisher abstract](https://guilfordjournals.com/doi/abs/10.1521/soco.1995.13.3.319) | Background to the routing analogy in the editorial note; no full-text claim |
| Starace, J. “Scaffold Effects on GAIA: A Controlled Comparison” | arXiv:2606.08529v1, June 7, 2026 preprint; methods, result, and limitations inspected | [Preprint](https://arxiv.org/html/2606.08529v1) | Qualified benchmark context below; omitted from body because the number does not test operational reconstruction |
| Zhang, Y., et al. “The Double Measurement Confound in Agent Benchmarks: De-Scaffolding, Ground-Truth Scoring, and Reliability Beyond the Mean” | arXiv:2609.09218v1, September 6, 2026 preprint; introduction, experimental framing, and audit limits inspected | [Preprint](https://arxiv.org/html/2609.09218v1) | Scores depend on the execution/evaluation system; does not establish this essay's causal interpretation |
| “ReCUT: Balancing Reasoning Length and Accuracy in LLMs via Stepwise Trails and Preference Optimization” | arXiv:2506.10822, 2025; primary research record/abstract inspected | [Paper record](https://arxiv.org/abs/2506.10822) | Existing reasoning-compression usage; supports declining that terminology here |

### Fact-check table

**VERIFIED** means the specific claim is supported by the identified inspected material. **QUALIFIED** marks an interpretation, limited verification, or a result whose experimental scope matters. Neither status means experiments were reproduced. **AUTHOR OBSERVATION** identifies first-person experience without independent measurement.

| Claim | Source / inspection | Status | Qualification |
| --- | --- | --- | --- |
| Anastasis's quoted ownership sentence is verbatim; application semantics are not assigned by installation path | README and `AGENTS.md` | VERIFIED | Machine-specific scope; repository records are not universal enforcement of live state |
| Audits identified unproven restores, incorrect SSH selection, and a silent boot-partition synchronization path | Reference §§15, 19, 20 and resolved-item history | VERIFIED | Historical repository evidence, not a new live-host test; restores were subsequently exercised |
| The old convention numbered findings without a separate intent-to-fix decision | Conversion record and preceding backlog | VERIFIED | The institutional failure is documented; no claim that an agent had no possible response to it |
| Twelve legacy P2 items became 4 commitments, 6 observations, and 2 transfers | Frozen conversion table | VERIFIED | Disposition changed; no fixes were delivered by the conversion |
| The dump pruner (P2-17) deleted by age without checking for a replacement and emptied one service's local dump shelf during a roughly week-long lapse | Reference §15, commitment text, conversion rationale | VERIFIED | Borg archives remained; this was loss of local dump copies, not demonstrated total database loss |
| The non-executable script (P2-11) has a shebang, has been mode `644` since creation, and its record asserts observed mode and history without intent in either direction | Conversion table and reference §18 | VERIFIED | Does not establish that the mode was deliberate or defective |
| Camera service/access semantics were transferred to the application owner | Conversion record and reference §19 | VERIFIED | Ownership disposition, not proof that receiving-repository remediation was completed |
| After the conversion, the open commitments were the existing P1 recovery item plus the four promoted P2 items | Reference commitments at `2c73f67` | VERIFIED | Dated snapshot: P1-5, P2-9, P2-10, P2-12, P2-17 |
| Current authority is distinguished from frozen conversion evidence | Reference §28 and migration README | VERIFIED | Historical material remains useful evidence; not all history was physically removed |
| Review is bounded and semiannual; event-triggered checks belong in relevant procedures | Reference §§20, 28 | VERIFIED | Written operating procedure, not proof of automatic enforcement or future compliance |
| Recovery matrices expose device-loss and site-loss consequences; the only Borg repository being in the same room (P1-5) remains the dominant open recovery commitment | Reference §15 and commitments | VERIFIED | Bounded threat models, not a comprehensive quantitative measure of all workstation risk |
| Themis governs what a portfolio can justifiably claim about its projects, separately from the workstation record | Reporting §2; Work Control §2 | VERIFIED | System authority inspected; no portfolio instance inspected; the body makes no further claim about Themis |
| The agent was doing less archaeology | Author's account of ongoing collaboration | AUTHOR OBSERVATION | No controlled comparison or measured effort reduction |
| Explicit dispositions let later operators recover decisions without repeating the conversion | Structural change plus interpretation of its use | QUALIFIED | The record supplies answers; correct retrieval, interpretation, currency checks, and future compliance remain necessary |
| Distributed cognition permits analysis across people and artifacts | Hutchins author account and cultural-ecosystem paper | VERIFIED | Applying the perspective to this case is the essay's synthesis |
| External representations can change reasoning demands without supplying otherwise unavailable information | Kirsh 2010, especially introduction | VERIFIED | Direct antecedent; not a new discovery or an AI performance result |
| PREMem shifts synthesis into memory construction and distinguishes retrieval from subsequent reasoning | Kim et al. 2025 introduction/methods | VERIFIED | Close prior work on conversational memory; operational governance is this essay's application |
| RAG, memory, and context engineering are not mutually exclusive with explicit state or prior synthesis | Original RAG abstract, MemGPT §§1–2, inspected practitioner articles, PREMem | QUALIFIED | Mechanism-level interpretation; no claim to survey every implementation or define an entire field |
| The extended-mind claim is unnecessary and unestablished here | Clark and Chalmers author text | QUALIFIED | Neither categorical exclusion nor evidence that agent plus Git meets the relevant conditions |
| Transactive memory includes routing knowledge about who knows what | Wegner 1995 publisher abstract | VERIFIED | Limited analogy retained below, not a theory of repositories as teammates |
| Starace reports about 84% versus 56% for Opus 4.7 on a filtered GAIA Level 2 slice | June 2026 preprint §§3, 5–6 | QUALIFIED | Five models, three configurations, three attempts per question; headline slice excludes flagged provider-serialization errors. Baseline contrasts vary tool surface as well as loop structure. Not a scaffold-only causal estimate or a test of repository governance |
| Agent scores depend on model, tools, scaffold, environment, and scorer | Zhang et al. September 2026 preprint, introduction and audit discussion | VERIFIED | A supported characterization of evaluation; the paper's interventions and scorer defects are benchmark-specific, and it does not validate this workstation case |
| “Inference burden” is existing language used locally here | PREMem title and argument | VERIFIED | No coinage, priority, validated metric, or standard definition claimed |
| “Reasoning compression” already names other ML work | ReCUT primary abstract | VERIFIED | Terminology declined; no exhaustive account of its uses claimed |

### Editorial note: original synthesis

**What belongs to prior work.** Distributed cognition supplies the broad analytical perspective. Kirsh directly addresses how external representations alter the work of reasoning, even without new information. PREMem explicitly moves synthesis into memory construction for later reuse. The distinction between retrieving material and reducing subsequent reconstruction is therefore an organizing distinction here, not a claimed discovery.

**What this essay contributes.** The contribution is a governed-infrastructure case: explicit authority, intent, dispositions, and provenance made particular decisions recoverable, while the preceding recording convention had conflated observations with obligations. The contrast between the dump pruner (P2-17) and the non-executable script (P2-11) shows why recording a decision and preserving uncertainty are both useful outcomes. The proposed consequence—less repeated operational reconstruction—is an interpretation supported by the representation change and the author's experience, not a quantified causal finding.

**Terminology and analogies.** “Inference burden” is an existing phrase given a local operational meaning. “Cognitive work migration” describes work moving into authoring, adjudication, maintenance, and validation; it is not a proposed theory. Repository ownership has a limited analogy to Wegner's routing knowledge about who knows what. Observation versus commitment is Anastasis's operational distinction. Historical evidence versus current authority is a separate distinction that applies to records of either; these are not three mutually exclusive classes. Themis is named only to gloss the opening remark; its own work-state model is out of scope here. “Reasoning compression” was rejected as terminology because existing ML work uses it for a different problem.

**Corrections made after review.** The first draft overstated novelty and separated RAG, memory, and context engineering too sharply from environment design. Kirsh and PREMem narrowed those claims. The revision also replaces a generalized repository quotation with the actual sentence, removes an unsupported hostname-transfer example, separates Themis standards from instance evidence, and distinguishes provenance from trustworthiness. It withdraws the categorical extended-mind rejection and corrects the benchmark account: Starace's headline comparison changes tools as well as loop structure. Sources whose detailed claims were not independently inspected, or whose material no longer serves the article, have been removed rather than retained as decorative support.

**Limits.** This is one operator's case, with repository evidence for the structural changes. No agent-effort ablation, net cognitive-cost accounting, or longitudinal test of the new maintenance regime was performed. Themis instance behavior was not inspected. The records establish what was documented and decided at the identified revisions; they do not establish permanent truth about the live machine. New evidence can require reopening both decisions and observations.
