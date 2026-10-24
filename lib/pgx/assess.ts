/**
 * Clinician engine: verified gene results + drug + clinical context → one exact
 * CPIC source row, with its verbatim text and provenance.
 *
 * Pure: no network, storage, or logging. The bundled snapshots are parsed once,
 * at module load, by parseGuidanceSnapshot(), which throws on a malformed file.
 * Tests may pass their own snapshots as the second argument.
 *
 * It never computes a dose. Dose text appears only inside verbatim CPIC fields.
 */

import clopidogrel from "../../data/cpic-cyp2c19-clopidogrel.v1.json";
import { matchGuidance } from "./guidance-match";
import { parseGuidanceSnapshot, type GuidanceSnapshot } from "./guidance-snapshot";
import type { ClinicalAssessment, ClinicalAssessmentInput } from "./types";

/** Every bundled CPIC guidance snapshot, validated at module load. */
export const BUNDLED_GUIDANCE_SNAPSHOTS: readonly GuidanceSnapshot[] = Object.freeze([
  parseGuidanceSnapshot(clopidogrel, "cpic-cyp2c19-clopidogrel.v1.json"),
]);

export function assess(
  input: ClinicalAssessmentInput,
  snapshots: readonly GuidanceSnapshot[] = BUNDLED_GUIDANCE_SNAPSHOTS,
): ClinicalAssessment {
  const match = matchGuidance(input, snapshots.map((snapshot) => ({
    pair: snapshot.pair,
    requiresDosingAlgorithm: snapshot.dosingAlgorithm !== null,
    records: snapshot.records,
  })));

  if (!match.ok) {
    const snapshot = match.guidelineIndex === undefined ? undefined : snapshots[match.guidelineIndex];
    if (match.reason === "dosing_algorithm_required" && snapshot?.dosingAlgorithm) {
      return { status: match.status, reason: match.reason, dosingAlgorithmReference: snapshot.dosingAlgorithm };
    }
    return { status: match.status, reason: match.reason };
  }

  const snapshot = snapshots[match.guidelineIndex];
  const record = snapshot.records[match.recordIndex];
  if (record.finding === "source_no_recommendation" || record.patientText === null) {
    return {
      status: "insufficient_data",
      reason: "source_no_recommendation",
      recommendationId: record.sourceRecommendationId,
    };
  }

  return {
    status: "matched",
    genes: Object.keys(record.lookupKey).sort(),
    drug: snapshot.pair.drug,
    phenotypes: { ...record.phenotypes },
    lookupKey: { ...record.lookupKey },
    context: record.context,
    strength: record.strength,
    finding: record.finding,
    patientText: record.patientText,
    clinicianSummary: record.clinicianSummary,
    cpicRecommendationVerbatim: record.cpicRecommendationVerbatim,
    cpicImplicationsVerbatim: { ...record.cpicImplicationsVerbatim },
    cpicCommentsVerbatim: record.cpicCommentsVerbatim,
    alternatives: [...record.alternatives],
    doseTextPresent: record.doseTextPresent,
    source: {
      guidelineUrl: snapshot.source.guidelineUrl,
      guidelineVersion: snapshot.source.guidelineVersion,
      publicationPmid: snapshot.source.publicationPmid,
      recommendationId: record.sourceRecommendationId,
      retrievedAt: snapshot.retrievedAt,
    },
    humanClinicalReview: record.humanClinicalReview,
  };
}
