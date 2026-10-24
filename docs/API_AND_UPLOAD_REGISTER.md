# Data/API register and upload contract

Updated 2026-10-24. This document distinguishes **implemented** access from proposed integrations. The application makes **no network request with a patient's uploaded file**. Keep the source inventory and this register updated with each source change.

| Source/API | Current status | Data used | Where | Role and limits |
| --- | --- | --- | --- | --- |
| CPIC API (`api.cpicpgx.org/v1`) | Implemented, build-time script only | Guideline, pair, recommendation_view | `scripts/fetch-clinpgx.mjs` → ignored `data/candidates/` | Source rows for reviewed, versioned PGx snapshot; candidate never auto-publishes. 600 ms spacing. |
| ClinPGx data usage policy | Linked and review pending | Terms | Snapshot and inventory | Confirm redistribution terms before public release; do not assume a blanket license. |
| PharmCAT | Research workflow documented, **not integrated** | VCF-to-allele/phenotype calling | External validated pipeline needed | GRCh38 and all required positions, including reference/no-call; browser VCF intake does not call alleles. |
| 23andMe-style raw data | Local parser implemented | rsID/chromosome/position/genotype coverage counts | `lib/pgx/upload.ts` | Preview only; no clinical phenotype inference. |
| RxNorm/RxNav | Planned | Ingredient and RxCUI normalization | No code yet | Required before a scanned/entered product can be joined to a CPIC drug. |
| openFDA NDC/event | Planned | Product lookup / separate adverse-event context | No code yet | Never backs a PGx recommendation or a causal claim. |
| CMS NPPES | Planned | Public NPI lookup | No code yet | Not clinical evidence and not real clinician authentication. |
| PubMed | Citation links only | Guideline PMID | Snapshot | Not queried at runtime. |
| PharmVar | Research source documented, **not integrated** | Allele definitions | No code yet | Needed for a validated allele-calling pipeline; not prescribing advice. |
| FDA PGx table/labeling | Research cross-check, **not integrated** | Label context | No code yet | Does not replace a matching CPIC guideline. |

## Browser upload path

`file input → size/type check → local text parser → format and no-call category → verification gate → (future: validated phenotype) → CPIC lookup`.

The parser currently accepts:

- `karyanomics-pgx-v1` JSON with `format`, `geneResults[]` (`gene`, `diplotype`, `phenotype`, `callStatus`), plus recommended `labName`, `reportDate`, `assayMethod`, `coveredVariants`. See [`data/examples/synthetic-pgx-report.v1.json`](../data/examples/synthetic-pgx-report.v1.json). Parsed values remain **unverified** regardless of a self-declared `complete` status; they are not fed to `assess()` automatically.
- Uncompressed VCF 4.x: structural preflight, GRCh38 header check, row/no-call counts. No allele/phenotype call. A full pipeline must validate sample, build, coverage, reference bases, quality, and PharmCAT-required positions. CYP2D6/HLA need outside calls.
- Four-column consumer raw TXT/TSV (`rsid`, chromosome, position, genotype): structural preflight and no-call counts only. Genome build, strand and assay coverage are not established.

PDFs, compressed files, arbitrary JSON, and multi-sample VCF interpretation are not supported. All files are read in the browser; the intake code has no `fetch`, API route, local storage, or logging. The page shows only category and counts for uploads, not clinician details.

## Category meanings

- `review_required`: structured report parsed, but authenticity, coverage and lab interpretation must be checked.
- `missing_calls`: structured report contains an incomplete/uncertain result; no guidance.
- `needs_external_caller`: VCF or raw SNP data needs a validated allele/phenotype workflow.
- `invalid`: file cannot be safely recognized.

Only the fictional Maya case uses the source-backed `assess()` lookup today. It is labeled as synthetic and its wording still awaits clinical review. The UI does not expose the full CPIC recommendation or doses to a patient.

## Refresh and review

1. Run `npm run fetch:clinpgx` to create a candidate snapshot from the official CPIC API.
2. Run `npm run validate:clinical` and compare source IDs, version, phenotype, indication, strength and terms to the curated snapshot.
3. Have a qualified reviewer approve text and indication mapping before changing `humanClinicalReview` or adding new rows.
4. Record endpoint, retrieval date, guideline/version, source IDs, review outcome, and commit in this register / change log. Do not scrape rendered pages when an official API or bulk download exists.

Official references: [CPIC API](https://api.cpicpgx.org/), [ClinPGx API/limits](https://api.clinpgx.org/), [ClinPGx data usage policy](https://www.clinpgx.org/page/dataUsagePolicy), [PharmCAT VCF requirements](https://pharmcat.clinpgx.org/using/VCF-Requirements/), [PharmCAT inputs/outside calls](https://pharmcat.clinpgx.org/using/), [23andMe raw-data limits](https://customercare.23andme.com/hc/en-us/articles/115004310067-Navigating-Your-Raw-Data).
