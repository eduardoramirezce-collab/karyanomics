/**
 * Shared helpers for copying CPIC recommendation text without authoring it.
 *
 * Everything here reads source fields and returns them unchanged, or derives a
 * boolean or list *from* the verbatim text. Nothing computes, rounds or rewrites
 * a dose. Used by the promotion script, the validator and the tests.
 */
export { hasDoseText, doseFragments } from "../../lib/pgx/dose-text.ts";

/** CPIC population string (trimmed) → app ClinicalContext. Exact match only. */
export const POPULATION_TO_CONTEXT = Object.freeze({
  "CVI ACS PCI": "acs_pci",
  "CVI non-ACS non-PCI": "non_acs_pci",
  "NVI": "neurovascular",
  "general": "general",
});

export const CONTEXT_TO_POPULATION = Object.freeze(
  Object.fromEntries(Object.entries(POPULATION_TO_CONTEXT).map(([pop, ctx]) => [ctx, pop])),
);

/** Lookup values that never produce guidance (same rule as the research routes). */
export const EXCLUDED_LOOKUP_VALUES = Object.freeze(new Set(["Indeterminate", "No Result", "n/a"]));

/** Map a raw CPIC population (which may carry trailing spaces) to a context, or null. */
export function contextForPopulation(population) {
  if (typeof population !== "string") return null;
  return POPULATION_TO_CONTEXT[population.trim()] ?? null;
}

/**
 * Drugs that CPIC itself names in the recommendation text, from an explicit
 * vocabulary of names to look for. Returns them in vocabulary order; [] when
 * none appear. The vocabulary is a search list, not a recommendation.
 */
export function namedAlternatives(text, vocabulary, primaryDrug) {
  const lower = text.toLowerCase();
  return vocabulary.filter((name) => name !== primaryDrug &&
    new RegExp(`\\b${name.toLowerCase()}\\b`).test(lower));
}

/** True when a CPIC row's lookup key contains a value that never produces guidance. */
export function hasExcludedLookupValue(row) {
  return Object.values(row?.lookupkey ?? {}).some((value) => EXCLUDED_LOOKUP_VALUES.has(value));
}
