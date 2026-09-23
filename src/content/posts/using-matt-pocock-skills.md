---
title: "Using Matt Pocock's Skills"
published: 2026-09-22
description: "Choose and use Matt Pocock's engineering and productivity skills, from focused debugging to multi-session projects."
image: ""
tags: [Agent Skills, Bun, AI Coding, Development Workflow]
category: "Development"
draft: false
lang: "en"
---

## Introduction

[Matt Pocock's skills collection](https://github.com/mattpocock/skills)
turns familiar engineering practices into reusable instructions for coding
agents. It covers requirements interviews, domain modeling, debugging,
test-driven development, code review, issue triage, handoffs, and long-running
plans.

Pick a workflow that matches the task. A small bug does not need a spec, tickets,
and a multi-session plan. A fuzzy feature may need an interview before anyone
touches code. Start with the skills you need for your current project and add
others as the work calls for them.

This guide covers the 38 skills exposed by the installer on September 22, 2026:
25 promoted engineering and productivity skills, plus 13 beta or specialized
skills. The catalog changes, so list it again before installing.

## Choose the workflow first

Start with the smallest workflow that matches the uncertainty in the task.

<!-- markdownlint-disable MD013 -->

| Situation                                    | Start with                                                                 | Add only when needed                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Small, clear change                          | A direct request                                                           | `tdd` for a test-first seam; `code-review` for an independent review           |
| Unclear idea or design                       | `grill-me`                                                                 | Save the result as a plan or continue with `to-spec`                           |
| Durable terminology or architecture decision | `grill-with-docs`                                                          | `to-spec`, then `to-tickets` if several agents or sessions will share the work |
| Hard bug or performance regression           | `diagnosing-bugs`                                                          | `tdd` for the regression test after the cause is known                         |
| Multi-session feature                        | `grill-with-docs` → `to-spec` → `to-tickets` → `implement` → `code-review` | `handoff` when a fresh session must continue the work                          |
| Very large, uncertain project                | `wayfinder`                                                                | Resolve its decision tickets before creating implementation tickets            |

<!-- markdownlint-enable MD013 -->

`grilling` is the interview primitive behind `grill-me`, `grill-with-docs`, and
`wayfinder`. It asks the decisions that are ready to answer in rounds, then waits
for confirmation. Use it when the cost of building the wrong thing exceeds the
cost of a longer conversation.

## How the skills work

Each skill is a folder with a `SKILL.md` file. The file describes when to use the
skill and what to do when it runs. The installer can add skills to one project or
make them available across projects. Project scope works well for this collection:
the engineering workflows use each repository's tracker, terminology, architecture
decisions, and test commands.

Matt's main catalog separates skills you invoke yourself from disciplines an agent
can select when a task matches. The reference tables call these **manual** and
**automatic**. Your coding agent's skill selector and automatic invocation rules
may differ, so check its interface when you use an explicit skill name.

## Install a project-level starter set

Run these commands from the Git repository that should own the skills. The
installer uses project scope by default and may detect your coding agent
automatically. Check its installation summary for the selected agent and paths.

### 1. Inspect the current catalog

This command lists skills without installing them:

```bash
bunx skills add mattpocock/skills --list
```

### 2. Install a dependency-complete starter set

The following set covers requirements clarification, durable project language,
debugging, test-first work, and review:

```bash
bunx skills add mattpocock/skills \
  --skill setup-matt-pocock-skills grilling grill-me \
  domain-modeling grill-with-docs diagnosing-bugs tdd code-review
```

The installer may prompt you to select an agent, or it may finish without a
prompt when it detects one. It records the selected skills and their source in
`skills-lock.json`. Review the installed files before committing them because
skills run with the agent's permissions.

:::caution[Use a space after --skill]
The installer still has an open bug in which `--skill=<name>` can ignore the
filter and install the entire repository. Use the documented space-separated form
`--skill <name>` and verify the installed list afterward.
:::

### 3. Verify the installed source

```bash
bunx skills list --json
git status --short
```

Each entry should report `mattpocock/skills` as its source and `project` as its
scope. Read the installed `SKILL.md` files before invoking a workflow that can
create issues, edit project instructions, commit code, or launch another agent.

## Configure each repository once

Invoke the setup skill in your coding agent. For example, ask it:

```text
Use the setup-matt-pocock-skills skill for this repository.
```

The skill inspects the repository, proposes an issue tracker and domain-document
layout, shows the files it wants to write, and waits for confirmation. It may add
an `Agent skills` section to an existing `AGENTS.md` or
`CLAUDE.md` and create configuration under `docs/agents/`.

The tracker choices include GitHub, GitLab, local Markdown, and **Other**. If your
project uses `BACKLOG.md`, choose **Other** and describe it as the source of work.
The `.scratch/<feature>/` layout is Matt's default for the built-in local Markdown
tracker. It is not required when you configure another tracker.

Setup does not create remote issues merely because the repository has a GitHub
remote. It records the confirmed tracker choice so skills such as `to-spec`,
`to-tickets`, and `triage` know where work belongs.

## Compose skills without missing dependencies

Several short orchestrator skills call other skills by name. Install the whole row
when you use one of these workflows.

<!-- markdownlint-disable MD013 -->

| Orchestrator                    | Required companion skills     | What the composition does                                                                      |
| ------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `grill-me`                      | `grilling`                    | Runs the decision interview without writing domain docs                                        |
| `grill-with-docs`               | `grilling`, `domain-modeling` | Interviews you while updating vocabulary and architecture decisions                            |
| `wayfinder`                     | `grilling`, `domain-modeling` | Builds a map of decision tickets for work too large for one session                            |
| `improve-codebase-architecture` | `codebase-design`             | Uses the deep-module vocabulary while inspecting architecture candidates                       |
| `implement`                     | `tdd`, `code-review`          | Implements tickets or a spec, applies test-first work at agreed seams, then reviews the result |

<!-- markdownlint-enable MD013 -->

`ask-matt` can suggest a flow, but it cannot install a skill that is absent. Treat
its answer as routing advice and compare the proposed names with your installed
list.

## Practical workflow examples

### Clarify a fuzzy change

```text
Use the grill-me skill to decide how account deletion should behave. Limit the
interview to the API contract, data retention, and recovery.
```

Answer each round, then confirm the shared understanding. Save the result in a plan
or spec before starting implementation. A fresh implementation session prevents
the long interview from competing with code context.

### Record project vocabulary and decisions

```text
Use the grill-with-docs skill to design the boundary between billing and
entitlements. Update the glossary and record decisions after I confirm them.
```

Use this for terms and decisions that future sessions need. Do not turn every
feature conversation into an ADR. Temporary plans belong in temporary artifacts;
stable domain language belongs in `CONTEXT.md` and reviewed decision records.

### Diagnose before fixing

```text
Use the diagnosing-bugs skill to investigate checkout latency. Establish a
failing feedback loop and identify the cause before changing production code.
```

The skill separates reproduction, minimization, hypotheses, instrumentation,
repair, and regression coverage. Pair it with `tdd` after the diagnosis identifies
the seam for the regression test.

### Carry work into another session

```text
Use the handoff skill so another session can continue the checkout investigation.
```

`handoff` writes a concise continuation document to the operating system's
temporary directory. The beta `claude-handoff` skill runs `claude --bg` to launch
a Claude Code background agent.

## Complete catalog

The first two tables contain the 25 promoted skills documented in the repository's
main README. The last table contains nine in-progress skills and four miscellaneous
skills that the installer also discovers. Beta skills can change or disappear
without notice.

### Promoted engineering skills

<!-- markdownlint-disable MD013 -->

| Skill                           | Invocation | Use it when                                                                                           |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `ask-matt`                      | Manual     | You need the collection to recommend a skill or flow; verify that the recommendation is installed     |
| `grill-with-docs`               | Manual     | A design needs both a structured interview and durable glossary or ADR updates                        |
| `triage`                        | Manual     | Issues or external pull requests need classification, verification, and agent-ready briefs            |
| `improve-codebase-architecture` | Manual     | You want a visual scan for deep-module opportunities before choosing one to explore                   |
| `setup-matt-pocock-skills`      | Manual     | A repository needs tracker, triage-label, and domain-document configuration                           |
| `to-spec`                       | Manual     | The conversation already contains enough decisions to synthesize into a tracker-backed spec           |
| `to-tickets`                    | Manual     | A plan or spec must become dependency-aware tracer-bullet tickets                                     |
| `implement`                     | Manual     | An approved spec or ticket set is ready for implementation, tests, review, and a commit               |
| `wayfinder`                     | Manual     | A project is too large or uncertain for one agent session and needs decision tickets first            |
| `prototype`                     | Automatic  | A throwaway implementation can answer a state, logic, or UI design question                           |
| `diagnosing-bugs`               | Automatic  | A hard failure or performance regression needs evidence before a fix                                  |
| `research`                      | Automatic  | Primary-source research should become a cited Markdown artifact in the repository                     |
| `tdd`                           | Automatic  | A feature or bug fix has a useful red-green-refactor seam                                             |
| `domain-modeling`               | Automatic  | The project needs sharper vocabulary, `CONTEXT.md`, or an ADR                                         |
| `codebase-design`               | Automatic  | You are designing a deep module, interface, seam, or test surface                                     |
| `code-review`                   | Automatic  | A branch or working diff needs separate standards and spec-conformance reviews                        |
| `resolving-merge-conflicts`     | Automatic  | A merge or rebase is stopped on conflicts that must be resolved by intent                             |
| `wizard`                        | Automatic  | A human must perform dashboard, credential, infrastructure, or cutover steps the agent cannot perform |

<!-- markdownlint-enable MD013 -->

### Promoted productivity skills

<!-- markdownlint-disable MD013 -->

| Skill                | Invocation | Use it when                                                                               |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `grill-me`           | Manual     | You want a decision interview without project-domain documentation                        |
| `handoff`            | Manual     | A fresh agent session needs a compact continuation document in the OS temporary directory |
| `teach`              | Manual     | You want a multi-session lesson that uses the current workspace for state                 |
| `to-questionnaire`   | Manual     | Another person must answer a decision asynchronously or in a meeting                      |
| `wait-what`          | Manual     | An explanation did not land and needs a new pitch using project vocabulary                |
| `grilling`           | Automatic  | A plan, decision, or idea needs its unresolved branches exposed in rounds                 |
| `writing-for-agents` | Automatic  | You are creating skills or editing agent-facing instructions such as `AGENTS.md`          |

<!-- markdownlint-enable MD013 -->

### Additional beta and specialized skills

<!-- markdownlint-disable MD013 -->

| Skill                        | Upstream bucket            | Use it when                                                                                              |
| ---------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `loop-me`                    | In progress                | You want to develop workflow specifications over several stateful sessions                               |
| `writing-beats`              | In progress                | Raw writing needs a sequence of beats whose concepts build on one another                                |
| `writing-fragments`          | In progress                | You want to collect unstructured writing material before shaping an article                              |
| `writing-shape`              | In progress                | A fragment file is ready to become an article one paragraph at a time                                    |
| `claude-handoff`             | In progress, Claude-only   | You intend to start a Claude Code background agent with `claude --bg`                                    |
| `setup-ts-deep-modules`      | In progress                | A TypeScript repository needs dependency-cruiser rules that enforce package entry points                 |
| `implement-spec`             | In progress                | A full specification should run as a dependency graph of implementation subagents on one branch          |
| `pr`                         | In progress                | A pull request body needs source-based summary, evidence, scope, and reversibility notes                 |
| `retro`                      | In progress, stub          | You want design notes for improving the agent environment after a coding session                         |
| `setup-pre-commit`           | Miscellaneous              | A JavaScript or TypeScript project needs Husky, lint-staged, formatting, types, and tests at commit time |
| `git-guardrails-claude-code` | Miscellaneous, Claude-only | Claude Code hooks should block dangerous Git commands before execution                                   |
| `scaffold-exercises`         | Miscellaneous              | A course repository needs a lintable section, problem, solution, and explainer structure                 |
| `migrate-to-shoehorn`        | Miscellaneous              | TypeScript tests should replace `as` assertions with `@total-typescript/shoehorn` helpers                |

<!-- markdownlint-enable MD013 -->

## Maintenance

Project-level copies do not update behind your back. Inspect upstream changes before
accepting them:

```bash
bunx skills update -p
git status --short
git diff -- skills-lock.json
```

Re-run the catalog listing when a workflow refers to a skill you do not have. Install
that skill and its companions explicitly with the space-separated `--skill` form.

## References

### Matt Pocock's collection

- [mattpocock/skills](https://github.com/mattpocock/skills)
- [Promoted catalog and installation guide](https://github.com/mattpocock/skills/blob/main/README.md)
- [In-progress skills](https://github.com/mattpocock/skills/blob/main/skills/in-progress/README.md)
- [Repository setup skill](https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills)

### Installer

- [vercel-labs/skills](https://github.com/vercel-labs/skills)
- [`--skill=<name>` installer issue](https://github.com/vercel-labs/skills/issues/2039)
