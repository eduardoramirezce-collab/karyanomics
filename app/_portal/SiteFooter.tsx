import catalog from "../../data/cpic-gene-drug-catalog.v1.json";
import { textLink } from "./ui";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-8 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">
          Demo prototype for education only. Not medical advice. Talk to your prescriber or pharmacist.
        </p>
        <p>
          Gene–drug data: ClinPGx/CPIC (CC BY-SA 4.0). See the{" "}
          <a className={textLink} href={catalog.source.usageTermsUrl} target="_blank" rel="noreferrer">
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
    </footer>
  );
}
