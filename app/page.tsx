import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-8 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Karyanomics
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400">
          Know how your genes shape your medications, before your next dose.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/patient"
          className="rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          I&apos;m a patient
        </Link>
        <span className="rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Clinician view coming soon
        </span>
      </div>
    </main>
  );
}
