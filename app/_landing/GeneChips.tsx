import { GENE_DESCRIPTIONS, VCF_GENES } from "../../lib/pgx/drugResult";
import Reveal from "../_motion/Reveal";
import { eyebrow } from "../_portal/ui";

/**
 * Eight gene chips, rendered on the server (so the browser never downloads the
 * PGx data modules for the landing page). Hover or keyboard focus reveals the
 * one-line description with opacity + transform only, so nothing reflows. On
 * touch screens, and with animations off, every description is simply shown.
 */
export default function GeneChips() {
  return (
    <section aria-labelledby="genes-heading" className="bg-paper py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={eyebrow}>The panel</p>
            <h2 id="genes-heading" className="display mt-3 max-w-3xl text-5xl text-ink sm:text-6xl lg:text-7xl">
              8 genes, read in your browser
            </h2>
          </div>
          <p className="max-w-sm text-base text-ink/80">Hover, tap, or focus a gene to see what it does.</p>
        </div>
        <Reveal stagger={0.06}>
          <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {VCF_GENES.map((gene, index) => (
              <li
                key={gene}
                data-reveal
                tabIndex={0}
                className="group relative isolate flex h-48 flex-col justify-between overflow-hidden rounded-2xl border border-ink/15 bg-white p-4 transition-transform duration-300 ease-out hover:-translate-y-1 focus:-translate-y-1"
              >
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-mist opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100" />
                <span aria-hidden="true" className="flex items-center justify-between text-xs font-medium text-ink/75">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span className="h-2 w-2 rounded-full bg-sky transition-transform duration-300 group-hover:scale-150 group-focus:scale-150" />
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="text-lg font-semibold tracking-tight text-ink">{gene}</span>
                  <span className="translate-y-2 text-[13px] leading-snug text-ink/80 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100">
                    {GENE_DESCRIPTIONS[gene]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
