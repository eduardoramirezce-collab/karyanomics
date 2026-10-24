/**
 * Shared patient-text safety matcher.
 *
 * Patient-facing text must never state or imply a dose and must never tell a
 * person to act on a medication (.kiro/steering/clinical-safety.md). This one
 * matcher is imported by scripts/validate-clinical-data.mjs, the snapshot
 * builders, and the tests, so every check uses the same rule.
 *
 * It is deliberately strict: it matches words, not meaning, so a noun such as
 * "change" is rejected too. Rephrase rather than weaken the pattern.
 *
 * Pure, no I/O. Erasable TypeScript only, so Node can import it from .mjs.
 */

/** Dose amounts, units, percentages, and dose vocabulary. */
const DOSE_PATTERNS: readonly RegExp[] = [
  // A number followed by a unit, with or without a space: "75 mg", "75mg", "2 mg/kg".
  /\d\s*(?:mg|mcg|µg|μg|ug|g|kg|ml|mL|L|units?|iu|IU)(?![a-z])/i,
  // Percentages and fold changes: "50%", "10-fold".
  /\d\s*%/,
  /\d\s*-?\s*fold\b/i,
  // Dose vocabulary and spelled-out units.
  /\b(?:doses?|dosing|dosage|dosed|milligrams?|micrograms?|grams?|mg|mcg|tablets?|pills?|capsules?)\b/i,
  // Frequencies.
  /\b(?:once|twice|thrice)\s+(?:a\s+)?(?:day|daily|week|weekly)\b/i,
  /\b(?:daily|per\s+day|a\s+day)\b/i,
];

/** Medication-action verbs, including the ones CPIC itself uses ("Avoid"). */
const ACTION_PATTERNS: readonly RegExp[] = [
  /\bavoid\w*/i,
  /\bstart\w*/i,
  /\bstop\w*/i,
  /\b(?:take|takes|taken|taking|took)\b/i,
  /\bskip\w*/i,
  /\bswitch\w*/i,
  /\bchang\w*/i,
  /\bdiscontinu\w*/i,
  /\bincreas\w*/i,
  /\bdecreas\w*/i,
  /\breduc\w*/i,
  /\btitrat\w*/i,
  /\bquit\w*/i,
  /\bcease\w*/i,
];

export interface PatientTextViolation {
  kind: "dose" | "action";
  match: string;
}

/** Every dose or action match in `text`. Empty when the text is patient-safe. */
export function findPatientTextViolations(text: string): PatientTextViolation[] {
  const violations: PatientTextViolation[] = [];
  for (const pattern of DOSE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) violations.push({ kind: "dose", match: match[0] });
  }
  for (const pattern of ACTION_PATTERNS) {
    const match = pattern.exec(text);
    if (match) violations.push({ kind: "action", match: match[0] });
  }
  return violations;
}

/** True when `text` contains no dose and no medication-action wording. */
export function isPatientSafeText(text: string): boolean {
  return findPatientTextViolations(text).length === 0;
}
