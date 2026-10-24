import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="relative z-40 border-b border-ink/10 bg-paper/90">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="inline-flex shrink-0 rounded-md" aria-label="Karyanomics home">
          <Image src="/brand/karyanomics-lockup.png" alt="Karyanomics" width={159} height={32} priority className="h-8 w-auto" />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/order" className="hidden rounded-full px-3 py-2 text-ink/80 hover:text-ink sm:inline-flex">Order a test</Link>
          <Link href="/login?role=clinician" className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-ink/80 underline-offset-4 hover:text-ink hover:underline">
            Clinician sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
