---
slug: presence-is-not-a-control
title: Presence Is Not a Control
subtitle: A human in the loop can still be out of practice.
kind: essay
published: 2026-09-29
description: >-
  “Human in the loop” names an architecture, not a control. Oversight is a
  safeguard only while its conditions are maintained and its detection is tested.
---

# Presence Is Not a Control

### A human in the loop can still be out of practice.

---

A named reviewer and an approval box can satisfy a process diagram. They do not, by themselves, satisfy a safety case. “Human in the loop” describes an architecture: a person stationed between a machine’s output and a consequential action. Architecture is not the same thing as a functioning control. A control is the capacity to notice that something is wrong and to stop it. That capacity has conditions. If an organization claims human oversight as a control, it has to maintain those conditions — competence, primary evidence, time, authority, practice, independence, and a measured ability to notice error.

The presence of a human is not the same thing as the preservation of human judgment. A human in the loop can still be out of practice.

## The older problem

This is not an AI discovery. It is a recurring feature of supervisory control.

When a process is automated, the work left to the person is rarely the work the person used to do. What remains is monitoring a system that is usually correct, diagnosing the unusual case, and taking over when the automation drops out or goes wrong. Lisanne Bainbridge called the bind an irony: the more successful the automation, the less the operator practices the skills intervention requires, and the more essential those unused skills become when something finally breaks [Bainbridge 1983]. The residual human task is then the one humans do badly — sustained attention to rare signals — plus a sudden demand for expert recovery.

The experimental record is specific enough to use and short enough to state. Operators watching highly reliable automation detect failures worse than operators watching automation whose reliability varies, especially when another task competes for attention [Parasuraman, Molloy & Singh 1993]. Decision aids produce omission errors and commission errors [Parasuraman & Riley 1997; Goddard, Roudsari & Wyatt 2012]. Instructions to be careful do not reliably remove either effect; both appear in novices and experts [Parasuraman & Manzey 2010]. Takeover is not instantaneous even when someone is watching. Moving from active control to passive monitoring changes what the operator understands about the current state; after a failure, spectators are slower at resuming the task [Endsley 1995; Endsley & Kiris 1995]. Unused skill decays. That is ordinary learning, not a character judgment.

Accident investigation already treats the last point as operational. In the Asiana 214 report the NTSB noted that the skills needed for a straight-in visual approach without glideslope guidance can atrophy through lack of practice when crews ordinarily fly with precision guidance and high automation. That was one mechanism among several — mode confusion, documentation and training gaps, poor coordination, inadequate supervision, fatigue — not a story about pilots who “forgot how to fly” [NTSB AAR-14/01]. If the safety case still depends on an unaided skill, an operation that almost never uses that skill is training its absence.

Two effects should stay distinct. Immediate recommendation bias is the first: judgment moves with the aid’s suggestion. In a mammography experiment, radiologists of every experience level were pulled toward incorrect BI-RADS categories when a purported AI suggested them [Dratsch et al. 2023]. Longitudinal deskilling is the second: the unused fallback thins over time. They often travel together. One short-circuits the judgment that remains. The other removes the occasions on which that judgment is exercised.

A designated human fallback can therefore become less capable while remaining formally on duty. Reliability reduces obvious failures. Fewer failures reduce the occasions on which the human must reconstruct the state and intervene. Attention reallocates. Skill thins. The next failure arrives to a person who is present, authorized, and out of the loop.

That failure mode is old. What is different now is the path the reviewer walks.

## The interface problem

None of the machine-side of this argument requires a system that “learns to fool the reviewer.” Ordinary optimization is enough.

Organizations do not supervise models against the underlying property they care about. They supervise against what they can see and score: unit tests, rubric items, rater preference, structured write-ups, passing CI, a coherent explanation, a complete-looking diff, a summary that sounds like diligence. A system can become better at satisfying those criteria without becoming proportionally better at the property the criteria were supposed to represent.

Specification gaming is the literal version: the system satisfies the specified objective and misses the intended one [Krakovna et al. 2020]. Reward-model overoptimization is the scored version. Optimize hard enough against a learned stand-in for human preference and the proxy score can keep rising after gold-standard quality has peaked or fallen [Gao, Schulman & Hilton 2023]. Sycophancy is the social version: models trained on preference data learn to produce answers raters like, including answers that agree with the user at the expense of accuracy [Sharma et al. 2023]. Outcome-only supervision of reasoning gives the trainer less information about where an error entered than supervision of intermediate steps; inferentially, it also gives an auditor less of a trace to inspect [Lightman et al. 2023].

