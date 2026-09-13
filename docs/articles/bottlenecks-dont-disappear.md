# Bottlenecks Don't Disappear. They Move.

### A field note on constraints, second-order effects, and what stays scarce

---

## 1. The conveyor belt

Consider a line with three serial stages. Input enters Process A, passes through Process B, and leaves through Process C. Process B is the slowest stage, so B sets the throughput of the whole line. Everyone knows it. Effort, tooling, staffing, and attention have accumulated around B for years, because B is where the work piles up.

Then someone doubles B's speed.

```text
   Input ──▶ [ A ] ──▶ [ B ] ──▶ [ C ] ──▶ Output
                        2× faster    ▲
                                     │
                          the new bottleneck
```

Throughput rises. But it does not double, and it does not rise to A's capacity or to B's new capacity. It rises exactly to the capacity of C, which was never the problem before and is now the only problem. The queue that used to form in front of B forms in front of C. The people who used to be blamed for B are congratulated, and the people at C, who changed nothing, are suddenly the ones explaining themselves.

Nothing was lost. The constraint did not vanish. It moved one step downstream.

This is the whole field note in miniature. Every major innovation solves one constraint and, by solving it, exposes another. The organizations that come out ahead are not the ones that solve today's bottleneck fastest. They are the ones that spot the next one first, because the next one is not a surprise. It was there the whole time, hidden behind the constraint that was binding.

The useful question about any change is therefore not "what problem does this solve?" It is:

> What becomes the problem once this one is solved?

---

## 2. Why this is a structural consequence, not a pattern

It is tempting to describe the migration of bottlenecks as a recurring pattern, something one notices often enough to expect. It is stronger than that. In any system whose output depends on a chain of interdependent stages, it follows from the structure.

Three results from different fields say the same thing.

**Theory of Constraints.** Goldratt's formulation, popularized in the 1984 novel *The Goal*, rests on a simple claim: a system's throughput is governed by its most constrained resource, and improving any other resource does not improve throughput. The five focusing steps, set out as a numbered procedure in *The Haystack Syndrome* (1990) rather than in the novel, are a method for acting on that claim: identify the constraint; exploit it fully; subordinate everything else to it; elevate it (add capacity); and then, having done so, go back to the first step because the constraint has now moved. The fifth step is the one most often forgotten. Later formulations attach a warning to it: do not allow inertia to become the constraint. An organization that keeps optimizing the old bottleneck after it has stopped binding is not merely wasting effort. It is actively ignoring the new one.

**Amdahl's law.** Amdahl's 1967 argument about parallel computing reached the same conclusion by inspection rather than algebra — the paper contains no equations at all. He observed that data-management housekeeping had accounted for a near-constant 40% of executed instructions for a decade, that this work was inherently sequential, and that it therefore placed "an upper limit on throughput of five to seven times the sequential processing rate" no matter how much parallelism was added elsewhere. His conclusion was that "the effort expended on achieving high parallel processing rates is wasted unless it is accompanied by achievements in sequential processing rates of very nearly the same magnitude." The serial fraction was always there; it simply did not matter until everything around it got faster.

**Little's law.** In a stable queueing system, the average number of items in the system equals the arrival rate multiplied by the average time each item spends inside. Speed up one stage and the queue in front of it shrinks, but the items flow through to the next stage at a higher rate, and the queue reforms wherever capacity is next exceeded. Queues do not disappear from a system with a constraint. They relocate to the constraint.

Put the three together and the claim in the deck is not a pattern but a consequence:

```text
  01  One factor sets the limit.
      Every serial system has a binding constraint.

  02  Everything optimizes around it.
      Effort, tools, and process cluster at the limit,
      because that is where the pain is visible.

  03  Lift it, and output climbs.
      Until a different constraint becomes binding,
      which it always does.
```

### 2.1 Where the argument does not hold

Two boundaries should be stated, because the deck's compression ("it's a law") invites over-application.

