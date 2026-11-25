# Scope Processing Loop

Every roadmap goal follows this repeating process:

```text
P1 Understand the Problem -> P2 Design the Approach -> P3 Break Down the Work
             ^                                                   |
             +----- P5 Review and Continue <- P4 Execute One Task+
```

The unit of work is a roadmap **goal**: one bounded problem or outcome being processed. Each process stage has a required artifact and an exit gate. A goal advances only when the current stage's gate is satisfied.

## Process coordinates

Track work with a process-and-goal coordinate:

```text
P<process number> G<goal number>
```

For example, `P1 G1` means **Understand the Problem for G1**. In the Security Risk Patching roadmap, that reads: **Understand the Problem for G1 — Freeze and reproduce the baseline**.

The normal sequence for each goal is:

```text
P1 G1 -> P2 G1 -> P3 G1 -> P4 G1 -> P5 G1
```

At `P5 G1`, Review and Continue decides whether to loop back within G1 or advance to `P1 G2`. Goals do not inherit a later process position merely because the overall roadmap has already been analyzed or planned.

## Operating principles

- Solve one clearly stated problem at a time.
- Keep evidence separate from assumptions.
- Plan outcomes before implementation details.
- Decompose work until tasks are independent, bounded, and verifiable.
- Process one micro-task at a time unless the roadmap explicitly proves that parallel work cannot conflict.
- Treat every completed action as new evidence, not as proof that the entire scope is complete.
- Feed results, failures, and newly discovered risks back into analysis.
- Completion is based on verified outcomes, not task activity.

## P1 — Understand the Problem

### Question

**What problem are we solving?**

### Required work

- Describe the current state and the undesired state.
- Identify affected users, systems, components, and trust boundaries.
- Gather reproducible evidence and distinguish facts from assumptions.
- Define impact, urgency, constraints, dependencies, and known risks.
- State what is explicitly outside the scope.
- Define a testable desired outcome.

### Artifact

A durable analysis under `docs/`, linked from the roadmap. It must contain the problem statement, evidence, boundaries, risks, and desired outcome.

### Exit gate

Analysis is complete enough to plan when:

- The problem can be stated in one testable sentence.
- Evidence demonstrates the current condition.
- In-scope and out-of-scope boundaries are explicit.
- Material unknowns are either resolved or recorded as risks.
- Success can be measured.

If the problem changes materially, return to this stage.

## P2 — Design the Approach

### Question

**How will we solve the analyzed problem?**

### Required work

- Translate the goal's desired outcome into an ordered approach.
- Confirm or refine the goal's exit condition.
- Select an approach and record material alternatives or tradeoffs.
- Identify dependencies, sequencing constraints, risks, and rollback needs.
- Define verification and final success criteria before implementation.

### Artifact

The goal's approach, exit condition, dependencies, and verification plan recorded in its roadmap under `processing/roadmap/`, following the [roadmap convention](roadmap/README.md).

### Exit gate

Planning is complete enough to break down into tasks when:

- The approach contributes directly to the goal's analyzed outcome.
- Step order reflects real dependencies.
- The goal has an observable exit condition.
- Verification and release gates are defined.
- The plan does not silently expand the analyzed scope.

## P3 — Break Down the Work

### Question

**What independent micro-tasks will execute the plan?**

### Required work

- Decompose each goal into the smallest useful reviewable tasks.
- Give each task one purpose, one bounded change surface, and one verification method.
- Identify inputs, outputs, dependencies, and files or components likely to change.
- Remove hidden coupling; where coupling is unavoidable, make dependency order explicit.
- Separate investigation tasks from implementation tasks when the answer is not yet known.

### Artifact

One micro-task file per actionable unit under `processing/tasks/<roadmap-id>/`, following the [micro-task convention](tasks/README.md). The roadmap links to its task files.

### Exit gate

A micro-task is ready for execution when it is:

- **Independent:** it can be completed without unrelated work.
- **Bounded:** its allowed change surface and non-goals are explicit.
- **Small:** it produces one reviewable result.
- **Actionable:** inputs and dependencies are available.
- **Verifiable:** commands, tests, or evidence can prove its exit condition.
- **Recoverable:** rollback or failure handling is understood when the change is risky.

If a task cannot meet these conditions, split it again or return to Design the Approach.

## P4 — Execute One Task

### Question

**Can this one micro-task be completed and verified now?**

### Required work

Process one ready micro-task:

1. Confirm its inputs, dependencies, boundaries, and clean starting state.
2. Mark only that task `Active`.
3. Make the smallest change that satisfies its exit condition.
4. Run the defined verification and record the evidence.
5. Review the actual change for scope drift, security impact, and regressions.
6. Mark it `Complete` only when its exit condition is proven; otherwise mark it `Blocked` with evidence.

### Artifact

The implementation or investigation result, its tests or evidence, and an updated micro-task record.

### Exit gate

Action is complete when:

- The task exit condition is satisfied.
- Required verification passes and is recorded.
- No unexplained or unrelated changes remain.
- New findings and residual risks are recorded for Review and Continue.

Completing one task does not automatically complete its goal or roadmap.

## P5 — Review and Continue

### Question

**What did the action teach us, and what scope should be processed next?**

### Required work

- Compare the verified action result with the task, goal, and roadmap outcomes.
- Analyze failures, regressions, new risks, assumptions disproved, and scope discovered.
- Decide whether to:
  - take the next ready micro-task;
  - revise the task breakdown;
  - revise the roadmap;
  - revise the original analysis; or
  - complete the goal and advance to the next goal; or
  - close the roadmap because all success criteria are proven.
- Update the roadmap progress and decision logs.

### Artifact

A dated process review recorded in the roadmap progress log, with links to evidence and any new or revised tasks.

### Exit gate

Review and Continue produces one explicit decision:

- **Continue:** execute the next ready micro-task.
- **Break down again:** return to Break Down the Work because task boundaries changed.
- **Change the plan:** return to Design the Approach because the sequence or approach changed.
- **Revisit the problem:** return to Understand the Problem because the problem or evidence changed.
- **Complete goal:** close the goal and advance to `P1` of the next goal.
- **Complete roadmap:** close the roadmap because every success criterion is verified.

## Scope status

Each roadmap records its overall status and current process coordinate. Individual goals may also record their own position when more than one goal is being prepared.

Overall status:

```text
Proposed | Active | Blocked | Complete
```

Current position:

```text
P1 G1 — Understand the Problem
```

`Blocked` is a status, not a process position. A blocked item remains at the coordinate where the blocker occurred.

## Control rule

At most one micro-task per roadmap may be `Active` by default. Parallel action requires an explicit roadmap decision showing that the tasks have disjoint change surfaces, independent verification, and no ordering dependency.
