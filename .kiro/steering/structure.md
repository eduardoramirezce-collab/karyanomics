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
├── lib/pgx/               # PGx engine: types, phenotype calls, recommendations, raw-file parser
├── data/                  # Curated, cited gene-drug snapshot + demo personas
├── scripts/               # Build-time data snapshot scripts (fetch-clinpgx.ts)
├── tests/                 # Unit and property-based tests
├── public/                # Static assets
└── KIRO_LOG.md            # Running log of how Kiro was used
```

## Where things go

- **UI and routes:** `app/`, split by audience (`patient/`, `physician/`) with
  shared server routes under `app/api/`.
- **Domain logic:** `lib/pgx/` holds the engine that maps
  genotype → phenotype → CPIC recommendation. Types stay in `types.ts` (no logic).
- **Data:** `data/` is the source of truth at runtime — a bundled snapshot plus
  fictional demo personas. Never commit real patient genetic data.
- **Data refresh:** `scripts/` regenerates `data/*.json` from ClinPGx/CPIC at
  build time, not at runtime.
- **Tests:** `tests/`, mirroring the module under test; safety rules belong here
  as property-based tests.

## Boundaries

- Patient genetic files are parsed in the browser and never uploaded.
- The PGx engine reads from `/data` only; it does not call external APIs directly
  (API routes handle openFDA / NPPES).
- Keep the `.kiro/` directory tracked in version control.
