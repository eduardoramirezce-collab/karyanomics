# Kiro and development log

Record actual Kiro activity with its prompt/task, files changed, checks, and commit. Do not credit Kiro for work performed in another tool.

## 2026-10-24 — Kiro VCF direction (Kai/main)

- Kai used Kiro Vibe mode to update the README, shared types, steering, and PGx engine spec for the VCF pipeline (main commit `fba15a7`).
- Allele coordinates remain TODO placeholders; the parser/caller and PharmCAT answer-key samples are not implemented in this commit.

## 2026-10-24 — Clinical data direction (Edu/clinical-data)

- Merged main's VCF direction into `clinical-data` and kept the phenotype → drug/indication guidance boundary.
- The CPIC snapshot, patient-safe snapshot, browser intake, API register, and tests were implemented with Codex, not Kiro.
- Earlier Kiro steering was reconciled with the source usage policy and client-only genetic data rules.

## 2026-10-24 — Clinical guidance increment (Edu/clinical-data)

- Codex merged the main VCF contract, extended five source-linked CYP2C19/clopidogrel ACS/PCI rows, and aligned patient-safe output and tests. This was not a Kiro coding session.
- Kai's VCF parser and reference fixtures were subsequently pushed on `feature/vcf-input`; his allele/phenotype caller remains open.

## 2026-10-24 — VCF input increment (Kai/feature/vcf-input)

- Kai recorded using Kiro Vibe mode to build `lib/pgx/parseVcf.ts`, `app/patient/VcfUpload.tsx`, three sample VCFs and PharmCAT 3.4.0 answer keys, plus EARS requirements and parser tests. See commit `bfdd24f`.

## 2026-10-24 — Branch integration (Edu/clinical-data)

- Codex merged Kai's VCF input branch with the clinical guidance branch, reused his parser for VCF inspection, and retained the verification boundary before `assess`. The caller and end-to-end VCF-to-guidance path are still pending. This integration was not a Kiro session.
- Codex added a fixture-only PharmCAT report → CPIC guidance handoff test; it uses Kai's reference outputs and does not implement or claim VCF allele calling.
- Codex later built the eight-target-gene PharmCAT/CPIC research catalog and exact pair-candidate lookup. This was not a Kiro session; the catalog is not clinical guidance.
- Codex researched CPIC's exact recommendation lookup keys and added a research-only source-row router for clopidogrel, thiopurines and statins, while flagging warfarin's separate algorithm. This was not a Kiro session; no new patient guidance was published.
- Codex added the nine-area medication research taxonomy, exact-RxNorm grouping, `/drugs` browse page, tests and source/gap documentation. This was not a Kiro session; Kiro steering and tasks were updated so both teammates' AI tools see the same boundaries.
- Codex added the NLM Prescribable RxNorm generic/brand display-name snapshot, candidate refresh/validation, lookup, UI, tests and documentation. This was not a Kiro session; the shared steering and spec record the brand-name/clinical-identity boundary.
