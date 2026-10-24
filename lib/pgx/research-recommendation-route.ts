import data from "../../data/cpic-recommendation-routes.v1.json";
import { findGeneDrugPairCandidates } from "./gene-drug-catalog";
import type { DiplotypeCall } from "./types";

/** This evidence must come from a trusted, validated caller, never upload JSON. */
export interface CallerEvidence {
  gene: string;
  genomeBuild: "GRCh38" | "other";
  coverage: "complete" | "incomplete";
  quality: "pass" | "fail";
  callerVersion: string;
  phenotypeTableVersion: string;
}

export interface ResearchRouteInput {
  drug: string;
  /** Exact CPIC population/context term; it must be selected, not inferred. */
  population: string | null;
  calls: DiplotypeCall[];
  evidence: CallerEvidence[];
  /** CYP2C9 recommendation keys use activity score, not phenotype wording. */
  activityScores?: Record<string, number>;
}

export type ResearchRouteResult =
  | {
      status: "source_row_for_clinician_review";
      drug: string;
      rxnormId: string;
      recommendationId: number;
      guidelineId: string;
      guidelineUrl: string;
      guidelineVersion: number;
      population: string;
      classification: string;
      requiredGenes: string[];
      clinicalReviewComplete: false;
    }
  | {
      status:
        | "unsupported_drug"
        | "guideline_algorithm_required"
        | "source_rows_not_indexed"
        | "context_required"
        | "context_not_indexed"
        | "missing_gene_call"
        | "unverified_gene_call"
        | "activity_score_required"
        | "no_exact_source_row"
        | "ambiguous_source_rows";
      requiredGenes?: string[];
      guidelineUrl?: string;
    };

const routes = data.routes;
const guidelines = data.guidelines;
const excludedPhenotypes = new Set(["Indeterminate", "No Result", "n/a"]);

function isNumericKey(value: string) {
  return /^\d+(?:\.\d+)?$/.test(value);
}

/**
 * Exact CPIC source-row routing for research. It returns IDs and provenance,
 * never recommendation text, medication selection, dose, or patient advice.
 */
export function findResearchRecommendationRoute(input: ResearchRouteInput): ResearchRouteResult {
  const drugKey = input.drug.trim().toLowerCase();
  const pairs = findGeneDrugPairCandidates(drugKey);
  if (!pairs.length) return { status: "unsupported_drug" };
  const drug = pairs[0].drug;
  const guidelineNames = [...new Set(pairs.map((pair) => pair.guideline))];
  const indexedGuidelines = guidelines.filter((guideline) => guidelineNames.includes(guideline.name));
  const warfarinGuideline = indexedGuidelines.find((guideline) =>
    guideline.name === "CYP2C9, VKORC1, CYP4F2 and Warfarin",
  );
  if (warfarinGuideline) {
    return {
      status: "guideline_algorithm_required",
      requiredGenes: [...warfarinGuideline.genes].sort(),
      guidelineUrl: warfarinGuideline.url,
    };
  }
  if (!indexedGuidelines.length) return { status: "source_rows_not_indexed" };

  const drugRoutes = routes.filter((route) => route.drug === drug &&
    indexedGuidelines.some((guideline) => guideline.guidelineId === route.guidelineId));
  if (!drugRoutes.length) return { status: "source_rows_not_indexed" };
  const requiredGenes = [...new Set(drugRoutes.flatMap((route) => Object.keys(route.lookupKey)))].sort();
  if (!input.population?.trim()) return { status: "context_required", requiredGenes };
  const population = input.population.trim();
  const contextRoutes = drugRoutes.filter((route) => route.population === population);
  if (!contextRoutes.length) return { status: "context_not_indexed", requiredGenes };

  const calls = new Map<string, DiplotypeCall>();
  const evidence = new Map<string, CallerEvidence>();
  for (const call of input.calls) {
    if (calls.has(call.gene)) return { status: "unverified_gene_call", requiredGenes };
    calls.set(call.gene, call);
  }
  for (const item of input.evidence) {
    if (evidence.has(item.gene)) return { status: "unverified_gene_call", requiredGenes };
    evidence.set(item.gene, item);
  }
  if (requiredGenes.some((gene) => !calls.has(gene))) {
    return { status: "missing_gene_call", requiredGenes };
  }
  if (requiredGenes.some((gene) => {
    const call = calls.get(gene)!;
    const proof = evidence.get(gene);
    return !proof || call.source !== "vcf" || !call.diplotype ||
      !call.phenotype || excludedPhenotypes.has(call.phenotype) ||
      proof.genomeBuild !== "GRCh38" || proof.coverage !== "complete" ||
      proof.quality !== "pass" || !proof.callerVersion.trim() ||
      !proof.phenotypeTableVersion.trim();
  })) return { status: "unverified_gene_call", requiredGenes };

  const numericGenes = new Set(contextRoutes.flatMap((route) =>
    Object.entries(route.lookupKey).filter(([, value]) => isNumericKey(value)).map(([gene]) => gene)));
  if ([...numericGenes].some((gene) => !Number.isFinite(input.activityScores?.[gene]))) {
    return { status: "activity_score_required", requiredGenes };
  }
  const matches = contextRoutes.filter((route) => Object.entries(route.lookupKey).every(([gene, value]) =>
    calls.get(gene)?.phenotype === route.phenotypes[gene as keyof typeof route.phenotypes] &&
    (isNumericKey(value)
      ? input.activityScores?.[gene] === Number(value)
      : calls.get(gene)?.phenotype === value),
  ));
  if (!matches.length) return { status: "no_exact_source_row", requiredGenes };
  if (matches.length !== 1) return { status: "ambiguous_source_rows", requiredGenes };
  const match = matches[0];
  const guideline = indexedGuidelines.find((item) => item.guidelineId === match.guidelineId)!;
  return {
    status: "source_row_for_clinician_review",
    drug: match.drug,
    rxnormId: match.rxnormId,
    recommendationId: match.recommendationId,
    guidelineId: guideline.guidelineId,
    guidelineUrl: guideline.url,
    guidelineVersion: guideline.version,
    population,
    classification: match.classification,
    requiredGenes,
    clinicalReviewComplete: false,
  };
}
