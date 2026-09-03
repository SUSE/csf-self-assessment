/** Keyboard activation for an SVG element wearing `role="button"`: those get no
 * native Enter/Space handling, so every clickable spoke has to supply it. */
export function activateOnKey(event: KeyboardEvent, activate: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  activate();
}
