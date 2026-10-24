import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseVcf } from "../lib/pgx/parseVcf";
import {
  CALLED_GENES,
  CYP2D6_NOTE,
  VCF_GENES,
  callStarAlleles,
} from "../lib/pgx/callStarAlleles";
import type { DiplotypeCall } from "../lib/pgx/types";
import {
  allPositions,
  buildVcf,
  byRsid,
  definitions,
  geneDef,
  genotypeFor,
  keyOf,
} from "./helpers/pgxVcf";

const call = (text: string) => callStarAlleles(parseVcf(text));
const gene = (calls: DiplotypeCall[], name: string) => {
  const c = calls.find((x) => x.gene === name);
  if (!c) throw new Error(`no result for ${name}`);
  return c;
};
const expectIndeterminate = (c: DiplotypeCall) => {
  expect(c.diplotype).toBeNull();
  expect(c.phenotype).toBe("Indeterminate");
  expect(c.note).toBeTruthy();
};

// ---------------------------------------------------------------------------
// Answer key: PharmCAT's own phenotype output for each sample patient
// ---------------------------------------------------------------------------

interface PharmcatDiplotype {
  label: string;
  phenotypes: string[];
  activityScore: string | null;
}

describe("answer key: matches PharmCAT 3.4.0 phenotype output", () => {
  it.each(["maya", "alex", "sam"])("%s", (id) => {
    const vcf = readFileSync(join(process.cwd(), "public/samples", `${id}.vcf`), "utf8");
    const pharmcat = JSON.parse(
      readFileSync(join(process.cwd(), "data/samples", `${id}.phenotype.json`), "utf8"),
    ) as { geneReports: Record<string, { recommendationDiplotypes: PharmcatDiplotype[] }> };

    const calls = call(vcf);
    for (const g of VCF_GENES) {
      const expected = pharmcat.geneReports[g].recommendationDiplotypes;
      expect(expected, `${id} ${g}`).toHaveLength(1);
      expect(gene(calls, g), `${id} ${g}`).toMatchObject({
        diplotype: expected[0].label,
        phenotype: expected[0].phenotypes[0] ?? null,
        activityScore: expected[0].activityScore,
        ambiguous: false,
      });
    }
  });

  it("Maya (PharmCAT Example 2) is CYP2C19 *2/*2, Poor Metabolizer", () => {
    const vcf = readFileSync(join(process.cwd(), "public/samples/maya.vcf"), "utf8");
    expect(gene(call(vcf), "CYP2C19")).toMatchObject({
      diplotype: "*2/*2",
      phenotype: "Poor Metabolizer",
    });
  });
});

// ---------------------------------------------------------------------------
// Structure, gating, CYP2D6
// ---------------------------------------------------------------------------

describe("callStarAlleles: structure", () => {
  it("returns one result per gene in a fixed order", () => {
    expect(call(buildVcf()).map((c) => c.gene)).toEqual([...CALLED_GENES]);
  });

  it("always returns CYP2D6 as Indeterminate with the fixed note", () => {
    const c = gene(call(buildVcf()), "CYP2D6");
    expectIndeterminate(c);
    expect(c.note).toBe(CYP2D6_NOTE);
  });

  it("all-reference file calls every VCF gene as its reference allele", () => {
    const calls = call(buildVcf());
    for (const g of VCF_GENES) {
      const ref = geneDef(g).namedAlleles.find((a) => a.reference)!.name;
      expect(gene(calls, g).diplotype).toBe(`${ref}/${ref}`);
    }
  });

  it.each([
    ["GRCh37", ["##fileformat=VCFv4.2", "##reference=GRCh37"]],
    ["unknown", ["##fileformat=VCFv4.2"]],
  ])("gates every gene when the build is %s", (_, meta) => {
    const calls = call(buildVcf({ meta }));
    expect(calls).toHaveLength(CALLED_GENES.length);
    calls.forEach(expectIndeterminate);
  });

  it("gives VKORC1 and CYP4F2 a null (not applicable) phenotype", () => {
    const calls = call(buildVcf());
    for (const g of ["VKORC1", "CYP4F2"]) {
      expect(gene(calls, g).diplotype).not.toBeNull();
      expect(gene(calls, g).phenotype).toBeNull();
      expect(gene(calls, g).note).toMatch(/genotype directly/);
    }
  });
});

// ---------------------------------------------------------------------------
// Never assume reference
// ---------------------------------------------------------------------------

