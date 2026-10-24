/**
 * VCF_Loader: gets VCF text from a bundled sample (static GET) or a local file
 * (File.text()) and runs analyzeVcf() on the device. Nothing is uploaded, and
 * nothing is logged. Returns a result object instead of throwing.
 */
import { analyzeVcf } from "../../lib/pgx/analyzeVcf";
import type { DiplotypeCall, ParsedVcf } from "../../lib/pgx/types";
import { findSample, type SampleId } from "./samples";

export type SessionSource = { kind: "sample"; id: SampleId } | { kind: "upload"; fileName: string };

export interface Loaded {
  source: SessionSource;
  patientName: string;
  parsed: ParsedVcf;
  calls: DiplotypeCall[];
}

export type LoadResult = { ok: true; value: Loaded } | { ok: false; message: string };

export const MAX_UPLOAD_BYTES = 30_000_000;

/** Rejects files that are not GRCh38 or not single-sample, using the parser's own messages. */
export function checkParsed(parsed: ParsedVcf): string | null {
  const problems: string[] = [];
  if (parsed.genomeBuild !== "GRCh38") {
    problems.push(...parsed.warnings.filter((w) => w.code === "build_not_grch38" || w.code === "build_unknown").map((w) => w.message));
    if (!problems.length) problems.push("This file is not marked as GRCh38.");
  }
  if (parsed.sampleCount !== 1) {
    const before = problems.length;
    problems.push(...parsed.warnings.filter((w) => w.code === "multiple_samples" || w.code === "no_samples").map((w) => w.message));
    if (problems.length === before) problems.push("This file must contain exactly one sample.");
  }
  return problems.length ? problems.join(" ") : null;
}

function analyze(text: string): { parsed: ParsedVcf; calls: DiplotypeCall[] } {
  return analyzeVcf(text);
}

export async function loadSample(id: SampleId, fetchImpl: typeof fetch = fetch): Promise<LoadResult> {
  const sample = findSample(id);
  if (!sample) return { ok: false, message: "We couldn't load that sample patient. Please try again." };
  const failed = `We couldn't load the sample patient ${sample.name}. Please try again.`;
  try {
    const response = await fetchImpl(sample.file);
    if (!response.ok) return { ok: false, message: failed };
    const { parsed, calls } = analyze(await response.text());
    const problem = checkParsed(parsed);
    if (problem) return { ok: false, message: problem };
    return { ok: true, value: { source: { kind: "sample", id: sample.id }, patientName: sample.name, parsed, calls } };
  } catch {
    return { ok: false, message: failed };
  }
}

export async function loadUpload(file: File): Promise<LoadResult> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: "This demo accepts VCF files up to 30 MB." };
  try {
    // Read locally. Nothing is uploaded.
    const { parsed, calls } = analyze(await file.text());
    const problem = checkParsed(parsed);
    if (problem) return { ok: false, message: problem };
    const patientName = parsed.sampleId?.trim() || file.name;
    return { ok: true, value: { source: { kind: "upload", fileName: file.name }, patientName, parsed, calls } };
  } catch {
    return { ok: false, message: "We couldn't read that file. Please check it is a plain-text .vcf file." };
  }
}
