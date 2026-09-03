import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AUTHOR_RULES } from './author-rules';
import { FACILITATOR_RULES } from './facilitator-rules';
import { PARTICIPANT_RULES } from './participant-rules';
import type { RuleSection } from './content';

// Help-system wiring guard. A control names the card that governs it — a stage
// field with `data-rule="<id>"`, a header icon with `rule: '<id>'` — and the panel
// promotes the card whose `id` matches. A marker naming a non-existent card fails
// SILENTLY: nothing bubbles up, the panel just scrolls to the top (the party-type
// page shipped that way, `data-rule="party"` with no `party` card). Worse now that
// `has()` drives gating — a typo doesn't misbehave visibly, it greys the icon out
// as though help simply had nothing to say about that section.
//
// Each entry is one source file and the audience set it must cite into. It is an
// explicit LIST, not a glob, so moving a marked control into a new component fails
// here (the emptied file matches nothing) until the new file is added.
const MARKER_SOURCES: { path: string; sections: RuleSection[] }[] = [
  { path: '../workbench/dimension-row.svelte', sections: AUTHOR_RULES },
  { path: '../workbench/role-row.svelte', sections: AUTHOR_RULES },
  { path: '../workbench/party-type-row.svelte', sections: AUTHOR_RULES },
  { path: '../question-editor/question-editor.svelte', sections: AUTHOR_RULES },
  { path: '../question-editor/question-meta-strip.svelte', sections: AUTHOR_RULES },
  { path: '../question-editor/rung-row.svelte', sections: AUTHOR_RULES },
  { path: '../recommendations-editor/recommender-block.svelte', sections: AUTHOR_RULES },
  { path: '../recommendations-editor/recommendation-editor.svelte', sections: AUTHOR_RULES },
  { path: '../recommendations-editor/recommendation-links-editor.svelte', sections: AUTHOR_RULES },
  { path: '../recommendations-editor/recommendation-links-row.svelte', sections: AUTHOR_RULES },
  { path: '../workbench/stage-header/section-nav.svelte', sections: AUTHOR_RULES },
  { path: '../workbench/stage-header/stage-header.svelte', sections: AUTHOR_RULES },
  { path: '../assessment-toolbar/model.ts', sections: PARTICIPANT_RULES },
  { path: '../facilitator-toolbar/facilitator-toolbar.svelte', sections: FACILITATOR_RULES },
];

/** All three marker dialects: `data-rule="x"` on a stage field, `rule: 'x'` on a
 *  header icon's model entry, and `rule="x"` on a HeaderIconButton written out
 *  directly (a one-off control that has no model row). */
function markersIn(relPath: string): string[] {
  const src = readFileSync(fileURLToPath(new URL(relPath, import.meta.url)), 'utf8');
  return [
    ...[...src.matchAll(/data-rule="([^"]+)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/\brule: '([^']+)'/g)].map((m) => m[1]),
    ...[...src.matchAll(/(?<!-)\brule="([^"]+)"/g)].map((m) => m[1]),
  ];
}

describe('rulebook markers resolve to cards', () => {
  for (const { path, sections } of MARKER_SOURCES) {
    const markers = [...new Set(markersIn(path))];
    it(`${path} cites only real cards`, () => {
      expect(markers.length).toBeGreaterThan(0); // guard against a moved/renamed file matching nothing
      const ids = new Set(sections.map((s) => s.id));
      const orphans = markers.filter((m) => !ids.has(m));
      expect(orphans, `markers with no matching card in this audience's set`).toEqual([]);
    });
  }
});

describe('every rule set is well formed', () => {
  const SETS = {
    author: AUTHOR_RULES,
    participant: PARTICIPANT_RULES,
    facilitator: FACILITATOR_RULES,
  };

  for (const [name, sections] of Object.entries(SETS)) {
    // Two cards with one id makes the second unreachable: promotion resolves by
    // `find`, so a duplicate is a card that can never be shown.
    it(`${name} has unique card ids`, () => {
      const ids = sections.map((s) => s.id);
      expect(ids).toEqual([...new Set(ids)]);
    });

    it(`${name} cards are all readable`, () => {
      for (const s of sections) {
        expect(s.paras.length, `${s.id} has no body`).toBeGreaterThan(0);
        expect(s.title.length, `${s.id} has no title`).toBeGreaterThan(0);
        expect(s.eyebrow.length, `${s.id} has no eyebrow`).toBeGreaterThan(0);
      }
    });
  }
});