describe("callStarAlleles: unreadable positions make the gene Indeterminate", () => {
  const p = byRsid("CYP2C19", "rs4244285");

  it("missing position", () => {
    const calls = call(buildVcf({ drop: new Set([keyOf(p)]) }));
    expectIndeterminate(gene(calls, "CYP2C19"));
    expect(gene(calls, "CYP2C19").note).toMatch(/missing/);
    // Other genes are unaffected.
    expect(gene(calls, "CYP2C9").diplotype).toBe("*1/*1");
  });

  it.each(["./.", "0/.", "."])("no-call %s", (gt) => {
    expectIndeterminate(gene(call(buildVcf({ gt: new Map([[keyOf(p), gt]]) })), "CYP2C19"));
  });

  it("REF that differs from the definition", () => {
    const other = ["A", "C", "G", "T"].find((b) => b !== p.ref)!;
    const calls = call(buildVcf({ override: new Map([[keyOf(p), { ref: other }]]) }));
    expectIndeterminate(gene(calls, "CYP2C19"));
  });

  it("duplicate record", () => {
    expectIndeterminate(gene(call(buildVcf({ duplicate: new Set([keyOf(p)]) })), "CYP2C19"));
  });

  it("a letter the definition doesn't know", () => {
    const unknown = ["A", "C", "G", "T"].find((b) => b !== p.ref && !p.alts.includes(b))!;
    const calls = call(
      buildVcf({
        override: new Map([[keyOf(p), { alt: unknown }]]),
        gt: new Map([[keyOf(p), "0/1"]]),
      }),
    );
    expectIndeterminate(gene(calls, "CYP2C19"));
  });

  it("a variant no named allele explains is not called normal", () => {
    // rs12769205 alone is part of *2 but not a complete allele on its own.
    const lone = byRsid("CYP2C19", "rs12769205");
    const calls = call(buildVcf({ gt: new Map([[keyOf(lone), "0/1"]]) }));
    expectIndeterminate(gene(calls, "CYP2C19"));
  });
});

// ---------------------------------------------------------------------------
// Matching and phase
// ---------------------------------------------------------------------------

describe("callStarAlleles: matching", () => {
  it("homozygous: *2/*2", () => {
    const calls = call(buildVcf({ gt: genotypeFor("CYP2C19", "*2", "*2") }));
    expect(gene(calls, "CYP2C19")).toMatchObject({
      diplotype: "*2/*2",
      phenotype: "Poor Metabolizer",
      ambiguous: false,
    });
  });

  it("heterozygous: CYP2C9 *1/*3 with CPIC activity score", () => {
    const calls = call(buildVcf({ gt: genotypeFor("CYP2C9", "*1", "*3") }));
    expect(gene(calls, "CYP2C9")).toMatchObject({
      diplotype: "*1/*3",
      phenotype: "Intermediate Metabolizer",
      activityScore: "1.0",
    });
  });

  it("uses CPIC's allele order for the label", () => {
    const calls = call(buildVcf({ gt: genotypeFor("CYP2C9", "*3", "*1") }));
    expect(gene(calls, "CYP2C9").diplotype).toBe("*1/*3");
  });

  it("all variants on one copy is not flagged ambiguous", () => {
    const c = gene(call(buildVcf({ gt: genotypeFor("CYP2C19", "*38", "*2") })), "CYP2C19");
    expect(c.diplotype).not.toBeNull();
    expect(c.diplotype!.split("/").sort()).toEqual(["*2", "*38"]);
    expect(c.ambiguous).toBe(false);
  });

  it("keeps the diplotype but gives Indeterminate phenotype when CPIC has no entry", () => {
    const def = geneDef("CYP2C9");
    const uncovered = def.namedAlleles.find((a) => a.name === "*76");
    expect(uncovered).toBeDefined();
    const c = gene(call(buildVcf({ gt: genotypeFor("CYP2C9", "*1", "*76") })), "CYP2C9");
    expect(c.diplotype).toBe("*1/*76");
    expect(c.phenotype).toBe("Indeterminate");
    expect(c.note).toMatch(/CPIC has no phenotype/);
  });
});

