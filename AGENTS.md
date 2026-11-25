# Agent Instructions: Cloud Sovereignty Framework Self-Assessment

Offline, browser-native toolkit (Author, Assessment, Migrator) adapting the European Commission Cloud Sovereignty Framework (CSF).

## Essential Rules & Invariants

1. **Offline is absolute**: Zero runtime network requests, no external CDN/scripts/fonts, zero telemetry. Built apps must be single-file self-contained HTML (enforced by `pnpm check:offline`).
2. **Domain/UI isolation**: Code in `packages/platform/src/{score-engine,schema,assessment,author,analytics,report,merge,load,setup}` is pure TypeScript and MUST NOT import Svelte, UI components, or DOM globals (`window`, `document`, `navigator`).
3. **Data model**: Canonical schema is v2.0 (`scope: 'dimension' | 'party'`). Data operations are immutable; merge records use an append-only ledger.
4. **Style & Language**: British English spelling (`organisation`, `behaviour`, `colour`). Simplified Technical English (ASD-STE100); no semicolons in user-facing text. Conventional Commits (`feat`, `fix`, `docs`, etc.).
5. **UI & State**: Svelte 5 runes (`$state`, `$derived`, `$props`).

## Common Commands

- `pnpm test`: Run unit tests (Node tests & Vitest).
- `pnpm typecheck`: Run TypeScript and Svelte checks across all packages.
- `pnpm lint`: Run ESLint across workspace.
- `pnpm build`: Build standalone HTML apps and verify offline single-file constraint.
- `pnpm verify`: Full CI gate (`lint` + `typecheck` + `test` + `theme check` + `build`).

## Context Efficiency: Task-Driven File Routing

Do NOT load unnecessary files or whole directories. Match the user's intent to the table below and read ONLY the referenced files:

| Intent / User Prompt Focus | Read First | Supporting Context / Implementation |
|---|---|---|
| **High-level concepts & terminology** (Estate, Claim, Partial, Rung, SEAL Floor) | `docs/overview.md` | `README.md` |
| **Workbook authoring & schema** (questions, ladders, rungs, dimensions, strata, roles, materiality) | `docs/authoring.md` | `packages/platform/src/schema/workbook.ts`<br>`packages/platform/src/schema/workbook-rules.ts`<br>`packages/platform/src/author/` |
| **AI authoring & workbook validation** (canonical agent skill source, validator CLI, JSON schema, prompt helper) | `tools/skill/SKILL.md` | `tools/skill/scripts/validate-workbook.mjs`<br>`tools/validate-workbook.mjs`<br>`tools/export-schema.mjs`<br>`tools/csf-workbook.schema.json`<br>`apps/author/src/shell-actions.svelte` |
| **Scoring engine & analytics** (SEAL floor min calculation, Sovereignty Score 0–100, unknown counts) | `docs/scoring.md` | `packages/platform/src/score-engine/types.ts`<br>`packages/platform/src/score-engine/objectives.ts`<br>`packages/platform/src/analytics/` |
| **Assessment & Participant workflow** (claims, units, answering, nobody-knows, doesn't-apply) | `docs/assessment-flow.md` | `packages/platform/src/assessment/`<br>`packages/platform/src/schema/assessment.ts`<br>`apps/assessment/src/fill/` |
| **Merge, landing & clash resolution** (divergence, gap, depth, applicability, append-only ledger) | `docs/assessment-flow.md` (Step 3) | `packages/platform/src/merge/clash-types.ts`<br>`packages/platform/src/merge/ledger.ts`<br>`packages/platform/src/merge/land.ts`<br>`apps/assessment/src/facilitator/` |
| **Schema migrations** (legacy v1 `grain` → canonical v2 `scope`) | `tools/migrate.mjs` | `packages/platform/src/migrate/` |
| **UI components, themes & design tokens** (OKLCH palettes, brand tokens, shared widgets) | `packages/platform/DESIGN.md` | `packages/platform/src/ui/`<br>`packages/platform/src/ui/theme.css`<br>`apps/*/src/app.css` |
| **Workshop operations & facilitation** (manual, checklists, room agendas) | `docs/guides/workshop-manual/README.md` | `docs/guides/what-it-is/README.md` |
| **Contributing, PR checks, licensing** (Conventional Commits, REUSE compliance) | `CONTRIBUTING.md` | `.github/workflows/verify.yml` |

## Repository Layout

- `apps/author`: Svelte 5 application for authoring instruments and test estates.
- `apps/assessment`: Svelte 5 application for participant filling and facilitator merging.
- `apps/migrator`: Svelte 5 application for offline v1-to-v2 schema migrations.
- `packages/platform`: Schemas, domain engines (scoring, merge, author, analytics), and shared UI.
- `docs/`: Conceptual guides, technical references, and workshop manuals.
- `samples/`: Reference workbooks and test fixtures.
- `tools/`: Offline bundle verification (`check-offline.mjs`), batch migration CLI (`migrate.mjs`), JSON schema exporter (`export-schema.mjs`), workbook validator (`validate-workbook.mjs`), JSON schema (`csf-workbook.schema.json`), and canonical source for the AI authoring skill package (`tools/skill/`).
