/** Generate the public browser snapshot by allowlisting patient-safe fields. */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(await readFile(join(root, "data/cpic-cyp2c19-clopidogrel.v1.json"), "utf8"));
const publicSnapshot = {
  schemaVersion: 1,
  sourceSnapshotId: source.snapshotId,
  reviewStatus: source.reviewStatus,
  source: {
    guidelineUrl: source.source.guidelineUrl,
    guidelineVersion: source.source.guidelineVersion,
    publicationPmid: source.source.publicationPmid,
  },
  pair: { gene: source.pair.gene, drug: source.pair.drug },
  records: source.records.map((row) => ({
    phenotype: row.phenotype,
    context: row.context,
    patientText: row.patientText,
    sourceRecommendationId: row.sourceRecommendationId,
    humanClinicalReview: row.humanClinicalReview,
  })),
};
await writeFile(join(root, "data/patient-guidance.v1.json"), JSON.stringify(publicSnapshot, null, 2) + "\n");
console.log(`Generated patient snapshot from ${source.snapshotId}`);
