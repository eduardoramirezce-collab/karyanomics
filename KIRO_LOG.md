# Kiro and development log

Record actual Kiro activity with its prompt/task, files changed, checks, and commit. Do not credit Kiro for work performed in another tool.

## 2026-10-24 — Kiro VCF direction (Kai/main)

- Kai used Kiro Vibe mode to update the README, shared types, steering, and PGx engine spec for the VCF pipeline (main commit `fba15a7`).
- Allele coordinates remain TODO placeholders; the parser/caller and PharmCAT answer-key samples are not implemented in this commit.

## 2026-10-24 — Clinical data direction (Edu/clinical-data)

- Merged main's VCF direction into `clinical-data` and kept the phenotype → drug/indication guidance boundary.
- The CPIC snapshot, patient-safe snapshot, browser intake, API register, and tests were implemented with Codex, not Kiro.
- Earlier Kiro steering was reconciled with the source usage policy and client-only genetic data rules.
