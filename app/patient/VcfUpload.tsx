"use client";

/**
 * VCF input for the patient side (pipeline stage 1: "Input").
 *
 * Two ways in, one parser:
 * - Upload: the file is read with File.text() in the browser. It is never
 *   sent to any server route or external service.
 * - Load sample patient: fetches a bundled, synthetic VCF from
 *   /public/samples/ (a static GET, nothing is sent) and runs it through the
 *   same parseVcf().
 *
 * This component only parses and summarizes the file. It shows no clinical
 * interpretation; star-allele calling and recommendations are later stages.
 */

import { useId, useRef, useState, type ChangeEvent } from "react";
import { parseVcf } from "@/lib/pgx/parseVcf";
import type { ParsedVcf } from "@/lib/pgx/types";

/**
 * Bundled sample patients. All are synthetic test files (no real people).
 * Their PharmCAT 3.4.0 reference outputs (the answer key) live in
 * data/samples/<id>.phenotype.json and <id>.report.tsv.
 */
export const SAMPLE_PATIENTS = [
  {
    id: "maya",
    name: "Maya",
    file: "/samples/maya.vcf",
    // Source: PharmCAT example 2 VCF, unmodified (pharmcat.clinpgx.org/examples).
  },
  {
    id: "alex",
    name: "Alex",
    file: "/samples/alex.vcf",
    // Source: PharmCAT example 1 VCF ("all reference"), unmodified.
  },
  {
    id: "sam",
    name: "Sam",
    file: "/samples/sam.vcf",
    // Source: PharmCAT example 1 VCF with GT changed to 0/1 at rs1057910,
    // rs4149056 and rs9923231 (existing PharmCAT rows; no coordinates added).
  },
] as const;

export type VcfSource =
  | { kind: "upload"; name: string }
  | { kind: "sample"; name: string; id: string };

interface VcfUploadProps {
  /** Called with the parse result so later pipeline stages can use it. */
  onParsed?: (result: ParsedVcf, source: VcfSource) => void;
}

type Status =
  | { state: "idle" }
  | { state: "loading"; label: string }
  | { state: "error"; message: string }
  | { state: "done"; result: ParsedVcf; source: VcfSource };

const buttonClass =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800";

export default function VcfUpload({ onParsed }: VcfUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const busy = status.state === "loading";

  function finish(text: string, source: VcfSource) {
    const result = parseVcf(text);
    setStatus({ state: "done", result, source });
    onParsed?.(result, source);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 30_000_000) {
      setStatus({ state: "error", message: "This demo accepts VCF files up to 30 MB." });
      return;
    }
    setStatus({ state: "loading", label: `Reading ${file.name}…` });
    try {
      // Read locally. Nothing is uploaded.
      const text = await file.text();
      finish(text, { kind: "upload", name: file.name });
    } catch {
      setStatus({
        state: "error",
        message: "We couldn't read that file. Please check it is a plain-text .vcf file.",
      });
    }
  }

  async function loadSample(sample: (typeof SAMPLE_PATIENTS)[number]) {
    setStatus({ state: "loading", label: `Loading ${sample.name}…` });
    try {
      const response = await fetch(sample.file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      finish(text, { kind: "sample", name: sample.name, id: sample.id });
    } catch {
      setStatus({
        state: "error",
        message: `We couldn't load the sample patient ${sample.name}. Please try again.`,
      });
    }
    // Clear any previously chosen upload so the two inputs don't disagree.
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section aria-labelledby={`${inputId}-heading`} className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id={`${inputId}-heading`} className="text-xl font-semibold">
          Load your genetic file
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload a VCF file (GRCh38). Your file is read on this device only. It is
          never uploaded or sent anywhere.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          Choose a VCF file
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept=".vcf"
          onChange={handleFile}
          disabled={busy}
          className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Or try a sample patient</p>
        <div className="flex flex-wrap gap-3">
          {SAMPLE_PATIENTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => loadSample(sample)}
              disabled={busy}
              className={buttonClass}
            >
              Load sample patient: {sample.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Sample patients are made-up test files, not real people.
        </p>
      </div>

      <div aria-live="polite" role="status">
        {status.state === "loading" && <p className="text-sm">{status.label}</p>}
        {status.state === "error" && (
          <p className="text-sm text-red-700 dark:text-red-400">
            <span aria-hidden="true">🛑 </span>
            <span className="font-medium">Error: </span>
            {status.message}
          </p>
        )}
        {status.state === "done" && (
          <ParseSummary result={status.result} source={status.source} />
        )}
      </div>
    </section>
  );
}

/** A plain summary of what was read. No clinical interpretation here. */
function ParseSummary({ result, source }: { result: ParsedVcf; source: VcfSource }) {
  const noCalls = result.variants.filter(
    (v) => v.gt[0] === null || v.gt[1] === null,
  ).length;
  const phased = result.variants.filter((v) => v.phased).length;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-sm font-medium">
        {source.kind === "sample" ? `Sample patient: ${source.name}` : `File: ${source.name}`}
      </p>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <dt className="text-gray-600 dark:text-gray-400">Sample ID</dt>
        <dd>{result.sampleId ?? "Not given"}</dd>
        <dt className="text-gray-600 dark:text-gray-400">Genome build</dt>
        <dd>{result.genomeBuild === "unknown" ? "Unknown" : result.genomeBuild}</dd>
        <dt className="text-gray-600 dark:text-gray-400">Positions read</dt>
        <dd>{result.variants.length}</dd>
        <dt className="text-gray-600 dark:text-gray-400">No-calls</dt>
        <dd>{noCalls}</dd>
        <dt className="text-gray-600 dark:text-gray-400">Phased calls</dt>
        <dd>{phased}</dd>
        <dt className="text-gray-600 dark:text-gray-400">Lines skipped</dt>
        <dd>{result.skippedLines.length}</dd>
      </dl>

      {result.warnings.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {result.warnings.map((w) => (
            <li key={w.code} className="text-amber-800 dark:text-amber-300">
              <span aria-hidden="true">⚠️ </span>
              <span className="font-medium">Warning: </span>
              {w.message}
            </li>
          ))}
        </ul>
      )}

      {result.skippedLines.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            Show skipped lines
          </summary>
          <ul className="mt-2 flex flex-col gap-1 font-mono text-xs">
            {result.skippedLines.slice(0, 50).map((s) => (
              <li key={s.line}>
                Line {s.line}: {s.reason}
              </li>
            ))}
            {result.skippedLines.length > 50 && (
              <li>…and {result.skippedLines.length - 50} more</li>
            )}
          </ul>
        </details>
      )}
    </div>
  );
}