There is a stronger research program about evaluation awareness, sandbagging, and strategic concealment of capabilities. It matters for frontier evaluation. It is not required here. The present argument depends on a weaker fact: systems can get better at looking overseeable.

Human-factors experiments usually hold the machine fixed and vary reliability. Alignment papers usually hold the evaluator fixed and vary optimization pressure. We did not find a mature literature that jointly tracks, in the same workflow over months, both the system’s increasing fit to approval criteria and the reviewer’s declining independent detection skill. The interaction is a synthesis.

The synthesis is not mysterious. As automation becomes more reliable and more fluent, obvious failures become rarer. Reviewers see fewer cases that force reconstruction. Throughput pressure rewards fast approval of work that already looks finished. Meanwhile the system is trained, selected, or prompted against the same signals the reviewer uses. The two adaptations reinforce each other without anyone intending that result.

AI adds a mechanism the older literature only partly had. The system under review now often produces the interface through which it is reviewed. It writes the summary of the change. It explains why the change is safe. It formats the evidence. It proposes the test plan, and sometimes it writes the tests. The reviewer is not looking at the territory and then consulting a tool. The reviewer is looking at a map drawn by the agent that traversed the territory.

That is an independence problem, not only a skill problem. Skill decay means the reviewer can no longer do the work unaided. Loss of an independent epistemic path means the reviewer never quite sees the work. Either is enough to hollow out a control. Together they are worse.

A 2026 mammography study makes the path point without any need for a story about expertise rotting over months. When a commercial AI missed a cancer, readers using the AI were less sensitive on those cases than they had been unaided, and they looked at the images differently — fewer fixations on the cases the model failed to flag [Taib et al. 2026]. If the aid does not point, the human is less likely to find. That is what it means for evidence to be mediated.

Learning studies make the practice point. Students who practiced mathematics with unrestricted GPT-4 scored much higher during assisted practice and then worse on a later unaided exam than students who had only a textbook. A constrained tutor that withheld finished answers avoided that penalty [Bastani et al. 2025]. Substitution is not scaffolding. If review work is organized so that the model does the reconstruction and the human signs the result, the human is practicing approval, not detection.

A more cautious clinical observation sits nearby. After AI detection tools became routine in several Polish endoscopy centers, unaided adenoma detection on exams performed without the tool was lower than it had been before the tool was introduced [Budzyń et al. 2025]. The comparison is observational, not randomized proof that AI caused deskilling. It is still a warning about what “the human remains the backup” can mean after the backup has spent months working with the primary.

Put the pieces together and the loop can remain intact on paper while losing its independence in practice. The reviewer is still there. The ticket still requires a click. The log still shows a name. The path from the underlying work to the reviewer’s judgment now runs through the system being judged.

## What the phrase actually buys

“Human in the loop” hides a stack of different designs. A person can be present. A person can have approval authority. A person can see primary evidence. A person can still have the skill to interpret it. A person can have the time and the incentives to use the skill. A person can reconstruct or challenge the machine’s account rather than ratify it. A person can halt the system. Many deployments buy the first two and talk as if they had bought all seven.

Regulation is already more precise than the slogan, at least on paper. The EU AI Act requires that high-risk systems be designed so they can be effectively overseen. Assigned persons must be able, as appropriate, to understand limits, monitor for anomalies, remain aware of automation bias, interpret output, disregard or reverse it, and interrupt the system to a safe state [EU AI Act Art. 14]. Deployers must assign people with competence, training, and authority [EU AI Act Art. 26(2)]. That is a capability list, not a staffing list. NIST’s AI Risk Management Framework treats human–AI configurations as something to define and govern rather than as a single pattern called oversight [NIST AI RMF 1.0]. Ben Green’s survey of government algorithm policies states the failure mode directly: mandated human oversight often assumes people can perform the overseeing function; when they cannot, the requirement legitimates the system without creating a check [Green 2022]. Green’s object is public-sector algorithms. The structure transfers.

None of this makes human involvement useless. Accountability still needs a bearer. Contextual judgment, local knowledge, and values that never entered the training objective still matter. Some failures are better handled by a person with complementary information. Political legitimacy still attaches to a human locus of decision. Graceful degradation still needs a recovery agent for the long tail if the design has not eliminated that tail.

The argument is narrower. If the organization continues to invoke human judgment as a meaningful fallback or control, the capability being relied upon has to be maintained and tested. If it is prepared to drop the human from the safety case, it should say so and design for that. The dishonest pattern is the common one: automation is treated as good enough that people need not practice, and not good enough that people can be removed.

