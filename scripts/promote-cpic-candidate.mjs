/**
 * Copy verbatim CPIC rows from a reviewed candidate into a curated snapshot.
 *
 * Run by a person, never by CI:
 *   node scripts/promote-cpic-candidate.mjs <slug> [--existing-only] [--reword-unsafe-patient-text]
 *
 * Guarantees:
 * - Text fields are copied byte-for-byte from the candidate. Nothing is authored
 *   except the project finding label and the templated patient paraphrase.
 * - An existing record whose ID, lookup key, population, strength or verbatim
 *   text no longer matches the source stops the run. Nothing is overwritten.
 * - A guideline version change stops the run.
 * - New records are always created unreviewed (humanClinicalReview: false).
 * - Rows keyed on Indeterminate / No Result / n/a are never promoted.
 * - --existing-only adds missing verbatim fields to existing rows only.
 * - --reword-unsafe-patient-text replaces an unreviewed row's patient text that
 *   fails lib/pgx/patient-text-guard.ts with the template, and reports it.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { USAGE_TERMS_URL, guidanceBySlug, patientTextFor } from "./lib/guidance-config.mjs";
import { contextForPopulation, hasDoseText, hasExcludedLookupValue, namedAlternatives } from "./lib/cpic-verbatim.mjs";
import { findPatientTextViolations } from "../lib/pgx/patient-text-guard.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [slug, ...flags] = process.argv.slice(2);
if (!slug) throw new Error("Usage: promote-cpic-candidate.mjs <slug> [--existing-only] [--reword-unsafe-patient-text]");
const entry = guidanceBySlug(slug);
const existingOnly = flags.includes("--existing-only");
const reword = flags.includes("--reword-unsafe-patient-text");

function stop(message) {
  console.error(`STOPPED (${slug}): ${message}\nThe curated snapshot was not changed.`);
  process.exit(1);
}

async function readJson(path, missingMessage) {
  try {
    return JSON.parse(await readFile(join(root, path), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" && missingMessage !== undefined) return missingMessage;
    if (error.code === "ENOENT") stop(`${path} not found. Run \`npm run fetch:clinpgx -- ${slug}\` first.`);
    throw error;
  }
}

const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NORMAL = new Set(["Normal Metabolizer", "Normal Function"]);

const candidate = await readJson(entry.candidatePath);
const existing = await readJson(entry.snapshotPath, null);
const guideline = candidate.guideline?.[0];
if (!guideline || guideline.name !== entry.guidelineName) stop("candidate guideline does not match the configuration");
if (existing && existing.source.guidelineVersion !== guideline.version) {
  stop(`CPIC guideline version changed from ${existing.source.guidelineVersion} to ${guideline.version}. Review the source before promoting.`);
}
const latestPublication = candidate.publications?.[0];
if (!latestPublication?.pmid) stop("candidate has no guideline publication");
if (existing && existing.source.publicationPmid !== latestPublication.pmid) {
  stop(`latest guideline publication changed from PMID ${existing.source.publicationPmid} to ${latestPublication.pmid}.`);
}

const rows = candidate.recommendations.filter((row) =>
  row.drugname === entry.drug && row.guidelinename === entry.guidelineName);
const byId = new Map(rows.map((row) => [row.recommendationid, row]));

function verbatimFields(row) {
  const genes = Object.keys(row.lookupkey).sort();
  const implications = {};
  for (const gene of genes) {
    if (typeof row.implications?.[gene] !== "string") stop(`row ${row.recommendationid} has no implications.${gene}`);
    implications[gene] = row.implications[gene];
  }
  if (typeof row.drugrecommendation !== "string" || typeof row.comments !== "string") {
    stop(`row ${row.recommendationid} is missing drugrecommendation or comments`);
  }
  return {
    cpicRecommendationVerbatim: row.drugrecommendation,
    cpicImplicationsVerbatim: implications,
    cpicCommentsVerbatim: row.comments,
    alternatives: namedAlternatives(row.drugrecommendation, entry.alternativesVocabulary, entry.drug),
    doseTextPresent: hasDoseText(row.drugrecommendation),
  };
}

/** The all-normal row of the same drug and population, used only to label a finding. */
function referenceRow(row) {
  const matches = rows.filter((other) => other.population === row.population &&
    Object.values(other.phenotypes ?? {}).length > 0 &&
    Object.values(other.phenotypes).every((value) => NORMAL.has(value)));
  if (matches.length !== 1) stop(`expected one all-normal reference row for population "${row.population.trim()}", found ${matches.length}`);
  return matches[0];
}

function findingFor(row) {
  if (row.classification === "No Recommendation") return "source_no_recommendation";
  return row.drugrecommendation === referenceRow(row).drugrecommendation
    ? "no_pgx_change_identified" : entry.nonNormalFinding;
}

