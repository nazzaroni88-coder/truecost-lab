/**
 * Lets the results pane send the user to the input a number came from.
 *
 * The chips live in the generic calculator shell; the field they point at may be inside a tab only
 * the calculator's own form knows about. Rather than teach the shell about tabs, it broadcasts a
 * request and any form that cares reveals the field first. Forms that do not listen still work:
 * the shell focuses the element itself on the next frame if it is already in the document.
 */

export const FOCUS_FIELD_EVENT = 'truecost:focus-field';

/** Retry delays in ms. The first is synchronous-ish for a field already on screen; the later ones
 *  give a listening form time to switch tabs and commit its render. */
const RETRY_MS = [0, 32, 96, 240];

export function requestFieldFocus(id: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(FOCUS_FIELD_EVENT, { detail: id }));
  // Deliberately timers rather than requestAnimationFrame: rAF does not fire at all while the tab
  // or preview pane is hidden, which would leave the request silently unfulfilled. Timers still run,
  // so the field is focused and waiting whenever the user looks at it again.
  for (const ms of RETRY_MS) {
    window.setTimeout(() => focusFieldNow(id), ms);
  }
}

export function focusFieldNow(id: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById(id);
  if (!el) return false;
  // Already there: don't yank an input the user has started typing in back to the top of the pane.
  if (document.activeElement === el) return true;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  // preventScroll because scrollIntoView is already animating; letting focus jump as well lands the
  // field in a different place than the smooth scroll was heading for.
  (el as HTMLElement).focus({ preventScroll: true });
  return document.activeElement === el;
}

export function onFieldFocusRequest(handler: (id: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(FOCUS_FIELD_EVENT, listener);
  return () => window.removeEventListener(FOCUS_FIELD_EVENT, listener);
}
