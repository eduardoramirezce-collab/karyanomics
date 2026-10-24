/**
 * Core PGx types for Karyanomics.
 *
 * These describe the data the PGx engine works with as it maps
 * genotype → phenotype → CPIC recommendation (see the README's
 * "How it works" section). Types only — no logic lives here.
 */

/**
 * A single gene's result for a person: the raw diplotype and the
 * phenotype it calls. CYP2D6 from consumer arrays may be indeterminate,
 * so the phenotype can be unknown.
 */
export interface GeneResult {
  /** Gene symbol, e.g. "CYP2C19", "CYP2D6", "SLCO1B1". */
  gene: string;
  /** Star-allele diplotype, e.g. "*1/*2". Null if not determinable. */
  diplotype: string | null;
  /**
   * Metabolizer / function phenotype derived from the diplotype,
   * e.g. "Poor Metabolizer". "Indeterminate" when it can't be called.
   */
  phenotype: string;
}

/** Patient-facing outcome level for a gene-drug pair. */
export type AssessmentLevel = "typical" | "caution" | "warning";

/**
 * The assessment for one drug given a person's gene results: a
 * patient-facing level plus the clinician-facing CPIC detail, each
 * carrying the source it comes from.
 */
export interface DrugAssessment {
  /** Drug name as assessed, e.g. "clopidogrel". */
  drug: string;
  /** Gene result(s) that drove this assessment. */
  genes: GeneResult[];
  /** Patient-facing outcome level. */
  level: AssessmentLevel;
  /** Short, plain-language explanation for the patient. */
  summary: string;
  /** The CPIC recommendation text for this phenotype + drug. */
  recommendation: string;
  /** Strength of the CPIC recommendation, e.g. "Strong", "Moderate". */
  strength: string;
  /** Suggested alternative drugs, if any. */
  alternatives: string[];
  /** PubMed IDs backing the recommendation. */
  citations: string[];
  /** Human-readable source/guideline this assessment cites. */
  source: string;
}
