/**
 * Browser-safe intake for PGx files. It validates the container and reports
 * coverage; it does not infer star alleles or clinical phenotypes from raw SNPs.
 */
import type { GeneResult } from "./types";

export type UploadKind = "lab_report_json" | "consumer_raw_tsv" | "vcf" | "unsupported";
export type UploadReadiness = "review_required" | "missing_calls" | "needs_external_caller" | "invalid";

export interface UploadInspection {
  kind: UploadKind;
  readiness: UploadReadiness;
  message: string;
  metrics: { records: number; noCalls: number };
  /** This is parsed input, never a verified clinical call. Do not feed directly to assess(). */
  geneResults: GeneResult[];
  issues: string[];
}

const empty = (kind: UploadKind, readiness: UploadReadiness, message: string, issues: string[] = []): UploadInspection => ({
  kind, readiness, message, metrics: { records: 0, noCalls: 0 }, geneResults: [], issues,
});

function inspectReport(text: string): UploadInspection {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return empty("lab_report_json", "invalid", "The JSON file could not be read."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return empty("lab_report_json", "invalid", "Expected a structured PGx report object.");
  }
  const report = value as Record<string, unknown>;
  if (report.format !== "karyanomics-pgx-v1" || !Array.isArray(report.geneResults)) {
    return empty("lab_report_json", "invalid", "This JSON is not a Karyanomics PGx v1 report.", ["Use the documented report schema; arbitrary JSON and PDFs are not supported."]);
  }
  if (report.geneResults.length > 100) {
    return empty("lab_report_json", "invalid", "Too many gene results in this report.");
  }
  if (report.geneResults.length === 0) {
    return empty("lab_report_json", "invalid", "The report has no gene results.");
  }
  const genes: GeneResult[] = [];
  let noCalls = 0;
  const seen = new Set<string>();
  for (const item of report.geneResults) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return empty("lab_report_json", "invalid", "A gene result has an invalid shape.");
    }
    const row = item as Record<string, unknown>;
    if (typeof row.gene !== "string" || !/^[A-Z0-9-]{2,20}$/.test(row.gene) ||
        !(row.diplotype === null || (typeof row.diplotype === "string" && row.diplotype.length <= 80)) ||
        typeof row.phenotype !== "string" || !row.phenotype.trim() || row.phenotype.length > 80 ||
        !["complete", "incomplete", "unverified"].includes(String(row.callStatus))) {
      return empty("lab_report_json", "invalid", "A gene result is missing required fields or has invalid values.");
    }
    if (seen.has(row.gene)) return empty("lab_report_json", "invalid", "Duplicate gene results were found.");
    seen.add(row.gene);
    genes.push({ gene: row.gene, diplotype: row.diplotype as string | null, phenotype: row.phenotype, source: "lab-report" });
    if (row.callStatus !== "complete" || !row.diplotype || row.phenotype === "Indeterminate") noCalls++;
  }
  const issues = ["Upload metadata is self-reported; a clinician/lab must verify assay coverage, quality and result authenticity before clinical use."];
  if (typeof report.labName !== "string" || typeof report.reportDate !== "string" ||
      typeof report.assayMethod !== "string" || !Array.isArray(report.coveredVariants)) {
    issues.push("Lab name, report date, assay method, or covered variants are missing.");
  }
  return {
    kind: "lab_report_json", readiness: noCalls ? "missing_calls" : "review_required",
    message: noCalls ? "Some calls are incomplete. No PGx guidance can be assigned." : "Report parsed. Clinical verification is required before a recommendation can be shown.",
    metrics: { records: genes.length, noCalls }, geneResults: genes, issues,
  };
}

