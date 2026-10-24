# Status audit — 2026-10-24

Read-only audit of `main` at `4a0580a`, run by Edu with Kiro. It checks the claims in README, steering, specs, and docs against the code, data, routes, and tests. Passing tests and a listed CPIC gene–drug pair do **not** establish clinical validity.

## Branch state at audit time

- `main` = `clinical-data` = `origin/main` at `4a0580a` (integrated state).
- `feature/vcf-input` (`745d1e1`) and `feature/star-allele-caller` (`88d0257`) are fully contained in `main`. They are stale; branch new work from `main`.
- `data/candidates/cpic-cyp2c19-clopidogrel.json` was **committed** on `feature/vcf-input` (`52d7f8d`, fetched 2026-10-24T17:08Z, CPIC guideline version 71). On `main` it is **untracked and ignored** (`/data/candidates/`). On `main`, a candidate exists only as a local file after `npm run fetch:clinpgx`. That earlier candidate still validates against the bundled snapshot.

## Check results

| Command | `main` | `feature/vcf-input` |
| --- | --- | --- |
| `npm test` | 12 files, **130 passed** | 2 files, 40 passed |
| `npm run validate:clinical` | pass: 5 demo records, 8 genes / 41 pairs, 134 route rows / 4 guidelines, 34 ingredients / 60 brands | script missing |
| `npx tsc --noEmit` (fresh clone) | **fails**: `app/layout.tsx(21,50) TS2304: Cannot find name 'LayoutProps'` | same failure |
| `npx tsc --noEmit` (after `next build`/`next typegen`) | pass | pass |
| `npx eslint .` | pass, no output | pass |
| `npx next build --webpack` | pass; static routes `/`, `/_not-found`, `/drugs`, `/patient` | pass; `/`, `/_not-found`, `/patient` |

`LayoutProps` is a global type that Next generates in `.next/types/routes.d.ts`. Run `npx next typegen` (or a build) before `tsc` on a fresh clone.

## 1. What works today

**VCF parsing and calling (Kai)**
- `parseVcf` reads CHROM, POS, ID, REF, ALT, FILTER and the first sample's `GT`, and records `|` vs `/`. It warns rather than throws. It does **not** read QUAL, or any FORMAT field other than GT (no PS, GQ, DP, AD).
- `callStarAlleles` calls CYP2C19, CYP2C9, VKORC1, CYP4F2, SLCO1B1, ABCG2, TPMT and NUDT15 from pinned PharmCAT 3.4.0 definitions and the CPIC diplotype table. CYP2D6 is always Indeterminate. Missing positions, no-calls, REF mismatches, duplicates and unmatched copies give Indeterminate. Blocking parse warnings make every gene Indeterminate. An unphased multi-het call is reported in trans with `ambiguous: true`.
- The three bundled VCFs match their PharmCAT answer keys. They have `FORMAT=GT` only, every row is `FILTER=PASS`, and every genotype is unphased. They exercise no quality or phase-set evidence.

**Phenotype → drug research routing (Edu)**
- `assess()` / `assessPatient()` cover one route: CYP2C19 + clopidogrel + ACS/PCI, with 5 phenotype rows. "Likely Intermediate" and "Likely Poor" Metabolizer rows exist in CPIC (IDs 8480386, 8480388) but are not in the snapshot, so they return `insufficient_data`.
- `findResearchRecommendationRoute()` matches 134 exact CPIC row IDs (clopidogrel in 3 populations, thiopurines, statins) and returns IDs and provenance only, never text. Warfarin returns `guideline_algorithm_required`. In the app, only tests call it. Nothing in the app produces its `CallerEvidence`.

**Medication catalog and brand names**
- 41 CPIC A/B pair entries, 34 ingredients, nine editorial areas, and 60 current U.S. RxNorm single-ingredient brand aliases. Exact generic/RxNorm lookup works. A brand lookup is for display only and is never routed to guidance.
- No NDC or product normalizer, no openFDA route, no barcode scanner (`html5-qrcode` is not installed).

**Patient UI**
- `/patient` offers VCF upload, the Maya/Alex/Sam samples, and a parse summary ("Genes determined: N of 9"). It has a JSON/TSV format check and the Maya-only clopidogrel demo text with a CPIC link. `/drugs` is the catalog.
- No three-level result indicator, drug search, openFDA panel, or pharmacist summary card exists yet.

**Clinician UI**
- None. There is no `app/physician`, `app/api`, NPI check, or authentication. The home page shows "Clinician view coming soon".

## 2. Demo vs research-only vs real-patient-safe

- **Synthetic demo:** the Maya → clopidogrel/ACS-PCI text (5 rows, `humanClinicalReview: false`, `reviewStatus: source_checked_demo_only`). The patient wording is project-authored, source-linked paraphrase, not verbatim CPIC text. Also synthetic: `personas.json`, `data/examples/synthetic-pgx-report.v1.json`, and the three sample VCFs.
- **Research-only:** every uploaded-VCF call, the gene–drug catalog, the 134 route rows (`usageTermsReviewPending: true`), therapeutic groups, and brand aliases.
- **Safe with a real patient upload:** local, in-browser parsing and a format/missing-call summary only. Nothing produces a clinical result from a real upload, and nothing should until the gaps below are closed. Browser-only processing is not a privacy-compliance review.

## 3. Disagreements and corrections (applied in this change)

