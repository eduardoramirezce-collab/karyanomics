/**
 * Provenance and safety validation for every curated CPIC guidance snapshot,
 * the generated patient snapshot, the drug monographs and the review queue.
 *
 * A live candidate (npm run fetch:clinpgx) is REQUIRED for every snapshot.
 * Without the source there is nothing to validate against, so this fails.
 *
 * Fails loudly (exit 1) on any mismatch. Never edits a file.
 */
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GUIDANCE } from "./lib/guidance-config.mjs";
import { contextForPopulation, doseFragments, hasDoseText, hasExcludedLookupValue, namedAlternatives } from "./lib/cpic-verbatim.mjs";
import { findPatientTextViolations } from "../lib/pgx/patient-text-guard.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const err = (scope, message) => errors.push(`${scope}: ${message}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortedEntries = (object) => JSON.stringify(Object.entries(object ?? {}).sort(([a], [b]) => a.localeCompare(b)));
const readJson = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));

/** Verbatim fields: the only places dose text may appear, and their CPIC source field. */
const VERBATIM_SOURCE = {
  cpicRecommendationVerbatim: (row) => [row.drugrecommendation],
  cpicCommentsVerbatim: (row) => [row.comments],
  cpicImplicationsVerbatim: (row) => Object.values(row.implications ?? {}),
};
/** Keys that must never reach the patient snapshot. */
const CLINICIAN_ONLY_KEY = /verbatim|dose|strength|alternatives|clinician|implication|comment|classification/i;
const PATIENT_RECORD_KEYS = ["context", "humanClinicalReview", "lookupKey", "patientText", "phenotypes", "sourceRecommendationId"];

/** Every string in `value` with its JSON path. */
function* strings(value, path = "") {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value)) for (const [i, item] of value.entries()) yield* strings(item, `${path}[${i}]`);
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) yield* strings(item, path ? `${path}.${key}` : key);
}
function* keys(value) {
  if (Array.isArray(value)) for (const item of value) yield* keys(item);
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) { yield key; yield* keys(item); }
}