describe("callStarAlleles: phase", () => {
  it("unphased double heterozygote is assigned in trans and flagged ambiguous", () => {
    // *2 on one copy, *17 on the other, written unphased.
    const c = gene(call(buildVcf({ gt: genotypeFor("CYP2C19", "*2", "*17") })), "CYP2C19");
    expect(c.diplotype!.split("/").sort()).toEqual(["*17", "*2"]);
    expect(c.ambiguous).toBe(true);
    expect(c.note).toMatch(/in trans/);
  });

  it("phased trans is not ambiguous", () => {
    const c = gene(call(buildVcf({ gt: genotypeFor("CYP2C19", "*2", "*17", true) })), "CYP2C19");
    expect(c.diplotype!.split("/").sort()).toEqual(["*17", "*2"]);
    expect(c.ambiguous).toBe(false);
  });

  it("phased cis (*2 and *17 variants on one copy) matches nothing → Indeterminate", () => {
    const def = geneDef("CYP2C19");
    const two = def.namedAlleles.find((a) => a.name === "*2")!;
    const seventeen = def.namedAlleles.find((a) => a.name === "*17")!;
    const gt = new Map<string, string>();
    def.positions.forEach((p, i) => {
      const variant = two.alleles[i] ?? seventeen.alleles[i];
      gt.set(keyOf(p), variant !== null && variant !== p.ref ? "1|0" : "0|0");
    });
    expectIndeterminate(gene(call(buildVcf({ gt })), "CYP2C19"));
  });

  it("when cis and trans both match, prefers trans and names the other", () => {
    // SLCO1B1 rs2306283 + rs4149056, unphased: trans = *5/*37, cis = *1/*15.
    const gt = new Map([
      [keyOf(byRsid("SLCO1B1", "rs2306283")), "0/1"],
      [keyOf(byRsid("SLCO1B1", "rs4149056")), "0/1"],
    ]);
    const c = gene(call(buildVcf({ gt })), "SLCO1B1");
    expect(c.diplotype!.split("/").sort()).toEqual(["*37", "*5"]);
    expect(c.ambiguous).toBe(true);
    expect(c.note).toMatch(/\*1\/\*15/);
  });

  it("too many unphased heterozygous positions → Indeterminate", () => {
    const positions = geneDef("CYP2C9").positions.slice(0, 11);
    const gt = new Map(positions.map((p) => [keyOf(p), "0/1"]));
    const c = gene(call(buildVcf({ gt })), "CYP2C9");
    expectIndeterminate(c);
    expect(c.note).toMatch(/too many/);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

/** A random GT for a position, including no-calls, phased, and multi-allelic. */
const gtFor = (altCount: number) =>
  fc
    .tuple(
      fc.option(fc.integer({ min: 0, max: altCount }), { nil: null, freq: 8 }),
      fc.option(fc.integer({ min: 0, max: altCount }), { nil: null, freq: 8 }),
      fc.boolean(),
    )
    .map(([a, b, phased]) => `${a ?? "."}${phased ? "|" : "/"}${b ?? "."}`);

/** Mostly-reference genotypes with a few random changes, so calls stay realistic. */
const mutations = fc.array(
  fc.integer({ min: 0, max: allPositions.length - 1 }).chain((i) =>
    gtFor(allPositions[i].alts.length).map((gt) => [keyOf(allPositions[i]), gt] as const),
  ),
  { maxLength: 6 },
);

const geneAndPosition = fc.constantFrom(...definitions.genes).chain((def) =>
  fc.integer({ min: 0, max: def.positions.length - 1 }).map((i) => [def.gene, def.positions[i]] as const),
);

describe("callStarAlleles properties", () => {
  it("every genotype combination yields exactly one result per gene", () => {
    fc.assert(
      fc.property(mutations, (changes) => {
        const calls = call(buildVcf({ gt: new Map(changes) }));
        expect(calls.map((c) => c.gene)).toEqual([...CALLED_GENES]);
      }),
    );
  });

  it("a missing defining position never produces a non-Indeterminate call", () => {
    fc.assert(
      fc.property(geneAndPosition, mutations, ([g, p], changes) => {
        const calls = call(buildVcf({ gt: new Map(changes), drop: new Set([keyOf(p)]) }));
        const c = gene(calls, g);
        expect(c.diplotype).toBeNull();
        expect(c.phenotype).toBe("Indeterminate");
      }),
    );
  });

  it("never throws on arbitrary variant lists", () => {
    const variant = fc.record({
      chrom: fc.constantFrom("chr10", "chr12", "chr6", "chr16", "chr19", "chr4", "chr13"),
      pos: fc.oneof(
        fc.constantFrom(...allPositions.map((p) => p.pos)),
        fc.integer({ min: 1, max: 250_000_000 }),
      ),
      ref: fc.constantFrom("A", "C", "G", "T", "AT"),
      alt: fc.array(fc.constantFrom("A", "C", "G", "T", "*"), { maxLength: 2 }),
      a: fc.option(fc.constantFrom("A", "C", "G", "T"), { nil: null }),
      b: fc.option(fc.constantFrom("A", "C", "G", "T"), { nil: null }),
      phased: fc.boolean(),
    });
    fc.assert(
      fc.property(fc.array(variant, { maxLength: 40 }), (vs) => {
        const parsed = {
          fileFormat: "VCFv4.2",
          genomeBuild: "GRCh38" as const,
          sampleId: "S",
          sampleCount: 1,
          skippedLines: [],
          warnings: [],
          variants: vs.map((v) => ({
            chrom: v.chrom,
            pos: v.pos,
            id: null,
            ref: v.ref,
            alt: v.alt,
            filter: null,
            gt: [v.a === null ? null : 0, v.b === null ? null : 0] as [number | null, number | null],
            alleles: [v.a, v.b] as [string | null, string | null],
            phased: v.phased,
          })),
        };
        expect(callStarAlleles(parsed)).toHaveLength(CALLED_GENES.length);
      }),
    );
  });
});
