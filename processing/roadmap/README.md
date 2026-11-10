# Roadmap Convention

Roadmaps are the primary artifact of **Design the Approach** in the [Scope Processing Loop](../PROCESS.md). They define a reviewable series of goals for one outcome. **Break Down the Work** decomposes those goals into independent files under [`../tasks/`](../tasks/). Each roadmap is updated as work progresses.

## File naming

Use a stable, lowercase, hyphenated name:

```text
<topic>.md
```

Examples: `security-risk-patching.md`, `browser-build-modernization.md`.

Renaming an active roadmap should be avoided because commits, issues, and evidence may link to it.

## Required header

Every roadmap begins with:

```markdown
# <Outcome>

**ID:** `<stable-id>`  
**Status:** Proposed | Active | Blocked | Complete  
**Current position:** P<process> G<goal> — <friendly process name>  
**Owner:** <person or team, or Unassigned>  
**Created:** YYYY-MM-DD  
**Updated:** YYYY-MM-DD  
**Target:** <release, milestone, or decision>  
**Depends on:** <roadmap IDs or None>
```

The roadmap ID is stable and uses the form `RM-<AREA>-NNN`.

## Required sections

Each roadmap contains these sections in order:

1. **Outcome** — one testable statement describing the finished state.
2. **Context** — why the work exists, with links to evidence or decisions.
3. **Scope** — explicit in-scope and out-of-scope boundaries.
4. **Success criteria** — objective release or completion gates.
5. **Goals and tasks** — ordered goals and links to independently verifiable micro-task files.
6. **Dependencies and risks** — prerequisites, sequencing constraints, and known uncertainty.
7. **Verification** — commands, tests, reviews, and retained evidence.
8. **Decision log** — dated decisions that materially change scope or approach.
9. **Progress log** — short dated summaries of completed work and blockers.

## Goal and task format

Goals use stable IDs and describe a meaningful intermediate state. Task checkboxes retain stable IDs and link to their micro-task record after segregation:

```markdown
## G1 — <Goal title>

**Position:** P1 G1 — Understand the Problem  
**Exit condition:** <observable condition>

- [ ] **T1.1** [<action with a concrete output>](../tasks/<roadmap-id>/T1.1-<short-name>.md)
- [ ] **T1.2** <action with a concrete output>
```

Rules:

- Order goals by dependency, not by preference.
- Record an active goal's process coordinate; use `Not started` for queued goals and `Complete` for finished goals.
- A task should produce one reviewable change or evidence artifact.
- Before Execute One Task, every task must have a micro-task file that satisfies the [micro-task convention](../tasks/README.md).
- Write tasks as actions and exit conditions as observable results.
- Do not mark a task complete until its verification evidence exists.
- When a task changes, edit its wording and record the material change in the decision log.
- Add newly discovered work under the appropriate goal; do not hide it in the progress log.
- Use `Blocked` only when progress requires an unavailable dependency or decision, and name that blocker.

## Status transitions

```text
Proposed -> Active -> Complete
                |
                +-> Blocked -> Active
```

- **Proposed:** drafted but not authorized for execution.
- **Active:** authorized and being executed.
- **Blocked:** an explicit dependency prevents meaningful progress.
- **Complete:** every success criterion is satisfied and evidence is linked.

Completion is outcome-based. A roadmap is not complete merely because all originally listed tasks were attempted.

The roadmap records its current process coordinate, such as `P1 G1`. Each goal moves through P1 to P5 independently. After every executed task, enter `P5` for that goal and explicitly decide to continue, break down the work again, change the plan, revisit the problem, complete the goal, or advance to `P1` of the next goal.

## Process coordinates

Use the notation defined in the [Scope Processing Loop](../PROCESS.md):

| Coordinate | Meaning for goal `Gx` |
|---|---|
| `P1 Gx` | Understand the Problem for the goal. |
| `P2 Gx` | Design the Approach for the goal. |
| `P3 Gx` | Break Down the Work for the goal. |
| `P4 Gx` | Execute One Task belonging to the goal. |
| `P5 Gx` | Review the action and decide what happens next. |

## Evidence and links

Use relative repository links. Link to durable evidence such as assessments, test files, CI runs, audit artifacts, or release decisions. Audit snapshots should include the date, exact commit, lockfile, tool version, and command used.

## Index

| ID | Roadmap | Status | Target |
|---|---|---|---|
| `RM-SEC-001` | [Security Risk Patching](security-risk-patching.md) | Proposed | MI-P6 security release gate |