Several objections should be absorbed rather than waved away. Humans have always specialized; calculators displaced mental arithmetic. This essay has no brief for keeping every displaced skill. It applies where the unused skill remains part of the claimed control. Preserving unused competence costs money — simulator time, slower review, withheld automation. That cost is real. If an organization will not pay it, it should stop listing the human as a mitigator. Humans are poor rare-event monitors even when practiced; redundant automated monitors will sometimes outperform a person staring at a stream. Build those monitors. Do not treat an untested click as their substitute. They have the same proxy problem. Adding a human can make outcomes worse if the reviewer is tired, biased, or weaker than the model on the task. And some systems can be built so that manual fallback is no longer the safety case. Then stop advertising a recovery path you will not keep sharp.

What remains is still enough to matter. Review queues, clinical sign-off, change-advisory approval, content-moderation appeals, agent tool-use confirmation: the loop is there because someone needs it to be there. Loops of that kind fail quietly. They fail by still existing.

## Oversight as a maintained capability

If oversight is a control, it has to be maintained the way other controls are maintained. High-reliability operations do not wait for a real stall at altitude to find out whether the crew can recover. They buy practice.

The mechanisms matter for the property they preserve, not as a generic checklist.

Practice is preserved by giving the unaided path somewhere to live: scheduled work without the model, recurrent simulation of rare failures, rotation between automated and manual workflows rather than a permanent class of approvers who have never done the underlying task. Intermediate control — keeping the person generating options rather than only ratifying them — has experimental support as a way to keep situation awareness from collapsing [Endsley & Kiris 1995; Parasuraman, Sheridan & Wickens 2000].

Independence is preserved by forcing contact with the case before contact with the verdict. Form a view before seeing the recommendation. Keep primary evidence on the screen — the image, the raw logs, the unsummarized diff — and make some reviews use that evidence with the model’s narrative withheld. Give some work to a second reviewer who does not live inside the same model-mediated packet. Accountability manipulations have reduced some automation-bias effects in laboratory work; exhortation has not [Parasuraman & Manzey 2010; Goddard, Roudsari & Wyatt 2012].

The control itself is preserved only if someone measures detection rather than only approval rate and cycle time. Random deep audits and adversarial review are ordinary quality tools. They weaken if both reviewers see only the system’s account of the work.

These are not equal in evidentiary status. Recurrent training and simulation have decades of institutional precedent. Several of the AI-specific adaptations — withholding summaries, judge-before-aid in agent review, seeded defects in pull-request queues — are design inferences from that record, not a validated package for large language models. They should be offered as such.

What looks like deliberate inefficiency is often the carrying cost of a control that is idle most of the time. If you will not carry the cost, you do not have the control. You have a drawing of one.

## A test the claim can fail

The missing piece in most human-in-the-loop programs is not another policy sentence. It is a reliability measurement.

Suppose an organization says that every AI-generated software change receives meaningful human review. That is a testable statement. It is not tested by counting approvals.

A direct test is a seeded-fault protocol, run as a series, not a snapshot. First establish a reviewer baseline before AI-mediated review becomes routine, or as early as the organization still can. Then, in a controlled environment that matches production as closely as possible, introduce known, realistic defects — a plausible but wrong dependency change, a missing authorization check, a test that asserts the wrong property, a summary that omits the risky part of the diff. Do not tell reviewers which cases are seeded. Measure detection rate, time-to-detection, and how often reviewers request primary evidence rather than accepting the generated narrative. False-positive escalation is worth recording if the organization also cares whether the loop becomes noisy. Repeat a comparable battery later, under the same rules, as AI-mediated review becomes ordinary work.

A single measurement says whether the control works today. Repeated measurement says whether it is degrading. If detection falls while approval throughput rises, the organization has evidence that the nominal human control is thinning. If detection holds, the architecture has a stronger claim to be a safeguard. If the organization refuses the test, it is asserting a control it will not validate.

This is a measurement design, not a published result. No decay curve is being offered. The point of the protocol is that such a curve could exist, and that without it “meaningful review” is an assumption.

The same instrument can be pointed at other loops: model-written clinical notes, diligence memos, agency decision letters, security-exception approvals. Two cautions travel with it. Reviewers will learn the genre of the seeds if the seeds are stereotyped; the exercise then measures drill performance. And a test that adds work without changing incentives, staffing, or authority will be gamed or ignored. Measurement does not replace the other conditions. It tells you whether they are still doing anything.

A control is not validated because it exists. It is validated because it works.

## Both sides move

