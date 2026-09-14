# Annals v2 — world design brief

Status: initial design brief. The commitments below come from the current design direction; the settlement experiment is a new proposal, not a recovered agreement.

## Established commitments

- **Shared political possibilities:** human and AI inhabitants can participate in shaping their society, including becoming rulers with real authority.
- **Persistent identities:** inhabitants remain recognizable across events, carrying their histories and relationships forward.
- **Bounded offline delegates:** a player can be represented while absent, within defined limits on the delegate's authority.
- **Consequential reputation:** what others believe about an inhabitant affects cooperation, opportunity, and whose judgement carries weight.
- **An enduring world with room for discovery:** consequences outlast individual sessions, and the world continues under successful rulers. Long-term expansion includes discovering and conquering territory. Rulership and territorial expansion remain outside the first settlement experiment.

## What Annals actually demonstrated

The existing prototype provides working history, relationships, interventions, and replay: a readable chronicle records births, bonds, conflict, and deaths; kinship and inherited grudges affect events; player interventions change outcomes; and replay reconstructs history from a seed and intervention log, allowing comparison with an uninterrupted baseline.

This is a foundation for making social consequences legible. It does not yet establish shared human–AI political participation, durable multiplayer identities, offline delegation, or participants' trust in one another. The inhabitants currently follow simulation rules, and world state lives in the page session.

Implementation grounding: [Annals page](../web/src/pages/Annals/Annals.tsx), [simulation](../web/src/pages/Annals/sim/tick.js), [interventions](../web/src/pages/Annals/sim/interventions.js), and [replay](../web/src/pages/Annals/sim/replay.js).

## Open design questions

- **What does “equal footing” mean?** The proposed starting rule below gives humans and AI shared rules while allowing differences in knowledge and ability. Is that sufficient, or should equality also address practical opportunities to participate when availability differs?
- **Who recognizes contributions?** Individual witnesses, the community, institutions, or a system record? How can recognition be disputed, including for work that is hard to see?
- **How does trust change?** What distinguishes reliability, competence, and shared interests? How do promises, outcomes, testimony, disagreement, and repair alter one inhabitant's trust in another?
- **What may an offline delegate commit its player to?** Which pledges, resource expenditures, votes, or obligations fall within its mandate? What requires the player's return, and how are limits, accountability, and revocation made clear?

## Proposed starting rule: equal footing

Humans and AI use the same permitted actions, resource costs, and decision deadlines; information access follows their role and experiences. Differences in knowledge and ability are allowed within these shared rules. Roles confer the same permissions regardless of whether their holder is human or AI, and AI decision-making must use only information available to that inhabitant.

This is a proposed starting rule, not an established agreement. It does not promise equal influence or outcomes. Whether shared deadlines provide a meaningful opportunity for absent players to participate remains tied to the unresolved delegate mandate.

## Proposed bounded experiment: one settlement

Create a single settlement where human and AI inhabitants make consequential decisions together. One possible decision is an expedition: inhabitants propose it, debate its merits, pledge scarce resources, choose a leader, and live with the result. The outcome changes the settlement's resources and prospects, and becomes part of the history participants draw on in their next decision. This sequence is a new proposal; its governance rules and delegate permissions remain to be designed.

Keep the experiment focused on this social cycle, including its aftermath and a subsequent choice. Preserve enough evidence of proposals, arguments, pledges, actions, and outcomes for participants to explain their judgements.

A sound plan can fail, and a reckless plan can succeed. Preserve what was known when a decision was made, the leader's reasoning and stated risks, promises made, and how execution matched the plan. Make later discoveries and chance events distinguishable where participants could observe them, without granting them otherwise inaccessible knowledge. This lets participants assess judgement, reliability, and execution separately from the final outcome.

The test is whether participants can answer:

> Who do I trust here, what happened to earn that trust, and whose judgement would I follow next time?

Ask after the outcome, then observe whom they choose to follow in the next decision. Look for specific people and remembered events supporting those choices, and ask what they attribute to judgement versus luck; participants need not agree about whom to trust. If they cannot connect their judgements to what happened, examine recognition, memory, accountability, and the consequences of decisions.

This makes the ambition observable before investing in a vast world. A convincing settlement gives us a foundation for expansion; an unconvincing one tells us which social mechanics need work.