const changes = [];
const records = [];
for (const record of existing?.records ?? []) {
  const id = record.sourceRecommendationId;
  const row = byId.get(id);
  if (!row) stop(`existing record ${id} is no longer in the CPIC candidate`);
  const lookupKey = record.lookupKey ?? { [existing.pair.gene]: record.phenotype };
  if (!same(sorted(lookupKey), sorted(row.lookupkey))) stop(`record ${id}: lookup key changed in the source`);
  const population = row.population.trim();
  if ((record.population ?? population) !== population || contextForPopulation(population) !== record.context) {
    stop(`record ${id}: population/context no longer matches the source ("${population}")`);
  }
  if (record.strength !== row.classification) stop(`record ${id}: strength changed from ${record.strength} to ${row.classification}`);

  const verbatim = verbatimFields(row);
  for (const [field, value] of Object.entries(verbatim)) {
    if (record[field] !== undefined && !same(record[field], value)) {
      stop(`record ${id}: ${field} differs from the source. Review the change; it was not overwritten.`);
    }
    if (record[field] === undefined) changes.push(`record ${id}: added ${field}`);
  }

  let patientText = record.patientText;
  const violations = patientText === null ? [] : findPatientTextViolations(patientText);
  if (violations.length > 0) {
    if (!reword || record.humanClinicalReview) {
      stop(`record ${id}: patient text fails the guard (${violations.map((v) => v.match).join(", ")}). Use --reword-unsafe-patient-text for unreviewed rows.`);
    }
    patientText = patientTextFor(record.finding, Object.keys(row.lookupkey).sort(), entry.drug);
    changes.push(`record ${id}: patient text reworded (guard matched ${violations.map((v) => v.match).join(", ")})`);
  }

  records.push({
    sourceRecommendationId: id,
    population,
    context: record.context,
    lookupKey: sorted(row.lookupkey),
    phenotypes: sorted(row.phenotypes),
    strength: row.classification,
    finding: record.finding,
    ...verbatim,
    patientText,
    clinicianSummary: record.clinicianSummary ?? null,
    humanClinicalReview: record.humanClinicalReview,
    reviewStatus: record.reviewStatus ?? "source_checked_demo_only",
    reviewedBy: record.reviewedBy ?? null,
    reviewedOn: record.reviewedOn ?? null,
  });
}

if (!existingOnly) {
  const known = new Set(records.map((record) => record.sourceRecommendationId));
  const additions = rows
    .filter((row) => !known.has(row.recommendationid) && !hasExcludedLookupValue(row) &&
      entry.populations.includes(row.population.trim()))
    .sort((a, b) => entry.populations.indexOf(a.population.trim()) - entry.populations.indexOf(b.population.trim()) ||
      a.recommendationid - b.recommendationid);
  for (const row of additions) {
    const population = row.population.trim();
    const context = contextForPopulation(population);
    if (!context) stop(`row ${row.recommendationid}: unknown population "${population}"`);
    const finding = findingFor(row);
    const genes = Object.keys(row.lookupkey).sort();
    records.push({
      sourceRecommendationId: row.recommendationid,
      population,
      context,
      lookupKey: sorted(row.lookupkey),
      phenotypes: sorted(row.phenotypes),
      strength: row.classification,
      finding,
      ...verbatimFields(row),
      patientText: patientTextFor(finding, genes, entry.drug),
      clinicianSummary: null,
      humanClinicalReview: false,
      reviewStatus: "source_checked_demo_only",
      reviewedBy: null,
      reviewedOn: null,
    });
    changes.push(`record ${row.recommendationid}: added (${population}, ${JSON.stringify(row.lookupkey)}, ${row.classification})`);
  }
}

const genes = [...new Set(records.flatMap((record) => Object.keys(record.lookupKey)))].sort();
const cpicLevels = {};
for (const gene of genes) {
  const pair = candidate.pair.find((item) => item.genesymbol === gene && item.usedforrecommendation === "Yes" && !item.provisional);
  if (!pair?.cpiclevel) stop(`no non-provisional CPIC pair row used for recommendation for ${gene}`);
  cpicLevels[gene] = pair.cpiclevel;
}
const drugRow = candidate.drug[0];
if (drugRow.name !== entry.drug || !/^RxNorm:\d+$/.test(drugRow.drugid)) stop("candidate drug identity is unexpected");
if (guideline.url !== `https://www.clinpgx.org/guideline/${guideline.clinpgxid}`) stop("unexpected guideline URL");

const body = {
  source: {
    name: "CPIC",
    guidelineName: guideline.name,
    guidelineId: guideline.clinpgxid,
    guidelineVersion: guideline.version,
    guidelineUrl: guideline.url,
    apiUrl: candidate.endpoints.recommendations,
    publicationPmid: latestPublication.pmid,
    usageTermsUrl: USAGE_TERMS_URL,
  },
  pair: { genes, drug: entry.drug, rxnormId: drugRow.drugid, cpicLevels },
  dosingAlgorithm: existing?.dosingAlgorithm ?? null,
  records,
};
const previousBody = existing && {
  source: existing.source, pair: existing.pair, dosingAlgorithm: existing.dosingAlgorithm ?? null, records: existing.records,
};
if (existing?.schemaVersion === 2 && same(previousBody, body)) {
  console.log(`${slug}: snapshot already matches the candidate; nothing to do.`);
  process.exit(0);
}

const retrievedAt = candidate.fetchedAt.slice(0, 10);
const revision = Number(/-r(\d+)$/.exec(existing?.snapshotId ?? "")?.[1] ?? 0) + 1;
const snapshot = {
  schemaVersion: 2,
  snapshotId: `cpic-${slug}-${retrievedAt}-r${revision}`,
  retrievedAt,
  reviewStatus: "source_checked_demo_only",
  ...body,
};
await writeFile(join(root, entry.snapshotPath), JSON.stringify(snapshot, null, 2) + "\n");
console.log(`${slug}: wrote ${snapshot.snapshotId} (${records.length} records)`);
for (const change of changes) console.log(`  - ${change}`);
console.log("Every new or changed row remains humanClinicalReview: false. Regenerate: npm run build:patient-data && npm run build:review-queue");
