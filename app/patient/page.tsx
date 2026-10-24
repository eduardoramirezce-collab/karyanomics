"use client";

/** Local-only PGx file intake and a clearly fictional, source-backed demo. */
import { useState } from "react";
import Link from "next/link";
import { assess } from "../../lib/pgx/assess";
import { inspectPgxUpload, type UploadInspection } from "../../lib/pgx/upload";
import type { ClinicalAssessmentInput } from "../../lib/pgx/types";
import personas from "../../data/personas.json";

const demo = assess(personas[0] as ClinicalAssessmentInput);

export default function PatientPage() {
  const [inspection, setInspection] = useState<UploadInspection | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  async function onFile(file?: File) {
    setInspection(null); setError(""); setFileName("");
    if (!file) return;
    if (file.size > 30_000_000) { setError("This demo accepts files up to 30 MB."); return; }
    try {
      const text = await file.text();
      setInspection(inspectPgxUpload(file.name, text));
      setFileName(file.name);
    } catch {
      setError("This file could not be read in your browser.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 p-6 sm:p-10">
      <Link href="/" className="text-sm text-blue-700 underline dark:text-blue-300">← Home</Link>
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">PGx file intake</h1>
        <p>Choose a file to check its format and missing calls. The file stays in your browser. This prototype does not store or send your genetic data.</p>
      </header>
      <section className="space-y-3 rounded-xl border border-gray-300 p-5 dark:border-gray-700" aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-xl font-semibold">Check a PGx file</h2>
        <p className="text-sm">Accepted: structured PGx report JSON, GRCh38 VCF, or four-column raw genotype TXT/TSV. PDF and compressed files are not supported.</p>
        <input type="file" accept=".json,.vcf,.txt,.tsv" aria-label="Choose a PGx file" onChange={(event) => void onFile(event.target.files?.[0])} className="block w-full rounded border p-2 focus-visible:outline-2 focus-visible:outline-blue-500" />
        {error && <p role="alert" className="font-medium">{error}</p>}
        {inspection && <div className="space-y-2" aria-live="polite">
          <p className="font-semibold">{fileName}: {inspection.message}</p>
          <p className="text-sm">Format: {inspection.kind.replaceAll("_", " ")} · Records: {inspection.metrics.records} · Missing/uncertain calls: {inspection.metrics.noCalls}</p>
          <p className="text-sm">Status: {inspection.readiness.replaceAll("_", " ")}</p>
          {inspection.issues.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{inspection.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
          <p className="text-sm font-medium">This upload has not been verified and does not produce a medication recommendation.</p>
        </div>}
      </section>
      <section className="space-y-3 rounded-xl border border-gray-300 p-5 dark:border-gray-700" aria-labelledby="demo-heading">
        <h2 id="demo-heading" className="text-xl font-semibold">Fictional example</h2>
        <p>Maya is a synthetic case used to show how a verified result could be matched to a specific guideline.</p>
        <button type="button" onClick={() => setShowDemo((value) => !value)} className="rounded bg-blue-700 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">{showDemo ? "Hide" : "Show"} example</button>
        {showDemo && demo.status === "matched" && <div className="space-y-2" aria-live="polite">
          <p className="font-semibold">Clopidogrel · ACS/PCI</p>
          <p>{demo.patientText}</p>
          <p className="text-sm">Source: <a className="underline" href={demo.source.guidelineUrl} target="_blank" rel="noreferrer">CPIC guideline</a>. Demo wording awaits qualified clinical review.</p>
        </div>}
      </section>
      <p className="text-sm">For demonstration only. A PGx result covers specific genetic factors; it cannot predict whether a medication will be safe or effective for you. Discuss treatment decisions with a prescriber or pharmacist.</p>
    </main>
  );
}
