# Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript 5, `strict` mode on
- **Styling:** Tailwind CSS v4 (with `@tailwindcss/turbopack`)
- **Testing:** Vitest 4 + fast-check (property-based testing)
- **Linting:** ESLint 9 with `eslint-config-next`
- **Barcode scanning:** html5-qrcode (NDC lookup)
- **Runtime:** Node.js 20+

## External data sources

All public, no API keys required:

- **ClinPGx (PharmGKB + CPIC)** — gene-drug pairs, guidelines, variant data
- **openFDA** — NDC lookup and drug adverse event reports
- **CMS NPPES** — clinician NPI verification
- **PubMed / PubChem** — citations and compound identifiers

Server-side API routes proxy external calls: `/api/drug` (openFDA) and
`/api/npi` (CMS NPPES). The bundled gene-drug snapshot lives in `/data` and is
refreshed at build time by `scripts/fetch-clinpgx.ts`.

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
npm run fetch:clinpgx    # refresh the bundled gene-drug snapshot (optional)
npm run fetch:pgx-definitions  # regenerate allele definitions + CPIC phenotype table
```
