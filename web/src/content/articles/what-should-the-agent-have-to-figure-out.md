---
slug: what-should-the-agent-have-to-figure-out
title: What Should the Agent Have to Figure Out?
subtitle: Designing the boundary between durable structure and live judgment
kind: essay
published: 2026-09-17
description: >-
  Which reasoning belongs in durable structure and which must stay live: a
  test of standing, reuse, and revisit for the records agents and operators read.
series:
  name: Agent Systems
  part: 3
---

# What Should the Agent Have to Figure Out?

### Designing the boundary between durable structure and live judgment

---

A pruning script deleted local database dumps by age. It never checked whether a newer dump had arrived. When the process that produced the dumps stopped for about a week, the script kept running, and one service's local dump directory emptied while still looking healthy. The backup repository on an external drive beside the machine held older archives, so data from before the lapse survived. Archives written during the lapse held no dump for that service at all. When the failure was found, someone decided it was work: the pruning behaviour would change. Which fix was left open: keep the newest few dumps regardless of age, refuse to delete the last dump for any service, or report each service's dump age in the nightly notification. One of those would be chosen. None had been.

A maintenance script in the operator's personal bin directory had a shebang line and file mode 644. It had never been executable. It ran only when handed to the shell by name. A sibling script with the same defect had been fixed two weeks earlier, because a document presented that one as a command. Nothing presented this one as a command. So the record said what the file was, how it could be run, and how long it had been that way, and that its intended form had never been established. That was not an oversight. The item had been explicitly left undecided, and when the backlog was later reorganized, the person with authority to close it kept it open rather than invent an intention.

Those two situations are the plot of the previous essay, with the private names removed. This essay asks the question they leave open.

If a well-kept environment can spare an agent from reconstructing answers that already exist, what should the agent still have to figure out?

[The first essay in this sequence](/writing/the-machine-should-explain-itself) argued that operational intent should be recoverable from the system rather than from conversational memory. [The second](/writing/the-work-the-agent-stopped-doing) argued that recording is not enough, because a record that turns every observation into an obligation becomes a new archaeology. This one is about allocation: where the reasoning should happen, and when.

A durable record should preserve what an accountable owner has already settled, so nobody has to derive it again. It should not pretend to have settled what nobody has decided.

The second half is the one this essay is for. If you externalize a judgment before anyone has legitimately made it, you have not reduced reasoning. You have hidden an assumption in infrastructure.

## Three operations that look alike

It is easy to treat every improvement to an agent's environment as "more context." That phrase hides three different operations.

The first is making an answer easier to retrieve. The relevant paragraph exists and a search can find it. The agent still has to interpret it, judge whether it is current, and decide what follows.

The second is making an answer unnecessary to derive again. Ownership has been assigned. A disposition has been taken. A constraint is binding. The next reader starts from that result, with enough provenance to reopen it if the world changes.

The third is deciding on behalf of a future reasoner. The environment does not store what was decided. It fills in what was never decided, because a field cannot be blank, a ticket cannot be open without a severity, or a complete-looking record is more comfortable than an honest one.

The two opening cases are the second operation done twice and the third refused. Recording that the pruner is work, without choosing the fix, is the second operation applied at one resolution and withheld at another. Recording that the script's intent was never established is the second operation applied to an absence. Inventing a purpose for the script so the entry would look finished would have been the third.

None of the three legs is new. Parasuraman, Sheridan, and Wickens distinguished four classes of function that automation can take over to different degrees: information acquisition, information analysis, decision and action selection, and action implementation. They argued that where a human may have to take over, decision automation should stay low even when information automation is high. A runbook that says where the backup logs live belongs to the first two stages. A recorded commitment to change the pruning rule is a decision already selected. A timer that deletes dumps on a schedule is action implementation. The gloss is mine, not theirs: support for seeing is not the same as substitution for choosing.

## The question is older than agents

