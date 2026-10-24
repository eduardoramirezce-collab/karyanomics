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
│   ├── allele-definitions.json   # Star-allele defining positions per gene (from ClinPGx/PharmCAT)
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

The target flow is a chain of stages that connect through fixed contracts in
`lib/pgx/types.ts`. Today, only VCF parsing and a separate synthetic phenotype
guidance demo run; the allele/phenotype caller is pending.

```
VCF file           →  VcfVariant[]  →  "*2/*2"         →  "Poor Metabolizer"  →  cited result
(single-sample,       (parseVcf)       (callDiplotypes)   (phenotype lookup)     (assess)
 GRCh38)

                                        ▲
                     optional CYP2D6 outside call joins here (not from the VCF)
```

- **parseVcf:** read `CHROM`, `POS`, `REF`, `ALT`, and the sample's `GT` (phased
  `|` or unphased `/`) into `ParsedVcf` with variants, skipped lines and warnings.
- **callDiplotypes:** match variants at defining positions (from
  `data/allele-definitions.json`) to star alleles, producing a `DiplotypeCall`
  per gene. Missing coverage → `Indeterminate` (never assume reference).
- **phenotype lookup:** map a diplotype to a phenotype using CPIC tables.
- **assess:** take a **phenotype** (plus drug and indication), look it up in
  `/data`, and return the cited recommendation. Pure, no network or storage I/O,
  never outputs a dose.
- **research recommendation router:** after a trusted caller provides per-gene
  evidence, match exact CPIC lookup keys from the versioned offline route file.
  It returns a source row for review, not patient advice. Warfarin needs a
  separate algorithm; a phenotype-only handoff is insufficient for it.

Key points for anyone building here:

- Target genes for the eventual validated caller: **CYP2C19, CYP2C9, VKORC1, SLCO1B1, TPMT, NUDT15, CYP4F2, ABCG2.** VCF parsing works today; no validated allele/phenotype call is produced yet.
- **CYP2D6 is never called from a VCF.** It comes only from an optional
  outside-call input and joins at the diplotype stage. With no outside call,
  CYP2D6 is `Indeterminate` ("CYP2D6 cannot be determined from this file").
- The stages are independent and meet only at their contracts, so they can be
  built and tested in order: `parseVcf` → `callDiplotypes` → phenotype → `assess`.
- **Sample patients (Maya, Alex, Sam) are synthetic VCF fixtures** in `public/samples/`,
  with PharmCAT reference outputs in `data/samples/` as the answer key. They do
  not yet exercise the full pipeline.
- Clinical demo wording is source-linked and awaits qualified review; do not
  present it as verbatim or clinically approved. Allele positions are never
  invented. The current `data/allele-definitions.json` has placeholders and
  cannot support calls.

## Boundaries

- Patient genetic files are parsed in the browser and never uploaded.
- The PGx engine reads from `/data` only; it does not call external APIs directly
  (API routes handle openFDA / NPPES).
- Keep the `.kiro/` directory tracked in version control.
