/**
 * Per-gene and per-drug results for the demo portal.
 *
 * Pure: reads only its arguments and bundled lib/pgx + data/ modules. No network,
 * storage, DOM, or console access. Follows .kiro/steering/clinical-safety.md:
 * - every status maps to one of the three steering levels;
 * - patient output never carries diplotypes, CPIC classifications, recommendation
 *   IDs, or recommendation wording, and never tells anyone to change a medication;
 * - assessPatient() text is reached only for a bundled sample whose CYP2C19 call
 *   passes toMayaSampleAssessment(); uploads always get the generic prescriber line.
 */
import routeData from "../../data/cpic-recommendation-routes.v1.json";
import alleleDefinitions from "../../data/allele-definitions.json";
import phenotypeTable from "../../data/cpic-diplotype-phenotypes.json";
import { assessPatient } from "./assess-patient";
import type { DrugResearchEntry } from "./drug-therapeutic-groups";
import { findGeneDrugPairCandidates } from "./gene-drug-catalog";
import {
  findResearchRecommendationRoute,
  type CallerEvidence,
  type ResearchRouteInput,
  type ResearchRouteResult,
} from "./research-recommendation-route";
import { toMayaSampleAssessment } from "./sample-assessment";
import type { DiplotypeCall, ParsedVcf } from "./types";

export const DISPLAY_STATUSES = [
  "Typical",
  "Your genes may change how this works",
  "Can't tell from this file",
  "Needs a clinician-run calculation",
] as const;
export type DisplayStatus = (typeof DISPLAY_STATUSES)[number];

/** The three result levels from clinical-safety.md. */
export type SteeringLevel = "typical" | "may-differ" | "talk-to-prescriber";

export const STATUS_LEVEL: Readonly<Record<DisplayStatus, SteeringLevel>> = {
  "Typical": "typical",
  "Your genes may change how this works": "may-differ",
  "Can't tell from this file": "talk-to-prescriber",
  "Needs a clinician-run calculation": "talk-to-prescriber",
};

export type Role = "patient" | "clinician";
export type SampleId = "maya" | "alex" | "sam";
export type ResultSource = { kind: "sample"; id: SampleId } | { kind: "upload" };

/** The eight genes the research caller reads from a VCF. */
export const VCF_GENES = [
  "CYP2C19", "CYP2C9", "VKORC1", "CYP4F2", "SLCO1B1", "ABCG2", "TPMT", "NUDT15",
] as const;

/** One plain line per gene: what it does, with no claim about response or dosing. */
export const GENE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  CYP2C19: "Makes a liver enzyme that helps break down some medicines.",
  CYP2C9: "Makes a liver enzyme that helps break down some medicines.",
  VKORC1: "Makes a protein your body uses to help blood clot.",
  CYP4F2: "Makes an enzyme that helps your body use vitamin K.",
  SLCO1B1: "Makes a pump that moves some medicines into the liver.",
  ABCG2: "Makes a pump that moves some medicines out of cells.",
  TPMT: "Makes an enzyme that helps break down some medicines.",
  NUDT15: "Makes an enzyme that helps break down some medicines.",
  CYP2D6: "Makes a liver enzyme that helps break down some medicines.",
};

export const GENERIC_PRESCRIBER_LINE =
  "Talk to your prescriber or pharmacist about what this result means for this medication.";
export const TYPICAL_LIMIT_LINE =
  "This test found no gene change for this medicine. Other genes and health factors can still matter.";
export const CYP2D6_LINE = "CYP2D6 cannot be determined from this file.";
export const CANT_TELL_GENE_LINE = "We can't tell this gene from this file.";
export const NO_GROUP_LINE = "This gene has no result group. Clinicians use it in a calculation.";
export const CONDITION_LABEL = "For heart attack or heart stent care (ACS/PCI)";
export const REVIEW_NOTE = "Demo wording awaits qualified clinical review.";
export const LOOKUP_FAILED_NOTE = "The source-row lookup could not be completed.";
export const STANDARD_38_TOOLTIP = "*38 is the current name for the standard reference allele.";

export type NonSourceRowStatus = Exclude<ResearchRouteResult["status"], "source_row_for_clinician_review">;

