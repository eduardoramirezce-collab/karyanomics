"use client";

/** Local-only PGx file intake and a clearly fictional, source-backed demo. */
import { useState } from "react";
import Link from "next/link";
import { assessPatient } from "../../lib/pgx/assess-patient";
import { inspectPgxUpload, type UploadInspection } from "../../lib/pgx/upload";
import { toMayaSampleAssessment } from "../../lib/pgx/sample-assessment";
import type { PatientAssessment } from "../../lib/pgx/assess-patient";
import VcfUpload from "./VcfUpload";

export default function PatientPage() {
  const [inspection, setInspection] = useState<UploadInspection | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [demo, setDemo] = useState<PatientAssessment | null>(null);

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
      <p><Link href="/drugs" className="text-blue-700 underline dark:text-blue-300">Browse the medication research catalog by category →</Link></p>
      <VcfUpload onParsed={(parsed, source, calls) => {
        setDemo(source.kind === "sample" && source.id === "maya"
          ? assessPatient(toMayaSampleAssessment(parsed, calls)) : null);
      }} />
      <section className="space-y-3 rounded-xl border border-gray-300 p-5 dark:border-gray-700" aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-xl font-semibold">Check another PGx file</h2>
        <p className="text-sm">Structured PGx report JSON and four-column raw genotype TXT/TSV are checked for format only. PDF and compressed files are not supported.</p>
        <input type="file" accept=".json,.txt,.tsv" aria-label="Choose a PGx report or raw genotype file" onChange={(event) => void onFile(event.target.files?.[0])} className="block w-full rounded border p-2 focus-visible:outline-2 focus-visible:outline-blue-500" />
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
        <h2 id="demo-heading" className="text-xl font-semibold">Maya sample result</h2>
        <p>Load the bundled Maya VCF above to see its CYP2C19 call passed to the clopidogrel/ACS-PCI demo lookup. Maya is a synthetic sample; the wording awaits qualified clinical review. Uploaded files never enter this demo lookup.</p>
        {demo?.status === "matched" && <div className="space-y-2" aria-live="polite">
          <p className="font-semibold">Clopidogrel · ACS/PCI</p>
          <p>{demo.patientText}</p>
          <p className="text-sm">Source: <a className="underline" href={demo.guidelineUrl} target="_blank" rel="noreferrer">CPIC guideline</a>. Demo wording awaits qualified clinical review.</p>
        </div>}
        {demo && demo.status !== "matched" && <p role="status">{demo.message}</p>}
      </section>
      <p className="text-sm">For demonstration only. A PGx result covers specific genetic factors; it cannot predict whether a medication will be safe or effective for you. Discuss treatment decisions with a prescriber or pharmacist.</p>
    </main>
  );
}