| Where | Conflict | Correction |
| --- | --- | --- |
| `.kiro/steering/clinical-safety.md` | Levels `typical`/`may-differ`/`talk-to-prescriber` vs `AssessmentLevel = "typical" \| "caution" \| "warning"` in `lib/pgx/types.ts` and `product.md` | Use the code identifiers and map them to the README's patient labels |
| `clinical-safety.md` | "Reject non-single-sample / non-GRCh38 VCFs with a clear error" | Currently a warning plus all-Indeterminate calls. Marked as open (`pgx-engine` task 3) |
| `.kiro/specs/star-allele-caller/requirements.md` 5.1 | "Phased (`\|`) → use given phase" ignores PS | Added a requirement: phase is valid only within one phase set |
| `.kiro/steering/structure.md`, `tech.md`, README repo tree | List `app/physician/`, `app/api/` (`/api/drug`, `/api/npi`), `.kiro/hooks`, `.kiro/settings`, `html5-qrcode`, and `scripts/fetch-clinpgx.ts` | Marked as planned; the script is `.mjs` |
| `data/cpic-diplotype-phenotypes.json` `source.license: "CC0 1.0 (CPIC)"` | `data-sources.md` says not to assume CC0 | Flagged for Kai. The file is generated, so fix it in `scripts/fetch-pgx-definitions.mjs` rather than by hand |
| `KIRO_LOG.md` | No entry for the Kiro session that wrote the first clinical-data spec, `clinical-safety.md` and `SOURCE_INVENTORY.md` (committed in `926c409`) | Entry added; this audit is credited to Kiro |
| README / tech.md command lists | Missing `validate:clinical` and the typegen step | Added |

## 4. Highest-priority gaps

1. **Phase sets (PS) are ignored (defect).** A gene phased `|` across *different* PS blocks is treated as fully phased. A probe gave CYP2C19 `*2/*17` → Intermediate Metabolizer with `ambiguous: false` when each het was in its own PS. Under VCF 4.2, phase is defined only within one PS. That call should be ambiguous. When phased and unphased hets mix, the given phase is discarded (conservative).
2. **FILTER/QUAL/GQ/DP are not used by the caller.** A probe set Maya's `*2` position to `FILTER=LowQual`, `GQ=3`, `DP=2`. It still called `*2/*2` Poor Metabolizer, and the upload readiness was `review_required`. Only the Maya demo gate (`toMayaSampleAssessment`) checks FILTER, and it treats `.` as passing. `CallerEvidence.quality` is self-asserted; nothing computes it.
3. **Required-position coverage vs variant-only VCFs.** Missing rows correctly give Indeterminate, so most real variant-only VCFs will be Indeterminate for most genes. There is no gVCF / reference-block support and no per-assay coverage manifest.
4. **Multi-gene guidance.** `assess()` is single-gene. The router requires every lookup-key gene and the activity score, which is correct, but only in research mode. Warfarin needs a separate algorithm. VKORC1/CYP4F2 have `phenotype: null` by design.
5. **Source review status.** 0 of 5 rows are clinically reviewed. ClinPGx usage terms are unconfirmed for redistribution. The CC0 label in the generated phenotype file conflicts with steering.
6. **Product/NDC → ingredient identity.** None exists. Brand → ingredient is display-only. Combination products are excluded. Scanned packages cannot enter guidance.
7. **Fresh-clone `tsc` failure** (see above). CI or a teammate running `tsc` first will see a false failure.

## 5. Next three tasks per person (non-overlapping)

**Kai: VCF → call evidence**
1. PS-aware phasing. Owns `lib/pgx/parseVcf.ts` (read `PS`), `lib/pgx/types.ts` (`VcfVariant.phaseSet`; coordinate the shared type with Edu), `lib/pgx/callStarAlleles.ts`, and `tests/callStarAlleles.test.ts` / `tests/parseVcf.test.ts`. Treat hets in different PS blocks as unphased relative to each other.
2. Per-gene call evidence. Owns a new `lib/pgx/callEvidence.ts` and its tests. Read FILTER, QUAL, GQ and DP into a computed per-gene evidence object (build, required-position coverage, failing positions, policy version), replacing the hand-made `CallerEvidence`. The thresholds need a documented, sourced policy; leave them unset rather than inventing numbers.
3. Quality fixtures. Owns `public/samples/` (new files only) and `tests/helpers/pgxVcf.ts`. Add synthetic VCFs with FORMAT `GT:GQ:DP:PS`, non-PASS rows, and multiple PS blocks. Also fix the license label in `scripts/fetch-pgx-definitions.mjs`.

**Edu: guidance, drug identity, clinician UI**
1. Consume evidence, don't trust flags. Owns `lib/pgx/sample-assessment.ts`, `lib/pgx/assess.ts`, `lib/pgx/assess-patient.ts`, `lib/pgx/research-recommendation-route.ts` and their tests. Require Kai's computed evidence instead of a caller-supplied `callStatus` / `CallerEvidence`.
2. Product/NDC → ingredient normalization. Owns a new `lib/pgx/drug-identity.ts`, `scripts/fetch-ndc-ingredients.mjs`, `data/` snapshot, and tests. Exact NDC → RxNorm ingredient(s), with combination products rejected or split explicitly. No guidance from brand text.
3. Clinician detail screen. Owns `app/physician/` and `app/api/npi/`. Use real identity controls before showing CPIC wording. An NPI lookup alone is a demo check only.

**Shared, review into `main`:** `lib/pgx/types.ts`, README, `.kiro/steering/*`, `KIRO_LOG.md`.