First, the argument assumes serial dependency. A collection of independent processes with no shared downstream stage does not have a single binding constraint; improving one simply improves that one. Most real organizations, however, share downstream stages (review, deployment, decision-making, customer attention), which is why the pattern is so widely observed.

Second, the argument assumes demand exceeds capacity somewhere. A system with slack at every stage is limited by demand, not by any internal constraint, and improving an internal stage does nothing until demand catches up. In that case the "new bottleneck" is external: the market, the user base, the number of decisions the organization is able to make. That is still a relocation, but a relocation outside the system boundary, and it is the hardest kind to notice because no internal queue forms.

---

## 3. The pattern predates the current wave

The relocation of constraints is easy to see in retrospect and hard to see in advance, which is why history is the right place to calibrate.

| Innovation | Constraint it removed | Constraint it exposed |
|---|---|---|
| Email | Communication latency | Inbox volume; attention |
| Search engines | Access to information | Quality and provenance of information |
| Cloud computing | Hardware procurement lead time | Governance, cost control, sprawl |
| Generative AI | Cost of producing content and code | Trust, verification, attention |

Each row follows the conveyor-belt shape. The constraint that was removed had been so binding, for so long, that everything downstream had been sized to it. Nobody needed to think about inbox management when a letter took three days to arrive. Nobody needed to evaluate the quality of information when the hard part was finding any at all. Nobody needed cloud governance when provisioning a server took six weeks and a purchase order; the procurement process *was* the governance. Remove the constraint and the downstream stages, sized for the old rate, are immediately overwhelmed.

Two older observations deserve mention because they anticipate the table.

Jevons, in *The Coal Question* (1865), noted that improvements in the efficiency of coal use had increased rather than decreased total coal consumption, because cheaper energy expanded the range of uses. Efficiency at one stage raised demand, and the constraint moved from "how much work can we get from a ton of coal" to "how much coal can we extract." The general form, in which making a resource cheaper increases its consumption enough to shift the constraint elsewhere, is now called the Jevons paradox, and it applies with uncomfortable precision to content and code generation.

Simon, in a 1971 essay on information-rich organizations, put the downstream side plainly: a wealth of information creates a poverty of attention, and the scarce resource becomes the capacity to allocate attention efficiently among the sources that might consume it. That sentence, written before the personal computer, describes the last row of the table exactly.

The address of the bottleneck changes. The shape of the problem does not.

---

## 4. Every engagement is a relocated constraint

Anyone who works across organizations sees the same four moves repeatedly, and each one is a conveyor belt.

**Hire more developers.** The constraint was hands on keyboards. The new constraint is coordination: the number of communication paths grows roughly with the square of team size, and Brooks' observation from *The Mythical Man-Month* (1975), that adding people to a late software project makes it later, is a special case of the constraint moving from production to integration.

**Automate deployments.** The constraint was the release process: manual, slow, error-prone, and therefore rare. Automate it and releases become cheap and frequent, at which point the quality of what is being released is the binding constraint. Testing, review, and rollback discipline, which used to be protected by the friction of infrequent releases, now have to stand on their own. Teams that automate deployment without also investing in verification do not ship faster; they ship defects faster.

**Build better dashboards.** The constraint was visibility. Once everything is measured and displayed, the constraint is interpretation and decision quality: which of the forty panels matters, what the anomaly means, who is going to act on it. An organization can be drowning in observability and still be blind, because the dashboards moved the bottleneck from data to judgment without anyone noticing that judgment was now the limiting stage.

**Ship faster.** The constraint was delivery speed. Remove it and the constraint becomes prioritization: if anything can be built in a week, the question of *what* to build is the only question left, and it is a question that engineering velocity does nothing to answer.

Most consulting engagements are not, at root, about the problem the client names. They are about a constraint the client removed successfully, and the constraint that appeared immediately behind it, which they have not yet named. The fastest diagnostic is to ask what the organization's last big win was, and then look one step downstream of it.

---

## 5. Generative AI did not remove the constraint. It inverted it.

