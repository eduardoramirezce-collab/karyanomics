# Karyanomics

**Know how your genes shape your medications, before your next dose.**

Karyanomics is an affordable pharmacogenomics (PGx) app. Patients load their genetic results, scan or search a medication, and get a plain-language answer about whether their genes may change how that drug works for them. Clinicians who verify their NPI get the full detail: diplotype, phenotype, and the CPIC recommendation with its evidence.

Built at **Hackachusetts 2026** · Track: **Healthcare & Biotech** · Built with **[Kiro](https://kiro.dev)**

> **Live demo:** _coming soon_
> **Demo video:** _coming soon_

**Implemented today:** a browser-only file intake page (`/patient`), structural checks for PGx JSON / VCF / four-column raw text, a fictional Maya example, and a versioned five-row CPIC snapshot with a separate patient-safe browser snapshot. Uploaded files are **not** interpreted into recommendations. The clinician portal, NPI check, NDC lookup, openFDA panel, validated VCF-to-phenotype caller, and broader gene–drug coverage below are planned, not yet implemented. See [API and upload register](./docs/API_AND_UPLOAD_REGISTER.md), [clinical change log](./docs/CLINICAL_CHANGELOG.md), and [current gaps](./docs/CURRENT_GAPS.md).

**Team handoff:** Kai owns VCF → diplotype/phenotype (`parseVcf`, allele definitions, caller); Edu owns phenotype + drug + indication → CPIC-linked guidance (`assess`, reviewed snapshot, patient-safe projection). `DiplotypeCall[]` in `lib/pgx/types.ts` is the boundary. A complete, verified call is required before guidance; missing/ambiguous calls remain Indeterminate. Shared README/steering changes should be merged to `main` through review so both branches inherit one direction.

---

## The problem

The same prescription can work well for one person, do nothing for another, and cause harm in a third, partly because of genes that control how drugs are metabolized. Clinical guidelines for these gene-drug pairs already exist (CPIC), but the tests are expensive and the reports are hard to read. Most patients never see this information, and the ones who do often can't act on it.

## Planned experience

### Patient side
- **Load a genotype:** upload a VCF file, or load one of three sample patients. The file is parsed **in your browser and never uploaded**.
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

| Gene | Called from | Drugs |
| --- | --- | --- |
| CYP2C19 | VCF | clopidogrel, citalopram/escitalopram, sertraline, omeprazole |
| CYP2C9 + VKORC1 | VCF | warfarin |
| SLCO1B1 | VCF | simvastatin |
| TPMT | VCF | azathioprine, mercaptopurine |
| CYP2D6 | outside call only | codeine, tramadol, ondansetron |

CYP2D6 can't be called from a VCF (it needs copy-number and structural analysis that genotyping/VCF data doesn't capture). It comes only from an optional **outside-call** input; if none is provided it shows as **Indeterminate** with the explanation "CYP2D6 cannot be determined from this file." DPYD and NUDT15 are out of scope for VCF calling today.

---

## Demo and local run

### Current demo

Open `/patient` and show the fictional Maya example. The browser intake can recognize VCF, PGx JSON, and raw TSV formats, but it does not yet call diplotypes or interpret uploaded files. The clinician portal and three-VCF-sample flow described below are planned. No real genetic data is stored in the repo.

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
npm run fetch:clinpgx    # fetch an ignored candidate for review; does not update bundled data
```

No API keys are required; all external APIs used are public.

---

## How it works

The target pipeline is below. Today, the VCF-to-phenotype caller is still being built; only the synthetic Maya phenotype exercises the guidance lookup:

1. **Input:** a single-sample GRCh38 VCF (your upload or a bundled sample), plus an optional "outside call" input for CYP2D6.
2. **Parse VCF:** read `CHROM`, `POS`, `REF`, `ALT`, and the sample's `GT` field (phased `|` or unphased `/`).
3. **Call star alleles:** match variants at defined positions to star alleles and produce a diplotype per gene (e.g. CYP2C19 `*2/*2`).
4. **Diplotype → phenotype** using CPIC tables (e.g. Poor Metabolizer).
5. **Phenotype + drug → CPIC recommendation.**
6. **Report:** a plain-language patient view, and a clinician view behind the NPI gate.

```
Browser (patient + clinician screens)
  └─ PGx engine (lib/pgx):
       VCF → parseVcf → callDiplotypes → phenotype → CPIC recommendation
       (optional CYP2D6 outside call joins at the diplotype step)
         └─ reads allele definitions + cited snapshot in /data
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
├── lib/pgx/               # PGx engine: types, VCF parser, star-allele caller, phenotype, recommendations
├── data/                  # Cited gene-drug snapshot + allele definitions + sample patients
│   ├── allele-definitions.json   # Star-allele defining positions per gene
│   └── samples/                   # Sample VCFs + PharmCAT reference outputs (answer key)
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
| [ClinPGx](https://www.clinpgx.org/) (PharmGKB + CPIC) | Gene-drug pairs, guidelines, variant data | Review the [current data usage policy](https://www.clinpgx.org/page/dataUsagePolicy) before redistribution. |
| [CPIC guidelines](https://cpicpgx.org/guidelines/) | Phenotype-based recommendations | Cited per recommendation |
| [PharmCAT](https://pharmcat.org) | Sample VCFs and reference outputs used to validate our allele caller | See PharmCAT terms |
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

Code: MIT. Licensing of bundled source-derived data must be confirmed against the current [ClinPGx data usage policy](https://www.clinpgx.org/page/dataUsagePolicy) before redistribution.

## Clinical data work in progress

The first source-backed engine path is CYP2C19 + clopidogrel for ACS/PCI, using
synthetic input. See [clinical data pipeline](./docs/CLINICAL_DATA_PIPELINE.md)
for source roles, test-input requirements, refresh steps, and the limits of PGx
interpretation. The bundled explanations are marked as awaiting qualified
clinical review. `npm run fetch:clinpgx` writes an ignored candidate snapshot;
it does not silently replace the app's checked demo data.