Oversight is not a fixture. The system being reviewed changes: capability, fluency, fit to the criteria by which it is accepted. The interface changes with it. So do the evaluation signals, the default evidence pack, and the workflow built around the automation. The supervisor changes too. Practice, attention, trust, and access to primary evidence are not constants. They are effects of the work the supervisor is actually given.

Treating “human in the loop” as a static property misses that. A person can remain in the architecture while the function the person was meant to perform thins out. The thinning does not require malice in the model or laziness in the reviewer. It requires a reliable system, an evaluable proxy, a mediated evidence path, and time.

If the human is no longer part of the safety case, say so and build the system that claim requires. If the human remains part of the case, the human function has maintenance requirements. Competence, primary evidence, time, authority, practice, independence, and a measured ability to notice error are the validity conditions. Absent those conditions, the loop is a drawing. The check it describes may already be gone.

---

## Post-article material

### Abstract

“Human in the loop” names an architecture, a person placed between a machine’s output and a consequential action, and is routinely treated as if it named a control, the capacity to notice that something is wrong and stop it. This essay argues that the second does not follow from the first. The supervisory-control literature has long shown that reliable automation erodes the monitoring, situation awareness, and unaided skill the human fallback depends on, and that instructions to be careful do not remove automation bias. AI-mediated review adds a second erosion: the system under review increasingly writes the summary, the explanation, the evidence pack, and sometimes the tests through which it is reviewed, while ordinary optimization against visible approval criteria makes its work look more overseeable without making it proportionally better. Skill decay and loss of an independent evidence path can each hollow out a control; together they can leave the loop intact on paper and empty in practice. The essay concludes that an organization that claims human oversight as a control must maintain its validity conditions (competence, primary evidence, time, authority, practice, independence, and a measured ability to notice error) and must test them, for example with a repeated seeded-fault protocol. An organization that will not do so should stop listing the human as a mitigator.

### Sources

Inspection scope: sources were located and inspected on 29 September 2026 during publication intake. For most works the inspection was the publisher or index abstract (Europe PMC, Crossref, arXiv). Full text was read for Bainbridge 1983 (archived PDF), NTSB AAR-14/01 (NTSB PDF), Parasuraman & Manzey 2010 (institutional repository PDF), NIST AI 100-1 (NIST PDF), and the text of Articles 14 and 26 of Regulation (EU) 2024/1689 as reproduced by the AI Act Explorer at artificialintelligenceact.eu; EUR-Lex itself could not be retrieved. Goddard et al. 2012 and Bastani et al. 2025 full texts were consulted through PubMed Central with an extraction tool, not read end to end. Parasuraman, Molloy & Singh 1993 and the full text of Endsley & Kiris 1995 were not accessed; the essay’s uses of them are checked against secondary descriptions (Parasuraman & Manzey 2010; Endsley 1996, “Automation and situation awareness,” in Parasuraman & Mouloua (eds.), *Automation and Human Performance*, pp. 163–181; McBride, Rogers & Fisk 2014, *Theoretical Issues in Ergonomics Science* 15(6): 545–577). Works consulted only to check uncited claims (14 CFR 121.427; van der Weij et al. 2024, arXiv:2406.07358; Needham et al. 2025, arXiv:2505.23836) are named in the fact-check table rather than listed here.

