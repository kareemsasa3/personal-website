---
slug: the-machine-should-explain-itself
title: The Machine Should Explain Itself
subtitle: Operational knowledge for AI agents belongs in the system, not in the agent
kind: essay
published: 2026-09-13
description: >-
  A three-layer model of what AI agents know, and why operational intent belongs
  in versioned artifacts rather than in agent memory.
series:
  name: Agent Systems
  part: 1
---

# The Machine Should Explain Itself

### Operational knowledge for AI agents belongs in the system, not in the agent

---

## 1. An experiment that measured the wrong thing

A workstation is managed through a Git repository whose purpose is to document and govern the machine: what is installed, how it is configured, why certain non-obvious choices were made, and what an operator (human or automated) is permitted to do. An AI agent had been working inside that repository for some time.

The workstation holds several GitHub identities: personal accounts and one identity used for consulting work. Access is separated at the SSH layer with host aliases, each pinned to its own key:

```ssh
Host gh-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/personal_github
    IdentitiesOnly yes

Host gh-company
    HostName github.com
    User git
    IdentityFile ~/.ssh/company_github
    IdentitiesOnly yes
```

A repository selects its identity through its remote (`git@gh-company:Company/example-repo.git`), and consulting commits must carry the company author identity (`user.email = engineer@company.example`).

An audit of the consulting tree found several repositories still pointing at a personal alias with a personal author email. They were corrected. Ordinary hygiene.

Then the question that motivates this article: did the *workstation-management system* know the convention? If a fresh agent were dropped into the repository tomorrow, could it tell that consulting repositories must never authenticate or commit under a personal identity?

The first test asked the agent what it knew about the identity configuration and forbade it from inspecting files or live state. It answered carefully and correctly: almost nothing. It knew what was already in its immediate context, could infer that multiple identities probably existed, could describe common SSH-alias patterns, and was explicit about which parts were knowledge and which were inference.

That answer was correct, and the test was wrong. It measured whether the agent happened to remember the machine. The question that matters for a governed system is different:

> Can a fresh agent reconstruct the intended configuration by reading the system's own documentation, without inspecting live state and without any prior conversation?

That is not a memory test. It is a documentation test, with a clear pass condition: either the intended identity model is recoverable from the repository's artifacts, or it is not. If not, the deficiency is in the system, not the agent.

The thesis the rest of the article develops:

> The most robust way to give AI agents durable operational knowledge is not to make them remember systems better. It is to design systems whose intended state, reasoning, and live behavior can be independently recovered, inspected, and reconciled by any sufficiently capable agent.

The anecdote is deliberately mundane. Its value is that it isolates the architectural question from any claim about how clever a model is.

---

## 2. Three epistemic layers

When an agent answers a question about a system, the answer is assembled from at most three sources. Conflating them is the root of most misjudgments about what agents "know." The split below is a proposed model, not established terminology, but each layer corresponds to something concrete.

