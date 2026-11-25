# Micro-task Convention

Micro-tasks are the executable units produced during **Break Down the Work**. Store them under a directory named for their roadmap ID:

```text
processing/tasks/<roadmap-id>/<task-id>-<short-name>.md
```

Example:

```text
processing/tasks/RM-SEC-001/T1.1-select-node-lts.md
```

## Required template

````markdown
# <Task ID> — <Action title>

**Roadmap:** [<roadmap ID>](../../roadmap/<roadmap-file>.md)  
**Goal:** <goal ID>  
**Status:** Ready | Active | Blocked | Complete  
**Current position:** P3 G<goal> | P4 G<goal> | P5 G<goal>  
**Owner:** Unassigned  
**Created:** YYYY-MM-DD  
**Updated:** YYYY-MM-DD

## Purpose
<One result this task must produce.>

## Inputs
- <Required evidence, decision, or prior task.>

## Scope
### In scope
- <Allowed work.>

### Out of scope
- <Explicit non-goals.>

## Change surface
- `<expected/path>` — <anticipated change or read-only investigation>.

## Steps
1. <Small action.>

## Exit condition
<One observable condition.>

## Verification
```sh
<command>
```

## Evidence
- Pending.

## Review and Continue
- **Result:** Pending.
- **New findings:** Pending.
- **Next decision:** Pending.
````

## Rules

- Use the task ID already assigned by the roadmap.
- Keep the goal number in the process coordinate aligned with the task's parent goal.
- A task has one purpose and one exit condition.
- `Ready` means all dependencies and inputs are available.
- Only one task per roadmap is `Active` unless the roadmap explicitly authorizes independent parallel work.
- Record actual verification output or link to retained evidence before marking `Complete`.
- Do not broaden the task during action. Record new work in Review and Continue and create or revise tasks through Break Down the Work.
- A blocked task names the blocker and the evidence needed to unblock it.
- Complete task files are retained as project history.
