/**
 * Test helper: build VCF text over every defining position in
 * data/allele-definitions.json, so tests never hand-write coordinates.
 */
import definitionsJson from "../../data/allele-definitions.json";
import type { AlleleDefinitionsFile, DefinitionPosition } from "../../lib/pgx/types";

export const definitions = definitionsJson as AlleleDefinitionsFile;

export const keyOf = (p: { chrom: string; pos: number }) => `${p.chrom}:${p.pos}`;

/** Every defining position across all genes, de-duplicated, in file order. */
export const allPositions: DefinitionPosition[] = (() => {
  const seen = new Map<string, DefinitionPosition>();
  for (const gene of definitions.genes) {
    for (const p of gene.positions) if (!seen.has(keyOf(p))) seen.set(keyOf(p), p);
  }
  return [...seen.values()];
})();

export const geneDef = (gene: string) => {
  const def = definitions.genes.find((d) => d.gene === gene);
  if (!def) throw new Error(`no definition for ${gene}`);
  return def;
};

/** Find a gene's position by rsID. */
export const byRsid = (gene: string, rsid: string) => {
  const p = geneDef(gene).positions.find((x) => x.rsid === rsid);
  if (!p) throw new Error(`${gene} has no ${rsid}`);
  return p;
};

export const GRCH38_HEADER = ["##fileformat=VCFv4.2", "##reference=GRCh38"];

export interface BuildOptions {
  /** GT per position key; everything else is 0/0. */
  gt?: Map<string, string>;
  /** Position keys to leave out of the file. */
  drop?: Set<string>;
  /** Replace the REF or ALT written for a position. */
  override?: Map<string, { ref?: string; alt?: string }>;
  /** Write a position twice. */
  duplicate?: Set<string>;
  meta?: string[];
}

export function buildVcf(opts: BuildOptions = {}): string {
  const lines = [
    ...(opts.meta ?? GRCH38_HEADER),
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE",
  ];
  for (const p of allPositions) {
    const key = keyOf(p);
    if (opts.drop?.has(key)) continue;
    const o = opts.override?.get(key);
    const row = [
      p.chrom,
      p.pos,
      p.rsid ?? ".",
      o?.ref ?? p.ref,
      o?.alt ?? p.alts.join(","),
      ".",
      "PASS",
      ".",
      "GT",
      opts.gt?.get(key) ?? "0/0",
    ].join("\t");
    lines.push(row);
    if (opts.duplicate?.has(key)) lines.push(row);
  }
  return lines.join("\n");
}

/**
 * GT strings that put the given letters on copy 1 and copy 2 at a position.
 * IUPAC / "X or Y" entries resolve to their first letter; null = reference.
 */
const IUPAC_FIRST: Record<string, string> = {
  R: "A", Y: "C", S: "C", W: "A", K: "G", M: "A", B: "C", D: "A", H: "A", V: "A", N: "A",
};

export function letterIndex(p: DefinitionPosition, letter: string | null): number {
  const resolved =
    letter === null ? p.ref : IUPAC_FIRST[letter] ?? letter.split(" or ")[0];
  const index = [p.ref, ...p.alts].indexOf(resolved);
  if (index === -1) throw new Error(`letter ${letter} not at ${keyOf(p)}`);
  return index;
}

/** GTs for one gene built from two named alleles (phased "a|b" or unphased "a/b"). */
export function genotypeFor(
  gene: string,
  first: string,
  second: string,
  phased = false,
): Map<string, string> {
  const def = geneDef(gene);
  const a = def.namedAlleles.find((x) => x.name === first);
  const b = def.namedAlleles.find((x) => x.name === second);
  if (!a || !b) throw new Error(`unknown allele ${first} or ${second}`);
  const sep = phased ? "|" : "/";
  const gt = new Map<string, string>();
  def.positions.forEach((p, i) => {
    gt.set(keyOf(p), `${letterIndex(p, a.alleles[i])}${sep}${letterIndex(p, b.alleles[i])}`);
  });
  return gt;
}
