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
  source: "vcf" | "outside-call" | "lab-report" | "demo";
  /** Unresolved phase must block assessment. */
  ambiguous?: boolean;
  /**
   * CPIC activity score as reported by the caller (e.g. DPYD "1.5"). Required
   * when a guideline's lookup key is an activity score. Never computed here.
   */
  activityScore?: string | null;
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

/** One genomic position that defines a gene's named alleles (from PharmCAT). */
export interface DefinitionPosition {
  /** Chromosome in "chr" form, e.g. "chr10". */
  chrom: string;
  /** 1-based GRCh38 position. */
  pos: number;
  /** rsID, or null if the position has none. */
  rsid: string | null;
  /** Reference letters, VCF style. */
  ref: string;
  /** Alternate letters, VCF style. */
  alts: string[];
}

/**
 * A named allele (star allele such as "*2", or a named variant such as
 * "rs9923231 variant (T)"). `alleles` has one entry per position of the gene:
 * VCF-style letters, an IUPAC code, "X or Y", or null for the reference letter.
 */
export interface NamedAlleleDefinition {
  name: string;
  /** True for the gene's reference allele (e.g. CYP2C19 *38). */
  reference: boolean;
  alleles: (string | null)[];
}

/**
 * Everything needed to call one gene from a VCF. Generated from PharmCAT by
 * scripts/fetch-pgx-definitions.mjs; coordinates are never hand-written.
 */
export interface AlleleDefinition {
  gene: string;
  chrom: string;
  pharmcatDefinitionVersion: string;
  positions: DefinitionPosition[];
  namedAlleles: NamedAlleleDefinition[];
}

/** Shape of data/allele-definitions.json. */
export interface AlleleDefinitionsFile {
  source: { name: string; tag: string; url: string; license: string };
  genome: string;
  retrievedAt: string;
  genes: AlleleDefinition[];
}

/** CPIC's phenotype (and activity score, where CPIC uses one) for a diplotype. */
export interface PhenotypeEntry {
  phenotype: string;
  activityScore: string | null;
}

/** Shape of data/cpic-diplotype-phenotypes.json: gene → "A/B" → entry. */
export interface PhenotypeTableFile {
  source: { name: string; url: string; license: string };
  retrievedAt: string;
  genes: Record<string, Record<string, PhenotypeEntry>>;
}

/**
 * The called diplotype and phenotype for one gene, with its source.
 * - Indeterminate gene: diplotype null, phenotype "Indeterminate", note says why.
 * - Called gene: diplotype set; phenotype is CPIC's term, "Indeterminate" if
 *   CPIC has no entry for that diplotype, or null if CPIC assigns no phenotype
 *   for the gene at all (VKORC1, CYP4F2).
 */
export interface DiplotypeCall {
  /** Gene symbol, e.g. "CYP2C19". */
  gene: string;
  /** Diplotype, e.g. "*2/*2". Null if the gene could not be called. */
  diplotype: string | null;
  /** CPIC phenotype term, "Indeterminate", or null (not applicable). */
  phenotype: string | null;
  /** CPIC activity score (e.g. "1.0") where CPIC uses one, else null. */
  activityScore: string | null;
  /** Where this call came from. */
  source: "vcf" | "outside-call" | "lab-report" | "demo";
  /** True when the call depends on an assumed phase (unphased data). */
  ambiguous: boolean;
  /** Plain-language note, e.g. why a gene is Indeterminate. */
  note?: string;
}

/** Patient-facing outcome level for a gene-drug pair. */
export type AssessmentLevel = "typical" | "caution" | "warning";

/**
 * Clinical context (CPIC "population"). It is part of the lookup key and must be
 * selected, never guessed. Each member maps to one exact CPIC population string:
 * - acs_pci       → "CVI ACS PCI" (cardiovascular, ACS and/or PCI)
 * - non_acs_pci   → "CVI non-ACS non-PCI" (other cardiovascular indications)
 * - neurovascular → "NVI" (neurovascular indications)
 * - general       → "general" (guidelines with a single population)
 */
export type ClinicalContext = "acs_pci" | "non_acs_pci" | "neurovascular" | "general";

export interface ClinicalAssessmentInput {
  geneResults: GeneResult[];
  drug: string;
  context: ClinicalContext | null;
  /** Complete means all positions required for the reported phenotype were assessed. */
  callStatus: "complete" | "incomplete" | "unverified";
}

/**
 * Project label for the direction of a source-backed finding. Not CPIC wording.
 * - reduced_activation: clopidogrel rows whose recommendation differs from the
 *   normal-metabolizer row (kept from the first reviewed-for-demo snapshot).
 * - pgx_factor_identified: any other row whose recommendation differs from the
 *   all-normal row of the same drug and population.
 * - no_pgx_change_identified: the recommendation text is identical to the
 *   all-normal row. This is not a promise of efficacy or safety.
 * - source_no_recommendation: CPIC classifies the row "No Recommendation".
 */
export type GuidanceFinding =
  | "reduced_activation"
  | "pgx_factor_identified"
  | "no_pgx_change_identified"
  | "source_no_recommendation";

/**
 * Pointer to an external dosing method a guideline requires (warfarin). The app
 * stores the reference only. It never runs, approximates, or summarizes it.
 */
export interface DosingAlgorithmReference {
  name: string;
  url: string;
  pmid: string | null;
  /** CPIC guideline `notesonusage`, copied byte-for-byte. */
  cpicNotesOnUsageVerbatim: string;
  clinicianMustUseAlgorithmDirectly: true;
}

export type ClinicalAssessment =
  | {
      status: "matched";
      /** Every gene in the CPIC lookup key, sorted. */
      genes: string[];
      drug: string;
      /** CPIC `phenotypes` of the matched row, by gene. */
      phenotypes: Record<string, string>;
      /** CPIC `lookupkey` of the matched row (a phenotype or an activity score). */
      lookupKey: Record<string, string>;
      /** Taken from the matched record, never assumed. */
      context: ClinicalContext;
      /** CPIC `classification`, copied unchanged. */
      strength: string;
      finding: Exclude<GuidanceFinding, "source_no_recommendation">;
      patientText: string;
      /** Legacy project paraphrase on the first five rows; null on every newer row. */
      clinicianSummary: string | null;
      /** CPIC `drugrecommendation`, copied byte-for-byte. Clinician-only. */
      cpicRecommendationVerbatim: string;
      /** CPIC `implications`, copied byte-for-byte, by gene. Clinician-only. */
      cpicImplicationsVerbatim: Record<string, string>;
      /** CPIC `comments`, copied byte-for-byte. Clinician-only. */
      cpicCommentsVerbatim: string;
      /** Only drugs CPIC itself names in the verbatim recommendation. Clinician-only. */
      alternatives: string[];
      /** True when the verbatim recommendation states a dose amount. Clinician-only. */
      doseTextPresent: boolean;
      source: {
        guidelineUrl: string;
        guidelineVersion: number;
        publicationPmid: string;
        recommendationId: number;
        retrievedAt: string;
      };
      humanClinicalReview: boolean;
    }
  | {
      status: "indeterminate" | "insufficient_data";
      reason:
        | "missing_or_unverified_call"
        | "ambiguous_gene_result"
        | "unsupported_pair"
        | "context_required"
        | "context_not_supported"
        | "unsupported_phenotype"
        | "ambiguous_source_rows"
        | "source_no_recommendation"
        | "dosing_algorithm_required";
      /** The CPIC row that states "No recommendation", when that is the reason. */
      recommendationId?: number;
      /** Set only for `dosing_algorithm_required`. */
      dosingAlgorithmReference?: DosingAlgorithmReference;
    };
