/**
 * Star allele caller (pipeline stages 3 and 4).
 *
 * Given a ParsedVcf, returns one DiplotypeCall per supported gene: the
 * diplotype (e.g. CYP2C19 *2/*2), CPIC's phenotype for it, and CPIC's activity
 * score where CPIC uses one. Pure and browser-safe: no network, no storage, no
 * logging. Reference data comes only from the two generated files in /data
 * (see scripts/fetch-pgx-definitions.mjs).
 *
 * Safety rules, from .kiro/steering/clinical-safety.md:
 * - Any missing, no-call, or unreadable defining position → Indeterminate.
 *   Missing data is never assumed to be reference.
 * - A copy that matches no named allele → Indeterminate, so an unknown variant
 *   is never reported as normal.
 * - CYP2D6 is never called from a VCF.
 *
 * Spec: .kiro/specs/star-allele-caller/
 */

import bundledDefinitions from "../../data/allele-definitions.json";
import bundledPhenotypes from "../../data/cpic-diplotype-phenotypes.json";
import type {
  AlleleDefinition,
  AlleleDefinitionsFile,
  DiplotypeCall,
  ParsedVcf,
  PhenotypeTableFile,
  VcfVariant,
  VcfWarningCode,
} from "./types";

/** Genes called from the VCF, in output order. */
export const VCF_GENES = [
  "CYP2C19",
  "CYP2C9",
  "VKORC1",
  "CYP4F2",
  "SLCO1B1",
  "ABCG2",
  "TPMT",
  "NUDT15",
] as const;

/** Every gene callStarAlleles returns, in order (CYP2D6 is always last). */
export const CALLED_GENES = [...VCF_GENES, "CYP2D6"] as const;

export const CYP2D6_NOTE = "CYP2D6 cannot be determined from this file.";

/** Parse warnings that make every gene in the file untrustworthy. */
const BLOCKING_WARNINGS: ReadonlySet<VcfWarningCode> = new Set([
  "build_not_grch38",
  "build_unknown",
  "no_samples",
  "multiple_samples",
  "missing_header",
  "missing_fileformat",
  "no_variants",
]);

/** Above this many unphased heterozygous positions, phase is too uncertain to call. */
export const MAX_UNPHASED_HETS = 10;

const IUPAC: Record<string, string[]> = {
  R: ["A", "G"],
  Y: ["C", "T"],
  S: ["C", "G"],
  W: ["A", "T"],
  K: ["G", "T"],
  M: ["A", "C"],
  B: ["C", "G", "T"],
  D: ["A", "G", "T"],
  H: ["A", "C", "T"],
  V: ["A", "C", "G"],
  N: ["A", "C", "G", "T"],
};

/** A named allele ready for matching: the set of accepted letters per position. */
interface PreparedAllele {
  name: string;
  /** Position in the definition's namedAlleles list (used for display order). */
  index: number;
  allowed: ReadonlySet<string>[];
  /** Positions defined with exactly one letter; higher = more specific. */
  score: number;
}

const prepared = new WeakMap<AlleleDefinition, PreparedAllele[]>();

function prepare(def: AlleleDefinition): PreparedAllele[] {
  const cached = prepared.get(def);
  if (cached) return cached;
  const result = def.namedAlleles.map((allele, index) => {
    let score = 0;
    const allowed = allele.alleles.map((letter, i) => {
      // A blank means the reference letter (stricter than PharmCAT; see design.md).
      if (letter === null) return new Set([def.positions[i].ref]);
      if (IUPAC[letter]) return new Set(IUPAC[letter]);
      if (letter.includes(" or ")) return new Set(letter.split(" or "));
      score++;
      return new Set([letter]);
    });
    return { name: allele.name, index, allowed, score };
  });
  prepared.set(def, result);
  return result;
}

function indeterminate(gene: string, note: string): DiplotypeCall {
  return {
    gene,
    diplotype: null,
    phenotype: "Indeterminate",
    activityScore: null,
    source: "vcf",
    ambiguous: false,
    note,
  };
}

const positionLabel = (p: { chrom: string; pos: number; rsid: string | null }) =>
  `${p.chrom}:${p.pos}${p.rsid ? ` (${p.rsid})` : ""}`;

