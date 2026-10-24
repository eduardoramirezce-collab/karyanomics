/**
 * Client-side VCF parser (pipeline stage 2: "Parse VCF").
 *
 * Turns the text of a VCF file into a ParsedVcf: one VcfVariant per readable
 * data line for the first sample, plus file-level warnings and a list of
 * skipped lines. This is a pure function: no network, no storage, no logging.
 * The file contents never leave the browser.
 *
 * The parser never throws on file content. Anything it can't read becomes a
 * warning (whole file) or a skipped line (one data line), so the UI can tell
 * the user exactly what went wrong.
 */

import type {
  GenomeBuild,
  ParsedVcf,
  SkippedVcfLine,
  VcfVariant,
  VcfWarning,
} from "./types";

/** The 8 fixed VCF columns plus FORMAT come before the first sample column. */
const FIRST_SAMPLE_COLUMN = 9;

/**
 * Length of chr1 in each build. Used to detect the build from ##contig lines
 * when the file doesn't name its assembly outright.
 */
const CHR1_LENGTH_GRCH38 = 248956422;
const CHR1_LENGTH_GRCH37 = 249250621;

const BASES = /^[ACGTN]+$/i;
const SYMBOLIC_ALT = /^<[^<>]+>$/;
const NON_NEGATIVE_INT = /^\d+$/;

/**
 * Normalize a chromosome name to the "chr" form so "10" and "chr10" are the
 * same thing. Sex and mitochondrial chromosomes are uppercased ("x" → "chrX",
 * "MT" → "chrM"); other names keep their case.
 */
export function normalizeChrom(raw: string): string {
  const bare = /^chr/i.test(raw) ? raw.slice(3) : raw;
  const upper = bare.toUpperCase();
  if (upper === "M" || upper === "MT") return "chrM";
  if (upper === "X" || upper === "Y") return `chr${upper}`;
  return `chr${bare}`;
}