Nor is the temporal move new. Kaplow's economic analysis of rules versus standards puts it exactly: a rule is given content ex ante, a standard ex post, and rules cost more to create while standards cost more to apply. An operational record is a body of rules and standards for its next reader, and the same tradeoff governs it. The implication I draw is that the more often a question will recur, the more its answer deserves to be written as a rule.

Agent research has reached the same idea from the other direction. PREMem, a 2025 memory system for dialogue, performs its reasoning when memories are written rather than when they are queried, storing the inferred relationships beside the raw fragments. Its authors call this shifting the inference burden into memory construction. That is the second operation, built as software. What PREMem does not ask, because its problem does not require it, is whether an inference should have been settled at all, who had the authority to settle it, what remains undecided, and what should reopen a stored conclusion. Its limitations section notes that it has no mechanism for forgetting.

MemGPT lets the model decide, through function calls, what to write to its long-term store and when. Practitioner writing on context engineering, including Anthropic's, is largely about curating the smallest useful set of tokens, taking structured notes outside the window, and compacting what has been learned. These systems make durable state cheap to produce. They do not say which state deserves to be durable, or keep a settled result and an open question visibly different. That is a governance gap, not a capability gap, and it is the gap this essay is about.

## What should become durable

Some answers have been settled by someone entitled to settle them. Making a future reader derive them again is waste, and it is a source of drift: two readers reconstructing ownership from installation paths should not be expected to reach the same owner. Four kinds of answer carry most of the weight.

Ownership that has been assigned. If a service runs on a workstation, that does not decide who owns its meaning. Once that boundary has been drawn, the next reader should follow it rather than infer it from a unit-file path.

A constraint that is actually binding, written as a constraint rather than as a hint inside a narrative.

A disposition that has been taken. Once someone decided the pruning failure was work, it stopped being a question of whether anyone cared. It became a commitment with an open design inside it.

Historical evidence that explains current state without being allowed to govern it: the record of why old ticket numbers disappeared answers why an identifier no longer means work, not what is open now.

Settled is not a property of a whole problem. A record can bind one layer, that this is work, and leave the next layer, which fix, honestly open. The boundary between durable structure and live judgment can run through the middle of a single item.

## What should remain live

The other pile is not "uniquely human faculties." It is work whose inputs are not yet sufficient for a durable answer.

Contradiction between intended and observed state. The record can say what was intended last month. The machine can say what is true this morning. Reconciling them is live work. Writing last month's intent as if it were today's observation is how environments go stale.

Tradeoffs under changing conditions. Recording that the only backup repository sits in the same room as the machine names the dominant remaining exposure. It does not choose a second copy. Cost, privacy, bandwidth, and recovery time still have to be weighed, and the weights move.

Ambiguous evidence. A non-executable script with a shebang is a fact. The operator's intention is not implied by the fact. A capable model can generate explanations for the mode. Capability does not create the missing decision.

Choices that need a current preference. Some questions are not missing information. They are waiting for someone entitled to say what they want.

Competing legitimate objectives. Availability against secrecy, speed against review, local convenience against restore discipline. Structure can name the conflict. It cannot honestly dissolve it in advance.

Context that changes the correct action. A procedure that is right on a quiet Tuesday can be wrong during an incident. If the record cannot say when its answer stops applying, it should not be written as though it always applies.

And the state the previous essay made visible: unknown because nobody decided. The script case adds a refinement. Unresolved because nobody looked is not the same as unresolved because the evidence gathered does not justify closure. The second is finished work. Themis, the portfolio-governance repository the previous essay named in passing, keeps these apart by construction: a recorded absence of judgment, a check that was never run, and a judgment that has gone stale are separate states that must not be collapsed. That distinction is inherited here, not proposed.

Horvitz's advice from the design of mixed-initiative interfaces applies almost unchanged. His scheduling assistant, when it could not tell which day an email meant, showed a week rather than guess a day. Scope the precision of what you offer to the precision of what you know. If you do not know, do not write a policy-shaped sentence.