```text
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: Immediate-context knowledge                        │
│  Prompt, conversation, retrieved memory, tool output so far  │
│  "What the agent has in front of it right now"               │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Documented intended state                          │
│  Repos, runbooks, ADRs, manifests, IaC, policy, reasoning    │
│  "What the system is supposed to be, and why"                │
├──────────────────────────────────────────────────────────────┤
│  Layer 3: Observed live state                                │
│  Config files, remotes, units, listeners, APIs, logs         │
│  "What the system actually is, right now"                    │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Immediate-context knowledge

Whatever is present in the model's current window: system prompt, conversation, retrieved memories or summaries, and tool output already returned. It is the layer most often mistaken for "what the agent knows," and the least trustworthy as a durable store. Its limits are structural:

- **Finite windows**, used non-uniformly. Liu et al. (2023) found that on multi-document question answering and key-value retrieval, model performance is highest when the relevant information is at the beginning or end of the input and degrades significantly when it sits in the middle.
- **Session boundaries.** What one conversation established is absent from the next unless something carries it forward.
- **Lossy carry-forward.** Summaries compress. "The identity model was fixed" has discarded which repositories, which aliases, and what the rule is.
- **Staleness.** A memory written last month describes last month's system.
- **Latent-but-unsurfaced information.** The information exists in a file the agent *could* read, but nothing retrieved it. From inside the window, it is indistinguishable from nonexistent.

The first SSH test operated entirely here. The agent had almost nothing and said so. A *good* agent confined to Layer 1 should look ignorant about system specifics; confident detail from an agent denied inspection is a warning sign.

### 2.2 Documented intended state

What the system's owners have written down about what it is supposed to be: architecture documents, runbooks, inventories, Architecture Decision Records, infrastructure-as-code declarations, policy and governance files, and reasoning that captures why non-obvious choices were made.

The defining property is recoverability by a stranger. A fresh agent or engineer should be able to reconstruct the operational model from these artifacts alone. If intent can only be reconstructed by asking the person who built it, the system has no Layer 2; it has an oral tradition.

Layer 2 is also where *purpose* lives. Structured declarations (a Kubernetes `spec`, a Terraform configuration, a policy-as-code rule) encode intent at the level of values: this is the state the system should exhibit. Only Layer 2 in its fuller sense can carry intent *above* the values, as invariants and reasons: live state can show that a key is used, and a declaration can require that it be used, but only a statement of purpose can say that a category of repositories must never use a different one, whatever the current keys happen to be.

### 2.3 Observed live state

What the machine reports when inspected: `~/.ssh/config`, `git config --list --show-origin`, remotes, systemd units, listening sockets, package versions, cloud resource listings, deployed manifests, API responses, logs. Layer 3 is authoritative about *what is* and silent about *what should be*. A remote pointing at `gh-personal` is a fact; whether it is a defect is not a Layer 3 question.

### 2.4 Why the separation matters

| Layer | Answers | Typical failure |
|---|---|---|
| Immediate context | What is in front of the agent now | Absent, stale, or compressed; mistaken for knowledge |
| Documented intent | What the system should be, and why | Stale, ambiguous, contradictory, or implementation-only |
| Observed live state | What the system is | Correct but unexplained; drifted; incompletely inspected |

The power lies in comparing Layers 2 and 3. Intent alone is aspiration; observation alone is inventory. The difference is drift, and drift is where operational risk lives. An agent that reads both, and reports which layer each statement came from, is a reconciliation instrument. An agent with only Layer 1 is a conversational partner with a good memory for the last thing you told it.

The second SSH test is a Layer 2 audit with Layer 3 deliberately withheld. That is the right control: it isolates documentation quality from the agent's ability to read live files.

---

## 3. This is a reconciliation problem, and the shape is familiar

Nothing in the preceding section is new to infrastructure engineering. Configuration management, orchestration, and desired-state deployment systems have converged on the same core operation: declare intended state, observe actual state, act on the difference. The AI-agent case is a variation on that pattern, not a departure from it.

### 3.1 The controller pattern

The Kubernetes documentation introduces controllers through the control-loop idea: a thermostat setting is the *desired state*, the room temperature is the *current state*, and the thermostat acts to bring the current state closer to the desired one. In Kubernetes, objects carry a `spec` field representing desired state, and the controller for that resource is responsible for making current state come closer to it. Because the controller re-derives its actions from the declared spec and the observed world on every pass, it does not need to remember what it did last time.

```text
        desired state (spec)
                 │
                 ▼
          reconciliation
                 │
                 ▼
        observed (current) state
```

The same shape recurs across the discipline. Convergent configuration management, the model behind the CFEngine and Puppet family of tools, applies idempotent operations repeatedly to move a host toward a declared state regardless of its starting point. Terraform stores state that maps real-world resources to configuration; `terraform plan` compares the current configuration to that prior state and proposes changes, and a refresh-only plan reads the current settings of managed remote objects and updates the recorded state to match without modifying the objects themselves, which is how drift between the record and the world becomes visible. The OpenGitOps principles require that a GitOps-managed system's desired state be declarative, versioned and immutable, pulled automatically by software agents, and continuously reconciled: agents "continuously observe actual system state and attempt to apply the desired state."

In each case the architectural bet is identical: **do not make the actuator the source of truth about intent.** Put intent in a durable, inspectable declaration and make the actuator stateless with respect to it.

One limit of these systems deserves emphasis because it is central to what follows. Terraform's refresh-only plan answers *is this what exists?* It does not answer *is this still what we want?* A declaration can be perfectly in sync with the world and perfectly out of sync with what anyone intends. Desired-state tooling checks configuration against reality; nothing in it checks configuration against purpose. That gap is where Layer 2 in the sense of this article, intent and not merely declaration, has to do its work.

### 3.2 The agent variant

Applying the pattern to an agent operating over a system:

```text
     documented intended state          (Layer 2)
                 │
                 ▼
     agent inspection + reasoning
                 │
                 ▼
     observed live state                (Layer 3)
                 │
                 ▼
     difference / drift analysis
                 │
                 ▼
     proposed or authorized remediation
                 │
                 ▼
     verification + documentation update
