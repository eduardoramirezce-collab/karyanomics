# Implementation Plan: Portal Frontend

## Overview

Build the pure helper `lib/pgx/drugResult.ts` and its tests first, then the session and VCF loader, then the pages (layout, home, order, login, portal), then retire `/patient`. Finish with `npm test`, `npm run build`, a KIRO_LOG line, and a pushed feature branch. TypeScript throughout, Tailwind v4, no new dependencies, relative imports inside `lib/pgx` and from `tests/`. `lib/pgx/parseVcf.ts`, `lib/pgx/callStarAlleles.ts`, and everything under `data/` stay unchanged. Follow `.kiro/steering/clinical-safety.md` for every patient-facing string.

## Tasks

- [x] 1. Gene rules and constants in the pure helper
  - [x] 1.1 Create `lib/pgx/drugResult.ts` with types, constants, and gene-level rules
    - Top-of-file JSDoc; imports only the `lib/pgx` modules and `data/` JSON listed in the design; no fetch, storage, DOM, or console
    - Export `DisplayStatus`, `SteeringLevel`, `Role`, `ResultSource`, the result/GeneCard/RouteRow types from the Data Models section, `DISPLAY_STATUSES`, `STATUS_LEVEL`, `VCF_GENES`, `GENE_DESCRIPTIONS` (draft table), `GENERIC_PRESCRIBER_LINE`, `TYPICAL_LIMIT_LINE`, `ROUTE_NOTES` (Req 14.6 verbatim)
    - Implement `isIndeterminateCall`, `geneStatus`, patient phenotype text rules, `untestedGuidelineGenes`, `relevantGenes`, `unreadGeneLine`, `buildGeneCards` (clinician fields only for clinician role)
    - Add a pure `*38` token helper that labels only a CYP2C19 allele token exactly equal to `*38` as "*38 (standard)"
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8, 11.1, 11.2, 11.3, 11.4, 11.6, 12.7, 12.9, 12.10, 12.11, 12.12, 14.6, 15.7_

  - [x]* 1.2 Write unit tests for gene rules in `tests/drugResult.test.ts`
    - `geneStatus` one case per branch; `ROUTE_NOTES` table equality; `unreadGeneLine` one/two/many formatting; `buildGeneCards` nine cards in Caller_Output order, VKORC1 null-phenotype text, CYP2D6 line, no clinician fields for patient role; `*38` helper rejects `*138` and non-CYP2C19 genes
    - _Requirements: 9.1, 9.3, 9.4, 9.8, 12.9, 12.10, 12.11, 12.12, 14.6_