## The cost of settling too much

Leaving everything as live reasoning has a cost the last two essays already paid. Settling too much has a different cost, and it is the one this essay is for.

Bainbridge's ironies of automation are the standing warning. Automating the easy parts of a task leaves the operator the hard parts, with less practice, and asks them to monitor a system that rarely needs them, which people cannot do well for long. Her final irony is that the most successful automated systems, the ones that almost never need intervention, may need the greatest investment in the person who must intervene. Translated to a record: settle every routine reconstruction into structure, and what remains is the cases where the structure is silent, stale, or wrong, with nobody in recent practice. That is an argument against pretending the leftover work got easier, not against settling the routine cases. Whether an agent loses anything by consuming recorded answers, the way human operators lose situation awareness under automation in Endsley's studies, is untested. The human finding does not transfer by assertion.

The automation-bias studies of Mosier, Skitka, and colleagues describe the complementary failure: an automated cue used as a substitute for checking. Commission errors follow a wrong directive despite contradictory evidence. Omission errors miss an event the aid did not flag. Applied to a repository this is analogy, not a finding about documents, but the shapes are recognizable: a reader who treats every recorded sentence as current policy implements a stale rule, and a reader who treats silence as safety misses the live failure the record never encoded.

Four further costs are specific to recording too much.

Maintenance. Every settled answer is a thing that can rot, and somebody has to own it.

Stale policy. A constraint recorded without any stated reason to revisit it will outlive the situation that justified it. Age-based deletion is a settled policy. The missing check, has a replacement arrived, was the live condition the policy dropped.

Hidden value judgments. Filling in intent for the script would have been a preference dressed as a finding.

Authority confusion. A recommendation retrieved from notes is not a ratified decision, and making a decision legible does not authorize every reader to enact it.

## A compact test

Three questions are enough, and they are closer to decision-rights hygiene than to a theory of mind.

**Has this been decided by someone with standing, on evidence that is still in view?** Standing means the right to ratify or bind the decision. Jensen and Meckling observed that the knowledge relevant to a decision and the right to make it do not automatically sit in the same place, and that no automatic process moves them together. An agent can retrieve a brilliant analysis and still lack the right to turn it into policy. Themis puts the operational form bluntly: authority is never inferred from commit identity, repository write access, or agent identity. Standing does not make a decision good; evidence, scope, and currency still have to hold. Without it, what is being recorded is an opinion in the typography of a rule.

**Will the next reader otherwise have to reconstruct the same answer?** This is the fresh-agent test from the first essay, now used as a gate. If the reasoning only explains a choice obvious from the configuration, recording it creates a maintenance surface and nothing else. Not every true sentence is worth governing.

**What declared condition, assumption, or trigger should force reconsideration?** This one is deliberately not universal. Most legitimate decisions carry no invalidation clause and do not need one. Some do. A deferral needs a date or a trigger, or it is an abandonment with a status field. A constraint that rests on an assumption needs the assumption stated, so that someone can notice when it fails. Assumption-based planning calls such a marker a signpost: an event or threshold that clearly indicates the changing vulnerability of an assumption. Themis requires a declared invalidation surface for each binding between a design decision and its implementation, and a revisit trigger for any work it defers, and demands neither of every recorded judgment. Some durable conclusions need a stated reason to stop reusing them. The pruning fix, once chosen, will be one: its justification is the lapse, and what should reopen it is a change in what the backup path protects.

If the first answer is no, preserve the uncertainty rather than invent a value to complete the schema. If the second is no, leave it in prose or leave it out. If the third has an answer, write it beside the decision, where the next reader will look.

These questions do not measure total cognitive work. The previous essay's limit still holds: changing where reasoning happens is not the same as proving that less of it happened, and nothing here turns one workstation's reorganization into a productivity result.

## An error budget is a boundary

Site reliability engineering has been drawing this line in public for a decade, and it gets the emphasis right.