export const ROUTE_NOTES: Readonly<Record<NonSourceRowStatus, string>> = {
  unsupported_drug: "Not in the research index",
  guideline_algorithm_required: "Requires the CPIC dosing algorithm and clinical factors",
  source_rows_not_indexed: "CPIC recommendation rows not indexed for this drug",
  context_required: "Population or clinical context required",
  context_not_indexed: "Not indexed for this population",
  missing_gene_call: "A required gene call is missing",
  unverified_gene_call: "Gene call not verified for source-row lookup",
  activity_score_required: "Activity score required",
  no_exact_source_row: "No exact CPIC source row for this result",
  ambiguous_source_rows: "More than one CPIC source row matched; review the guideline",
};

const NORMAL_PHENOTYPES = new Set(["Normal Metabolizer", "Normal Function"]);
const INDETERMINATE_PHENOTYPES = new Set(["Indeterminate", "No Result", "n/a"]);
const VCF_GENE_SET = new Set<string>(VCF_GENES);
const GENE_SYMBOL = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)?$/;

/** CPIC classification values in the routes snapshot (Strong, Moderate, ...). */
export const CPIC_CLASSIFICATIONS: readonly string[] = [
  ...new Set(routeData.routes.map((route) => route.classification)),
];

// ---------------------------------------------------------------------------
// Result shapes

export interface PatientGeneLine {
  gene: string;
  phenotypeText: string;
}

export interface ClinicianGeneLine extends PatientGeneLine {
  diplotype: string | null;
  activityScore: string | null;
}

export type RouteRow =
  | {
      kind: "source_row";
      population: string;
      classification: string;
      recommendationId: number;
      guidelineVersion: number;
      guidelineUrl: string;
      /** CPIC drugrecommendation, copied verbatim. Clinician-only. */
      drugRecommendation: string;
      /** CPIC implications by gene, copied verbatim. Clinician-only. */
      implications: Record<string, string>;
      reviewNote: "Clinical review not complete";
    }
  | { kind: "note"; population: string | null; status: NonSourceRowStatus; note: string }
  | { kind: "error"; population: string | null; note: string };

interface DrugResultBase {
  drug: string;
  genericName: string;
  brandNames: string[];
  status: DisplayStatus;
  level: SteeringLevel;
  guidanceLine: string;
  conditionLabel: string | null;
  reviewNote: string | null;
  typicalLimitLine: string | null;
  unreadGeneLine: string | null;
  guidelineUrl: string;
}

export interface PatientDrugResult extends DrugResultBase {
  role: "patient";
  genes: PatientGeneLine[];
}

export interface ClinicianDrugResult extends DrugResultBase {
  role: "clinician";
  genes: ClinicianGeneLine[];
  routeRows: RouteRow[];
}

export type DrugResult = PatientDrugResult | ClinicianDrugResult;

export interface GeneCard {
  gene: string;
  description: string;
  status: DisplayStatus;
  level: SteeringLevel;
  phenotypeText: string;
  clinician?: {
    diplotype: string | null;
    activityScore: string | null;
    phaseAssumed: boolean;
    note?: string;
  };
}

export interface DrugResultInput {
  drug: DrugResearchEntry;
  role: Role;
  source: ResultSource;
  parsed: ParsedVcf;
  calls: DiplotypeCall[];
}

// ---------------------------------------------------------------------------
// Gene-level rules

/** A call that cannot be read: no diplotype, assumed phase, or a no-result phenotype. */
export function isIndeterminateCall(call: DiplotypeCall): boolean {
  return call.diplotype === null || call.ambiguous ||
    (call.phenotype !== null && INDETERMINATE_PHENOTYPES.has(call.phenotype));
}

export function geneStatus(call: DiplotypeCall): DisplayStatus {
  if (isIndeterminateCall(call)) return "Can't tell from this file";
  if (call.phenotype === null) return "Needs a clinician-run calculation";
  if (NORMAL_PHENOTYPES.has(call.phenotype)) return "Typical";
  return "Your genes may change how this works";
}

/** Gene symbols in a CPIC guideline title that the VCF caller does not read. */
export function untestedGuidelineGenes(guideline: string): string[] {
  const tokens = guideline.split(/,\s*(?:and\s+)?|\s+and\s+/).map((token) => token.trim());
  const genes: string[] = [];
  for (const token of tokens) {
    if (GENE_SYMBOL.test(token) && !VCF_GENE_SET.has(token) && !genes.includes(token)) genes.push(token);
  }
  return genes;
}

