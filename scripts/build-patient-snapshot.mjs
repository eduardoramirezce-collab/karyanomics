/**
 * Generate data/patient-guidance.v1.json, the only guidance file the browser
 * patient engine reads, by copying an allowlist of patient-safe fields from
 * every curated snapshot.
 *
 * Never copied: verbatim CPIC text, strength, alternatives, dose flags,
 * clinician summaries, implications, comments. "No Recommendation" rows are
 * left out entirely; the patient engine reports insufficient data for them.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GUIDANCE } from "./lib/guidance-config.mjs";
import { findPatientTextViolations } from "../lib/pgx/patient-text-guard.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guidelines = [];
for (const entry of GUIDANCE) {
  const source = JSON.parse(await readFile(join(root, entry.snapshotPath), "utf8"));
  const records = source.records
    .filter((row) => row.patientText !== null)
    .map((row) => {
      const violations = findPatientTextViolations(row.patientText);
      if (violations.length) throw new Error(`${entry.slug} ${row.sourceRecommendationId}: unsafe patient text`);
      return {
        sourceRecommendationId: row.sourceRecommendationId,
        context: row.context,
        lookupKey: row.lookupKey,
        phenotypes: row.phenotypes,
        patientText: row.patientText,
        humanClinicalReview: row.humanClinicalReview,
      };
    });
  guidelines.push({
    sourceSnapshotId: source.snapshotId,
    reviewStatus: source.reviewStatus,
    source: {
      guidelineUrl: source.source.guidelineUrl,
      guidelineVersion: source.source.guidelineVersion,
      publicationPmid: source.source.publicationPmid,
    },
    pair: { genes: source.pair.genes, drug: source.pair.drug, rxnormId: source.pair.rxnormId },
    algorithmOnly: source.dosingAlgorithm !== null,
    records,
  });
}
const publicSnapshot = { schemaVersion: 2, guidelines };
await writeFile(join(root, "data/patient-guidance.v1.json"), JSON.stringify(publicSnapshot, null, 2) + "\n");
console.log(`Generated patient snapshot from ${guidelines.map((g) => g.sourceSnapshotId).join(", ")}`);