An error budget is a settled decision about how much unreliability to accept: one hundred percent minus the service-level objective. Google's SRE workbook is explicit that the budget is half of the instrument. The other half is a written policy, agreed in advance by product, development, and reliability owners, naming the specific actions taken when the budget is exhausted. Without that agreement, the workbook says, the objective is another reporting metric rather than a decision-making tool. Its example policy binds the consequence: a service over budget for the trailing four weeks halts all changes and releases other than the highest-priority fixes and security work until it is back within objective. It names exceptions in advance, such as a company-wide network failure or an outage caused by another team's service. And it names what stays live: if the parties disagree about the calculation or whether the agreed actions fit, the question escalates to a named executive.

Read against the three questions, this is the whole essay in one document. The consequences were decided by people with standing to bind them, and recorded so that nobody argues about a freeze during the incident. The exceptions are the declared conditions under which the settled answer does not apply. The escalation path admits that a residue of judgment remains and says who exercises it. The policy settles what it can, marks what it cannot, and does not pretend the second category is empty.

The workstation cases sit on the same line: a commitment with its rule still open, and a record of what was known with a refusal to say more.

## The next reader

Two questions travel out of this essay into any system.

What am I making the next reader rediscover that has already been decided?

What am I recording as settled that nobody has actually decided?

The reader may be an agent or an operator at one in the morning. The questions are the same, and so is the failure on either side.

"Keep a human in the loop" does not answer them. Vaccaro, Almaatouq, and Malone's 2024 meta-analysis found that, on average across 106 experiments, human–AI combinations performed worse than the better of the human or the AI alone, with losses concentrated in decision tasks and sharpest where the AI alone had outperformed the human. That study is not about operational records and does not validate this test. It is a cold shower for any design whose only allocation rule is "a person checks." The loop has to contain a specific remaining problem, and the environment has to say which one.

I do not want an environment that answers every question in advance. I want one that is strict about which questions are closed, honest about which are half-closed, and unwilling to let an open one look finished.

The agent should have to figure out what is still actually open: the contradiction that appeared this morning, the tradeoff nobody has scored, the script whose intent was never stated, the recovery design that waits on a preference nobody has chosen. It should not have to figure out, again, who owns the service, whether the pruning failure is work, or whether last year's conversion record is current policy. And it should not be handed unsolved problems in the file format of policy. The environment's job is to make the second list short and the first list visible.

---

## Post-article material

### Abstract

After operational knowledge has been made recoverable, the remaining design problem is allocation: which reasoning should be settled into durable structure, and which must stay live. A record can make material findable, preserve a result an accountable owner has already settled, or fill in a judgment nobody has made. The second is useful; the third is a defect. The temporal move itself is old, in rules-versus-standards analysis and in agent memory systems that reason at write time; the function-allocation and automation-irony literatures describe the human-factors version. The contribution is narrower: a three-question gate for agent-readable operational records, asking whether a recorded answer has standing, whether it spares reconstruction, and whether it declares a reason to be revisited. Two inspected workstation cases show that a decision can be settled at one resolution and open at another, and that a refusal to infer intent can itself be a ratified outcome.

### Sources

Inspection scope: presence here does not imply full-book access or experimental reproduction. Links were inspected during review of this essay. Repository records were inspected locally at the identified revisions; locators are given without publishing private repository URLs. Anastasis facts describe commit `2c73f67` (September 17, 2026), which is also the current head, not a fresh live-host audit. Themis facts describe governing standards at `ea680ae`, not a portfolio instance.

