/**
 * Runtime guard for the reviewed-for-demo CPIC guidance snapshots in /data.
 *
 * Imported JSON is untyped. Instead of casting it, every bundled snapshot is
 * parsed here once, at module load, and any malformed or inconsistent file
 * throws. The engines (assess, assessPatient) stay pure and only ever see
 * values that passed these checks.
 *
 * The checks are structural and internal-consistency only. Provenance against
 * the live CPIC source is checked by scripts/validate-clinical-data.mjs.
 */

import { hasDoseText } from "./dose-text";
import { findPatientTextViolations } from "./patient-text-guard";
import type { ClinicalContext, DosingAlgorithmReference, GuidanceFinding } from "./types";

export const POPULATION_BY_CONTEXT: Readonly<Record<ClinicalContext, string>> = Object.freeze({
  acs_pci: "CVI ACS PCI",
  non_acs_pci: "CVI non-ACS non-PCI",
  neurovascular: "NVI",
  general: "general",
});

const CONTEXTS = Object.keys(POPULATION_BY_CONTEXT) as ClinicalContext[];
const FINDINGS: readonly GuidanceFinding[] = [
  "reduced_activation",
  "pgx_factor_identified",
  "no_pgx_change_identified",
  "source_no_recommendation",
];
const STRENGTHS = ["Strong", "Moderate", "Optional", "No Recommendation"] as const;
const EXCLUDED_LOOKUP_VALUES = new Set(["Indeterminate", "No Result", "n/a"]);

export type ReviewStatus = "source_checked_demo_only" | "clinically_reviewed";

export interface GuidanceRecord {
  sourceRecommendationId: number;
  /** CPIC population, trimmed. Must correspond to `context`. */
  population: string;
  context: ClinicalContext;
  lookupKey: Record<string, string>;
  phenotypes: Record<string, string>;
  /** CPIC classification, unchanged. */
  strength: (typeof STRENGTHS)[number];
  finding: GuidanceFinding;
  cpicRecommendationVerbatim: string;
  cpicImplicationsVerbatim: Record<string, string>;
  cpicCommentsVerbatim: string;
  alternatives: string[];
  doseTextPresent: boolean;
  /** Null only for "No Recommendation" rows, which never reach a patient. */
  patientText: string | null;
  clinicianSummary: string | null;
  humanClinicalReview: boolean;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedOn: string | null;
}

export interface GuidanceSnapshot {
  schemaVersion: 2;
  snapshotId: string;
  retrievedAt: string;
  reviewStatus: "source_checked_demo_only";
  source: {
    name: "CPIC";
    guidelineName: string;
    guidelineId: string;
    guidelineVersion: number;
    guidelineUrl: string;
    apiUrl: string;
    publicationPmid: string;
    usageTermsUrl: string;
  };
  pair: {
    genes: string[];
    drug: string;
    rxnormId: string;
    cpicLevels: Record<string, string>;
  };
  dosingAlgorithm: DosingAlgorithmReference | null;
  records: GuidanceRecord[];
}

class SnapshotError extends Error {}

type Json = Record<string, unknown>;

function fail(label: string, path: string, message: string): never {
  throw new SnapshotError(`Invalid guidance snapshot ${label}: ${path} ${message}`);
}

function object(value: unknown, label: string, path: string): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(label, path, "must be an object");
  return value as Json;
}

function text(value: unknown, label: string, path: string): string {
  if (typeof value !== "string" || value.trim() === "") fail(label, path, "must be a non-empty string");
  return value;
}

function nullableText(value: unknown, label: string, path: string): string | null {
  return value === null ? null : text(value, label, path);
}

function matches(value: unknown, pattern: RegExp, label: string, path: string): string {
  const result = text(value, label, path);
  if (!pattern.test(result)) fail(label, path, `does not match ${pattern}`);
  return result;
}

function integer(value: unknown, label: string, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    fail(label, path, "must be a positive integer");
  }
  return value;
}

