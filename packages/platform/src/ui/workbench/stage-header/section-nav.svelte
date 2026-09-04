<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { FocusRef } from '../focus';
  import HeaderIconButton from './header-icon-button.svelte';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import FileText from '@lucide/svelte/icons/file-text';
  import Target from '@lucide/svelte/icons/target';
  import Table from '@lucide/svelte/icons/table';
  import Users from '@lucide/svelte/icons/users';
  import Building2 from '@lucide/svelte/icons/building-2';
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import Megaphone from '@lucide/svelte/icons/megaphone';

  // The instrument sections: icon-buttons that reach the always-present workbook
  // sections. Objectives (SOV) is one of them — its icon opens the
  // list page and dots for an objective-level issue. The QUESTIONS index is
  // deliberately NOT here: it is about the same set the question nav walks, so it
  // leads that group instead (see stage-header), and a question-level issue dots
  // it there. Each `owns` predicate feeds the shared ownsIssue so a dot lands on
  // the exact target the issue-jump would.
  
  // Each also names the AUTHOR_RULES card that governs its section, which is what
  // makes the row readable in help mode: press Dimensions there and you land on the
  // Dimensions page with the dimension rule already up beside it (HeaderIconButton
  // owns that behaviour). A section whose rule has no card greys out on its own.
  type Props = {
    focus: FocusRef;
    ownsIssue: (match: (f: FocusRef) => boolean) => boolean;
    onFocus: (focus: FocusRef) => void;
    /** Trailing controls, inside the last group (the help toggle).*/
    actions?: Snippet | undefined;
  };
  let { focus, ownsIssue, onFocus, actions }: Props = $props();

  // `divide` opens a new group before that section, which is how the row stays ONE
  // `{#each}` over one HeaderIconButton — a second group as a second each-block
  // would be the same six lines of markup twice. Test estates opens the last group:
  // the seven before it are the instrument as authored, while a test estate is the
  // author's own QA rig, and the help toggle joins it there as the other tool that
  // is about the workbench rather than in it.
  const sections = [
    { kind: 'overview', label: 'Overview', Icon: Settings2, rule: 'overview', owns: (f: FocusRef) => f.kind === 'overview' },
    { kind: 'frontSheet', label: 'Front sheet', Icon: FileText, rule: 'frontsheet', owns: (f: FocusRef) => f.kind === 'frontSheet' },
    { kind: 'objectives', label: 'Objectives', Icon: Target, rule: '3.5', owns: (f: FocusRef) => f.kind === 'objective' },
    { kind: 'dimensions', label: 'Dimensions', Icon: Table, rule: 'dimension', owns: (f: FocusRef) => f.kind === 'dimensions' },
    { kind: 'roles', label: 'Roles', Icon: Users, rule: 'role', owns: (f: FocusRef) => f.kind === 'roles' },
    { kind: 'parties', label: 'Party types', Icon: Building2, rule: 'party', owns: (f: FocusRef) => f.kind === 'parties' },
    { kind: 'recommendations', label: 'Recommendations', Icon: Megaphone, rule: '3.8', owns: (f: FocusRef) => f.kind === 'recommendations' || f.kind === 'recommendation' },
    { kind: 'testEstates', label: 'Test estates', Icon: FlaskConical, rule: '7', divide: true, owns: (f: FocusRef) => f.kind === 'testEstates' },
  ] as const;
</script>

<div class="flex items-center gap-1">
  {#each sections as s (s.kind)}
    {#if 'divide' in s}
      <!-- Its own margins, because the row's `gap-1` is tuned for neighbouring
     icons and would read as a hairline crammed between two buttons. -->
      <div class="mx-1.5 h-6 w-px bg-border"></div>
    {/if}
    <HeaderIconButton
      label={s.label}
      Icon={s.Icon}
      rule={s.rule}
      active={focus.kind === s.kind}
      flagged={ownsIssue(s.owns)}
      onclick={() => onFocus({ kind: s.kind })}
    />
  {/each}
  {@render actions?.()}
</div>
