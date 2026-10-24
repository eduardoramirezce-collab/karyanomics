/**
 * Detects whether a verbatim source recommendation states a dose amount.
 *
 * This only classifies text that was copied from a source. It never produces,
 * rounds, or adjusts a dose. Shared by the runtime snapshot guard, the snapshot
 * promotion script, the validator, and the tests.
 *
 * Erasable TypeScript only and no imports, so Node can import it from .mjs.
 */

/**
 * True when the text contains a number with a dose unit ("75 mg", "<20mg/day",
 * "2 mg/kg/day") or a percentage ("50%", "30-80%"). Wording such as
 * "standard dose" without an amount is not dose text.
 */
export function hasDoseText(text: string): boolean {
  return /\d\s*(?:mg|mcg|µg|μg|g)(?:\s*\/\s*(?:kg|m2|day|d))*(?![a-z])/i.test(text) ||
    /\d\s*%/.test(text);
}

/**
 * Every dose-bearing fragment of a verbatim recommendation, exactly as written.
 * Each fragment is a substring of `text`; callers use this to prove that no dose
 * string exists anywhere except as a copy of its source.
 */
export function doseFragments(text: string): string[] {
  const pattern = /[<>≤≥]?\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:%|mg|mcg|µg|μg|g)(?:\s*\/\s*(?:kg|m2|day|d))*(?![a-z])/gi;
  return [...text.matchAll(pattern)].map((match) => match[0].trim());
}