The current wave fits the model, with one feature that makes it unusually sharp: the constraint did not merely move, it flipped sign.

```text
   BEFORE                          AFTER
   ─────────────────────────       ─────────────────────────
   Not enough content        ──▶   Too much content
   Not enough documentation  ──▶   Too much documentation
   Not enough code           ──▶   Too much code
```

For the entire history of knowledge work, the binding constraint on written artifacts was production. Writing the document, drafting the code, producing the analysis: these were the slow stages, and everything downstream (review, decision, maintenance) was sized to the trickle that production allowed. Generation is now cheap. The downstream stages, sized for a trickle, are receiving a flood.

The scarce resource is now judgment: deciding what should exist, whether what was produced is correct, whether it is worth the attention it will consume, and who is accountable for it. None of these got faster. Several got harder, because the volume of candidates to judge has increased by orders of magnitude while the material looks more polished and therefore demands *more* scrutiny per unit, not less.

This is the same relocation seen in the deployment-automation case, applied to intellectual output rather than software releases. And it has a specific consequence for teams building with AI agents: the agent's throughput is not the system's throughput. The system's throughput is the rate at which a human, or a trustworthy verification process, can confirm the output is right. An organization that measures its AI adoption by generated volume is measuring Process B after the upgrade and wondering why the line is not twice as fast.

Documentation is the sharpest example. A system that was under-documented can now be over-documented in an afternoon. But documentation that nobody has verified, that nobody owns, and that nobody can distinguish from the stale copy sitting next to it is not an asset. It is a new bottleneck: the reader's ability to determine which of it to trust.

---

## 6. What does not move

If the bottleneck always shifts, it is worth asking whether anything stays constant. The deck names five things that have remained scarce through every wave in the table: attention, trust, judgment, coordination, and accountability. It is worth being precise about *why* these persist, because the reason tells you whether they will persist through the next wave too.

Each of them is rate-limited by human cognition or by human social process, and none of them is substitutable by throughput.

**Attention** is finite by definition. There are only so many hours in which a given person can focus, and producing more things to attend to does not produce more attention. Every innovation in the table increased the supply of things competing for it.

**Trust** is slow to earn and fast to lose, and it does not scale with output. Producing more content does not produce more trust; producing more unverified content erodes it. Trust is built through repeated verification over time, and time is the one input that cannot be accelerated.

**Judgment** is what one does with abundance: choosing, ranking, rejecting. It is the downstream stage of every abundance-producing technology, and it depends on context, taste, and accountability that cannot yet be reliably delegated.

**Coordination** is the cost of getting humans to agree on what to do. It grows with the number of people and the number of options, and both are increased by every innovation that lowers the cost of producing options.

**Accountability** is the requirement that someone own the outcome. It cannot be distributed to a tool. When a generated document is wrong, a generated deployment fails, or a generated decision is bad, a person answers for it, and the number of things a person can answer for is bounded.

These five are not immune to change, and it would overstate the case to call them permanent. What can be said is that each has been the downstream constraint in every wave so far, because each is a human-rate-limited stage that sits after production. Any innovation that increases production without touching them will relocate the constraint to one of them. That is a prediction the model makes, and it has held for every row in Section 3.

---

## 7. Four questions

The principle becomes an operating model when it is turned into questions asked before adoption, not after.

```text
  1.  What bottleneck does this remove?
  2.  What bottleneck does it create?
  3.  Who owns the new bottleneck?
  4.  Are we prepared for that responsibility?
```

The first question is the one every vendor answers for you. The second is the one the conveyor-belt model tells you to ask, and it has a concrete method: look one step downstream of the stage being improved, and ask whether that stage is sized for the new rate. The third question is where most organizations fail, because the new bottleneck usually lands on a team that did not ask for the change and has no mandate to handle it. The people at Process C did not buy the upgrade to Process B. The fourth question is whether the organization has actually resourced the new constraint, or merely noticed it.

