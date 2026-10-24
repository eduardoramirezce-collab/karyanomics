/**
 * One-call entry point for the browser: VCF text → parsed file + per-gene calls.
 * Pure; runs on the device. Nothing here sends data anywhere.
 */

import { callStarAlleles } from "./callStarAlleles";
import { parseVcf } from "./parseVcf";
import type { DiplotypeCall, ParsedVcf } from "./types";

export interface VcfAnalysis {
  parsed: ParsedVcf;
  calls: DiplotypeCall[];
}

export function analyzeVcf(text: string): VcfAnalysis {
  const parsed = parseVcf(text);
  return { parsed, calls: callStarAlleles(parsed) };
}