function boolean(value: unknown, label: string, path: string): boolean {
  if (typeof value !== "boolean") fail(label, path, "must be a boolean");
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string, path: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    fail(label, path, `must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function textRecord(value: unknown, label: string, path: string): Record<string, string> {
  const source = object(value, label, path);
  const entries = Object.entries(source);
  if (entries.length === 0) fail(label, path, "must not be empty");
  return Object.fromEntries(entries.map(([key, item]) => [key, text(item, label, `${path}.${key}`)]));
}

function sameKeys(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const left = Object.keys(a).sort();
  const right = Object.keys(b).sort();
  return left.length === right.length && left.every((key, i) => key === right[i]);
}

const isNumericKey = (value: string) => /^\d+(?:\.\d+)?$/.test(value);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseDosingAlgorithm(value: unknown, label: string): DosingAlgorithmReference | null {
  if (value === null) return null;
  const source = object(value, label, "dosingAlgorithm");
  if (source.clinicianMustUseAlgorithmDirectly !== true) {
    fail(label, "dosingAlgorithm.clinicianMustUseAlgorithmDirectly", "must be true");
  }
  return {
    name: text(source.name, label, "dosingAlgorithm.name"),
    url: matches(source.url, /^https?:\/\//, label, "dosingAlgorithm.url"),
    pmid: source.pmid === null ? null : matches(source.pmid, /^\d+$/, label, "dosingAlgorithm.pmid"),
    cpicNotesOnUsageVerbatim: text(source.cpicNotesOnUsageVerbatim, label, "dosingAlgorithm.cpicNotesOnUsageVerbatim"),
    clinicianMustUseAlgorithmDirectly: true,
  };
}

function parseRecord(value: unknown, label: string, index: number, genes: Set<string>): GuidanceRecord {
  const path = `records[${index}]`;
  const row = object(value, label, path);
  const context = oneOf(row.context, CONTEXTS, label, `${path}.context`);
  const population = text(row.population, label, `${path}.population`);
  if (POPULATION_BY_CONTEXT[context] !== population) {
    fail(label, `${path}.context`, `"${context}" does not correspond to population "${population}"`);
  }

  const lookupKey = textRecord(row.lookupKey, label, `${path}.lookupKey`);
  const phenotypes = textRecord(row.phenotypes, label, `${path}.phenotypes`);
  const implications = textRecord(row.cpicImplicationsVerbatim, label, `${path}.cpicImplicationsVerbatim`);
  if (!sameKeys(lookupKey, phenotypes) || !sameKeys(lookupKey, implications)) {
    fail(label, path, "lookupKey, phenotypes and cpicImplicationsVerbatim must name the same genes");
  }
  for (const [gene, key] of Object.entries(lookupKey)) {
    if (!genes.has(gene)) fail(label, `${path}.lookupKey.${gene}`, "is not one of pair.genes");
    if (EXCLUDED_LOOKUP_VALUES.has(key)) fail(label, `${path}.lookupKey.${gene}`, `"${key}" never produces guidance`);
    if (!isNumericKey(key) && key !== phenotypes[gene]) {
      fail(label, `${path}.lookupKey.${gene}`, "must equal the phenotype unless it is an activity score");
    }
  }

  const strength = oneOf(row.strength, STRENGTHS, label, `${path}.strength`);
  const finding = oneOf(row.finding, FINDINGS, label, `${path}.finding`);
  if ((finding === "source_no_recommendation") !== (strength === "No Recommendation")) {
    fail(label, `${path}.finding`, "must be source_no_recommendation exactly when strength is No Recommendation");
  }

  const recommendation = text(row.cpicRecommendationVerbatim, label, `${path}.cpicRecommendationVerbatim`);
  const doseTextPresent = boolean(row.doseTextPresent, label, `${path}.doseTextPresent`);
  if (doseTextPresent !== hasDoseText(recommendation)) {
    fail(label, `${path}.doseTextPresent`, "disagrees with the verbatim recommendation");
  }

  if (!Array.isArray(row.alternatives)) fail(label, `${path}.alternatives`, "must be an array");
  const alternatives = row.alternatives.map((item, i) => text(item, label, `${path}.alternatives[${i}]`));
  for (const name of alternatives) {
    if (!new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(recommendation)) {
      fail(label, `${path}.alternatives`, `"${name}" is not named in the verbatim recommendation`);
    }
  }

  const patientText = nullableText(row.patientText, label, `${path}.patientText`);
  if ((patientText === null) !== (finding === "source_no_recommendation")) {
    fail(label, `${path}.patientText`, "must be null exactly for No Recommendation rows");
  }
  if (patientText !== null) {
    const violations = findPatientTextViolations(patientText);
    if (violations.length > 0) {
      fail(label, `${path}.patientText`, `contains dose or action wording: ${violations.map((v) => v.match).join(", ")}`);
    }
  }

  const humanClinicalReview = boolean(row.humanClinicalReview, label, `${path}.humanClinicalReview`);
  const reviewStatus = oneOf(row.reviewStatus, ["source_checked_demo_only", "clinically_reviewed"] as const, label, `${path}.reviewStatus`);
  const reviewedBy = nullableText(row.reviewedBy, label, `${path}.reviewedBy`);
  const reviewedOn = row.reviewedOn === null ? null : matches(row.reviewedOn, ISO_DATE, label, `${path}.reviewedOn`);
  if (humanClinicalReview) {
    if (!reviewedBy || !reviewedOn || reviewStatus !== "clinically_reviewed") {
      fail(label, path, "a reviewed record needs reviewedBy, reviewedOn and reviewStatus clinically_reviewed");
    }
  } else if (reviewedBy !== null || reviewedOn !== null || reviewStatus !== "source_checked_demo_only") {
    fail(label, path, "an unreviewed record must have reviewStatus source_checked_demo_only and no reviewer");
  }

  return {
    sourceRecommendationId: integer(row.sourceRecommendationId, label, `${path}.sourceRecommendationId`),
    population,
    context,
    lookupKey,
    phenotypes,
    strength,
    finding,
    cpicRecommendationVerbatim: recommendation,
    cpicImplicationsVerbatim: implications,
    cpicCommentsVerbatim: text(row.cpicCommentsVerbatim, label, `${path}.cpicCommentsVerbatim`),
    alternatives,
    doseTextPresent,
    patientText,
    clinicianSummary: nullableText(row.clinicianSummary, label, `${path}.clinicianSummary`),
    humanClinicalReview,
    reviewStatus,
    reviewedBy,
    reviewedOn,
  };
}

/** Parse one bundled snapshot or throw. Pure: no I/O. */
export function parseGuidanceSnapshot(value: unknown, label = "snapshot"): GuidanceSnapshot {
  const root = object(value, label, "(root)");
  if (root.schemaVersion !== 2) fail(label, "schemaVersion", "must be 2");
  if (root.reviewStatus !== "source_checked_demo_only") fail(label, "reviewStatus", "must be source_checked_demo_only");

  const source = object(root.source, label, "source");
  if (source.name !== "CPIC") fail(label, "source.name", "must be CPIC");
  const guidelineId = matches(source.guidelineId, /^PA\d+$/, label, "source.guidelineId");
  const guidelineUrl = text(source.guidelineUrl, label, "source.guidelineUrl");
  if (guidelineUrl !== `https://www.clinpgx.org/guideline/${guidelineId}`) {
    fail(label, "source.guidelineUrl", "must be the ClinPGx page for source.guidelineId");
  }

  const pair = object(root.pair, label, "pair");
  if (!Array.isArray(pair.genes) || pair.genes.length === 0) fail(label, "pair.genes", "must be a non-empty array");
  const genes = pair.genes.map((gene, i) => matches(gene, /^[A-Z0-9-]{2,20}$/, label, `pair.genes[${i}]`));
  if (new Set(genes).size !== genes.length || genes.some((gene, i) => i > 0 && genes[i - 1] > gene)) {
    fail(label, "pair.genes", "must be unique and sorted");
  }
  const cpicLevels = textRecord(pair.cpicLevels, label, "pair.cpicLevels");
  if (!sameKeys(cpicLevels, Object.fromEntries(genes.map((gene) => [gene, true])))) {
    fail(label, "pair.cpicLevels", "must have one level per gene");
  }

  const dosingAlgorithm = parseDosingAlgorithm(root.dosingAlgorithm, label);
  if (!Array.isArray(root.records)) fail(label, "records", "must be an array");
  const geneSet = new Set(genes);
  const records = root.records.map((row, i) => parseRecord(row, label, i, geneSet));
  if (dosingAlgorithm && records.length > 0) {
    fail(label, "records", "must be empty when a dosing algorithm is required");
  }
  if (!dosingAlgorithm && records.length === 0) fail(label, "records", "must not be empty");

  const ids = new Set<number>();
  const keys = new Set<string>();
  for (const record of records) {
    if (ids.has(record.sourceRecommendationId)) fail(label, "records", `duplicate ID ${record.sourceRecommendationId}`);
    ids.add(record.sourceRecommendationId);
    const key = `${record.context}|${JSON.stringify(Object.entries(record.lookupKey).sort())}`;
    if (keys.has(key)) fail(label, "records", `duplicate lookup key ${key}`);
    keys.add(key);
  }
  const usedGenes = new Set(records.flatMap((record) => Object.keys(record.lookupKey)));
  if (records.length > 0 && genes.some((gene) => !usedGenes.has(gene))) {
    fail(label, "pair.genes", "names a gene that no record uses");
  }

  return {
    schemaVersion: 2,
    snapshotId: text(root.snapshotId, label, "snapshotId"),
    retrievedAt: matches(root.retrievedAt, ISO_DATE, label, "retrievedAt"),
    reviewStatus: "source_checked_demo_only",
    source: {
      name: "CPIC",
      guidelineName: text(source.guidelineName, label, "source.guidelineName"),
      guidelineId,
      guidelineVersion: integer(source.guidelineVersion, label, "source.guidelineVersion"),
      guidelineUrl,
      apiUrl: matches(source.apiUrl, /^https:\/\/api\.cpicpgx\.org\//, label, "source.apiUrl"),
      publicationPmid: matches(source.publicationPmid, /^\d+$/, label, "source.publicationPmid"),
      usageTermsUrl: matches(source.usageTermsUrl, /^https:\/\//, label, "source.usageTermsUrl"),
    },
    pair: {
      genes,
      drug: matches(pair.drug, /^[a-z0-9 -]+$/, label, "pair.drug"),
      rxnormId: matches(pair.rxnormId, /^RxNorm:\d+$/, label, "pair.rxnormId"),
      cpicLevels,
    },
    dosingAlgorithm,
    records,
  };
}
