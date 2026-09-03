# Cloud Sovereignty Self-Assessment

[![Verify](https://github.com/SUSE/csf-self-assessment/actions/workflows/verify.yml/badge.svg)](https://github.com/SUSE/csf-self-assessment/actions/workflows/verify.yml)

An offline, workshop-oriented platform for authoring self-assessment instruments,
collecting participant answers, reconciling them, and producing a defensible
reading of an organisation's cloud sovereignty exposure.

The included Cloud Sovereignty workbook adapts the European Commission's Cloud
Sovereignty Framework from supplier-ranking material into a self-assessment for
an estate the organisation already operates. It contains 8 objectives, 35
questions, 10 technical dimensions, 6 participant roles, and 4 party types.
The EC framework is reference material and an example of good practice here,
not a certification or conformance target.

The product is broader than that one workbook: the Author app can create and
quality-check other assessment instruments using the same workbook model.

For the project's precise vocabulary—Workbook, Estate, Rung, Claim, Partial,
Landing, SEAL, and related terms—see [Overview](./docs/overview.md) and
[Assessment Flow](./docs/assessment-flow.md).

## What is included

The platform has two primary, standalone HTML applications and optional desktop
wrappers:

- **Author** creates and edits workbooks. Its workbench covers objectives,
  questions and ladders, dimensions and strata, roles, party types,
  recommendations, and reference test estates. Authors can preview the
  participant experience and inspect a test estate in the dashboard,
  recommendations, and printable report surfaces.
- **Assessment** serves two personas. Facilitators prepare an estate, merge
  returned participant files, inspect analytics and recommendations, and print
  reports. Participants declare the roles, dimensions, and parties they can
  speak for, answer that scope, and export their contribution.
- **Desktop** packages those exact HTML applications in a hardened Electron
  shell. The HTML files remain the canonical deliverables and continue to work
  without Electron.

There is no server, account system, database, telemetry, or runtime network
dependency. JSON files are the interchange format, and in-progress work is kept
in browser or desktop local storage until it is exported.

## Workshop flow

1. **Author** — Create or import a workbook, edit the instrument, resolve its
   validation and quality issues, exercise its test estates, and export the
   workbook JSON.
2. **Prepare** — Load the workbook in Assessment, inspect it, name the estate,
   seed the concrete parties/providers involved, and export a self-contained
   workbook-assessment JSON.
3. **Fill** — Each participant loads the workbook-assessment, enters their name,
   composes one or more claims, answers only the units covered by those claims,
   and exports a partial JSON.
4. **Land** — The facilitator loads partials one at a time. First, the facilitator
   reconciles the parties. Then, the facilitator reviews answer clashes using their
   provenance and authority. Every accepted answer unit receives an append-only
   ledger record. This includes undisputed units.
5. **Read and report** — The dashboard, recommendations page, and printable
   report read the current assessment. A finalised assessment can be exported
   after at least one partial has landed and no landing remains under review.

Files are version-checked against the embedded workbook. This is a pre-1.0
project: superseded formats are rejected rather than migrated.

## Scoring model

The engine deliberately keeps two outputs separate:

- **SEAL floor (0–4)** is a gate: the minimum over answers that the workbook
  marks as gating, including dimension answers only where their dimension is
  critical. One low gating answer can set the whole floor.
- **Sovereignty Score (0–100)** is a weighted ranking measure based on authored
  rung points. Both `material` and `ranking` questions contribute. However, `ranking`
  questions never affect the SEAL floor.

Unanswered, don't-know, and not-applicable are distinct states. The floor is
never presented without its unknown count, and a floor calculated from an
incomplete assessment is an upper bound that can only fall as more answers are
landed.

The schemas in `packages/platform/src/schema/` and the evaluator in
`packages/platform/src/score-engine/` are the implementation sources of truth.
See [the authoring guide](./docs/authoring.md) for the full mechanics
and [the scoring analysis](./docs/scoring.md) for comparison with the EC
reference calculator.

## Requirements

- Node.js 22 or newer
- pnpm 11.24.0. The repository pins this version in `devEngines.packageManager`.

Use pnpm. Do not use npm, yarn, or any other package manger in this workspace.

```sh
pnpm install --frozen-lockfile
```

Normal development and the standalone HTML builds require no environment file
or external service.

## Development

Start both Vite applications:

```sh
pnpm dev
```

- Author: http://localhost:5173/
- Assessment: http://localhost:5174/

Build the two offline, single-file applications:

```sh
pnpm build
```

The outputs are:

- `apps/author/dist/author.html`
- `apps/assessment/dist/assessment.html`

They can be opened directly from disk or distributed on an internal share. The
build runs the offline gate, which rejects runtime URLs, remote fonts, external
scripts, and other network dependencies.

Useful checks:

```sh
pnpm lint            # ESLint across the workspace
pnpm typecheck       # TypeScript and Svelte checks in every package
pnpm test            # tool, platform, desktop unit, and desktop smoke tests
pnpm check:offline   # verify built HTML is self-contained
pnpm verify          # full CI-equivalent validation and build
```

Desktop smoke tests launch graphical applications, so Linux CI runs `pnpm
verify` under Xvfb. The standard pull-request and `main` workflow runs on Node 22 and
Ubuntu 24.04. See [verify.yml](./.github/workflows/verify.yml) for details.

## Desktop applications

Build and launch the optional Electron wrappers locally:

```sh
pnpm desktop:author
pnpm desktop:assessment
```

Both commands first rebuild the standalone HTML files and the desktop shell.
Run the complete desktop test suite with:

```sh
pnpm desktop:test
```

The local packaging proof currently targets unsigned Apple Silicon macOS app
directories:

```sh
pnpm desktop:package:author
pnpm desktop:package:assessment
```

Packaged output is written below `dist/desktop/`. The Electron shell keeps
context isolation and sandboxing enabled, exposes only a narrow native JSON-file
bridge, blocks arbitrary navigation and requests, and performs no update check.

Tagged prereleases are handled by
[desktop-release.yml](./.github/workflows/desktop-release.yml). A tag must match
the root package version and point to a commit contained in `main`. The workflow
builds and tests both applications for universal macOS, Windows x64, and Linux
x64. Signed publication also requires the configured Apple and Windows
signing credentials. Releases include the two standalone HTML files, native
packages, checksums, a release manifest, and a CycloneDX SBOM. The exact contract
is recorded in the desktop release workflow.

## Repository layout

```text
.
├── apps/
│   ├── author/              Svelte authoring application
│   ├── assessment/          Svelte participant and facilitator application
│   └── desktop/             Electron shell, packaging, release tooling, tests
├── packages/
│   └── platform/            Schemas, assessment/merge logic, scoring, analytics,
│                            reports, storage utilities, and shared Svelte UI
├── v2/                      Current Cloud Sovereignty workbook and example files
├── samples/                 Teaching and EC calculator fixtures
├── docs/
│   ├── eu-csf/              EC reference material (read-only)
│   └── ...                  Scoring guide, authoring guide, and assessment flow
├── tools/                   Offline checks, EC conversions, and theme tooling
└── .github/workflows/       Source verification and tagged desktop prereleases
```

Important package areas:

- `packages/platform/src/author/` — immutable workbook edits, linting, gauges,
  test-estate evaluation, and recommendation authoring
- `packages/platform/src/assessment/` — claims, answer placement,
  completeness, provenance, and participant walk order
- `packages/platform/src/merge/` — sequential landing, conflict resolution,
  party reconciliation, snapshots, history, and ledger construction
- `packages/platform/src/score-engine/` and `analytics/` — evaluation and
  derived dashboard readings
- `packages/platform/src/report/` — report document and appendix generation
- `packages/platform/src/ui/` — shared components used by both applications

## Local theme editor

The optional tweakcn integration is repository-local and does not require auth,
a database, Docker, or `.env.local`.

```sh
pnpm tweakcn:setup        # one-time network/install bootstrap
pnpm tweakcn:start suse   # open the local editor at http://localhost:3000/
pnpm tweakcn:verify       # verify all built-in palettes round-trip unchanged
pnpm tweakcn status       # inspect or manage the local session
```

`.tools/tweakcn` and `.tools/tweakcn-runtime` are ignored, generated trees.
Applying an exported palette to the authoritative theme is a separate explicit
operation:

```sh
pnpm tweakcn apply suse --write
```

See `tools/tweakcn-session.mjs` for the managed workflow and pin-update
procedure.

## Data and documentation conventions

- Treat `docs/eu-csf/` as read-only upstream material.
- Put regenerated Cloud Sovereignty workbook and assessment artifacts in `v2/`.
- Use `samples/` for teaching data and cross-instrument fixtures.
- Keep runtime behaviour offline. Do not use CDN assets, remote fonts, telemetry,
  automatic updates, or release checks.
- Keep workbook semantics in the schema and engine. Documentation explains
  those rules but does not override them.
- Preserve explicit unknowns and provenance. Do not collapse don't-know into a
  zero or merge participant files as an unreviewed union.

For guided use, start with the
[authoring guide](./docs/authoring.md) or the
[workshop flow guide](./docs/assessment-flow.md).

To contribute to this project, please read our [Contributing Guide](./CONTRIBUTING.md).
