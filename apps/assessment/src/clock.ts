/** The shell's one clock read: the current instant, ISO-8601 UTC. Everything
 *  downstream — the pure core, the Report's stamp, the merge ledger's `at` — is
 *  PASSED the instant and never reads it (product invariant #3, report.md
 *  invariant #7), so this is the only place in the app that can be wrong about
 *  what time it is. */
export function nowInstant(): string {
  return new Date().toISOString();
}