| Source | Metadata / inspected access | Link or locator | Use and limit |
| ------ | --------------------------- | --------------- | ------------- |
| Anastasis operational record | Reference §§15, 18, 28 and remediation commitments at `2c73f67`; `AGENTS.md`; tracked script and pruning script inspected | `anastasis-reference.md`; `usr/local/bin/db-dump.sh`; `home/bin/update-system` | Backup layout, dump-pruning commitment and its open remediation options, non-executable-script observation, ownership and mutation boundaries |
| Anastasis conversion evidence | Frozen record dated September 17, 2026; preceding backlog at `2c73f67^` also inspected | `docs/migrations/2026-09-17-commitment-model-conversion/README.md` | The "deliberately left undecided" wording and the demotion rationale; historical evidence, not current authority |
| Themis governing standards | Architecture status and work-control standards at `ea680ae`; relevant sections inspected | `docs/governance/ARCHITECTURE_STATUS.md` (§11.3 authority; binding invalidation surface; unestablished/unobserved/stale states); `docs/governance/PROJECT_WORK_CONTROL.md` (`DEFERRED` revisit trigger; `UNKNOWN` versus `UNOBSERVED`) | Authority-is-never-inferred rule, distinct unknown states, and the scoped revisit requirements; no portfolio instance inspected |
| Parasuraman, R., Sheridan, T. B., & Wickens, C. D. "A model for types and levels of human interaction with automation." | *IEEE Trans. SMC-A* 30(3), 2000, pp. 286–297; full text inspected via an archived university mirror | https://doi.org/10.1109/3468.844354 ; https://web.archive.org/web/20210415000421id_/http://www.cs.uml.edu/~holly/91.549/readings/sheridan-autonomy.pdf | Four functional stages and the recommendation to keep decision automation low where takeover is expected; "seeing versus choosing" is this essay's gloss |
| Kaplow, L. "Rules versus Standards: An Economic Analysis." | *Duke Law Journal* 42(3), 1992, pp. 557–629; publisher landing page and abstract inspected; PDF not retrieved | https://scholarship.law.duke.edu/dlj/vol42/iss3/2/ | Ex ante versus ex post content and the creation/application cost asymmetry; the frequency implication is this essay's extension |
| Kim, S., Lee, Y., Kim, S., Kim, H., & Cho, S. "Pre-Storage Reasoning for Episodic Memory" (PREMem) | *Findings of EMNLP 2025*, pp. 22096–22113; full text inspected | https://aclanthology.org/2025.findings-emnlp.1204/ | Reasoning at memory-construction time stored beside raw fragments; stated absence of forgetting; no authority or selection criterion |
| Packer, C., et al. "MemGPT: Towards LLMs as Operating Systems." | arXiv:2310.08560, v2 February 2024; full text inspected | https://arxiv.org/abs/2310.08560 | Model-directed writes to long-term memory via function calls; no criterion for settled versus raw state |
| Anthropic. "Effective context engineering for AI agents." | Engineering article, September 29, 2025; full page inspected | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | Curation of a minimal high-signal context, structured note-taking, compaction; silent on ratification and revisit |
| Bainbridge, L. "Ironies of automation." | *Automatica* 19(6), 1983, pp. 775–779; full text inspected on the author's site (pronouns modernized there relative to print) | https://doi.org/10.1016/0005-1098(83)90046-8 ; http://www.complexcognition.co.uk/2021/06/ironies-of-automation.html | Easy parts automated, hard parts left; skill decay; monitoring limits; the final irony about training investment |
| Endsley, M. R., & Kiris, E. O. "The out-of-the-loop performance problem and level of control in automation." | *Human Factors* 37(2), 1995, pp. 381–394; abstract inspected | https://doi.org/10.1518/001872095779064555 | Human situation-awareness loss under automation; cited only to mark the agent analogue as untested |
| Mosier, K. L., Skitka, L. J., Heers, S., & Burdick, M. "Automation bias: decision making and performance in high-tech cockpits"; Skitka, L. J., Mosier, K. L., & Burdick, M. "Does automation bias decision-making?" | *Int. J. Aviation Psychology* 8(1), 1998, pp. 47–63; *Int. J. Human-Computer Studies* 51(5), 1999, pp. 991–1006; abstracts inspected | https://pubmed.ncbi.nlm.nih.gov/11540946/ ; https://doi.org/10.1006/ijhc.1999.0252 | Definition of automation bias (1998) and commission/omission errors (1999); repository application is analogy |
| Horvitz, E. "Principles of Mixed-Initiative User Interfaces." | *CHI '99*, pp. 159–166; full text inspected on the author's site | https://doi.org/10.1145/302979.303030 ; https://erichorvitz.com/chi99horvitz.pdf | Scoping precision of service to uncertainty; the LookOut week-view example |
| Jensen, M. C., & Meckling, W. H. "Specific and General Knowledge, and Organizational Structure." | In *Contract Economics*, 1992, pp. 251–274; reprinted *J. Applied Corporate Finance* 8(2), 1995; author preprint full text inspected | https://ucema.edu.ar/u/je49/organizacion/Jensen_SpecificK.pdf | Co-location of knowledge and decision rights; "standing" is this essay's word for their decision-control right |
| Dewar, J. A., Builder, C. H., Hix, W. M., & Levin, M. H. *Assumption-Based Planning: A Planning Tool for Very Uncertain Times.* | RAND MR-114-A, 1993; summary pages (xi–xiii) of the primary scan inspected | https://doi.org/10.7249/MR114 | Definition of a signpost; the five-step method is not otherwise used |
| Google. *The Site Reliability Workbook*, ch. 2 "Implementing SLOs" and Appendix B "Example Error Budget Policy." | O'Reilly, 2018; both pages inspected in full | https://sre.google/workbook/implementing-slos/ ; https://sre.google/workbook/error-budget-policy/ | Error budget definition; policy must name actions, be agreed by three parties, and include escalation; example freeze, exceptions, and CTO escalation |
| Vaccaro, M., Almaatouq, A., & Malone, T. "When combinations of humans and AI are useful." | *Nature Human Behaviour* 8, 2024, pp. 2293–2303; open-access full text inspected | https://doi.org/10.1038/s41562-024-02024-1 | Average loss against the better of human or AI alone; decision-task and relative-performance moderators; not evidence about operational records |

