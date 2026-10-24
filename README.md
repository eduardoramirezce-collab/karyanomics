# Karyanomics

**Know how your genes shape your medications, before your next dose.**

Karyanomics is an affordable pharmacogenomics (PGx) app. Patients load their genetic results, scan or search a medication, and get a plain-language answer about whether their genes may change how that drug works for them. Clinicians who verify their NPI get the full detail: diplotype, phenotype, and the CPIC recommendation with its evidence.

Built at **Hackachusetts 2026** · Track: **Healthcare & Biotech** · Built with **[Kiro](https://kiro.dev)**

> **Live demo:** _coming soon_
> **Demo video:** _coming soon_

---

## The problem

The same prescription can work well for one person, do nothing for another, and cause harm in a third, partly because of genes that control how drugs are metabolized. Clinical guidelines for these gene-drug pairs already exist (CPIC), but the tests are expensive and the reports are hard to read. Most patients never see this information, and the ones who do often can't act on it.

## What Karyanomics does

### Patient side
- **Load a genotype:** pick a demo persona, or upload a 23andMe-style raw data file. The file is parsed **in your browser and never uploaded**.
- **Scan or search a medication:** scan the barcode (NDC) on a pill bottle with your phone camera, or type the drug name.
- **Get a plain-language result:** one of three levels, with a short explanation and the guideline it comes from:
  - ✅ Typical response expected
  - ⚠️ Your genes may change how this drug works
  - 🛑 Talk to your prescriber before your next dose
- **See what's been reported:** adverse event reports submitted to the FDA for that drug, clearly labeled as reports, not proof of cause.
- **Share with your pharmacist:** a clean summary card to bring to your next appointment.

The patient side **never tells anyone to start, stop, or change a dose**. That decision belongs to a clinician.

### Clinician side
- **NPI gate:** enter a National Provider Identifier; we validate its check digit and confirm it against the CMS NPPES registry.
- **Full detail per drug:** gene, diplotype, phenotype, CPIC recommendation, strength of recommendation, alternatives, and PubMed citations.

> **Note on the NPI gate:** NPIs are public, so this is a demo access check, not real authentication. A production version would add identity verification (license check or clinician single sign-on).

### Gene-drug coverage (CPIC level A)

| Gene | Drugs |
| --- | --- |
| CYP2C19 | clopidogrel, citalopram/escitalopram, sertraline, omeprazole |
| CYP2D6 | codeine, tramadol, ondansetron |
| CYP2C9 + VKORC1 | warfarin |
| SLCO1B1 | simvastatin |
| TPMT / NUDT15 | azathioprine, mercaptopurine |
| DPYD | fluorouracil, capecitabine |

CYP2D6 can't be reliably determined from consumer genotyping arrays (copy-number variation), so raw-file results show it as **Indeterminate** rather than guessing.

---

## Try it

### For judges
1. Open the live demo link above (no login required).
2. **Patient:** choose a demo persona, e.g. **Maya** (CYP2C19 poor metabolizer), then search `clopidogrel`. Try **Dev** (CYP2D6 ultrarapid metabolizer) with `codeine`.
3. **Clinician:** click **"I'm a clinician"**, then **"Judge demo access"** to view the full clinical detail without a real NPI.

All personas are fictional. No real genetic data is stored in this repo.

### Run locally

**Requirements:** Node.js 20+ and npm

```bash
git clone https://github.com/<org-or-user>/karyanomics.git
cd karyanomics
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm test                 # unit + property-based tests
npm run fetch:clinpgx    # refresh the bundled gene-drug snapshot (optional)
```

No API keys are required; all external APIs used are public.

---

## How it works

```
Browser (patient + clinician screens)
  └─ PGx engine (lib/pgx): genotype → phenotype → CPIC recommendation
       └─ reads a bundled, cited snapshot in /data
            (genetic data never leaves the device)

Server routes (Next.js)
  ├─ /api/drug  → openFDA NDC + drug adverse event APIs
  └─ /api/npi   → CMS NPPES NPI Registry API

Build time
  └─ scripts/fetch-clinpgx.ts → ClinPGx / CPIC → /data/*.json
```

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Vitest · fast-check · html5-qrcode

### Repo structure

```
karyanomics/
├── .kiro/                 # Kiro specs, steering, hooks, MCP settings (do not gitignore)
│   ├── specs/
│   ├── steering/
│   ├── hooks/
│   └── settings/
├── app/                   # Next.js pages and API routes
│   ├── patient/
│   ├── physician/
│   └── api/
├── lib/pgx/               # PGx engine: types, phenotype calls, recommendations, raw-file parser
├── data/                  # Curated gene-drug snapshot + demo personas
├── scripts/               # Data snapshot scripts
├── tests/                 # Unit and property-based tests
└── KIRO_LOG.md            # Running log of how we used Kiro
```

---

## How we used Kiro

_Full write-up coming at submission. Summary of the approach:_

- **Spec-driven development:** separate feature specs for the PGx engine, data snapshot, patient app, and clinician portal, with requirements written in EARS format. Bugfix specs for issues found during integration.
- **Steering:** a `clinical-safety.md` steering file, always included, that enforces our core rule: patient-facing text never instructs starting, stopping, or dosing a medication, and every recommendation cites its source.
- **Agent hooks:** schema validation and tests on every data change; safety and accessibility checks on patient-facing components.
- **MCP:** let Kiro call ClinPGx and openFDA directly while building the data layer and API routes.
- **Property-based testing:** safety rules written as properties (e.g. no genotype and drug combination ever produces patient text telling someone to stop a medication).

See [`KIRO_LOG.md`](./KIRO_LOG.md) and the [`.kiro/`](./.kiro) directory for the details.

---

## Data sources and credits

| Source | Used for | License / note |
| --- | --- | --- |
| [ClinPGx](https://www.clinpgx.org/) (PharmGKB + CPIC) | Gene-drug pairs, guidelines, variant data | CC BY-SA 4.0 |
| [CPIC guidelines](https://cpicpgx.org/guidelines/) | Phenotype-based recommendations | Cited per recommendation |
| [openFDA](https://open.fda.gov/) | NDC lookup, drug adverse event reports | U.S. FDA public data. A report is not proof the drug caused the event. |
| [CMS NPPES NPI Registry](https://npiregistry.cms.hhs.gov/) | Clinician NPI verification | U.S. CMS public data |
| [PubMed / NCBI](https://pubmed.ncbi.nlm.nih.gov/) | Citations (PMIDs) | U.S. NLM public data |
| [PubChem](https://pubchem.ncbi.nlm.nih.gov/) | Compound identifiers | U.S. NLM public data |

---

## Disclaimer

Karyanomics is a hackathon prototype for education and demonstration only. It is **not a medical device**, has not been reviewed by the FDA, and does not provide medical advice. Never start, stop, or change a medication based on this app. Talk to your prescriber or pharmacist.

---

## Team

- **Kai** — product, clinical data and PGx engine
- **Edu** — front end, API integrations, clinician portal

## License

Code: MIT. Bundled data in `/data` derived from ClinPGx is shared under CC BY-SA 4.0.