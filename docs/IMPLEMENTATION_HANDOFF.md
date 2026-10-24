# Implementation handoff for Kiro or another coding assistant

Updated 2026-10-24 after Kai's `88d0257` main commit, the clinical-data merge, and the [status audit](./STATUS_AUDIT_2026-10-24.md) of `4a0580a`.
Read `README.md`, `.kiro/steering/clinical-safety.md`, `.kiro/steering/data-sources.md`, `docs/CURRENT_GAPS.md`, and `docs/STATUS_AUDIT_2026-10-24.md` before changing the pipeline. Branch new work from `main`; `feature/vcf-input` and `feature/star-allele-caller` are already merged and stale.

## Current split (from the audit, non-overlapping)

| Kai (VCF → call evidence) | Edu (guidance, drug identity, clinician UI) |
| --- | --- |
| 1. PS-aware phasing: `lib/pgx/parseVcf.ts`, `lib/pgx/callStarAlleles.ts`, their tests | 1. Consume computed evidence instead of caller-supplied flags: `lib/pgx/sample-assessment.ts`, `assess.ts`, `assess-patient.ts`, `research-recommendation-route.ts` |
| 2. Computed per-gene evidence (FILTER/QUAL/GQ/DP, coverage, build): new `lib/pgx/callEvidence.ts` | 2. NDC/product → ingredient: new `lib/pgx/drug-identity.ts`, fetch script, snapshot, validator |
| 3. Quality and phase-set fixtures in `public/samples/` and `tests/helpers/pgxVcf.ts`; fix the CC0 label in `scripts/fetch-pgx-definitions.mjs` | 3. Clinician screen with real identity controls: `app/physician/`, `app/api/npi/` |

Shared and reviewed into `main`: `lib/pgx/types.ts` (Kai adds `phaseSet` and the evidence type; Edu reviews), README, `.kiro/steering/*`, `KIRO_LOG.md`.

## Working pieces and owners

- Kai's VCF side: `analyzeVcf(text)` returns `{ parsed, calls }`; `callStarAlleles` calls CYP2C19, CYP2C9, VKORC1, CYP4F2, SLCO1B1, ABCG2, TPMT and NUDT15 using generated PharmCAT 3.4.0 definitions and CPIC phenotype data. CYP2D6 stays Indeterminate. Three bundled VCFs have PharmCAT answer keys and tests. Do not hand-edit generated definitions.
- Edu's guidance side: `assess()` and `assessPatient()` cover only CYP2C19 + clopidogrel + ACS/PCI, using source-linked rows marked `humanClinicalReview: false`. The bundled Maya sample reaches this demo via `toMayaSampleAssessment`; uploaded files do not.
- The research catalog joins eight genes to 41 CPIC A/B pairs and 34 ingredients. `/drugs` groups ingredients into nine editorial therapeutic areas and displays 60 current U.S. RxNorm brand mappings. These are display/navigation data, not response predictions.
- `findResearchRecommendationRoute()` returns exact CPIC source-row IDs for clopidogrel, thiopurines and selected statins when required genes, context and evidence are present. It rejects ambiguous calls, uses the call's activity score and has no recommendation text. Warfarin requires a separate clinical algorithm.

## Next implementation order

1. Extend the caller handoff with trustworthy per-gene assay provenance, required-position coverage, genotype quality/FILTER policy, build and phase evidence. A `VCF` source label or `FILTER=PASS` alone cannot make a clinical-quality call. Keep uploaded files outside `assess` until this is validated with more than the three sample fixtures.
2. Add exact drug-product/NDC → ingredient RxNorm normalization, including combination-product handling. Brand-name text is a display alias only.
3. For each new gene–drug–indication route, verify the current CPIC lookup key, population, multi-gene requirements, activity score, and source terms. Keep candidate rows out of patient guidance pending qualified clinical review. Do not turn pair listings or openFDA reports into recommendations.
4. Build a clinician view with real identity controls. NPI lookup alone only checks a public identifier. Keep clinician-only detail separate from allowlisted patient summaries and never output self-directed dose/start/stop instructions.
5. Update README, steering, specs, changelog and this handoff whenever behavior changes. Credit actual Kiro work in `KIRO_LOG.md`; do not label work done with another tool as Kiro.

Verify with `npm test`, `npx next typegen && npx tsc --noEmit` (plain `tsc` fails on a fresh clone with `LayoutProps`), `npx eslint .`, `npx next build --webpack`, and `npm run validate:clinical`. The data refresh scripts write candidate files for review; never silently replace a curated snapshot.
