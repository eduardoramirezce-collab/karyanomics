import catalog from "../../data/cpic-gene-drug-catalog.v1.json";

export default function SiteFooter() {
  return (
    <footer className="on-ink mt-auto bg-ink text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-12 text-sm text-white/80">
        <p className="display text-3xl text-white sm:text-4xl">
          Demo prototype for education only. Not medical advice. Talk to your prescriber or pharmacist.
        </p>
        <div className="grid gap-4 border-t border-white/15 pt-6 sm:grid-cols-2">
          <p>
            Gene–drug data: ClinPGx/CPIC (CC BY-SA 4.0). See the{" "}
            <a className="font-medium text-sky underline decoration-sky/50 underline-offset-4 hover:decoration-sky" href={catalog.source.usageTermsUrl} target="_blank" rel="noreferrer">
              ClinPGx data usage policy
            </a>
            .
          </p>
          <p>
            Drug names: NLM RxNorm. This product uses publicly available data from the U.S. National Library of
            Medicine (NLM), National Institutes of Health, Department of Health and Human Services; NLM is not
            responsible for the product and does not endorse or recommend this or any other product.
          </p>
        </div>
      </div>
    </footer>
  );
}
