import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="rounded text-lg font-bold tracking-tight text-teal-700">
          Karyanomics
        </Link>
        <Link href="/login?role=clinician" className="rounded text-sm font-medium text-slate-700 underline underline-offset-2 hover:text-teal-700">
          Clinician sign in
        </Link>
      </div>
    </header>
  );
}