### Fact-check table

**VERIFIED** means the specific claim is supported by the identified inspected material. **QUALIFIED** marks an interpretation, a limited inspection, or a result whose scope matters. **ANALOGY** marks a transfer from another domain that is not a finding about agent-readable records. **AUTHOR OBSERVATION** and **ORIGINAL SYNTHESIS** are labeled as such.

| Claim | Source / inspection | Status | Qualification |
| ----- | ------------------- | ------ | ------------- |
| The pruning script deleted local dumps by age alone and never checked for a replacement | `db-dump.sh` line 44 (`find ... -mtime +7 -delete`); commitment text | VERIFIED | Current repository fact at `2c73f67` |
| The dump-producing process lapsed for about a week and one service's local dump directory emptied | Reference §15, operator-recorded observation dated 2026-09-13 | QUALIFIED | Recorded operator observation, not re-audited |
| The backup repository is on an external drive in the same room; pre-lapse archives survived; lapse-window archives held no dump for that service | Reference §15 (repository path, single-copy residual risk, recovery consequence) | VERIFIED | Corrects the earlier draft's "remote archives"; the recovery consequence is the record's own statement |
| The decision that the pruning failure was work was settled; the remediation rule was left open among three options | Commitment remediation column at `2c73f67` | VERIFIED | The essay's "settled at one resolution, open at another" reading is interpretation of that record |
| The maintenance script has a shebang, has been mode 644 since creation, and runs only via the shell | Git index mode `100644`; file header; reference §18 | VERIFIED | Git proves the mode only since tracking began on 2026-08-23; earlier history is the record's assertion |
| A sibling script was fixed because a document presented it as a command; this one was not, because none did | Reference §18 | VERIFIED | The discriminator is documentary evidence, as the record states |
| The item was explicitly left undecided before the conversion and demoted without asserting intent | Pre-conversion backlog at `2c73f67^`; conversion record | VERIFIED | The essay's characterization of this as a ratified refusal is interpretation |
| Parasuraman, Sheridan, and Wickens distinguish four automatable stages and recommend low decision automation where takeover is expected | 2000 paper, full text | VERIFIED | "Support for seeing is not substitution for choosing" is this essay's gloss; they note few direct comparisons of information and decision automation |
| Kaplow: rules are given content ex ante and standards ex post; rules cost more to create and standards more to apply | Duke Law Journal landing page and abstract | VERIFIED | Abstract-level inspection; the frequency implication in the body is this essay's extension, not quoted |
| PREMem reasons at storage time, stores inferred relationships beside raw fragments, and has no forgetting mechanism | Paper full text, method and limitations sections | VERIFIED | Dialogue personalization, not operational records; it compiles mechanically above a similarity threshold |
| MemGPT lets the model decide what and when to write to long-term memory via function calls | Paper §2.3 and Figure 3 | VERIFIED | No criterion for settled versus raw content is offered |
| Anthropic's context-engineering article emphasizes minimal high-signal context, notes outside the window, and compaction | Article full page | VERIFIED | One practitioner account, not a field definition |
| Bainbridge: easy parts automated, hard parts left; skill decay; sustained monitoring is not humanly sustainable; the most successful systems may need the greatest training investment | Author's full text | VERIFIED | Her wording is "easy parts," not "frequent" |
| Whether agents lose anything analogous to human situation awareness under automation is untested | Endsley & Kiris abstract; no agent evidence located | ANALOGY | Stated in the body as untested |
| Automation bias: automated cues replacing checking; commission and omission errors | Mosier et al. 1998 and Skitka et al. 1999 abstracts | VERIFIED | Flight-simulation tasks |
| Repository records can produce commission-like and omission-like failures | Essay's transfer of the above | ANALOGY | Not a finding about documents |
| Horvitz: scope precision of service to uncertainty; LookOut showed a week view rather than guess a day | CHI '99 full text, principle 8 and LookOut section | VERIFIED | "If you do not know, do not write a policy-shaped sentence" is this essay's sentence |
| Jensen and Meckling: knowledge and decision rights do not automatically co-locate; no automatic process moves them together | Author preprint, §§1.2 and 4.1 | VERIFIED | "Standing" is this essay's term |
| Themis: authority is never inferred from commit identity, write access, or agent identity | `ARCHITECTURE_STATUS.md` §11.3 | VERIFIED | Governing standard, not instance behaviour |
| Themis: recorded absence of judgment, unobserved check, and stale judgment are distinct states that must not be collapsed | `PROJECT_WORK_CONTROL.md` (UNOBSERVED versus UNKNOWN); `ARCHITECTURE_STATUS.md` (unestablished/unobserved/stale) | VERIFIED | The body maps these to its own plain-language descriptions |
| Themis requires a declared invalidation surface for bindings and a revisit trigger for deferred work, and does not demand either of every judgment | `ARCHITECTURE_STATUS.md` binding currency rules; `PROJECT_WORK_CONTROL.md` `DEFERRED` requirements | QUALIFIED | The two positive requirements are verbatim; the absence of a general requirement is inferred from the standards' scope |
| Dewar et al.: a signpost is an event or threshold that clearly indicates the changing vulnerability of an assumption | MR-114-A summary, p. xiii | VERIFIED | Primary scan; only the summary was inspected |
| SRE workbook: error budget is 100% minus the SLO; the policy must name actions on exhaustion, be agreed by product, development, and SRE, and include escalation; without agreement the SLO is a reporting metric; the example policy halts changes except P0 and security fixes, names exceptions, and escalates disputes to the CTO | Workbook ch. 2 and Appendix B | VERIFIED | Google's example, presented as such |
| Vaccaro et al.: 106 experiments; combinations on average below the better of human or AI alone; losses concentrated in decision tasks and largest where AI alone beat the human | Open-access full text | VERIFIED | Heterogeneous laboratory tasks; not evidence about governed records |
| Two readers reconstructing ownership from installation paths should not be expected to reach the same owner | None | AUTHOR OBSERVATION | Phrased as an expectation, not a measured result |
| Leaving reasoning live cost repeated reconstruction in the earlier cases | Prior essays' inspected records and author account | AUTHOR OBSERVATION | Unmeasured; no claim that total work fell after the conversion |
| Retrieve / preserve a settled result / decide on behalf of a future reasoner is a distinct published taxonomy | Not found as a named triad | ORIGINAL SYNTHESIS | Each leg exists separately in function-allocation, knowledge-compilation, and programmed-decision literatures |
| The standing / reuse / revisit gate | Decision-rights literature (standing); *The Machine Should Explain Itself* §8 (reuse); Dewar and Themis practice (revisit) | ORIGINAL SYNTHESIS | The bundle as a gate for agent-readable state was not found as a unit; each question has a named antecedent |

