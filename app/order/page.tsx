import { listDrugTherapeuticGroups } from "../../lib/pgx/drug-therapeutic-groups";
import { GENE_DESCRIPTIONS, VCF_GENES } from "../../lib/pgx/drugResult";
import { card } from "../_portal/ui";
import OrderForm from "./OrderForm";

const STEPS = [
  { title: "Order a test", text: "Fill in the form. We send you a saliva kit." },
  { title: "Get your results", text: "A lab reads 8 genes from your sample." },
  { title: "Check your medications", text: "Sign in to see how your genes may affect common medicines." },
];

export default function OrderPage() {
  const groups = listDrugTherapeuticGroups().filter((group) => group.drugs.length > 0);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-slate-900">Order your test</h1>
        <p className="text-lg text-slate-700">
          One saliva sample. Results for 8 genes that affect common medications.
        </p>
      </header>

      <section aria-labelledby="genes-heading" className="flex flex-col gap-4">
        <h2 id="genes-heading" className="text-2xl font-semibold text-slate-900">What the test covers</h2>
        <p className="text-base text-slate-700">A gene is a piece of your DNA. These genes help your body handle some medicines.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {VCF_GENES.map((gene) => (
            <li key={gene} className={card}>
              <p className="font-mono text-base font-semibold text-slate-900">{gene}</p>
              <p className="text-base text-slate-700">{GENE_DESCRIPTIONS[gene]}</p>
            </li>
          ))}
        </ul>
        <h3 className="text-lg font-semibold text-slate-900">Medication groups we check</h3>
        <ul className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <li key={group.id} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-800">
              {group.label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="order-how-heading" className="flex flex-col gap-4">
        <h2 id="order-how-heading" className="text-2xl font-semibold text-slate-900">How it works</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 font-bold text-white">{index + 1}</span>
              <span>
                <span className="block text-base font-semibold text-slate-900">{step.title}</span>
                <span className="block text-base text-slate-700">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="form-heading" className={`${card} flex flex-col gap-4 p-6`}>
        <h2 id="form-heading" className="text-2xl font-semibold text-slate-900">Request a kit</h2>
        <OrderForm />
      </section>
    </main>
  );
}