Answering all four does not prevent the constraint from moving. Nothing prevents that. It ensures the organization is standing at the right place when it arrives.

---

## 8. Every solution creates a responsibility

The deck's closing line is that progress shifts the work; it never removes it. That is a restatement of the conveyor belt, but the word *responsibility* sharpens it usefully.

A removed constraint is a solved problem. An exposed constraint is a new responsibility, and responsibilities are owned. The question "what becomes the problem once this one is solved?" is therefore also the question "who is about to inherit work they did not sign up for?" Organizations that handle transitions well are the ones that name the new owner before the queue forms in front of them.

This suggests a different optimization target. Most teams optimize to solve today's bottleneck, which is reasonable, since it is the one causing pain. But by the time it is solved, the advantage from solving it is shared with everyone else who solved it. The durable advantage goes to the team that has already identified tomorrow's constraint and staffed it. In the current wave, that means the organizations that invested in verification, review, curation, and clear ownership *before* generation became cheap are the ones not currently drowning.

A practical exercise, which the deck poses and which works as a diagnostic for any team:

> Take your team's biggest win of the past year. What problem disappeared? Now look downstream. What appeared right after it?

If the second question has no answer, the new constraint has not yet been noticed. It is there. It is always there.

---

## 9. Conclusion

Bottlenecks do not disappear. They move, and they move in a predictable direction: downstream, to the stage that was sized for the old rate and has not been resized for the new one. This is not an observation about technology cycles. It is a consequence of how throughput works in any system of dependent stages, and it has been formalized independently in operations management, computer architecture, and queueing theory.

The current wave of generation tools is a textbook instance, distinguished only by the violence of the inversion: production, the binding constraint on knowledge work for as long as there has been knowledge work, is no longer binding, and the constraints that were always waiting behind it, attention, trust, judgment, coordination, and accountability, are now fully exposed. They were not created by the new tools. They were revealed by them.

The organizations that will handle this well are not the ones with the highest generated volume. They are the ones that asked, before adopting anything, what would become the problem once the old problem was solved, and who would own it.

---
---

## Post-article material

### Abstract

Every improvement to a constrained system relocates its binding constraint rather than removing it, a consequence formalized independently in the Theory of Constraints, Amdahl's law, and Little's law. This field note develops that principle from a simple serial-pipeline example, traces it through email, search, cloud computing, and generative AI, and argues that the current wave is distinctive because it inverted the constraint on knowledge work from scarcity of production to scarcity of judgment. It identifies five human-rate-limited resources (attention, trust, judgment, coordination, accountability) that have been the downstream constraint in every wave, and proposes a four-question operating model for anticipating where the next bottleneck will land and who will own it.

### Sources

| Source | Metadata | Used for |
|---|---|---|
| Goldratt, E. M. & Cox, J., *The Goal: A Process of Ongoing Improvement* | North River Press, 1984 | Theory of Constraints; throughput governed by the binding constraint (§2) |
| Goldratt, E. M., *The Haystack Syndrome* | North River Press, 1990, pp. 58–63 | The five focusing steps as a numbered procedure (§2) |
| Amdahl, G. M., "Validity of the Single Processor Approach to Achieving Large Scale Computing Capabilities" | AFIPS Conference Proceedings Vol. 30 (Atlantic City, Apr. 18–20), AFIPS Press, 1967, pp. 483–485 | Sequential-overhead limit on speedup; both quotations (§2) |
| Little, J. D. C., "A Proof for the Queuing Formula: L = λW" | *Operations Research* 9(3), 1961, pp. 383–387 | Little's law (§2) |
| Jevons, W. S., *The Coal Question* | Macmillan, 1865, ch. VII, "Of the Economy of Fuel" | Efficiency increasing consumption; Jevons paradox (§3) |
| Simon, H. A., "Designing Organizations for an Information-Rich World" | in Greenberger, M. (ed.), *Computers, Communications, and the Public Interest*, Johns Hopkins Press, 1971, ch. 2, pp. 40–41 | "Wealth of information creates a poverty of attention" (§3) |
| Brooks, F. P., *The Mythical Man-Month* | Addison-Wesley, 1975, ch. 2 ("The Mythical Man-Month") | Brooks' law; communication-path growth (§4) |