### Editorial note: original synthesis

**Inherited.** Function allocation across information, decision, and action stages (Parasuraman, Sheridan, Wickens). Ex ante versus ex post determination of a rule's content (Kaplow). Reasoning at memory-construction time (PREMem; MemGPT's model-directed persistence). Ironies of automation (Bainbridge). Automation bias (Mosier, Skitka, and colleagues). Scoping precision to uncertainty (Horvitz). Co-location of knowledge and decision rights (Jensen and Meckling). Signposts for vulnerable assumptions (Dewar et al.). Pre-bound error-budget consequences with declared exceptions and escalation (Google SRE). Explicit unknown as legitimate durable state, including the distinction between undecided, unobserved, and stale: established in Themis's governing standards and in *The Work the Agent Stopped Doing*, and used here without any claim of novelty. The reuse question is the fresh-agent test from *The Machine Should Explain Itself*.

**Adapted.** Reading the information/decision/action split onto records rather than control systems. Treating a repository sentence as capable of producing automation-bias-shaped failures. Narrowing "what would change this?" from a universal requirement to the cases where Themis and assumption-based planning actually bind it: deferrals and assumption-dependent constraints.

**Analogical only.** The transfer of Bainbridge's leftover-work irony and of automation bias to records. The agent analogue of out-of-the-loop degradation, which the body marks as untested.

