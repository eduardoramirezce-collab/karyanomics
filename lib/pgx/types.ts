/**
 * Core PGx types for Karyanomics.
 *
 * These describe the data the PGx engine works with as it maps
 * genotype → phenotype → CPIC recommendation (see the README's
 * "How it works" section). Types only — no logic lives here.
 */

/**
 * A single gene's result for a person: the raw diplotype and the
 * phenotype it calls. CYP2D6 is never callable from a VCF, so the
 * phenotype can be "Indeterminate".
 */
export interface GeneResult {
  /** Gene symbol, e.g. "CYP2C19", "CYP2C9", "SLCO1B1". */
  gene: string;
  /** Star-allele diplotype, e.g. "*1/*2". Null if not determinable. */
  diplotype: string | null;
  /**
   * Metabolizer / function phenotype derived from the diplotype,
   * e.g. "Poor Metabolizer". "Indeterminate" when it can't be called.
   */
  phenotype: string;
  /** Where this result came from: VCF calling, or an external CYP2D6 outside call. */
  source: "vcf" | "outside-call";
}

/**
 * One variant record read from a VCF: the position, the reference and
 * alternate alleles, and the (first) sample's genotype call.
 */
export interface VcfVariant {
  /**
   * Chromosome, normalized to the "chr" form regardless of how the file
   * wrote it: "10" and "chr10" both become "chr10"; "MT" becomes "chrM".
   */
  chrom: string;
  /** 1-based position on the chromosome. */
  pos: number;
  /** ID column (usually an rsID), or null if ".". */
  id: string | null;
  /** Reference allele, uppercased. */
  ref: string;
  /** Alternate allele(s) from the ALT column; empty if ALT is ".". */
  alt: string[];
  /** FILTER column (e.g. "PASS"), or null if ".". */
  filter: string | null;
  /**
   * The sample's genotype as allele indices (0 = REF, 1 = first ALT, ...).
   * e.g. [1, 1] for a homozygous ALT call. null = no call (".") for that
   * chromosome copy, e.g. "./." is [null, null].
   */
  gt: [number | null, number | null];
  /**
   * The genotype resolved to allele letters: each entry is REF, one of ALT,
   * or null for a no-call. Always consistent with `gt`.
   */
  alleles: [string | null, string | null];
  /** True if the GT was phased ("|"), false if unphased ("/"). */
  phased: boolean;
}

/** Genome build detected from the VCF's ## metadata. */
export type GenomeBuild = "GRCh38" | "GRCh37" | "unknown";

/** Machine-readable reasons the parser flags a whole file. */
export type VcfWarningCode =
  | "build_not_grch38"
  | "build_unknown"
  | "multiple_samples"
  | "no_samples"
  | "missing_header"
  | "missing_fileformat"
  | "no_variants";

/** A file-level problem found while parsing. Parsing continues where possible. */
export interface VcfWarning {
  code: VcfWarningCode;
  /** Plain-language explanation suitable for showing to the user. */
  message: string;
}

/** A data line the parser could not read, with its 1-based line number. */
export interface SkippedVcfLine {
  line: number;
  reason: string;
}

/**
 * The full result of parsing a VCF in the browser. The parser never throws:
 * problems are reported through `warnings` (whole file) and `skippedLines`
 * (individual malformed lines).
 */
export interface ParsedVcf {
  /** Value of ##fileformat (e.g. "VCFv4.2"), or null if absent. */
  fileFormat: string | null;
  /** Genome build detected from ## metadata. */
  genomeBuild: GenomeBuild;
  /** ID of the sample whose genotypes were read (the first sample). */
  sampleId: string | null;
  /** Number of sample columns in the file. */
  sampleCount: number;
  /** Parsed variant records for the first sample. */
  variants: VcfVariant[];
  /** Data lines that were skipped, with line numbers and reasons. */
  skippedLines: SkippedVcfLine[];
  /** File-level warnings (build, sample count, missing header, ...). */
  warnings: VcfWarning[];
}

/**
 * The defining variants for a single star allele of a gene. A diplotype
 * is called by matching VcfVariant calls against these definitions.
 * Coordinates are sourced from ClinPGx/PharmCAT, never invented.
 */
export interface AlleleDefinition {
  /** Gene symbol, e.g. "CYP2C19". */
  gene: string;
  /** Star-allele name, e.g. "*2". */
  allele: string;
  /** Positions and alleles that define this star allele. */
  variants: { chrom: string; pos: number; ref: string; alt: string }[];
}

/**
 * The called diplotype and phenotype for one gene, with its source. A
 * null diplotype with phenotype "Indeterminate" means the gene could not
 * be called (missing coverage, or CYP2D6 with no outside call).
 */
export interface DiplotypeCall {
  /** Gene symbol, e.g. "CYP2C19". */
  gene: string;
  /** Star-allele diplotype, e.g. "*2/*2". Null if not determinable. */
  diplotype: string | null;
  /** Phenotype derived from the diplotype, or "Indeterminate". */
  phenotype: string;
  /** Where this call came from. */
  source: "vcf" | "outside-call";
  /** Optional human-readable note, e.g. why a gene is Indeterminate. */
  note?: string;
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
/**
 * Engine entry points for the VCF pipeline that are not built yet. These are
 * signature stubs only; they throw until implemented so callers fail loudly
 * rather than silently receiving fake results. (parseVcf lives in
 * lib/pgx/parseVcf.ts.)
 */

/** Call per-gene diplotypes by matching variants against allele definitions. */
export function callDiplotypes(
  variants: VcfVariant[],
  defs: AlleleDefinition[],
): DiplotypeCall[] {
  void variants;
  void defs;
  throw new Error("not implemented");
}