/** Pair-lookup genes (code-point order), then untested guideline genes (title order). */
export function relevantGenes(drug: string): { pairGenes: string[]; untested: string[] } {
  const pairs = findGeneDrugPairCandidates(drug);
  const pairGenes = [...new Set(pairs.map((pair) => pair.gene))].sort();
  const untested: string[] = [];
  for (const title of new Set(pairs.map((pair) => pair.guideline))) {
    for (const gene of untestedGuidelineGenes(title)) {
      if (!pairGenes.includes(gene) && !untested.includes(gene)) untested.push(gene);
    }
  }
  return { pairGenes, untested };
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function unreadGeneLine(untested: string[]): string | null {
  if (!untested.length) return null;
  return `This medication also depends on ${joinList(untested)}, which can't be read from this file.`;
}

function phenotypeTextFor(gene: string, matches: DiplotypeCall[], untested: boolean): string {
  if (gene === "CYP2D6") return CYP2D6_LINE;
  if (untested && matches.length === 0) return `${gene} is not tested from this file.`;
  if (untested || matches.length !== 1 || isIndeterminateCall(matches[0])) return CANT_TELL_GENE_LINE;
  if (matches[0].phenotype === null) return NO_GROUP_LINE;
  return matches[0].phenotype;
}

export function buildGeneCards(calls: DiplotypeCall[], role: Role): GeneCard[] {
  return calls.map((call) => {
    const status = geneStatus(call);
    const phenotypeText = phenotypeTextFor(call.gene, [call], false);
    const card: GeneCard = {
      gene: call.gene,
      description: GENE_DESCRIPTIONS[call.gene] ?? "A gene that can affect how some medicines work.",
      status,
      level: STATUS_LEVEL[status],
      phenotypeText,
    };
    if (role === "clinician") {
      card.clinician = {
        diplotype: call.diplotype,
        activityScore: call.activityScore,
        phaseAssumed: call.ambiguous,
        ...(call.note && call.note !== phenotypeText ? { note: call.note } : {}),
      };
    }
    return card;
  });
}

export interface DiplotypeToken {
  allele: string;
  /** True only for a CYP2C19 allele exactly equal to "*38". */
  standard38: boolean;
}

/** Splits a diplotype for display; labels only CYP2C19 "*38" tokens as standard. */
export function diplotypeTokens(gene: string, diplotype: string): DiplotypeToken[] {
  if (gene !== "CYP2C19") return [{ allele: diplotype, standard38: false }];
  return diplotype.split("/").map((allele) => ({ allele, standard38: allele.trim() === "*38" }));
}

// ---------------------------------------------------------------------------
// Drug-level result

function containsBannedText(text: string): boolean {
  const lower = text.toLowerCase();
  return ["stop", "dose", "mg"].some((word) => lower.includes(word)) ||
    CPIC_CLASSIFICATIONS.some((value) => lower.includes(value.toLowerCase()));
}

function safeRoute(input: ResearchRouteInput): ResearchRouteResult | null {
  try {
    return findResearchRecommendationRoute(input);
  } catch {
    return null;
  }
}

function routePopulations(drug: string): (string | null)[] {
  const populations = [...new Set(routeData.routes.filter((route) => route.drug === drug).map((route) => route.population))];
  return populations.length ? populations : [null];
}

function callerEvidence(input: DrugResultInput): CallerEvidence[] {
  if (input.source.kind !== "sample") return [];
  if (toMayaSampleAssessment(input.parsed, input.calls).callStatus !== "complete") return [];
  return VCF_GENES.map((gene) => ({
    gene,
    genomeBuild: "GRCh38" as const,
    coverage: "complete" as const,
    quality: "pass" as const,
    callerVersion: alleleDefinitions.source.tag,
    phenotypeTableVersion: phenotypeTable.retrievedAt,
  }));
}

function routeRow(result: ResearchRouteResult | null, population: string | null): RouteRow {
  if (!result) return { kind: "error", population, note: LOOKUP_FAILED_NOTE };
  if (result.status === "source_row_for_clinician_review") {
    const sourceRow = routeData.routes.find((route) => route.recommendationId === result.recommendationId);
    return {
      kind: "source_row",
      population: result.population,
      classification: result.classification,
      recommendationId: result.recommendationId,
      guidelineVersion: result.guidelineVersion,
      guidelineUrl: result.guidelineUrl,
      drugRecommendation: sourceRow?.drugRecommendation ?? "",
      implications: (sourceRow?.implications ?? {}) as Record<string, string>,
      reviewNote: "Clinical review not complete",
    };
  }
  return { kind: "note", population, status: result.status, note: ROUTE_NOTES[result.status] };
}

function computeDrugResult(input: DrugResultInput): DrugResult {
  const { drug, role, source, parsed, calls } = input;
  const { pairGenes, untested } = relevantGenes(drug.drug);
  const genes = [...pairGenes, ...untested];

  const lines = genes.map((gene) => {
    const matches = calls.filter((call) => call.gene === gene);
    const isUntested = untested.includes(gene);
    const call = matches.length === 1 ? matches[0] : null;
    const undetermined = isUntested || !call || isIndeterminateCall(call) || call.phenotype === null;
    return { gene, call, undetermined, phenotypeText: phenotypeTextFor(gene, matches, isUntested) };
  });

  // Status precedence: calculation → can't tell → may change → typical.
  const statusRoute = safeRoute({ drug: drug.drug, population: null, calls, evidence: [] });
  let status: DisplayStatus;
  if (statusRoute?.status === "guideline_algorithm_required") status = "Needs a clinician-run calculation";
  else if (!statusRoute || !lines.length || lines.some((line) => line.undetermined)) status = "Can't tell from this file";
  else if (lines.some((line) => !NORMAL_PHENOTYPES.has(line.call!.phenotype!))) status = "Your genes may change how this works";
  else status = "Typical";

  // Guidance text: bundled sample + complete CYP2C19 call + matched snapshot row only.
  let guidanceLine = GENERIC_PRESCRIBER_LINE;
  let conditionLabel: string | null = null;
  let reviewNote: string | null = null;
  let guidelineUrl = drug.guidelineUrl;
  if (source.kind === "sample" && drug.drug === "clopidogrel") {
    const assessmentInput = toMayaSampleAssessment(parsed, calls);
    if (assessmentInput.callStatus === "complete") {
      const assessment = assessPatient(assessmentInput);
      if (assessment.status === "matched" && !containsBannedText(assessment.patientText)) {
        guidanceLine = assessment.patientText;
        conditionLabel = CONDITION_LABEL;
        reviewNote = assessment.humanClinicalReview ? null : REVIEW_NOTE;
        guidelineUrl = assessment.guidelineUrl;
      }
    }
  }

  const base: DrugResultBase = {
    drug: drug.drug,
    genericName: drug.genericName,
    brandNames: drug.brandNames.map((brand) => brand.name),
    status,
    level: STATUS_LEVEL[status],
    guidanceLine,
    conditionLabel,
    reviewNote,
    typicalLimitLine: status === "Typical" ? TYPICAL_LIMIT_LINE : null,
    unreadGeneLine: unreadGeneLine(untested),
    guidelineUrl,
  };

  if (role === "patient") {
    return {
      role: "patient",
      ...base,
      genes: lines.map(({ gene, phenotypeText }) => ({ gene, phenotypeText })),
    };
  }

  const evidence = callerEvidence(input);
  return {
    role: "clinician",
    ...base,
    genes: lines.map(({ gene, call, phenotypeText }) => ({
      gene,
      phenotypeText,
      diplotype: call?.diplotype ?? null,
      activityScore: call?.activityScore ?? null,
    })),
    routeRows: routePopulations(drug.drug).map((population) =>
      routeRow(safeRoute({ drug: drug.drug, population, calls, evidence }), population)),
  };
}

/** One card's content for one drug. Never throws. */
export function buildDrugResult(input: DrugResultInput): DrugResult {
  try {
    return computeDrugResult(input);
  } catch {
    const status: DisplayStatus = "Can't tell from this file";
    const base: DrugResultBase = {
      drug: input.drug.drug,
      genericName: input.drug.genericName,
      brandNames: input.drug.brandNames.map((brand) => brand.name),
      status,
      level: STATUS_LEVEL[status],
      guidanceLine: GENERIC_PRESCRIBER_LINE,
      conditionLabel: null,
      reviewNote: null,
      typicalLimitLine: null,
      unreadGeneLine: null,
      guidelineUrl: input.drug.guidelineUrl,
    };
    return input.role === "patient"
      ? { role: "patient", ...base, genes: [] }
      : { role: "clinician", ...base, genes: [], routeRows: [] };
  }
}