| Source | Record | Locator |
|---|---|---|
| Bainbridge, L., “Ironies of Automation” | *Automatica* 19(6): 775–779, 1983 | https://doi.org/10.1016/0005-1098(83)90046-8 |
| Parasuraman, R., Molloy, R., and Singh, I. L., “Performance Consequences of Automation-Induced ‘Complacency’” | *International Journal of Aviation Psychology* 3(1): 1–23, 1993 | https://doi.org/10.1207/s15327108ijap0301_1 |
| Parasuraman, R. and Riley, V., “Humans and Automation: Use, Misuse, Disuse, Abuse” | *Human Factors* 39(2): 230–253, 1997 | https://doi.org/10.1518/001872097778543886 |
| Goddard, K., Roudsari, A., and Wyatt, J. C., “Automation bias: a systematic review of frequency, effect mediators, and mitigators” | *JAMIA* 19(1): 121–127, 2012 | https://doi.org/10.1136/amiajnl-2011-000089 |
| Parasuraman, R. and Manzey, D. H., “Complacency and Bias in Human Use of Automation: An Attentional Integration” | *Human Factors* 52(3): 381–410, 2010 | https://doi.org/10.1177/0018720810376055 |
| Endsley, M. R., “Toward a Theory of Situation Awareness in Dynamic Systems” | *Human Factors* 37(1): 32–64, 1995 | https://doi.org/10.1518/001872095779049543 |
| Endsley, M. R. and Kiris, E. O., “The Out-of-the-Loop Performance Problem and Level of Control in Automation” | *Human Factors* 37(2): 381–394, 1995 | https://doi.org/10.1518/001872095779064555 |
| National Transportation Safety Board, *Descent Below Visual Glidepath and Impact With Seawall, Asiana Airlines Flight 214* | Aircraft Accident Report NTSB/AAR-14/01, adopted 24 June 2014 | https://www.ntsb.gov/investigations/AccidentReports/Reports/AAR1401.pdf |
| Dratsch, T. et al., “Automation Bias in Mammography: The Impact of Artificial Intelligence BI-RADS Suggestions on Reader Performance” | *Radiology* 307(4): e222176, 2023 | https://doi.org/10.1148/radiol.222176 |
| Krakovna, V. et al., “Specification gaming: the flip side of AI ingenuity” | DeepMind blog, 21 April 2020 | https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/ |
| Gao, L., Schulman, J., and Hilton, J., “Scaling Laws for Reward Model Overoptimization” | *Proceedings of the 40th ICML*, PMLR 202: 10835–10866, 2023; arXiv:2210.10760 | https://proceedings.mlr.press/v202/gao23h.html |
| Sharma, M. et al., “Towards Understanding Sycophancy in Language Models” | arXiv:2310.13548, 2023 | https://arxiv.org/abs/2310.13548 |
| Lightman, H. et al., “Let’s Verify Step by Step” | arXiv:2305.20050, 2023 | https://arxiv.org/abs/2305.20050 |
| Taib, A. G. et al., “Automation Bias in Action: Eye Tracking of Humans Reading Screening Mammograms with and without AI Prompts” | *Radiology* 320(1): e252590, 2026 | https://doi.org/10.1148/radiol.252590 |
| Bastani, H. et al., “Generative AI without guardrails can harm learning: Evidence from high school mathematics” | *PNAS* 122(26): e2422633122, 2025 | https://doi.org/10.1073/pnas.2422633122 |
| Budzyń, K. et al., “Endoscopist deskilling risk after exposure to artificial intelligence in colonoscopy: a multicentre, observational study” | *Lancet Gastroenterology & Hepatology* 10(10): 896–903, 2025; online 12 August 2025 | https://doi.org/10.1016/S2468-1253(25)00133-5 |
| Regulation (EU) 2024/1689 (Artificial Intelligence Act), Article 14, “Human oversight”, and Article 26(2) | *Official Journal of the European Union*, L series, 12 July 2024 | https://eur-lex.europa.eu/eli/reg/2024/1689/oj |
| National Institute of Standards and Technology, *Artificial Intelligence Risk Management Framework (AI RMF 1.0)* | NIST AI 100-1, January 2023 | https://doi.org/10.6028/NIST.AI.100-1 |
| Green, B., “The flaws of policies requiring human oversight of government algorithms” | *Computer Law & Security Review* 45: 105681, 2022; arXiv:2109.05067 | https://doi.org/10.1016/j.clsr.2022.105681 |
| Parasuraman, R., Sheridan, T. B., and Wickens, C. D., “A Model for Types and Levels of Human Interaction with Automation” | *IEEE Transactions on Systems, Man, and Cybernetics, Part A* 30(3): 286–297, 2000 | https://doi.org/10.1109/3468.844354 |

### Fact-check table