- [x] 2. Drug results and helper tests
  - [x] 2.1 Implement `buildDrugResult` in `lib/pgx/drugResult.ts`
    - Relevant_Genes, Undetermined detection, route populations from `data/cpic-recommendation-routes.v1.json` (`[null]` when none), one `findResearchRecommendationRoute` call per population, Caller_Evidence only for a sample whose `toMayaSampleAssessment(...).callStatus` is `complete`
    - Status precedence 1–4 from the design; `level = STATUS_LEVEL[status]`; `typicalLimitLine` only for "Typical"
    - Clopidogrel guidance via `assessPatient` only for a complete sample call with `matched` result; every other path uses `GENERIC_PRESCRIBER_LINE`
    - Return the patient shape (no diplotype, activity score, ambiguous, classification, recommendation ID, guideline version, route rows) or the clinician shape with `routeRows`; never throw
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8, 12.13, 12.14, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 14.1, 14.2, 14.3, 14.4, 14.5, 14.7, 14.8, 15.1, 21.2_

  - [x] 2.2 Write required example tests in `tests/drugResult.test.ts` using the three sample VCFs
    - Read `public/samples/{maya,alex,sam}.vcf` with `readFileSync` and run `analyzeVcf`
    - Maya + clopidogrel (patient, sample): "Your genes may change how this works", guidance line equals the Poor Metabolizer `patientText` in `data/patient-guidance.v1.json`, condition label and review note present
    - Sam + simvastatin: "Your genes may change how this works" with SLCO1B1 phenotype text "Decreased Function"
    - Alex + simvastatin: "Typical" with `typicalLimitLine`
    - Each sample + warfarin: "Needs a clinician-run calculation"
    - Each sample + amitriptyline: "Can't tell from this file" with the CYP2D6 Unread_Gene_Line; sertraline names "CYP2D6, CYP2B6, SLC6A4, and HTR2A"; phenytoin names "HLA-B"
    - Maya VCF as upload + clopidogrel: `GENERIC_PRESCRIBER_LINE`; `STATUS_LEVEL` table equality
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.4a, 22.4b, 22.5, 22.6, 22.10_

  - [x]* 2.3 Write clinician route-row unit tests in `tests/drugResult.test.ts`
    - Maya clinician clopidogrel: three source rows (CVI ACS PCI, CVI non-ACS non-PCI, NVI) in data order with "Clinical review not complete"; same text as upload yields `unverified_gene_call` notes; warfarin yields one note row with `population: null`
    - _Requirements: 14.2, 14.3, 14.4, 14.5, 14.7, 14.8_

  - [x] 2.4 Write property test in `tests/drugResult.property.test.ts`
    - **Property 1: Every drug gets exactly one of four statuses, without throwing**
    - Set up shared arbitraries: sample analyses, both roles, sample/upload sources, every drug in every Therapeutic_Group, sample calls with random edits, and generated `DiplotypeCall[]`
    - `fc.assert(fc.property(...), { numRuns: 100 })` with tag comment `// Feature: portal-frontend, Property 1: ...`
    - **Validates: Requirements 12.1, 12.14, 22.7**

  - [x] 2.5 Write property test in `tests/drugResult.property.test.ts`
    - **Property 3: Patient output is free of clinician detail and dosing words**
    - Recursive string walk over patient-role results for every Sample_Patient and drug; assert none of the clinician keys and no case-insensitive "stop", "dose", "mg", or CPIC_Classification value from `data/cpic-recommendation-routes.v1.json`
    - **Validates: Requirements 15.1, 15.3, 15.4, 22.8**

  - [x]* 2.6 Write property test in `tests/drugResult.property.test.ts`
    - **Property 2: Steering level always matches the status**
    - **Validates: Requirements 12.7, 12.8, 22.6**

  - [ ]* 2.7 Write property test in `tests/drugResult.property.test.ts`
    - **Property 4: Determinism**
    - **Validates: Requirements 12.13, 11.1**

  - [ ]* 2.8 Write property test in `tests/drugResult.property.test.ts`
    - **Property 5: An undetermined relevant gene forces "Can't tell from this file"**
    - **Validates: Requirements 11.4, 11.5, 12.3, 12.6, 22.9**

  - [x]* 2.9 Write property test in `tests/drugResult.property.test.ts`
    - **Property 6: Uploads never receive assessPatient text**
    - **Validates: Requirements 13.6, 13.7, 22.5**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Session and VCF loader
  - [x] 4.1 Create `app/_portal/samples.ts`, `app/_portal/session-record.ts`, and `app/_portal/load-vcf.ts`
    - Move `SAMPLE_PATIENTS` and `SampleId` into `samples.ts`; make `app/patient/VcfUpload.tsx` import from it so the build stays green until task 8
    - `session-record.ts`: `KEY = "karyanomics.session.v1"`, pure `parseSessionRecord` rejecting every invalid case, normalizing patient npi to `null`
    - `load-vcf.ts`: `loadSample` (GET `/samples/{id}.vcf`), `loadUpload` (30 MB limit, `File.text()`), `checkParsed` using the parser's own build and sample-count warnings; return `{ ok: false, message }` with the fixed messages, never throw, no console
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 7.4, 7.6, 8.5, 8.6, 16.1, 16.2, 16.3, 16.7, 21.1_

  - [x] 4.2 Create `app/_portal/session.tsx` with `SessionProvider` and `useSession()`
    - `start`, `restoreFromRecord`, `signOut`, `RestoreState`; sample sessions write only `{ role, npi, sampleId }` to `sessionStorage`, uploads remove the record; wrap storage access in `try/catch`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 16.5, 16.6_

  - [x]* 4.3 Write unit tests in `tests/portal-session.test.ts`
    - `parseSessionRecord` invalid and valid cases; `checkParsed` GRCh37 and two-sample headers; `loadUpload` size and read-failure messages; `loadSample` with a mocked failing `fetch`
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 7.6_

- [x] 5. Layout, shared UI, and public pages
  - [x] 5.1 Update `app/layout.tsx` and `app/globals.css`; create `SiteFooter.tsx`, `StatusChip.tsx`, `Diplotype.tsx` in `app/_portal/`
    - Remove the dark-mode override; wrap children in `SessionProvider`; footer with demo disclaimer, ClinPGx/CPIC credit linking `catalog.source.usageTermsUrl`, and the NLM sentence
    - `StatusChip`: inline SVG icon (`aria-hidden="true"`) plus visible words, tokens from the design; `Diplotype`: uses the `*38` helper with a focus/hover tooltip via `aria-describedby`
    - _Requirements: 9.7, 9.8, 15.8, 15.9, 18.2, 18.3, 18.5, 19.2, 19.4, 20.1, 20.2, 20.3, 20.4_

  - [x] 5.2 Replace `app/page.tsx` with the home page
    - h1, tagline, two cards (`grid sm:grid-cols-2`), "How it works" strip, "Clinician sign in" link to `/login?role=clinician`; no "Clinician view coming soon"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 18.1, 18.4_

  - [x] 5.3 Create `app/order/page.tsx` and `app/order/OrderForm.tsx`
    - Gene list from `VCF_GENES` + `GENE_DESCRIPTIONS`, non-empty group labels, three steps; labelled fields, `preventDefault()`, `aria-live="polite"` thanks message, no fetch or storage
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 16.2, 16.6, 18.4, 19.3_