/** A diplotype candidate from one arrangement of the two copies. */
interface Candidate {
  first: PreparedAllele;
  second: PreparedAllele;
  /** Unordered key so A/B and B/A count as the same diplotype. */
  key: string;
  score: number;
  /** min(variants on copy 1, variants on copy 2): higher = more "in trans". */
  split: number;
  /** Set when a copy matched two equally specific alleles. */
  tie: string | null;
}

/** Best-scoring named alleles whose accepted letters cover this copy. */
function matchCopy(copy: string[], alleles: PreparedAllele[]): PreparedAllele[] {
  let best: PreparedAllele[] = [];
  let bestScore = -1;
  for (const allele of alleles) {
    if (!allele.allowed.every((set, i) => set.has(copy[i]))) continue;
    if (allele.score > bestScore) {
      best = [allele];
      bestScore = allele.score;
    } else if (allele.score === bestScore) {
      best.push(allele);
    }
  }
  return best;
}

function callGene(
  def: AlleleDefinition,
  byPosition: Map<string, VcfVariant[]>,
  phenotypes: PhenotypeTableFile,
): DiplotypeCall {
  const { gene, positions } = def;

  // 1. Read the genotype at every defining position, refusing anything unclear.
  const copyA: string[] = [];
  const copyB: string[] = [];
  const phased: boolean[] = [];
  const missing: string[] = [];

  for (const p of positions) {
    const records = byPosition.get(`${p.chrom}:${p.pos}`);
    if (!records) {
      missing.push(positionLabel(p));
      continue;
    }
    if (records.length > 1) {
      return indeterminate(gene, `Position ${positionLabel(p)} appears more than once in this file.`);
    }
    const v = records[0];
    if (v.ref !== p.ref) {
      return indeterminate(
        gene,
        `The file's reference letters at ${positionLabel(p)} don't match the expected reference.`,
      );
    }
    const [a, b] = v.alleles;
    if (a === null || b === null) {
      return indeterminate(gene, `There is no genotype call at ${positionLabel(p)}.`);
    }
    const known = new Set([p.ref, ...p.alts]);
    if (!known.has(a) || !known.has(b)) {
      return indeterminate(gene, `The genotype at ${positionLabel(p)} is not one we have a definition for.`);
    }
    copyA.push(a);
    copyB.push(b);
    phased.push(v.phased);
  }

  if (missing.length > 0) {
    return indeterminate(
      gene,
      missing.length === 1
        ? `Position ${missing[0]} is missing from this file.`
        : `${missing.length} positions needed for ${gene} are missing from this file (first: ${missing[0]}).`,
    );
  }

  // 2. Work out which arrangements of the two copies to consider.
  const hets = positions.flatMap((_, i) => (copyA[i] !== copyB[i] ? [i] : []));
  const allPhased = hets.every((i) => phased[i]);
  const unphasedMulti = !allPhased && hets.length >= 2;

  if (!allPhased && hets.length > MAX_UNPHASED_HETS) {
    return indeterminate(
      gene,
      `This file has too many unphased differences in ${gene} to tell which copy each one is on.`,
    );
  }

  const arrangements: [string[], string[]][] = [];
  if (!unphasedMulti) {
    arrangements.push([copyA, copyB]);
  } else {
    // Keep the first het fixed; try every way of flipping the rest.
    const flips = hets.slice(1);
    for (let mask = 0; mask < 1 << flips.length; mask++) {
      const one = [...copyA];
      const two = [...copyB];
      flips.forEach((i, bit) => {
        if (mask & (1 << bit)) [one[i], two[i]] = [two[i], one[i]];
      });
      arrangements.push([one, two]);
    }
  }

  // 3. Match each copy to a named allele.
  const alleles = prepare(def);
  const candidates: Candidate[] = [];
  for (const [one, two] of arrangements) {
    const m1 = matchCopy(one, alleles);
    const m2 = matchCopy(two, alleles);
    if (m1.length === 0 || m2.length === 0) continue;
    const variantsOn = (copy: string[]) =>
      hets.filter((i) => copy[i] !== positions[i].ref).length;
    const [x, y] = m1[0].index <= m2[0].index ? [m1[0], m2[0]] : [m2[0], m1[0]];
    const tied = [m1, m2].find((m) => m.length > 1);
    candidates.push({
      first: x,
      second: y,
      key: `${x.name}/${y.name}`,
      score: m1[0].score + m2[0].score,
      split: Math.min(variantsOn(one), variantsOn(two)),
      tie: tied ? tied.map((a) => a.name).join(", ") : null,
    });
  }

  if (candidates.length === 0) {
    return indeterminate(
      gene,
      `The genotype in ${gene} doesn't match any known allele combination, so it can't be called safely.`,
    );
  }

  // 4. Prefer trans, then the most specific alleles.
  candidates.sort((p, q) => q.split - p.split || q.score - p.score);
  const top = candidates.filter(
    (c) => c.split === candidates[0].split && c.score === candidates[0].score,
  );
  const topKeys = [...new Set(top.map((c) => c.key))];
  if (topKeys.length > 1) {
    return indeterminate(
      gene,
      `More than one allele combination fits ${gene} equally well (${topKeys.join("; ")}).`,
    );
  }
  const chosen = top[0];
  if (chosen.tie) {
    return indeterminate(
      gene,
      `More than one ${gene} allele fits the same copy equally well (${chosen.tie}).`,
    );
  }

  // 5. Phase ambiguity.
  const allKeys = [...new Set(candidates.map((c) => c.key))];
  const alternatives = allKeys.filter((k) => k !== chosen.key);
  const ambiguous = unphasedMulti && (chosen.split > 0 || alternatives.length > 0);
  const notes: string[] = [];
  if (ambiguous) {
    notes.push(
      chosen.split > 0
        ? "Phase unknown: the variants were assumed to be on different copies (in trans)."
        : "Phase unknown.",
    );
    if (alternatives.length > 0) notes.push(`Other possible result: ${alternatives.join("; ")}.`);
  }

  // 6. CPIC phenotype lookup.
  const table = Object.hasOwn(phenotypes.genes, gene) ? phenotypes.genes[gene] : undefined;
  const forward = `${chosen.first.name}/${chosen.second.name}`;
  const reverse = `${chosen.second.name}/${chosen.first.name}`;
  let diplotype = forward;
  let phenotype: string | null;
  let activityScore: string | null = null;

  if (!table) {
    phenotype = null;
    notes.push(`CPIC does not assign a phenotype for ${gene}; guidelines use the genotype directly.`);
  } else {
    const key = Object.hasOwn(table, forward) ? forward : Object.hasOwn(table, reverse) ? reverse : null;
    if (key) {
      diplotype = key;
      phenotype = table[key].phenotype;
      activityScore = table[key].activityScore;
    } else {
      phenotype = "Indeterminate";
      notes.push(`CPIC has no phenotype for ${forward}.`);
    }
  }

  return {
    gene,
    diplotype,
    phenotype,
    activityScore,
    source: "vcf",
    ambiguous,
    ...(notes.length > 0 ? { note: notes.join(" ") } : {}),
  };
}