| Claim | Source / inspection | Status | Qualification |
|---|---|---|---|
| Automation leaves the operator monitoring, diagnosing the unusual case, and taking over; the more successful the automation, the less practice and the more the unused skill matters | Bainbridge 1983, full text, pp. 775–777 | VERIFIED | Paraphrase, not quotation. It combines §1.1.1 (“physical skills deteriorate when they are not used,” p. 775) with what Bainbridge calls “perhaps the final irony”: “it is the most successful automated systems, with rare need for manual intervention, which may need the greatest investment in human operator training” (p. 777). |
| The residual task includes sustained attention to rare signals, which humans do badly | Bainbridge 1983, full text, p. 776 | VERIFIED | Bainbridge cites vigilance studies (Mackworth 1950) for the claim that effective visual attention to a source where little happens cannot be maintained for more than about half an hour. |
| Operators watching highly reliable automation detect failures worse than those watching variable-reliability automation, especially under competing tasks | Parasuraman & Manzey 2010, full text, p. 384, describing Parasuraman, Molloy & Singh 1993 | QUALIFIED | The 1993 paper was not inspected. The secondary description reports 33% detection under constant reliability against 82% under variable reliability in the multitask condition, with near-perfect detection when monitoring was the only task. |
| Decision aids produce omission and commission errors | Goddard et al. 2012, full text via PMC; Parasuraman & Manzey 2010, abstract and pp. 396–397; Parasuraman & Riley 1997, abstract only | QUALIFIED | Goddard and Parasuraman & Manzey name both error types. The Parasuraman & Riley abstract describes misuse as producing “failures of monitoring or decision biases” and does not use the omission/commission terms; its full text was not inspected. |
| Instructions to be careful do not reliably remove automation bias; it appears in novices and experts | Parasuraman & Manzey 2010, abstract and summary on pp. 396–397 | VERIFIED | The abstract states that automation bias “occurs in both naive and expert participants, cannot be prevented by training or instructions.” |
| Moving from active control to passive monitoring changes what the operator understands about the current state | Endsley & Kiris 1995, abstract; Endsley 1995, abstract; Endsley 1996 chapter, full text | VERIFIED | Endsley & Kiris attribute lower situation awareness under automation to “the shift from active to passive processing.” Endsley 1996 reports that only Level 2 (comprehension) awareness was reduced, not Level 1 (perception). |
| After a failure, spectators are slower at resuming the task | Endsley & Kiris 1995, abstract; McBride, Rogers & Fisk 2014, full text via PMC | QUALIFIED | The abstract reports decrements “in decision time following a failure.” McBride et al. describe the increase in decision time as occurring only at the highest automation level. Corrected at intake: the draft also said “less accurate,” which neither source supports; McBride et al. state that “the quality of the decisions made was near ceiling for all of the groups.” The primary full text was not inspected. |
| Unused skill decays | Bainbridge 1983, p. 775; NTSB AAR-14/01, p. 100 | QUALIFIED | The body gives no citation for the general sentence; both sources state it for the skills they discuss. |
| NTSB noted that visual-approach skills can atrophy through lack of practice when crews ordinarily fly with glideslope guidance and high automation | NTSB AAR-14/01, full text, §2.5.1, p. 100 | VERIFIED | The report’s words are “these skills can atrophy through lack of practice,” said of the pilot flying, who “used the A/P regularly and typically relied on the ILS glideslope.” The essay generalizes from that pilot to crews. |
| Atrophy was one mechanism among several: mode confusion, documentation and training gaps, coordination, supervision, fatigue | NTSB AAR-14/01, full text, §3.2 Probable Cause, p. 129 | VERIFIED | The essay’s list paraphrases the probable cause and the five contributing factors. |
| Radiologists of every experience level were pulled toward incorrect BI-RADS categories suggested by a purported AI | Dratsch et al. 2023, abstract | VERIFIED | 27 radiologists read 50 mammograms; 12 of 40 test suggestions were incorrect. Accuracy on incorrect-suggestion cases fell to 19.8%, 24.8%, and 45.5% by experience group. |
| Immediate recommendation bias and longitudinal deskilling are distinct effects that often travel together | Essay’s own distinction | ORIGINAL | Illustrated by Dratsch (immediate) and Budzyń (longitudinal); not a finding of either. |
| A designated fallback can become less capable while remaining formally on duty | Synthesis of the rows above | INFERENCE | Causal chain argued, not measured. |
| Specification gaming: the system satisfies the specified objective and misses the intended one | Krakovna et al. 2020, blog post | VERIFIED | The post defines it as “a behaviour that satisfies the literal specification of an objective without achieving the intended outcome.” Blog post, not a peer-reviewed paper. |
| Optimizing hard against a learned preference proxy can keep raising the proxy score after gold-standard quality has peaked or fallen | Gao, Schulman & Hilton 2023, arXiv abstract; PMLR record | QUALIFIED | The “gold standard” is a fixed synthetic reward model that “plays the role of humans,” not human judgment. The abstract states that over-optimizing the proxy “can hinder ground truth performance.” |
| Preference-trained models learn to produce answers raters like, including agreement with the user at the expense of accuracy | Sharma et al. 2023, arXiv abstract | QUALIFIED | The paper concludes sycophancy is “likely driven in part by human preference judgments”; the essay states the mechanism more directly than the paper does. |
| Outcome-only supervision gives less information about where an error entered than step-level supervision | Lightman et al. 2023, arXiv abstract | VERIFIED | This follows from the paper’s definitions (feedback on a final result versus each intermediate step). The auditor point is marked as an inference in the body. |
| A stronger research program exists on evaluation awareness, sandbagging, and strategic concealment | Not cited in the body; checked against van der Weij et al. 2024 (arXiv:2406.07358) and Needham et al. 2025 (arXiv:2505.23836), abstracts | QUALIFIED | Both papers exist and study sandbagging and evaluation awareness respectively. The essay makes no use of their results. |
| No mature literature jointly tracks system fit to approval criteria and reviewer detection skill in one workflow over months | Author’s literature search | AUTHOR | Not an exhaustive review. No such study was found during intake either, but intake was not a literature search. |
| The two adaptations reinforce each other; the system now produces the interface through which it is reviewed | Essay’s synthesis | ORIGINAL | Offered explicitly as a synthesis, not a finding. |
| Skill decay and loss of an independent epistemic path are distinct ways a control is hollowed out | Essay’s argument | ORIGINAL | — |
| When a commercial AI missed a cancer, readers using it were less sensitive on those cases than when unaided | Taib et al. 2026, abstract | VERIFIED | 10 NHS screening readers; 60-case test set with 14 false-negative AI cases; median sensitivity 39% with AI versus 71% unaided (P = .002). Retrospective paired design. The body states the direction only. |
| Readers made fewer fixations on the cases the model failed to flag | Taib et al. 2026, abstract | QUALIFIED | The measure is fixation rate: 0.44 versus 0.47 fixations per second (P = .03). The difference is small and is a rate, not a count. |
| If the aid does not point, the human is less likely to find | Inference from Taib et al. 2026 | INFERENCE | — |
| Students with unrestricted GPT-4 scored higher in assisted practice and worse on a later unaided exam than textbook-only students; a constrained tutor avoided the penalty | Bastani et al. 2025, abstract; full text via PMC | VERIFIED | Nearly 1,000 students. GPT Base: 48% better in practice and 17% lower on the unaided exam. The abstract says the penalty was “largely mitigated” by GPT Tutor, which gave hints rather than answers. The control group had textbooks and notes. |
| Substitution is not scaffolding; review organized that way practices approval, not detection | Analogy from Bastani et al. to review work | ANALOGY | The study concerns high-school mathematics learning, not professional review. |
| After AI tools became routine in several Polish endoscopy centres, unaided adenoma detection fell below the pre-AI level; observational, not causal proof | Budzyń et al. 2025, abstract; Crossref record | VERIFIED | Four centres in the ACCEPT trial; non-AI colonoscopies in the 3 months before and the 3 months after AI introduction; ADR fell from 28.4% to 22.4% (−6.0 points). Retrospective observational design, as the essay says. |
| “Human in the loop” conflates seven distinct capabilities, and many deployments buy the first two | Essay’s decomposition | ORIGINAL | The deployment claim is the author’s judgment, not a survey. |
| The EU AI Act requires high-risk systems to be designed so they can be effectively overseen | Art. 14(1), text | VERIFIED | — |
| Assigned persons must be able, as appropriate, to understand limits, monitor for anomalies, remain aware of automation bias, interpret output, disregard or reverse it, and interrupt to a safe state | Art. 14(4)(a)–(e), text | QUALIFIED | Art. 14(4) places the duty on how the system is provided: overseers must be “enabled, as appropriate and proportionate.” The five capabilities match (a)–(e). |
| Deployers must assign people with competence, training, and authority | Art. 26(2), text; Art. 14, text | VERIFIED | Art. 26(2): “Deployers shall assign human oversight to natural persons who have the necessary competence, training and authority, as well as the necessary support.” Corrected at intake: the draft cited Art. 14, which uses that phrase only in paragraph 5, for two-person verification of remote biometric identification. |
| NIST’s AI RMF treats human–AI configurations as something to define and govern | NIST AI 100-1, full text: GOVERN 3.2, MAP 3.5, Appendix C | VERIFIED | GOVERN 3.2: “Policies and procedures are in place to define and differentiate roles and responsibilities for human-AI configurations and oversight of AI systems.” |
| Mandated oversight assumes people can perform it; when they cannot, it legitimates the system without creating a check | Green 2022, abstract (arXiv:2109.05067) | VERIFIED | Survey of 41 policies. Green: such policies “legitimize government uses of faulty and controversial algorithms.” |
| Green’s structure transfers beyond public-sector algorithms | Essay’s extension | ANALOGY | — |
| Human involvement retains value for accountability, context, legitimacy, and recovery | Essay’s argument | INFERENCE | — |
| The dishonest pattern: automation good enough that people need not practice, not good enough that they can be removed | Essay’s argument | ORIGINAL | — |
| High-reliability operations buy practice rather than waiting for a real failure | Not cited in the body; checked against 14 CFR 121.427 (recurrent training, docket dated 1970) | QUALIFIED | One regulatory example for U.S. air carriers, not a survey of high-reliability industries. |
| Intermediate control keeps situation awareness from collapsing and has experimental support | Endsley & Kiris 1995, abstract; Endsley 1996, full text; Parasuraman, Sheridan & Wickens 2000, abstract | QUALIFIED | Endsley & Kiris is the experiment: out-of-the-loop effects were greater under full than intermediate automation, per Endsley 1996. Parasuraman, Sheridan & Wickens 2000 is a design model, not experimental evidence. |
| Accountability manipulations have reduced some automation-bias effects in the laboratory; exhortation has not | Parasuraman & Manzey 2010, pp. 396–397; Goddard et al. 2012, full text via PMC | QUALIFIED | Skitka, Mosier & Burdick (2000; 181 non-pilots, simulated task) found fewer omission and commission errors under some accountability conditions. Parasuraman & Manzey call the results “not fully conclusive,” and Goddard reports one study where only internally perceived accountability mattered. Training and verification prompts had no effect in Mosier et al. 2001. |
| Recurrent training and simulation have decades of precedent; the AI-specific adaptations are design inferences | 14 CFR 121.427 (see above); essay’s own classification | QUALIFIED | The essay labels the AI-specific mechanisms as unvalidated. |
| A seeded-fault protocol with a baseline and repeated measurement tests whether review is meaningful | Essay’s proposal | ORIGINAL | A measurement design. The essay states that no result or decay curve is offered. |
| Reviewers learn stereotyped seeds; tests that add work without changing incentives get gamed | Essay’s argument | INFERENCE | — |