```

Three properties distinguish this from a controller, and each drives a design choice.

**Intent is partly prose.** A controller's desired state is fully structured. Much of what an agent needs about a real system (why the consulting tree is isolated, which deviations are accepted, what "on-demand" means for a given service) is not expressible as a schema without losing meaning. Agents can read prose, and that is much of their value here. But prose intent is harder to diff, harder to validate mechanically, and easier to leave stale.

**The loop is not hot.** A controller reconciles continuously and autonomously. Agent reconciliation is episodic, human-initiated, and gated at remediation. This is a feature: the agent's judgment about what constitutes drift is fallible in ways a type-checked `spec` is not, and its remediation actions are less constrained than a controller's fixed operation set.

**Authority is graduated.** A controller has full authority over the objects it owns. An agent should read Layer 2 freely, read Layer 3 through a bounded read-only interface, propose changes, and act only when authorized within a declared scope. Section 6 develops this.

The value of the analogy is not that agents are controllers. It is that the principles that make controllers robust (externalized intent, stateless re-derivation, explicit drift, minimal idempotent change) apply directly, and violating them has the consequences it has always had.

---

## 4. Effective capability is a property of the environment

Across the two SSH tests the underlying model was unchanged; what changed was the evidence available to it. Denied inspection, it appeared to know almost nothing. Given the repository, it can reconstruct the identity model, notice whether the consulting-tree invariant is written down, and identify which files would need to change. No increase in base-model capability explains the difference. Its *epistemic environment* changed.

This is routinely misread. Observers see an agent with rich tool access produce a precise, grounded analysis and conclude the model is strong; they see the same model without tools produce a cautious non-answer and conclude it is weak. Both attribute to the model something that belongs to the surrounding system.

An engineering intuition, not a law:

```text
effective agent capability
  ≈ model capability
  × retrieval quality
  × tool access
  × source quality
  × verification ability
```

The multiplicative form does conceptual work: a near-zero in any factor collapses the result. A strong model with no retrieval is confined to Layer 1. A strong model with excellent tools pointed at stale documentation will confidently reconstruct the wrong intended state. A strong model with good tools and good sources but no read access to Layer 3 can describe intent but cannot detect drift.

The research base for the retrieval and tool factors is well established. Lewis et al. (2020) showed that combining a parametric language model with a neural retriever over an external corpus, and conditioning generation on the retrieved passages, improves results on knowledge-intensive tasks and yields more factual output than a parametric-only baseline. Toolformer (Schick et al., 2023) showed that a language model can learn, self-supervised, to insert calls to a fixed set of external APIs (a calculator, a question-answering system, search, translation, a calendar) and incorporate the results into its predictions. ReAct (Yao et al., 2023) interleaves reasoning traces with actions against an environment, the pattern that agent tool use now generally follows. The systems-side corollary is the one this article is concerned with: for a fixed model, what is placed in, and kept out of, its context is often the dominant lever on its quality.

### 4.1 Implications for benchmarking

If capability is substantially environmental, benchmarks that hold the environment fixed measure the model, and benchmarks that vary it measure the system. Both are legitimate; they are not interchangeable.

For a team evaluating an agent for operational use, the environmental factors are the ones under its control. It cannot make a model smarter. It can make documentation recoverable, inspection tools safe and complete, and sources of truth unambiguous. Those investments raise the effective capability of every agent that will ever touch the system, including ones not yet released, and of every human too.

The corollary for the SSH experiment: an agent that fails to reconstruct the identity model from the repository is not, by itself, evidence of a poor agent. It is evidence about the repository.

---

## 5. Designing an agent-legible system

"Agent-legible" is a proposed term for a system whose intended state and reasoning can be recovered by a capable agent from the system's own durable artifacts, without reliance on prior conversation. The properties are almost entirely ones good engineering already asks for: inspectable, version-controlled, attributable, reviewable, diffable, reproducible (two agents given the same artifacts reconstruct the same model), machine-readable where structure is cheap, and readable by a new engineer and an agent alike, because in practice they need the same things.

### 5.1 Responsibilities, not filenames

A layout such as `SYSTEM.md`, `ARCHITECTURE.md`, `REASONING.md`, `OPERATIONS.md`, `INVENTORY.md`, `SECURITY.md`, plus `docs/`, `adr/`, `config/`, `infra/`, `scripts/`, and `audits/` is one local convention. What generalizes is the set of responsibilities that must be discharged somewhere an agent can find them:

| Responsibility | Question it answers for a fresh agent |
|---|---|
| Identity and access model | Who or what authenticates to what, with which credentials, and which combinations are forbidden |
| Inventory and ownership | What exists, and which repository or team owns each component's configuration semantics |
| Expected configuration | The declared values the live system should exhibit |
| Design decisions | Why the system is shaped this way; alternatives rejected |
| Operational procedures | How routine and emergency operations are performed |
| Known deviations | Where live state is *expected* to differ from the ideal, and why that is accepted |
| Deferred work | What is known to be wrong or incomplete but not yet addressed |
| Agent and operator boundaries | What may be inspected, proposed, and changed, and by whom |
| Provenance | For each claim, how and when it was established |
| Validation procedures | How to check that the system is in its intended state |

Two of these are most often missing. **Known deviations** prevent an agent from reporting accepted reality as drift; without them, every fresh reconciliation rediscovers the same "problem." **Agent boundaries** are what make agent access safe enough to be broad enough to be useful. A minimal governance policy for an agent operating over a system looks like this in outline:

```text
- Repository edits and live-system changes are separate permissions.
  Authorization for one does not imply the other.
