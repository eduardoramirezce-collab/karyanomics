import { listDrugTherapeuticGroups } from "../../lib/pgx/drug-therapeutic-groups";
import { GENE_DESCRIPTIONS, VCF_GENES } from "../../lib/pgx/drugResult";
import Reveal from "../_motion/Reveal";
import { card, eyebrow } from "../_portal/ui";
import OrderForm from "./OrderForm";

const STEPS = [
  { title: "Order a test", text: "Fill in the form. We send you a saliva kit." },
  { title: "Get your results", text: "A lab reads 8 genes from your sample." },
  { title: "Check your medications", text: "Sign in to see how your genes may affect common medicines." },
];

export default function OrderPage() {
  const groups = listDrugTherapeuticGroups().filter((group) => group.drugs.length > 0);
  return (
    <main className="flex w-full flex-col">
      <header className="hero-glow border-b border-ink/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-16 sm:py-24">
          <p className={eyebrow}>Order</p>
          <h1 className="display max-w-4xl text-[2.75rem] text-ink sm:text-7xl lg:text-[6.5rem]">Order your test</h1>
          <p className="max-w-xl text-lg text-ink/80 sm:text-xl">
            One saliva sample. Results for 8 genes that affect common medications.
          </p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <div className="flex flex-col gap-14">
          <section aria-labelledby="genes-heading" className="flex flex-col gap-5">
            <h2 id="genes-heading" className="display text-4xl text-ink sm:text-5xl">What the test covers</h2>
            <p className="text-base text-ink/80">A gene is a piece of your DNA. These genes help your body handle some medicines.</p>
            <Reveal stagger={0.05}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {VCF_GENES.map((gene, index) => (
                  <li key={gene} data-reveal className={`${card} flex gap-4`}>
                    <span aria-hidden="true" className="display text-3xl leading-none text-royal">{String(index + 1).padStart(2, "0")}</span>
                    <span className="flex flex-col gap-1">
                      <span className="text-base font-semibold tracking-tight text-ink">{gene}</span>
                      <span className="text-base text-ink/80">{GENE_DESCRIPTIONS[gene]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <h3 className="mt-4 text-lg font-semibold text-ink">Medication groups we check</h3>
            <ul className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <li key={group.id} className="rounded-full border border-royal/20 bg-mist px-3.5 py-1.5 text-sm font-medium text-royal">
                  {group.label}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="order-how-heading" className="flex flex-col gap-5">
            <h2 id="order-how-heading" className="display text-4xl text-ink sm:text-5xl">How it works</h2>
            <ol className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex items-baseline gap-5 py-5">
                  <span className="display w-14 shrink-0 text-5xl leading-none text-royal">
                    <span className="sr-only">Step </span>{index + 1}
                  </span>
                  <span>
                    <span className="block text-lg font-semibold text-ink">{step.title}</span>
                    <span className="block text-base text-ink/80">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section aria-labelledby="form-heading" className="lg:sticky lg:top-8 lg:self-start">
          <div className={`${card} flex flex-col gap-5 p-6 sm:p-8`}>
            <h2 id="form-heading" className="display text-4xl text-ink">Request a kit</h2>
            <OrderForm />
          </div>
        </section>
      </div>
    </main>
  );
}
