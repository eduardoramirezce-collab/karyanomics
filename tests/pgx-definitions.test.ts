import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import phenotypesJson from "../data/cpic-diplotype-phenotypes.json";
import { parseVcf } from "../lib/pgx/parseVcf";
import { VCF_GENES } from "../lib/pgx/callStarAlleles";
import type { PhenotypeTableFile } from "../lib/pgx/types";
import { definitions, keyOf } from "./helpers/pgxVcf";

const phenotypes = phenotypesJson as PhenotypeTableFile;

describe("data/allele-definitions.json", () => {
  it("is pinned to PharmCAT v3.4.0 on GRCh38", () => {
    expect(definitions.source.tag).toBe("v3.4.0");
    expect(definitions.genome).toBe("GRCh38");
  });

  it("has exactly the 8 VCF genes, in order", () => {
    expect(definitions.genes.map((g) => g.gene)).toEqual([...VCF_GENES]);
  });

  it.each(definitions.genes.map((g) => [g.gene, g] as const))(
    "%s has one reference allele whose letters are the REF",
    (_, gene) => {
      const refs = gene.namedAlleles.filter((a) => a.reference);
      expect(refs).toHaveLength(1);
      expect(refs[0].alleles).toEqual(gene.positions.map((p) => p.ref));
    },
  );

  it.each(definitions.genes.map((g) => [g.gene, g] as const))(
    "%s: every allele has one letter per position",
    (_, gene) => {
      for (const allele of gene.namedAlleles) {
        expect(allele.alleles).toHaveLength(gene.positions.length);
      }
    },
  );

  it("every defining position is in maya.vcf with the same REF and ALT", () => {
    const text = readFileSync(join(process.cwd(), "public/samples/maya.vcf"), "utf8");
    const byKey = new Map(parseVcf(text).variants.map((v) => [keyOf(v), v]));
    for (const gene of definitions.genes) {
      for (const p of gene.positions) {
        const v = byKey.get(keyOf(p));
        expect(v, `${gene.gene} ${keyOf(p)}`).toBeDefined();
        expect(v!.ref).toBe(p.ref);
        expect(v!.alt).toEqual(p.alts);
      }
    }
  });
});

describe("data/cpic-diplotype-phenotypes.json", () => {
  it("has tables for the 6 genes CPIC assigns phenotypes to", () => {
    expect(Object.keys(phenotypes.genes).sort()).toEqual(
      ["ABCG2", "CYP2C19", "CYP2C9", "NUDT15", "SLCO1B1", "TPMT"],
    );
  });

  it("matches the CPIC API spot checks", () => {
    expect(phenotypes.genes.CYP2C19["*2/*2"]).toEqual({
      phenotype: "Poor Metabolizer",
      activityScore: null,
    });
    expect(phenotypes.genes.CYP2C9["*1/*3"]).toEqual({
      phenotype: "Intermediate Metabolizer",
      activityScore: "1.0",
    });
  });
});