const snapshots = new Map();
for (const entry of GUIDANCE) {
  const scope = entry.slug;
  const snapshot = await readJson(entry.snapshotPath);
  snapshots.set(entry.slug, snapshot);
  let candidate;
  try {
    candidate = await readJson(entry.candidatePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    err(scope, `no live candidate at ${entry.candidatePath}. Run \`npm run fetch:clinpgx\` (build-time, network) and re-run.`);
    continue;
  }

  // Snapshot-level provenance against the live source.
  const guideline = candidate.guideline?.[0];
  if (snapshot.schemaVersion !== 2) err(scope, "schemaVersion must be 2");
  if (snapshot.reviewStatus !== "source_checked_demo_only") err(scope, "snapshot reviewStatus must stay source_checked_demo_only");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.retrievedAt ?? "")) err(scope, "retrievedAt is missing");
  if (!guideline || guideline.name !== entry.guidelineName) err(scope, "candidate guideline does not match");
  else {
    if (snapshot.source.guidelineVersion !== guideline.version) {
      err(scope, `GUIDELINE VERSION MISMATCH: snapshot v${snapshot.source.guidelineVersion}, live CPIC v${guideline.version}. Review the source change before promoting.`);
    }
    if (snapshot.source.guidelineId !== guideline.clinpgxid || snapshot.source.guidelineUrl !== guideline.url) {
      err(scope, "guideline ID/URL differ from the live source");
    }
  }
  if (snapshot.source.publicationPmid !== candidate.publications?.[0]?.pmid) err(scope, "publicationPmid differs from the latest guideline publication");
  if (snapshot.pair.rxnormId !== candidate.drug?.[0]?.drugid || snapshot.pair.drug !== entry.drug) err(scope, "drug identity differs from the live source");
  for (const [gene, level] of Object.entries(snapshot.pair.cpicLevels ?? {})) {
    const pair = candidate.pair.find((item) => item.genesymbol === gene && item.usedforrecommendation === "Yes");
    if (!pair || pair.cpiclevel !== level || pair.provisional) err(scope, `CPIC level for ${gene} differs from the live source`);
  }

  if (snapshot.dosingAlgorithm) {
    if (snapshot.records.length) err(scope, "an algorithm-only guideline must have no records");
    if (snapshot.dosingAlgorithm.cpicNotesOnUsageVerbatim !== guideline?.notesonusage) {
      err(scope, "dosingAlgorithm.cpicNotesOnUsageVerbatim is not byte-identical to CPIC notesonusage");
    }
    if (snapshot.dosingAlgorithm.clinicianMustUseAlgorithmDirectly !== true) err(scope, "algorithm flag missing");
    if (candidate.recommendations.length) err(scope, "CPIC now publishes recommendation rows for this drug; review before relying on algorithm-only handling");
  }

  const live = new Map(candidate.recommendations.map((row) => [row.recommendationid, row]));
  const seen = new Set();
  for (const record of snapshot.records) {
    const id = record.sourceRecommendationId;
    const rs = `${scope} rec ${id}`;
    if (seen.has(id)) err(rs, "duplicate record");
    seen.add(id);
    const row = live.get(id);
    if (!row) { err(rs, "not found in the live CPIC candidate"); continue; }

    // Identity of the source row.
    if (row.drugname !== entry.drug || row.guidelinename !== entry.guidelineName) err(rs, "drug or guideline differs");
    if (sortedEntries(row.lookupkey) !== sortedEntries(record.lookupKey)) err(rs, "lookup key differs");
    if (sortedEntries(row.phenotypes) !== sortedEntries(record.phenotypes)) err(rs, "phenotypes differ");
    if (row.population.trim() !== record.population || contextForPopulation(row.population) !== record.context) {
      err(rs, `population/context differ (live "${row.population.trim()}", snapshot "${record.population}" / ${record.context})`);
    }
    if (row.classification !== record.strength) err(rs, `strength differs (live ${row.classification}, snapshot ${record.strength})`);
    if (hasExcludedLookupValue(row)) err(rs, "Indeterminate/No Result/n/a rows must not be stored");

    // Verbatim fields are byte-identical to the live source.
    if (record.cpicRecommendationVerbatim !== row.drugrecommendation) err(rs, "cpicRecommendationVerbatim is not byte-identical to drugrecommendation");
    if (record.cpicCommentsVerbatim !== row.comments) err(rs, "cpicCommentsVerbatim is not byte-identical to comments");
    if (sortedEntries(record.cpicImplicationsVerbatim) !== sortedEntries(
      Object.fromEntries(Object.keys(row.lookupkey).map((gene) => [gene, row.implications?.[gene]])))) {
      err(rs, "cpicImplicationsVerbatim is not byte-identical to implications.<GENE>");
    }
    if (!same(record.alternatives, namedAlternatives(row.drugrecommendation, entry.alternativesVocabulary, entry.drug))) {
      err(rs, "alternatives are not exactly the drugs CPIC names");
    }
    if (record.doseTextPresent !== hasDoseText(row.drugrecommendation)) err(rs, "doseTextPresent is wrong");

    // Dose text may exist only inside verbatim fields, as a substring of its source field.
    for (const [path, value] of strings(record)) {
      const field = path.split(".")[0];
      const fragments = doseFragments(value);
      if (!fragments.length) continue;
      const sources = VERBATIM_SOURCE[field]?.(row);
      if (!sources) { err(rs, `dose text "${fragments[0]}" outside a verbatim field (${path})`); continue; }
      for (const fragment of fragments) {
        if (!sources.some((source) => typeof source === "string" && source.includes(fragment))) {
          err(rs, `dose text "${fragment}" in ${path} is not a substring of the CPIC source`);
        }
      }
    }

    // Patient text and the human review gate.
    if (record.patientText !== null) {
      const violations = findPatientTextViolations(record.patientText);
      if (violations.length) err(rs, `patient text contains ${violations.map((v) => v.match).join(", ")}`);
    } else if (record.strength !== "No Recommendation") err(rs, "patient text is missing");
    if (record.humanClinicalReview === true) {
      if (!record.reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(record.reviewedOn ?? "") || record.reviewStatus !== "clinically_reviewed") {
        err(rs, "marked reviewed without reviewedBy and reviewedOn");
      }
    } else if (record.humanClinicalReview !== false || record.reviewStatus !== "source_checked_demo_only" ||
      record.reviewedBy !== null || record.reviewedOn !== null) {
      err(rs, "unreviewed records must be humanClinicalReview false with no reviewer");
    }
  }
  console.log(`${scope}: ${snapshot.records.length} records checked against live CPIC v${guideline?.version} (${candidate.fetchedAt}).`);
}