/** Call every supported gene from a parsed VCF. Never throws. */
export function callStarAlleles(
  parsed: ParsedVcf,
  definitions: AlleleDefinitionsFile = bundledDefinitions as AlleleDefinitionsFile,
  phenotypes: PhenotypeTableFile = bundledPhenotypes as PhenotypeTableFile,
): DiplotypeCall[] {
  const cyp2d6 = indeterminate("CYP2D6", CYP2D6_NOTE);

  const blocking = parsed.warnings.find((w) => BLOCKING_WARNINGS.has(w.code));
  if (blocking) {
    return [...VCF_GENES.map((gene) => indeterminate(gene, blocking.message)), cyp2d6];
  }

  const byPosition = new Map<string, VcfVariant[]>();
  for (const v of parsed.variants) {
    const key = `${v.chrom}:${v.pos}`;
    const list = byPosition.get(key);
    if (list) list.push(v);
    else byPosition.set(key, [v]);
  }

  const calls = VCF_GENES.map((gene) => {
    const def = definitions.genes.find((d) => d.gene === gene);
    if (!def) return indeterminate(gene, `No allele definitions are available for ${gene}.`);
    try {
      return callGene(def, byPosition, phenotypes);
    } catch {
      // Defensive: a bug in one gene must never take down the others.
      return indeterminate(gene, `${gene} could not be determined from this file.`);
    }
  });

  return [...calls, cyp2d6];
}
