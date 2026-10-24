# Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript 5, `strict` mode on
- **Styling:** Tailwind CSS v4 (with `@tailwindcss/turbopack`)
- **Testing:** Vitest 4 + fast-check (property-based testing)
- **Linting:** ESLint 9 with `eslint-config-next`
- **Barcode scanning:** html5-qrcode (NDC lookup) — PLANNED; not installed yet
- **Runtime:** Node.js 20+

## External data sources

All public, no API keys required:

- **ClinPGx (PharmGKB + CPIC)** — gene-drug pairs, guidelines, variant data
- **openFDA** — NDC lookup and drug adverse event reports
- **CMS NPPES** — clinician NPI verification
- **PubMed / PubChem** — citations and compound identifiers

PLANNED server-side API routes will proxy external calls: `/api/drug` (openFDA)
and `/api/npi` (CMS NPPES). Neither exists yet, and no code calls openFDA or
NPPES today. The bundled snapshots live in `/data`. Build-time scripts in
`scripts/*.mjs` (for example `scripts/fetch-clinpgx.mjs`) write ignored
candidates to `data/candidates/` for review; they never overwrite a curated
snapshot.

## Conventions

- Import alias `@/*` maps to the repo root (see `tsconfig.json`).
- Keep type-only modules free of logic (e.g. `lib/pgx/types.ts`).
- Document modules with a top-of-file JSDoc block explaining intent.
- Tailwind utility classes inline in JSX; include focus-visible states for
  accessibility.
- Tests live in `tests/` and match `**/*.{test,spec}.{ts,tsx}`; encode safety
  rules as fast-check properties where possible.

## Common commands

```bash
npm install              # install dependencies
npm run dev              # start dev server at http://localhost:3000
npm run build            # production build
npm run start            # serve the production build
npm test                 # run unit + property-based tests (vitest run)
npm run lint             # run ESLint
npm run validate:clinical      # provenance/consistency checks for all bundled clinical data
npx next typegen && npx tsc --noEmit  # typecheck; typegen first or a fresh clone fails on `LayoutProps`
npx next build --webpack       # production build check used in the handoff
npm run fetch:clinpgx    # write an ignored CPIC candidate for review (does not update bundled data)
npm run fetch:pgx-definitions  # regenerate allele definitions + CPIC phenotype table
```

Verify every change with `npm test`, `npm run validate:clinical`, typecheck,
`npx eslint .`, and `npx next build --webpack`.
