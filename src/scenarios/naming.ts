/**
 * When a generated scenario name should follow its contents, and when it must not.
 *
 * Scenario names used to be generated once, at creation, and never revisited. Edit a five-year
 * comparison up to nine years and the tab strip still read "… · 5 yr" — and so did the name carried
 * inside any link shared from it, so the recipient opened a scenario whose label contradicted its
 * own numbers.
 *
 * The rule has to be narrow in the other direction too: a name the user typed is theirs, and an
 * edit must never overwrite it.
 */

/** Produces the name a calculator would generate for a given set of inputs. */
export type Describe<I> = (inputs: I) => string;

/**
 * The name a scenario should take after its inputs change, or `null` to leave it as it is.
 *
 * A name is treated as ours to update only when it is EXACTLY what `describe` would have produced
 * for the inputs being replaced. That is the one case where authorship is provable:
 *   - a name the user typed does not match, so it survives
 *   - a preset's own name ("Tesla Model 3 vs Toyota Camry Hybrid") does not match either, so a
 *     scenario keeps the record of which example it started from
 *   - a name we generated matches exactly, and is refreshed
 *
 * Comparing against the OLD inputs is what makes this work. Comparing against the new ones would
 * never match — that mismatch is precisely the staleness being fixed.
 */
export function nextScenarioName<I>(currentName: string, describe: Describe<I>, oldInputs: I, newInputs: I): string | null {
  if (currentName !== describe(oldInputs)) return null;
  const next = describe(newInputs);
  return next === currentName ? null : next;
}