// Generated patient snapshot: allowlisted fields only, in sync with the sources.
const patient = await readJson("data/patient-guidance.v1.json");
for (const key of keys(patient)) {
  if (CLINICIAN_ONLY_KEY.test(key)) err("patient snapshot", `contains clinician-only or dose field "${key}"`);
}
for (const [path, value] of strings(patient)) {
  if (path.endsWith("patientText") && findPatientTextViolations(value).length) err("patient snapshot", `${path} contains dose/action wording`);
}
if (patient.schemaVersion !== 2 || patient.guidelines?.length !== GUIDANCE.length) err("patient snapshot", "out of date; run npm run build:patient-data");
for (const entry of GUIDANCE) {
  const source = snapshots.get(entry.slug);
  const pub = patient.guidelines?.find((item) => item.pair?.drug === entry.drug);
  if (!pub || pub.sourceSnapshotId !== source.snapshotId) { err("patient snapshot", `${entry.slug} is out of sync; run npm run build:patient-data`); continue; }
  const expected = source.records.filter((row) => row.patientText !== null);
  if (pub.records.length !== expected.length) err("patient snapshot", `${entry.slug} record count differs from source`);
  for (const row of expected) {
    const item = pub.records.find((candidate) => candidate.sourceRecommendationId === row.sourceRecommendationId);
    if (!item || Object.keys(item).sort().join() !== PATIENT_RECORD_KEYS.join() ||
      item.patientText !== row.patientText || item.context !== row.context ||
      !same(item.lookupKey, row.lookupKey) || !same(item.phenotypes, row.phenotypes) ||
      item.humanClinicalReview !== row.humanClinicalReview) {
      err("patient snapshot", `${entry.slug} rec ${row.sourceRecommendationId} differs from the clinical source`);
    }
  }
}

// Drug monographs (Stage 2), when present.
let monographFiles = [];
try {
  monographFiles = (await readdir(join(root, "data/drugs"))).filter((name) => name.endsWith(".v1.json"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
for (const name of monographFiles) {
  const drug = await readJson(`data/drugs/${name}`);
  const scope = `monograph ${name}`;
  const label = drug.whatItIsUsedFor ?? {};
  if (!/^[0-9a-f-]{36}$/i.test(label.splSetId ?? "")) err(scope, "whatItIsUsedFor.splSetId is missing");
  if (!label.splVersion) err(scope, "whatItIsUsedFor.splVersion is missing");
  if (!/^\d{4}-\d{2}-\d{2}/.test(label.retrievedAt ?? "")) err(scope, "whatItIsUsedFor.retrievedAt is missing");
  if (drug.mechanismSummary?.needsHumanReview !== true) err(scope, "mechanismSummary must be needsHumanReview: true");
  if (drug.patientFriendlyDescription?.needsHumanReview !== true) err(scope, "patientFriendlyDescription must be needsHumanReview: true");
  const patientText = drug.patientFriendlyDescription?.text ?? "";
  if (findPatientTextViolations(patientText).length) err(scope, "patientFriendlyDescription contains dose/action wording");
}

if (errors.length) {
  console.error(`Clinical data validation FAILED (${errors.length}):`);
  for (const message of errors) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${[...snapshots.values()].reduce((n, s) => n + s.records.length, 0)} guidance records, the patient snapshot and ${monographFiles.length} monographs.`);
}