function inspectVcf(lines: string[]): UploadInspection {
  const fileformat = lines.some((line) => /^##fileformat=VCFv4\./.test(line));
  const buildLines = lines.filter((line) => /^##(?:reference|contig)=/.test(line));
  const grch38 = buildLines.some((line) => /(?:GRCh38|hg38|b38)(?:[^\d]|$)/i.test(line));
  const header = lines.find((line) => line.startsWith("#CHROM\t"));
  if (!fileformat || !header) return empty("vcf", "invalid", "VCF header is missing or invalid.");
  const columns = header.split("\t");
  if (!(["#CHROM", "POS", "ID", "REF", "ALT", "QUAL", "FILTER", "INFO"].every((c, i) => columns[i] === c))) {
    return empty("vcf", "invalid", "VCF required columns are missing.");
  }
  let records = 0; let noCalls = 0;
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const cells = line.split("\t");
    if (cells.length < 8 || !/^\d+$/.test(cells[1])) return empty("vcf", "invalid", "A VCF data row is malformed.");
    records++;
    if (columns.length > 9) {
      const gtIndex = cells[8]?.split(":").indexOf("GT") ?? -1;
      const gt = gtIndex < 0 ? undefined : cells[9]?.split(":")[gtIndex];
      if (!gt || gt.includes(".")) noCalls++;
    }
  }
  const issues = ["A VCF needs a validated GRCh38 reference and a PharmCAT-compatible allele-calling workflow; this preview does not infer a phenotype.",
    "A variant-only VCF may omit required reference positions. Missing is not a normal genotype."];
  if (!grch38) issues.unshift("GRCh38 could not be confirmed from the VCF header.");
  if (columns.length < 10) issues.unshift("No sample genotype column was found.");
  if (columns.length > 10) issues.unshift("Multiple samples detected; this preview cannot select a patient.");
  return { kind: "vcf", readiness: "needs_external_caller", message: "VCF structure recognized. Allele calling and quality review are still required.", metrics: { records, noCalls }, geneResults: [], issues };
}

function inspectConsumerRaw(lines: string[]): UploadInspection {
  const data = lines.filter((line) => line.trim() && !line.startsWith("#"));
  let records = 0; let noCalls = 0;
  const seen = new Set<string>();
  for (const line of data) {
    const cells = line.split("\t");
    if (cells.length !== 4 || !/^(rs\d+|i\d+)$/i.test(cells[0]) || !/^\d+$/.test(cells[2]) ||
        !/^(?:[ACGTDI]{1,2}|--)$/.test(cells[3])) {
      return empty("consumer_raw_tsv", "invalid", "This is not a supported four-column raw genotype file.");
    }
    if (seen.has(cells[0])) return empty("consumer_raw_tsv", "invalid", "Duplicate marker IDs were found.");
    seen.add(cells[0]); records++;
    if (cells[3] === "--") noCalls++;
  }
  if (!records) return empty("consumer_raw_tsv", "invalid", "No genotype rows were found.");
  return { kind: "consumer_raw_tsv", readiness: "needs_external_caller",
    message: "Raw genotype file recognized. It cannot establish a clinical PGx phenotype here.",
    metrics: { records, noCalls }, geneResults: [],
    issues: ["Genome build, strand, assay coverage and quality must be verified.", "Missing markers and no-calls cannot be assumed normal.", "Consumer raw data are not validated for medical decisions."],
  };
}

/** Parse text already read in the browser. Never logs or transmits its contents. */
export function inspectPgxUpload(filename: string, text: string): UploadInspection {
  if (!text.trim()) return empty("unsupported", "invalid", "The file is empty.");
  if (text.length > 30_000_000) return empty("unsupported", "invalid", "The file is too large for this demo (30 MB limit).");
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return inspectReport(text);
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.some((line) => line.startsWith("##fileformat=VCF")) || lower.endsWith(".vcf")) return inspectVcf(lines);
  if (lower.endsWith(".txt") || lower.endsWith(".tsv")) return inspectConsumerRaw(lines);
  return empty("unsupported", "invalid", "Supported files are PGx report JSON, VCF, and four-column raw genotype TXT/TSV.");
}