### Fact-check table

**Method note.** Every external claim below was checked against the primary text, or against a scan of it, in a dedicated verification pass. Two findings from that pass changed the essay and are recorded here.

| Claim (section) | Source | Status | Caveat |
|---|---|---|---|
| Throughput governed by the most constrained resource (§2) | Goldratt & Cox, *The Goal*, 1984 | Verified | The novel presents the claim narratively; it does not set out the numbered steps |
| Five focusing steps as a numbered procedure (§2) | Goldratt, *The Haystack Syndrome*, 1990, pp. 58–63 | Corrected this pass | **Originally cited to *The Goal* (1984); that attribution does not hold.** The numbered steps belong to the 1990 book. Sourced to a peer-reviewed TOC paper citing it directly, not to the primary text, which was not reachable |
| "Do not allow inertia to become the constraint" (§2) | Later formulations; the wording as commonly quoted is cited to the 2004 revised *The Goal* | Verified as later | An earlier phrasing of step 5 carries no inertia clause. The essay now says "later formulations" rather than attributing it to 1984 |
| Sequential overhead bounds achievable speedup; both quotations (§2) | Amdahl 1967 | Corrected this pass | **The paper contains no equations** — the IEEE SSCS reprint's editors' note states this explicitly. The essay originally said it "makes the arithmetic explicit"; §2 now describes the verbal argument and quotes it directly. Title, venue and pages verified |
| L = λW (§2) | Little 1961 | Verified against publisher record | Volume, issue and pages confirmed. The relocation inference is this essay's application, not Little's claim |
| Coal-efficiency improvements increased total consumption (§3) | Jevons 1865, ch. VII | Verified against primary text | "It is wholly a confusion of ideas to suppose that the economical use of fuel is equivalent to a diminished consumption. The very contrary is the truth." "Jevons paradox" is a later coinage; the essay says so |
| "A wealth of information creates a poverty of attention" (§3) | Simon 1971, pp. 40–41 | Verified against primary scan | Wording confirmed verbatim. The essay paraphrases rather than quotes |
| Adding people to a late project makes it later; communication paths grow ~n² (§4) | Brooks 1975, ch. 2 | Verified | Brooks' law appears in the eponymous chapter; n(n−1)/2 confirmed |
| Historical table rows (email, search, cloud, AI) (§3) | Essay's own synthesis | Interpretive | Illustrative, not empirical; no statistics claimed |
| The five persistent scarcities (§6) | Deck / essay synthesis | Interpretive | Explicitly hedged as "has held for every row" rather than as permanent |
| Brooks' law read as the constraint moving from production to integration (§4) | Essay's own reading | Interpretive | Brooks does not frame it this way |
| No statistics are used | — | Confirmed | — |

### Editorial note: original synthesis

- The **conveyor-belt framing** and the claim that constraints move "downstream, to the stage sized for the old rate" are the essay's synthesis of Goldratt, Amdahl, and Little; none of those sources uses this framing.
- The **inversion** argument (§5), that generative AI flipped the constraint from production scarcity to judgment scarcity, is the essay's; it draws on Simon and Jevons but neither addresses AI.
- The **five persistent scarcities** and the explanation for their persistence (human-rate-limited, non-substitutable by throughput) are the essay's synthesis, hedged as an observed regularity rather than a law.
- Reading **Brooks' law as a special case** of the constraint moving from production to integration (§4) is the essay's interpretation; Brooks describes the effect but does not frame it in constraint terms.
- The **four questions** and the **"every solution is a responsibility"** reframing originate in the author's deck.
- The **two boundary conditions** in §2.1 (serial dependency; demand exceeding capacity) are the essay's clarification and should be retained if the "law" language is kept, since they mark where it does not apply.
