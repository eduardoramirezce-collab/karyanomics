# Project Structure

```
karyanomics/
├── .kiro/                 # Kiro specs, steering, hooks, MCP settings (do NOT gitignore)
│   ├── specs/
│   ├── steering/
│   ├── hooks/
│   └── settings/
├── app/                   # Next.js App Router: pages, layout, global styles
│   ├── patient/           # Patient-facing screens
│   ├── physician/         # Clinician portal (NPI-gated)
│   └── api/               # Server routes (/api/drug, /api/npi)
├── lib/pgx/               # PGx engine: types, VCF parser, star-allele caller, phenotype, recommendations
├── data/                  # Cited gene-drug snapshot + allele definitions + sample patients
│   ├── allele-definitions.json         # Generated PharmCAT 3.4.0 allele definitions
│   ├── cpic-diplotype-phenotypes.json  # Generated CPIC phenotype lookup
│   └── samples/                   # PharmCAT reference outputs per sample patient (answer key)
├── scripts/               # Build-time data snapshot scripts (fetch-clinpgx.mjs)
├── tests/                 # Unit and property-based tests
├── public/                # Static assets
│   └── samples/           # Sample patient VCFs (maya, alex, sam), fetched by the browser
└── KIRO_LOG.md            # Running log of how Kiro was used
```

## Where things go

- **UI and routes:** `app/`, split by audience (`patient/`, `physician/`) with
  shared server routes under `app/api/`.
- **Domain logic:** `lib/pgx/` holds the engine that maps
  VCF → diplotype → phenotype → CPIC recommendation. Types stay in `types.ts`
  (no logic).
- **Data:** `data/` is the source of truth at runtime — a cited gene-drug
  snapshot, `allele-definitions.json`, and synthetic sample patients under
  `samples/`. Never commit real patient genetic data.
- **Data refresh:** `scripts/` regenerates `data/*.json` from ClinPGx/CPIC at
  build time, not at runtime.
- **Tests:** `tests/`, mirroring the module under test; safety rules belong here
  as property-based tests.

## PGx pipeline (how a VCF becomes a result)

`analyzeVcf(text)` runs the browser-only parser and Kai's eight-gene
`callStarAlleles` against pinned PharmCAT 3.4.0 definitions and CPIC phenotype
data. CYP2D6 remains Indeterminate without a specialized outside call.
Missing/no-call positions become Indeterminate; assumed phase is marked
`ambiguous: true`. The three bundled samples match PharmCAT answer keys.

The Maya sample alone reaches the CYP2C19/clopidogrel ACS/PCI demo through
`toMayaSampleAssessment()` and the patient-safe snapshot. Its wording remains
`humanClinicalReview: false`. Uploaded VCFs yield research calls but do not
reach medication guidance. The research recommendation router uses exact drug,
population, phenotype and activity-score keys and rejects ambiguous calls. It
returns source-row IDs, not medication advice. Clinical assay quality, coverage
provenance, clinician review and product identity remain to be implemented.

## Boundaries

- Patient genetic files are parsed in the browser and never uploaded.
- The PGx engine reads from `/data` only; it does not call external APIs directly
  (API routes handle openFDA / NPPES).
- Keep the `.kiro/` directory tracked in version control.