/** Which build a single ## metadata line points to, if any. */
function buildSignal(metaLine: string): GenomeBuild | null {
  // Only lines that describe the reference genome are trusted for this.
  if (!/^##(reference|assembly|contig)/i.test(metaLine)) return null;

  if (/^##contig/i.test(metaLine)) {
    const id = /[<,]ID=([^,>]+)/i.exec(metaLine)?.[1];
    const length = /[<,]length=(\d+)/i.exec(metaLine)?.[1];
    if (id && length && normalizeChrom(id) === "chr1") {
      if (Number(length) === CHR1_LENGTH_GRCH38) return "GRCh38";
      if (Number(length) === CHR1_LENGTH_GRCH37) return "GRCh37";
    }
  }

  if (/GRCh38|hg38|\bb38\b|GCA_000001405\.(1[5-9]|[2-9]\d)/i.test(metaLine)) {
    return "GRCh38";
  }
  if (/GRCh37|hg19|\bb37\b|hs37d5|human_g1k_v37/i.test(metaLine)) {
    return "GRCh37";
  }
  return null;
}

/** Combine every build signal in the file. Conflicting signals → unknown. */
function decideBuild(signals: Set<GenomeBuild>): GenomeBuild {
  if (signals.size !== 1) return "unknown";
  return [...signals][0];
}

type GtResult =
  | { ok: true; gt: [number | null, number | null]; phased: boolean }
  | { ok: false; reason: string };

/**
 * Read a GT value such as "0/1", "1|1", "./." or "0|.".
 * Only diploid calls are supported (all genes we call are autosomal).
 */
function parseGt(raw: string | undefined, altCount: number): GtResult {
  // A missing or "." GT is a no-call (VCF allows dropping trailing fields).
  if (raw === undefined || raw === "" || raw === ".") {
    return { ok: true, gt: [null, null], phased: false };
  }

  const hasPipe = raw.includes("|");
  const hasSlash = raw.includes("/");
  if (hasPipe && hasSlash) {
    return { ok: false, reason: `GT "${raw}" mixes phased and unphased separators` };
  }

  const parts = raw.split(/[|/]/);
  if (parts.length !== 2) {
    return { ok: false, reason: `GT "${raw}" is not a diploid call` };
  }

  const gt: (number | null)[] = [];
  for (const part of parts) {
    if (part === ".") {
      gt.push(null);
      continue;
    }
    if (!NON_NEGATIVE_INT.test(part)) {
      return { ok: false, reason: `GT "${raw}" has a non-numeric allele` };
    }
    const index = Number(part);
    if (index > altCount) {
      return {
        ok: false,
        reason: `GT "${raw}" points to allele ${index} but ALT has only ${altCount}`,
      };
    }
    gt.push(index);
  }

  return { ok: true, gt: [gt[0], gt[1]], phased: hasPipe };
}

type LineResult =
  | { ok: true; variant: VcfVariant }
  | { ok: false; reason: string };

/** Parse one tab-separated data line for the first sample. */
function parseDataLine(line: string): LineResult {
  const cols = line.split("\t");
  if (cols.length < 8) {
    return { ok: false, reason: `expected at least 8 columns, found ${cols.length}` };
  }
  if (cols.length <= FIRST_SAMPLE_COLUMN) {
    return { ok: false, reason: "no FORMAT and sample columns" };
  }

  const [chromRaw, posRaw, idRaw, refRaw, altRaw, , filterRaw] = cols;
  const formatRaw = cols[8];
  const sampleRaw = cols[FIRST_SAMPLE_COLUMN];

  if (chromRaw === "" || chromRaw === ".") {
    return { ok: false, reason: "missing CHROM" };
  }
  if (!NON_NEGATIVE_INT.test(posRaw) || Number(posRaw) < 1) {
    return { ok: false, reason: `invalid POS "${posRaw}"` };
  }
  if (!BASES.test(refRaw)) {
    return { ok: false, reason: `invalid REF "${refRaw}"` };
  }

  const alt = altRaw === "." ? [] : altRaw.split(",");
  for (const a of alt) {
    if (!BASES.test(a) && a !== "*" && !SYMBOLIC_ALT.test(a)) {
      return { ok: false, reason: `invalid ALT "${altRaw}"` };
    }
  }
  const altNormalized = alt.map((a) => (BASES.test(a) ? a.toUpperCase() : a));

  const gtIndex = formatRaw.split(":").indexOf("GT");
  if (gtIndex === -1) {
    return { ok: false, reason: "FORMAT has no GT field" };
  }

  const gtResult = parseGt(sampleRaw.split(":")[gtIndex], altNormalized.length);
  if (!gtResult.ok) return gtResult;

  const ref = refRaw.toUpperCase();
  const letter = (i: number | null): string | null =>
    i === null ? null : i === 0 ? ref : altNormalized[i - 1];

  return {
    ok: true,
    variant: {
      chrom: normalizeChrom(chromRaw),
      pos: Number(posRaw),
      id: idRaw === "." || idRaw === "" ? null : idRaw,
      ref,
      alt: altNormalized,
      filter: filterRaw === "." || filterRaw === "" ? null : filterRaw,
      gt: gtResult.gt,
      alleles: [letter(gtResult.gt[0]), letter(gtResult.gt[1])],
      phased: gtResult.phased,
    },
  };
}

/** Parse a VCF file's text. Never throws; see the module comment. */
export function parseVcf(text: string): ParsedVcf {
  const warnings: VcfWarning[] = [];
  const skippedLines: SkippedVcfLine[] = [];
  const variants: VcfVariant[] = [];
  const buildSignals = new Set<GenomeBuild>();

  let fileFormat: string | null = null;
  let sampleId: string | null = null;
  let sampleCount = 0;
  let sawHeader = false;
  let warnedMissingHeader = false;

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  lines.forEach((line, i) => {
    const lineNumber = i + 1;
    if (line.trim() === "") return;

    if (line.startsWith("##")) {
      const ff = /^##fileformat=(.*)$/i.exec(line);
      if (ff && fileFormat === null) fileFormat = ff[1].trim();
      const signal = buildSignal(line);
      if (signal) buildSignals.add(signal);
      return;
    }

    if (line.startsWith("#CHROM")) {
      sawHeader = true;
      const samples = line.split("\t").slice(FIRST_SAMPLE_COLUMN);
      sampleCount = samples.length;
      sampleId = samples[0] ?? null;
      return;
    }

    // Any other "#" line is a comment.
    if (line.startsWith("#")) return;

    if (!sawHeader && !warnedMissingHeader) {
      warnedMissingHeader = true;
      warnings.push({
        code: "missing_header",
        message:
          "This file has no #CHROM header line, so we can't tell which columns hold the sample.",
      });
    }

    // A header with zero samples means there are no genotypes to read.
    if (sawHeader && sampleCount === 0) return;

    try {
      const result = parseDataLine(line);
      if (result.ok) variants.push(result.variant);
      else skippedLines.push({ line: lineNumber, reason: result.reason });
    } catch {
      // Defensive: parseDataLine should never throw, but a bad line must
      // never take down the whole file.
      skippedLines.push({ line: lineNumber, reason: "could not read this line" });
    }
  });

  if (!sawHeader && variants.length > 0) {
    sampleCount = 1;
  }

  if (fileFormat === null) {
    warnings.push({
      code: "missing_fileformat",
      message: "This file is missing the ##fileformat line that VCF files start with.",
    });
  }

  const genomeBuild = decideBuild(buildSignals);
  if (genomeBuild === "unknown") {
    warnings.push({
      code: "build_unknown",
      message:
        "We couldn't find the genome build in this file. Karyanomics needs GRCh38, so results may not be reliable.",
    });
  } else if (genomeBuild !== "GRCh38") {
    warnings.push({
      code: "build_not_grch38",
      message: `This file uses genome build ${genomeBuild}. Karyanomics needs GRCh38, so results from this file can't be trusted.`,
    });
  }

  if (sawHeader && sampleCount === 0) {
    warnings.push({
      code: "no_samples",
      message: "This file has no sample columns, so there are no genotypes to read.",
    });
  } else if (sampleCount > 1) {
    warnings.push({
      code: "multiple_samples",
      message: `This file has ${sampleCount} samples. We only read the first one${
        sampleId ? ` (${sampleId})` : ""
      }.`,
    });
  }

  if (variants.length === 0 && !(sawHeader && sampleCount === 0)) {
    warnings.push({
      code: "no_variants",
      message: "We couldn't read any genotype lines from this file.",
    });
  }

  return {
    fileFormat,
    genomeBuild,
    sampleId,
    sampleCount,
    variants,
    skippedLines,
    warnings,
  };
}
