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

import s_cyp2c19Clopidogrel from "../../data/cpic-cyp2c19-clopidogrel.v1.json";
import s_slco1b1Simvastatin from "../../data/cpic-slco1b1-simvastatin.v1.json";
import s_cyp2c9Vkorc1Cyp4f2Warfarin from "../../data/cpic-cyp2c9-vkorc1-cyp4f2-warfarin.v1.json";
import s_tpmtNudt15Azathioprine from "../../data/cpic-tpmt-nudt15-azathioprine.v1.json";
import s_tpmtNudt15Mercaptopurine from "../../data/cpic-tpmt-nudt15-mercaptopurine.v1.json";
import s_dpydFluorouracil from "../../data/cpic-dpyd-fluorouracil.v1.json";
import s_dpydCapecitabine from "../../data/cpic-dpyd-capecitabine.v1.json";
import s_cyp2c19Citalopram from "../../data/cpic-cyp2c19-citalopram.v1.json";
import s_cyp2c19Escitalopram from "../../data/cpic-cyp2c19-escitalopram.v1.json";
import s_cyp2c19Cyp2b6Sertraline from "../../data/cpic-cyp2c19-cyp2b6-sertraline.v1.json";
import { matchGuidance } from "./guidance-match";
import { parseGuidanceSnapshot, type GuidanceSnapshot } from "./guidance-snapshot";
import type { ClinicalAssessment, ClinicalAssessmentInput } from "./types";

/** Every bundled CPIC guidance snapshot, validated at module load. */
export const BUNDLED_GUIDANCE_SNAPSHOTS: readonly GuidanceSnapshot[] = Object.freeze([
  parseGuidanceSnapshot(s_cyp2c19Clopidogrel, "cpic-cyp2c19-clopidogrel.v1.json"),
  parseGuidanceSnapshot(s_slco1b1Simvastatin, "cpic-slco1b1-simvastatin.v1.json"),
  parseGuidanceSnapshot(s_cyp2c9Vkorc1Cyp4f2Warfarin, "cpic-cyp2c9-vkorc1-cyp4f2-warfarin.v1.json"),
  parseGuidanceSnapshot(s_tpmtNudt15Azathioprine, "cpic-tpmt-nudt15-azathioprine.v1.json"),
  parseGuidanceSnapshot(s_tpmtNudt15Mercaptopurine, "cpic-tpmt-nudt15-mercaptopurine.v1.json"),
  parseGuidanceSnapshot(s_dpydFluorouracil, "cpic-dpyd-fluorouracil.v1.json"),
  parseGuidanceSnapshot(s_dpydCapecitabine, "cpic-dpyd-capecitabine.v1.json"),
  parseGuidanceSnapshot(s_cyp2c19Citalopram, "cpic-cyp2c19-citalopram.v1.json"),
  parseGuidanceSnapshot(s_cyp2c19Escitalopram, "cpic-cyp2c19-escitalopram.v1.json"),
  parseGuidanceSnapshot(s_cyp2c19Cyp2b6Sertraline, "cpic-cyp2c19-cyp2b6-sertraline.v1.json"),
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