**This essay's contribution.** Not a new theory of judgment, and not the observation that reasoning can be moved earlier, which prior work states plainly. The contribution is the operational gate for durable agent-readable state: distinguish retrieving material, preserving a settled result, and deciding on behalf of a future reasoner; ask whether a recorded answer has standing, spares reconstruction, and declares a reason to be revisited. The two inspected cases add two observations the gate needs: a decision can be settled at one resolution while its implementation stays open, and a refusal to infer intent can itself be a ratified outcome rather than a gap.

**Narrowed or rejected after review.** Removed "compiled" as an organizing term, because it names three unrelated technical lineages this essay does not draw on. Removed the claim that a decision without invalidation conditions is "not finished." Removed the aviation and sepsis examples: the first oversimplified how rule-bounded a diversion decision is, and the second rested on a clinical bundle whose evidence base is contested. Corrected the earlier draft's "remote archives"; the surviving archives were on a locally attached drive. Corrected the characterization of contemporary memory and context-engineering work, which the earlier draft described as putting more material into the next model call. Removed Fitts, Sheridan and Verplank, Hollnagel and Woods, Anderson, Endsley and Kaber, Fama and Jensen, RAG, and a benchmark-confound preprint from the body and apparatus, because the argument did not need them. Corrected a source link that pointed at the wrong automation-bias paper.

**Limits.** One operator's two cases, with repository evidence for the structural facts and an operator account for the incident timeline. No measurement of total reasoning, agent effort, or outcome quality. Kaplow was inspected at abstract level; Dewar at the report summary. Themis standards were inspected, not a portfolio instance. The three questions are a design heuristic, not a validated instrument.