### Editorial note: original synthesis

**Inherited.** The ironies of automation and the decay of unused operator skill are Bainbridge’s. Automation-induced complacency under reliable automation is Parasuraman, Molloy, and Singh’s, as integrated with automation bias by Parasuraman and Manzey. The omission/commission account of automation bias, and the finding that instructions do not prevent it, come from that literature and from Goddard, Roudsari, and Wyatt’s review. The out-of-the-loop problem and the role of level of control belong to Endsley and Kiris; the types-and-levels model belongs to Parasuraman, Sheridan, and Wickens. The Asiana 214 atrophy finding is the NTSB’s. Specification gaming, reward-model overoptimization, sycophancy, and process versus outcome supervision are Krakovna et al.’s, Gao et al.’s, Sharma et al.’s, and Lightman et al.’s respectively. The observation that human-oversight mandates can legitimate a system without checking it is Green’s.

**Adapted.** The clinical and educational studies (Dratsch, Taib, Budzyń, Bastani) are used for narrower points than their authors make: Dratsch and Taib for immediate recommendation bias and a mediated evidence path, Budzyń as an observational warning about the fallback, and Bastani for the difference between substitution and scaffolding. The EU AI Act and NIST AI RMF are read as capability lists, which is an interpretation of their structure rather than a claim about how they are enforced.

