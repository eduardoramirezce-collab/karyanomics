import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(
  await readFile(join(root, "data/cpic-cyp2c19-clopidogrel.v1.json"), "utf8"),
);
const errors = [];
const key = (row) => `${row.phenotype}|${row.context}`;

if (snapshot.schemaVersion !== 1) errors.push("Unexpected schema version");
if (snapshot.reviewStatus !== "source_checked_demo_only") {
  errors.push("Snapshot must remain clearly marked as demo-only until clinical review");
}
if (snapshot.pair.gene !== "CYP2C19" || snapshot.pair.drug !== "clopidogrel") {
  errors.push("Unexpected gene-drug pair");
}
if (!snapshot.source.guidelineUrl?.startsWith("https://")) {
  errors.push("Guideline URL is missing or invalid");
}
if (!Number.isInteger(snapshot.source.guidelineVersion)) {
  errors.push("Guideline version is missing");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.retrievedAt)) {
  errors.push("Retrieval date is missing");
}
if (!Array.isArray(snapshot.records) || snapshot.records.length === 0) {
  errors.push("No recommendation records");
} else {
  const seen = new Set();
  for (const row of snapshot.records) {
    if (seen.has(key(row))) errors.push(`Duplicate recommendation: ${key(row)}`);
    seen.add(key(row));
    if (!Number.isInteger(row.sourceRecommendationId)) {
      errors.push(`Missing source recommendation ID: ${key(row)}`);
    }
    if (row.context !== "acs_pci") errors.push(`Unsupported context: ${key(row)}`);
    if (!row.strength) errors.push(`Missing strength: ${key(row)}`);
    if (row.humanClinicalReview !== false) {
      errors.push(`Clinical review status must be explicit: ${key(row)}`);
    }
    if (/\b(start|stop|take|dose|mg|milligram)\b/i.test(row.patientText)) {
      errors.push(`Patient wording may imply a medication action or dose: ${key(row)}`);
    }
  }
}

try {
  const candidate = JSON.parse(
    await readFile(join(root, "data/candidates/cpic-cyp2c19-clopidogrel.json"), "utf8"),
  );
  if (candidate.guideline?.[0]?.version !== snapshot.source.guidelineVersion) {
    errors.push("Live candidate guideline version differs from bundled snapshot");
  }
  for (const row of snapshot.records) {
    const match = candidate.recommendations?.find(
      (item) => item.recommendationid === row.sourceRecommendationId,
    );
    if (!match || match.phenotypes?.CYP2C19 !== row.phenotype ||
        match.population?.trim() !== "CVI ACS PCI" ||
        match.classification !== row.strength) {
      errors.push(`Candidate does not match source row: ${key(row)}`);
    }
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.log("No candidate refresh found; checking bundled snapshot only.");
}

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${snapshot.records.length} source-linked demo records.`);
}
