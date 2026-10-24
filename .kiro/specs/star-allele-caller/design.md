# Design — Star allele caller

## Data

`scripts/fetch-pgx-definitions.mjs` (build time only) writes:

- `data/allele-definitions.json`: per gene, the defining `positions`
  (`chrom`, `pos`, `rsid`, `ref`, `alts`) and `namedAlleles` (`name`,
  `reference`, `alleles[]` with one VCF-style letter or `null` per position).
  Trimmed from PharmCAT `v3.4.0` `<GENE>_translation.json`.
- `data/cpic-diplotype-phenotypes.json`: `{ gene: { "A/B": { phenotype,
  activityScore } } }` from CPIC `/v1/diplotype` (`generesult`,
  `totalactivityscore`; `"n/a"` becomes `null`). VKORC1 and CYP4F2 have no rows.

## Algorithm (`callStarAlleles(parsed, defs?, phenotypes?)`)

1. **Gate.** Blocking parse warnings → all genes Indeterminate.
2. **Index** variants by `chrom:pos`. Duplicate positions are remembered.
3. **Per gene, read observations** at each defining position. Missing, duplicate,
   no-call, REF mismatch, or unknown letter → Indeterminate with a note.
4. **Allowed letters.** For each named allele and position: `null` → `{ref}`;
   IUPAC → its bases; `"X or Y"` → `{X, Y}`; else `{letter}`.
   Score = positions defined with exactly one letter.
5. **Arrangements.** Phased (every het position `|`) or ≤ 1 het → the observed
   orientation only. Otherwise every split of the k het positions (2^(k-1),
   k ≤ 10).
6. **Match** each copy to the named alleles whose allowed letters contain the
   copy's letter at every position; keep the top-scoring allele, and record a tie
   if two different names share the top score.
7. **Choose.** Among arrangements where both copies matched: prefer the largest
   `min(variants on copy 1, variants on copy 2)` (trans), then the highest total
   score. Different diplotypes still tied → Indeterminate.
8. **Ambiguity.** Unphased, k ≥ 2, and (variants on both copies, or another
   arrangement matched) → `ambiguous: true`, alternatives listed in the note.
9. **Phenotype.** Look up `A/B`, then `B/A`; use CPIC's key as the diplotype
   label. Not found → `Indeterminate` phenotype. Gene with no table → `null`.
   Not found and no table → label in definition order.
10. **CYP2D6** is appended as Indeterminate.

### Why blank means reference

PharmCAT treats a blank as "not specified" and ranks alleles by score. We treat
it as the reference letter. This is stricter: a copy carrying any variant that
its allele does not define matches nothing, so the gene becomes Indeterminate
instead of being called as a lower-scoring allele. That is the safe failure for
this app. It reproduces PharmCAT's calls on the three sample files.

## Types (`lib/pgx/types.ts`)

- `DefinitionPosition`, `NamedAlleleDefinition`, `AlleleDefinition`
  (per gene), `AlleleDefinitionsFile`.
- `PhenotypeEntry`, `PhenotypeTableFile`.
- `DiplotypeCall` gains `phenotype: string | null`, `activityScore`,
  `ambiguous`.

## Limits

- Phase sets (`PS`) are ignored; a gene is phased only if every het position is.
- PharmCAT's partial and combination alleles are not reproduced; those cases are
  Indeterminate.
- Most clinical VCFs list only variant sites. Those files make genes Indeterminate
  (missing positions) until a preprocessing step adds reference calls.