- [x] 6. Login page
  - [x] 6.1 Create `app/_portal/PatientPicker.tsx`
    - Three account cards, `.vcf` file input labelled "Or upload your own VCF", sample disclaimer, disabled controls while loading, loading text in `aria-live="polite"`, errors in `role="alert"`
    - _Requirements: 4.1, 4.2, 6.3, 6.8, 6.9, 19.1, 19.3_

  - [x] 6.2 Create `app/login/page.tsx` and `app/login/LoginTabs.tsx`
    - h1 + `<Suspense><LoginTabs/></Suspense>`; tablist with roving tabindex and Left/Right keys; initial tab from `role=clinician`
    - Clinician NPI_Gate with label, "Sign in", "Judge demo access", blank-NPI error via `aria-describedby`, demo-only notice, `// TODO:` for check-digit and CMS NPPES lookup; picker under "Choose a patient"
    - `start(role, npi, loaded)` creates the Session and pushes `/portal`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 18.4, 19.1, 19.3_

- [x] 7. Portal page
  - [x] 7.1 Create `SessionBanner.tsx`, `GeneSection.tsx`, `DrugResultCard.tsx`, `MedicationSection.tsx` in `app/_portal/`
    - Banner text per role, upload notice, "Sign out" (calls `signOut` then `router.push("/")`)
    - Gene cards from `buildGeneCards`; clinician-only diplotype, activity score, phase assumed, and note
    - Category_Select of non-empty groups (first selected), Search button, `searchedGroupId` reset on change, `aria-live="polite"` results with the count line, cards from `buildDrugResult` in `useMemo`
    - Drug card renders only helper output: generic and brand names (or "No current U.S. brand name listed"), genes, chip, Unread_Gene_Line, guidance line, condition label, review note, Typical_Limit_Line, "CPIC guideline" link; clinician route rows labelled as research source rows for clinician review
    - _Requirements: 8.2, 8.3, 8.4, 8.7, 9.1, 9.2, 9.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 13.1, 13.2, 13.4, 13.5, 13.8, 13.9, 14.1, 14.4, 14.5, 14.9, 15.2, 15.5, 15.6_

  - [x] 7.2 Create `app/portal/page.tsx`
    - Render when a session exists; otherwise `restoreFromRecord()` with a loading message, redirect to `/login` on `none`, "We couldn't reload your sample results." with a `/login` link on `failed`; "Browse all medications" link to `/drugs`
    - _Requirements: 7.5, 7.7, 8.1, 8.8, 17.3, 18.1, 18.4_

- [x] 8. Route clean-up
  - [x] 8.1 Replace `app/patient/page.tsx` with `redirect("/login")` and delete `app/patient/VcfUpload.tsx`
    - Confirm no remaining imports of `VcfUpload`; leave `app/drugs/page.tsx` unchanged
    - _Requirements: 17.1, 17.2_

- [x] 9. Final verification, log, and branch push
  - [x] 9.1 Run `npm test` and `npm run build` and fix any failures
    - Confirm `lib/pgx/parseVcf.ts`, `lib/pgx/callStarAlleles.ts`, and `data/` are unchanged; confirm `package.json` has no new dependencies and the feature has no `console` calls
    - _Requirements: 21.3, 21.4, 22.10, 22.11_

  - [x] 9.2 Append one line to `KIRO_LOG.md`
    - Include the current time, "Spec mode: portal-frontend", what was built (drugResult helper and tests, session/loader, home, order, login, portal pages, `/patient` redirect), and that it was built in Kiro
    - _Requirements: 22.11_

  - [x] 9.3 Commit on branch `feature/portal-frontend` and push
    - Create or switch to `feature/portal-frontend`, stage the feature files by name (including `.kiro/specs/portal-frontend/` and `KIRO_LOG.md`), commit, then run `git push -u origin feature/portal-frontend`
    - Do not merge into or push to `main`
    - _Requirements: 22.11_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; 2.2, 2.4, and 2.5 are required.
- Every patient-facing string follows `.kiro/steering/clinical-safety.md`: no take/stop/skip/switch/dose instructions, no dose numbers, icon plus words for every status.
- Property tests run at least 100 iterations each and carry the `// Feature: portal-frontend, Property N: ...` tag.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "4.2"] },
    { "id": 2, "tasks": ["2.2", "2.4", "5.1", "6.1"] },
    { "id": 3, "tasks": ["2.3", "2.5", "5.2", "5.3", "6.2", "7.1"] },
    { "id": 4, "tasks": ["2.6", "4.3", "7.2", "8.1"] },
    { "id": 5, "tasks": ["2.7"] },
    { "id": 6, "tasks": ["2.8"] },
    { "id": 7, "tasks": ["2.9"] },
    { "id": 8, "tasks": ["9.1"] },
    { "id": 9, "tasks": ["9.2"] },
    { "id": 10, "tasks": ["9.3"] }
  ]
}
```