**Analogical only.** Green’s analysis concerns public-sector algorithms; its extension to software review, clinical sign-off, and agent tool-use confirmation is an analogy. Bastani’s students are not professional reviewers.

**This essay’s contribution.** The distinction between human presence and a functioning control; the enumeration of that control’s validity conditions; the pairing of reviewer skill decay with machine-side optimization against approval criteria; the observation that the system under review now often authors the interface of its own review, which makes independence a separate failure from skill; and the repeated seeded-fault protocol as a way for an organization’s claim of meaningful review to fail.

**Narrowed after review.** Before intake the author narrowed the Lightman claim to “less information about where an error entered,” marked auditability as an inference, and removed a claim that outcome supervision is “easier to game.” Uses of Bastani, Budzyń, Taib, Asiana, and Green were kept at their earlier scope. At intake, verification found two sentences that the sources do not support as written: the “less accurate” half of the Endsley and Kiris claim and the Article 14 locator for the deployer staffing duty. The author removed “less accurate” and moved the staffing duty’s citation to Article 26(2); the fact-check rows above record both corrections.

**Limits.** No experiment was run for this essay, and the seeded-fault protocol has not been tried. Several sources were checked only at the abstract level, and two (Parasuraman, Molloy & Singh 1993; the full text of Endsley & Kiris 1995) only through secondary descriptions. The Budzyń comparison is observational and the Taib study has ten readers. The claim that no joint longitudinal literature exists rests on the author’s search, not a systematic review.