- Live access is read-only unless the current task explicitly grants
  mutation, and then only for named targets.
- Enumerate the mutation classes that are never implied: service
  lifecycle, package operations, privilege escalation for writes,
  changes outside the repository.
- When documentation, tracked configuration, and live state disagree,
  report the disagreement. Do not pick a winner by assumption.
- Before any consequential change: state the evidence, expected
  effect, validation, and rollback; then stop for authorization.
```

The last rule is the operational heart of Section 7.

### 5.2 Documented implementation is not documented intent

The distinction that matters most, and the one the experiment made concrete, is this:

```text
documented implementation  !=  documented intent
```

A tracked SSH config can prove that `Host gh-company` uses key X. It cannot, by itself, establish that all consulting repositories must use the company identity. The first is a value; the second is an invariant the value exists to serve:

```text
Repositories under the consulting tree must authenticate to GitHub with
the company SSH identity and commit under the company author identity.
No repository under that tree may use a personal alias or personal email.
```

The two are not redundant. Configuration can be correct while the invariant is violated (a repository cloned with the wrong remote). The implementation can change entirely (aliases renamed, keys rotated, a move to directory-conditional Git configuration) while the invariant stands unchanged. An agent holding only the implementation can report what is configured. An agent holding the invariant can report whether the configuration *achieves its purpose*, and can still do so after the implementation has been refactored beyond recognition.

Nygard's Architecture Decision Record format (2011) is built for exactly this: each record captures the context that motivated a decision, the decision itself, and its consequences. The code shows what was done; the record preserves why, which is what a future maintainer needs in order to change it safely. ADRs were designed for humans and turn out to suit agents well, being short, dated, versioned, and explicit about what was considered.

The workstation repository illustrated the failure directly. It contained a tracked mirror of `~/.ssh/config`. On inspection, the mirror was stale, and nothing in the repository said what role it played: authoritative declaration, reference copy, or historical snapshot. It looked like Layer 2 material and functioned as an old Layer 3 snapshot. A configuration copy that accurately mirrored live state at some point is not documented intent unless someone has established that the mirrored state is *intended*, and has said so.

### 5.3 Correct is not the same as enforced

A second result from the live inspection sharpens the point further. After remediation, every consulting repository was correct. But the correction had been applied as repository-local overrides:

```text
global Git identity                  = personal email
~/code/consulting/<repo>/.git/config = company email   (each, individually)
```

There was no conditional include, hook, or other directory-aware rule selecting the company identity for the consulting tree. The observed state matched the invariant; the architecture did nothing to keep it that way. A fresh clone under `~/code/consulting/` would silently inherit the personal identity, and the invariant would be violated again by the very next routine action.

This is a third thing, distinct from both documented intent and observed correctness:

```text
observed correctness   the consulting repos are right today
documented intent      the rule says they must be right
enforced policy        the system makes them right by construction
```

A system can satisfy any two and still be defective. Intent plus observed correctness without enforcement is right today and likely to drift again. Observed correctness plus enforcement without documented intent works, but no future operator can say why, or safely change it. Intent plus enforcement with observed drift means the rule exists and is being violated now, which usually indicates the enforcement mechanism has a gap or is being bypassed.

Git supports directory-conditional configuration (`includeIf "gitdir:..."`), so the enforced version is straightforward: default identity personal, a rule scoped to the consulting tree that selects the company identity. The mechanism is not the point. The point is that a reconciliation pass which stops at "drift corrected" has verified Layer 3 against Layer 2 once, and left the system free to drift again. An agent that has recovered the invariant can ask the further question: *what, structurally, preserves this?* An agent that has only recovered the configuration cannot.

### 5.4 Legible by design, not by archaeology

A documentation-only test of the workstation's `~/code` hierarchy produced a subtler finding. A fresh agent could partially reconstruct the workspace topology:

```text
~/code/
    personal/
    consulting/
    selfhosted/
```

but only by assembling fragments: paths embedded in systemd units, a helper script, references in old operational notes, a taxonomy document that turned out to be stale. No current artifact intentionally defined the layout model. The topology existed operationally; the policy that produced it was effectively unowned.

A system in this condition is legible by archaeology. A patient agent or engineer can dig the intent out of the sediment of implementation, and will often get it approximately right. But archaeology is expensive, its conclusions are inferences rather than documented facts, and it fails silently when the sediment is misleading. Layer 2 done properly means that the intent is stated once, in an owned artifact, so that no one has to excavate it. The claim is about the *policy*, not the contents: the layout model and the rule for what belongs where should be owned and documented, while the current set of repositories under each directory is inventory, and inventory can be discovered dynamically each time it is needed.

### 5.5 Where structure ends and prose begins

Structure the things that will be *compared*; write prose for the things that will be *understood*. Expected values, inventories, ownership tables, and validation commands are compared against live state and benefit from a machine-readable form. Design reasoning, invariants with exceptions, accepted deviations, and operational philosophy are read for meaning; forcing them into a schema loses nuance or produces a schema nobody maintains. Whatever the form, each substantive claim should carry enough provenance (what established it, when) that staleness is visible rather than latent.

---

## 6. A safe reconciliation workflow

The loop of Section 3.2 as a phased procedure. The phases are separated deliberately; the reason follows them.

**Phase 1: Recover intended state.** Read documentation, declared configuration, ADRs, and governance files. Do not inspect live state. Produce an explicit model of what the system is supposed to be, each element tagged with its source artifact and any ambiguity noted. This output is a deliverable in itself: it answers the second SSH question directly, and gaps found here are documentation defects, found before live inspection could paper over them.

**Phase 2: Inspect observed state.** Using read-only commands and APIs within the declared boundary, collect evidence. Record the exact command or query and its output for every claim.

**Phase 3: Compare and classify.** For each element of the intended model, and for each observed item the model does not account for:

| Classification | Meaning |
|---|---|
| Matches intent | Observed state agrees with documented intent |
| Drifted | Observed state disagrees with documented intent |
| Undocumented | Observed, but no documented intent exists for it |
| Ambiguous | Documentation admits more than one reading, or sources conflict |
| Unverifiable | Intent is documented but could not be checked within scope |

The last two are where agents most often fail silently. Resolving ambiguity by picking the likely reading, or reporting an unverifiable item as matching, converts uncertainty into false confidence.

**Phase 4: Explain.** For each drifted, undocumented, or ambiguous item: evidence, likely operational consequence, severity. This is the report a human reviews, and every statement in it should be checkable against the Phase 2 record.

**Phase 5: Remediate, only if authorized.** The minimal change that resolves a specific finding. No batching of unrelated fixes; no cleanup "while here."

**Phase 6: Verify.** Re-inspect the affected state with the same read-only methods as Phase 2.

**Phase 7: Update durable knowledge.** If the *intended* design changed, update Layer 2 so the next fresh agent reconstructs the new model. If only live state changed to match existing intent, update provenance. If the finding was of the Section 5.3 kind (correct but unenforced), the remediation may itself be a Layer 2 change: adding the rule that preserves the invariant.

### 6.1 Why the phases are separated

The alternative, an agent that discovers and mutates in one interleaved pass, is faster and worse. The agent forms its model of intent while already changing the system, so the model is shaped by what it has just done. A misreading of documentation is acted on before anyone reviews it. The report describes a system that no longer exists. Authorization cannot be scoped, because the set of changes is not known until they have been made.

Separating Phase 1 from Phase 2 has a further benefit the experiment illustrates: it tests documentation independently of live state. An agent that reads both at once will fill documentation gaps from observation without noticing, and the report will say "intent recovered" when what happened was "live state observed and assumed intended." The stale SSH mirror of Section 5.2 is exactly what that failure looks like when it has been committed to a repository.

### 6.2 Epistemic status is part of the output

Every statement the agent makes should carry its status:

```text
documented fact   found in artifact X
observed fact     output of read-only command Y at time T
inference         follows from facts A and B
assumption        not established; adopted to proceed; must be confirmed
unknown           could not be determined within scope
```

This is the mechanism by which a reviewer spends attention where it matters. A report of documented and observed facts needs a light review. A report with three assumptions in the identity section needs those three lines read carefully.

---

## 7. Failure modes

The architecture has well-defined ways to fail. Most are failures of Layer 2, the layer teams are least accustomed to treating as engineered infrastructure.

**Stale documentation.** The agent performs Phase 1 flawlessly and reconstructs an intended state that was true two migrations ago. Every subsequent finding is a false drift report, and the proposed remediations would revert legitimate changes. Provenance makes this visible; a documentation update as part of the definition of done for any live change (Phase 7) prevents it. Note that desired-state tooling does not help here: as Section 3.1 observed, refresh checks the declaration against the world, not against anyone's current intent.

**Correct but undocumented.** The system works; nobody can say why. A fresh reader sees configuration with no stated purpose, cannot distinguish load-bearing detail from accident, and either leaves it alone out of fear or changes it out of ignorance. Most long-lived systems are in this state, and it is what the first SSH test would have labeled "the agent knows nothing" when the precise diagnosis is "the system was never written down."

**Correct but unenforced.** Section 5.3. Drift has been corrected; nothing prevents its recurrence. This is easy to miss because a Layer 2 versus Layer 3 comparison passes.

**Documentation and live state disagree.** Ordinary drift. The architecture handles it well *provided* the disagreement is surfaced rather than resolved by assumption. The failure is not the drift; it is an agent deciding which side is right.

**Multiple sources claim authority.** README says one thing, the IaC declares another, a shell script does a third, production does a fourth. Without declared precedence an agent picks one, usually the most structured or most recently read. The remedy is an explicit source-of-truth policy: which artifact is authoritative for which class of fact, and what to do on conflict. "Tracked configuration is authoritative for values; the reference document is authoritative for intent; on conflict, report both and stop" is a workable minimum.

**Human-only or machine-only documentation.** Long narrative with operative facts buried mid-paragraph is hard to compare against and, per Section 2.1, may not be retrieved at all from a long context. A pile of YAML with no stated purpose is complete implementation and absent intent: the agent can detect that a value differs from the declaration but not whether the declaration is still wanted or what an accepted deviation looks like. Section 5.5's rule addresses both.

**The agent silently fills gaps.** Agents are disposed to produce complete answers. When the gap is in documentation, the filled content becomes a fabricated intended state; when it is in observation, a fabricated fact. This is the single most important behavioral requirement and the reason Section 6.2 exists. An agent operating over real infrastructure must be instructed, and evaluated, on its willingness to say "unknown" and "unverifiable." The first SSH test, whatever else it measured, demonstrated the correct behavior.

**Tool access is too broad.** The environmental view of capability tempts toward "more access, more capability." But read and write are asymmetric risks, and "read everything" is not a safe default either. Read-only inspection should be bounded to the system under reconciliation: an agent asked about a workstation's identity model does not need the private keys, credentials in unrelated dotfiles, or repositories the governance layer assigns to another owner. Every file an agent reads enters its context and, depending on deployment, may enter logs or memory. Mutation should be off by default, enabled per task, scoped to named targets, and separated from discovery. Authorization to reconcile documentation is not authorization to reconcile the machine.

---

## 8. Reasoning as a versioned artifact

Engineering versions code, infrastructure declarations, schemas, and configuration. The argument here implies versioning one more thing: the reasoning that explains why the system has its shape. Concretely: invariants that must remain true; rejected alternatives and why; trust boundaries and their placement; operational philosophy ("services in this class are on-demand; always-on is drift, not design"); the intent behind configuration that would otherwise look accidental.

This converts reasoning from something that lives in an author's head, decays over months, and leaves with them, into an inspectable artifact with a diff history. For an agent it is the difference between detecting a violation of purpose and detecting only a change in value.

The tradeoff is real. Not every thought deserves persistence. A reasoning corpus so large that the load-bearing invariants are lost among transient notes is functionally equivalent to none, and worse for retrieval. The discipline is editorial: record the decisions a future maintainer would need in order to change the system safely, at the moment they are made, when context is cheapest to capture. ADRs offer a useful convention: accepted records are superseded rather than edited, so the history is preserved without any one document growing unbounded.

A practical test: would a fresh agent running Phase 1 six months from now reach a wrong conclusion about intent without this? If yes, write it down. If the reasoning only explains a choice obvious from the configuration, it is noise.

---

## 9. The operator was always the wrong place to keep it

Nothing in this architecture is specific to AI agents. The underlying claim is older and broader than "agents work better with context": **operational intelligence should be recoverable from the system rather than resident in the operator.** The operator may be the original engineer, a new maintainer, an incident responder at three in the morning, an auditor, or an agent. Each needs recoverable intent, explicit known deviations, a stated source of truth, and reasoning attached to non-obvious decisions. Each is harmed by stale documentation, undocumented live state, and conflicting authorities.

What agents add is not a new requirement but a new and unusually honest test. Human readers are forgiving: they fill gaps from experience, ask a colleague, or guess and usually get away with it, and a system can run for years on that tolerance without anyone noticing that the documentation does not actually say what everyone believes it says. An agent given the artifacts and denied everything else has exactly the artifacts. If it cannot reconstruct the intended state, the artifacts are insufficient, and the humans have been getting by on something other than documentation. The consulting-tree inspection and the `~/code` archaeology both surfaced conditions that had been invisible to the people who lived with the machine daily, precisely because those people carried the missing intent in their heads.

Designing for agent legibility therefore does not displace existing practice. It enforces it, by providing a cheap, repeatable, unsentimental check on whether the system can explain itself to anyone who did not build it.

---

## 10. Conclusion

The experiment began as a question about what an agent remembered and became a question about what the system had made recoverable. That reframing is the whole argument. Persistent agent memory is convenient and will improve, but it is the wrong home for canonical operational truth: private to one agent, invisible to review, undiffable, unattributable, stale by construction. The right home is where well-run infrastructure has always kept it: close to the system, in versioned artifacts that declare intent separately from implementation, and that a stranger can read.

The desired-state pattern underlying controllers, GitOps, and configuration management already encodes most of this. It externalizes intent, keeps the actuator stateless with respect to it, and treats the difference between declared and observed as the primary signal. What it does not do, and what this article argues an agent-legible system must add, is carry *purpose* alongside declaration, so that a reconciler can ask not only "does this match?" but "is this still what we want, and what keeps it true?"

The fresh-agent test makes the standard concrete:

1. Give a capable agent the system's durable artifacts.
2. Give it no prior conversation.
3. Deny it live-state inspection.
4. Ask it what the system is supposed to be.
5. Examine what it cannot establish.

Every gap in step 5 is one of two things: a documentation or architecture finding, or an explicit scope boundary that the system itself declares. "Unknown because the documentation is deficient" and "unknown because the artifacts say this is outside the system" are different results; the second is a successful Layer 2 answer. If the agent cannot tell which kind of unknown it is facing, that is itself the finding, and it was a finding before the agent arrived. Then, in a separate pass, grant read-only inspection and measure drift, including the drift that has been corrected but not prevented. If the agent can answer step 4, the machine explains itself. If it cannot, that is the defect to fix.

---
---

## Post-article material

### Abstract

An experiment asking an AI agent about a workstation's SSH and Git identity configuration showed that the useful question was not whether the agent remembered the system but whether the system's own documentation was sufficient for a fresh agent to reconstruct its intended state. The article proposes a three-layer model of agent knowledge (immediate context, documented intended state, observed live state), connects it to the desired-state reconciliation pattern behind Kubernetes controllers, GitOps, and configuration management, and argues that those systems check declaration against reality but not against purpose. It proposes "agent-legible" system design, a phased and authorization-gated reconciliation workflow, and a practical fresh-agent test, and argues that the underlying principle, operational intelligence recoverable from the system rather than resident in the operator, serves human maintainers as much as agents.

### Sources

| Source | Publication metadata | Link |
|---|---|---|
| Kubernetes documentation, "Controllers" | Kubernetes project, concept page; source `content/en/docs/concepts/architecture/controller.md` (current `main`) | https://kubernetes.io/docs/concepts/architecture/controller/ |
| OpenGitOps, "GitOps Principles" | OpenGitOps project (CNCF); `PRINCIPLES.md` in `open-gitops/documents` (current `main`) | https://opengitops.dev/ ; https://github.com/open-gitops/documents/blob/main/PRINCIPLES.md |
| HashiCorp Terraform documentation: "State", "Command: plan", "Command: refresh" | Terraform v1.13.x documentation set | https://developer.hashicorp.com/terraform/language/state ; https://developer.hashicorp.com/terraform/cli/commands/plan ; https://developer.hashicorp.com/terraform/cli/commands/refresh |
| Git documentation, `git-config(1)`, "Conditional includes" | Git project, `Documentation/config.adoc` (current `master`) | https://git-scm.com/docs/git-config#_conditional_includes |
| OpenSSH, `ssh_config(5)` | OpenSSH portable, `ssh_config.5` (current `master`) | https://man.openbsd.org/ssh_config |
| Nygard, M., "Documenting Architecture Decisions" | Blog post, 15 Nov 2011, thinkrelevance.com; template (Title / Status / Context / Decision / Consequences) | http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions |
| Lewis, P. et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" | arXiv:2005.11401, 2020 | https://arxiv.org/abs/2005.11401 |
| Liu, N. F. et al., "Lost in the Middle: How Language Models Use Long Contexts" | arXiv:2307.03172, 2023 | https://arxiv.org/abs/2307.03172 |
| Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., Cao, Y., "ReAct: Synergizing Reasoning and Acting in Language Models" | ICLR 2023; arXiv:2210.03629 | https://arxiv.org/abs/2210.03629 |
| Schick, T. et al., "Toolformer: Language Models Can Teach Themselves to Use Tools" | arXiv:2302.04761, 2023 (Meta AI) | https://arxiv.org/abs/2302.04761 |

Removed during source verification: Burgess, "A Site Configuration Engine" (1995), and the Anthropic engineering post on context engineering. Neither could be verified against primary text during this pass; the sentences that depended on them were rewritten to stand without citation (convergent configuration management is described as a class of tools, and the context-engineering point is stated as this article's own corollary).

### Fact-check table

| Claim (section) | Source | Status | Caveat |
|---|---|---|---|
| Control loop framing; thermostat example; `spec` represents desired state; controller makes current state closer to desired (§3.1) | Kubernetes `controller.md` | Verified against source text | Paraphrased; no direct quotation |
| Desired state must be declarative; versioned and immutable; pulled automatically by software agents; continuously reconciled. Quoted: agents "continuously observe actual system state and attempt to apply the desired state" (§3.1) | `open-gitops/documents/PRINCIPLES.md` | Verified; quotation verbatim | No version number stated in the article |
| Terraform state maps real-world resources to configuration; `plan` compares current configuration to prior state; a refresh-only plan reads current settings of managed remote objects and updates state to match without modifying them (§3.1) | Terraform v1.13.x docs (`state/index.mdx`, `plan.mdx`, `refresh.mdx`) | Verified | Standalone `terraform refresh` is documented as deprecated in favor of `-refresh-only`; the article uses the refresh-only phrasing |
| Refresh answers "is this what exists?" not "is this still what we want?" (§3.1, §7) | Article's own inference from the verified semantics | Synthesis | Presented as this article's framing, not a documentation claim |
| `includeIf "gitdir:..."` conditional includes (§5.3) | Git `Documentation/config.adoc` | Verified | — |
| `IdentitiesOnly` restricts ssh to configured identity files (§1) | OpenSSH `ssh_config.5` | Verified | — |
| Nygard ADR format (2011) captures context, decision, consequences (§5.2) | Nygard template as reproduced in the ADR reference repository, with dated link to the original post | Verified (template text, URL, date) | The gloss "code shows what; record preserves why" is the article's, not quoted from Nygard |
| Lewis et al.: retriever + parametric LM conditioned on retrieved passages; improves knowledge-intensive tasks; more factual than parametric-only (§4) | arXiv:2005.11401; characterization checked against the Hugging Face model documentation for RAG | Verified (title, ID, characterization) | Venue omitted; characterization limited to what the abstract supports |
| Toolformer: self-supervised learning to call a fixed API set (calculator, QA, search, translation, calendar) and incorporate results (§4) | arXiv:2302.04761 abstract | Verified | Venue omitted; article does not claim Toolformer demonstrates interactive agency |
| ReAct: interleaves reasoning traces with actions; Yao et al., ICLR 2023 (§4) | Author repository bibtex; arXiv:2210.03629 | Verified (title, authors, venue) | — |
| Lost in the Middle: multi-document QA and key-value retrieval experiments; performance best at beginning/end of context, degraded in the middle (§2.1) | arXiv:2307.03172; author repository | Verified (title, ID, both experimental tasks) | The positional finding is the paper's titular result; venue omitted |
| Workstation findings: stale SSH mirror with undocumented role; consulting repos correct via per-repo overrides with no conditional include; `~/code` topology recoverable only from fragments (§5.2–5.4) | Author's own inspection | Operator-reported | Sanitized; details confirmed by the author against the audit record before publication |
| No statistics are used | — | Confirmed | — |

### Editorial note: original synthesis

Presented as proposed models or coined terms, and signaled as such in the text:

- **Three epistemic layers** (immediate context / documented intent / observed state). The layers map to established concepts; the framing and its application to agent epistemics is this article's.
- **Epistemic environment** as the locus of effective agent capability, and the **effective-capability formulation** (§4), labeled an engineering intuition.
- **"Agent-legible system"** (§5).
- **Observed correctness / documented intent / enforced policy** (§5.3), including the "any two is still defective" observation.
- **"Legible by archaeology"** (§5.4).
- **The seven-phase workflow** and **five-way classification** (§6).
- **The fresh-agent test** (§10), including the distinction between deficient-documentation unknowns and declared-scope unknowns.
- **The claim that desired-state tooling checks declaration against reality but not against purpose** (§3.1).
- **The broader formulation** that operational intelligence should be recoverable from the system rather than resident in the operator (§9), stated as the article's thesis in general form.

Connections to Kubernetes controllers, GitOps, Terraform, convergent configuration management, ADRs, RAG, and tool-use research are to established work; the contribution is the argument that they jointly imply the thesis.

