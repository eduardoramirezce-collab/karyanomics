import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseVcf, normalizeChrom } from "../lib/pgx/parseVcf";
import type { VcfVariant } from "../lib/pgx/types";

const HEADER_COLS = "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT";

/** Build a small VCF with a GRCh38 header and one sample. */
function vcf(dataLines: string[], opts: { meta?: string[]; samples?: string[] } = {}) {
  const meta = opts.meta ?? ["##fileformat=VCFv4.2", "##reference=GRCh38"];
  const samples = opts.samples ?? ["S1"];
  return [...meta, [HEADER_COLS, ...samples].join("\t"), ...dataLines].join("\n");
}

const line = (chrom: string, pos: number, ref: string, alt: string, format: string, sample: string) =>
  [chrom, pos, ".", ref, alt, ".", "PASS", ".", format, sample].join("\t");

const codes = (text: string) => parseVcf(text).warnings.map((w) => w.code);

describe("parseVcf: bundled sample files", () => {
  const sample = (id: string) =>
    readFileSync(join(process.cwd(), "public", "samples", `${id}.vcf`), "utf8");

  it.each(["maya", "alex", "sam"])("%s.vcf parses cleanly as GRCh38 with one sample", (id) => {
    const result = parseVcf(sample(id));
    expect(result.genomeBuild).toBe("GRCh38");
    expect(result.sampleCount).toBe(1);
    expect(result.skippedLines).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.variants.length).toBe(1226);
  });

  it("reads Maya's homozygous CYP2C19 rs4244285 call", () => {
    const v = parseVcf(sample("maya")).variants.find((x) => x.id === "rs4244285");
    expect(v).toMatchObject({
      chrom: "chr10",
      pos: 94781859,
      ref: "G",
      alt: ["A"],
      gt: [1, 1],
      alleles: ["A", "A"],
      phased: false,
    });
  });
});

describe("parseVcf: genome build", () => {
  it("detects GRCh38 from ##reference", () => {
    expect(parseVcf(vcf([])).genomeBuild).toBe("GRCh38");
  });

  it("detects GRCh38 from ##contig assembly", () => {
    const text = vcf([], { meta: ["##fileformat=VCFv4.2", "##contig=<ID=chr10,assembly=GRCh38.p14>"] });
    expect(parseVcf(text).genomeBuild).toBe("GRCh38");
  });

  it("detects GRCh37 from the chr1 contig length and warns", () => {
    const text = vcf([line("1", 100, "A", "G", "GT", "0/1")], {
      meta: ["##fileformat=VCFv4.2", "##contig=<ID=1,length=249250621>"],
    });
    expect(parseVcf(text).genomeBuild).toBe("GRCh37");
    expect(codes(text)).toContain("build_not_grch38");
  });

  it("warns when the build is missing", () => {
    const text = vcf([line("1", 100, "A", "G", "GT", "0/1")], { meta: ["##fileformat=VCFv4.2"] });
    expect(parseVcf(text).genomeBuild).toBe("unknown");
    expect(codes(text)).toContain("build_unknown");
  });

  it("treats conflicting build signals as unknown", () => {
    const text = vcf([], { meta: ["##fileformat=VCFv4.2", "##reference=GRCh38", "##assembly=hg19"] });
    expect(parseVcf(text).genomeBuild).toBe("unknown");
  });
});

describe("parseVcf: chromosomes", () => {
  it.each([
    ["10", "chr10"],
    ["chr10", "chr10"],
    ["CHR10", "chr10"],
    ["x", "chrX"],
    ["MT", "chrM"],
    ["chrM", "chrM"],
  ])("normalizes %s to %s", (raw, expected) => {
    expect(normalizeChrom(raw)).toBe(expected);
  });
});

describe("parseVcf: genotypes", () => {
  const one = (format: string, sample: string, alt = "G") =>
    parseVcf(vcf([line("10", 5, "A", alt, format, sample)]));

  it("finds GT wherever it sits in FORMAT", () => {
    const { variants } = one("DP:GT:GQ", "12:0|1:99");
    expect(variants[0]).toMatchObject({ gt: [0, 1], alleles: ["A", "G"], phased: true });
  });

  it("reads unphased calls", () => {
    expect(one("GT", "1/1").variants[0]).toMatchObject({ gt: [1, 1], phased: false });
  });

  it.each(["./.", ".|.", "."])("treats %s as a no-call", (gt) => {
    expect(one("GT", gt).variants[0]).toMatchObject({ gt: [null, null], alleles: [null, null] });
  });

  it("keeps a half no-call", () => {
    expect(one("GT", "0/.").variants[0]).toMatchObject({ gt: [0, null], alleles: ["A", null] });
  });

  it("treats a dropped GT subfield as a no-call", () => {
    expect(one("GT:DP", "").variants[0]).toMatchObject({ gt: [null, null] });
  });

  it("maps multi-allelic ALT indices to the right letters", () => {
    expect(one("GT", "1/2", "C,G").variants[0]).toMatchObject({
      alt: ["C", "G"],
      gt: [1, 2],
      alleles: ["C", "G"],
    });
  });

  it("skips a GT that points past the ALT list", () => {
    const r = one("GT", "0/2");
    expect(r.variants).toEqual([]);
    expect(r.skippedLines[0].line).toBe(4);
  });

  it.each(["0/1|1", "1", "0|1/1", "a/b"])("skips unsupported GT %s", (gt) => {
    expect(one("GT", gt).skippedLines).toHaveLength(1);
  });

  it("skips lines whose FORMAT has no GT", () => {
    expect(one("DP", "12").skippedLines[0].reason).toMatch(/no GT/);
  });
});

describe("parseVcf: file structure", () => {
  it("uses the first sample and warns when there are several", () => {
    const text = vcf([line("10", 5, "A", "G", "GT", "0/1") + "\t1/1"], { samples: ["S1", "S2"] });
    const r = parseVcf(text);
    expect(r.sampleId).toBe("S1");
    expect(r.sampleCount).toBe(2);
    expect(r.variants[0].gt).toEqual([0, 1]);
    expect(codes(text)).toContain("multiple_samples");
  });

  it("skips malformed lines with their line number and keeps going", () => {
    const text = vcf([
      line("10", 5, "A", "G", "GT", "0/1"),
      "10\tnot-a-number\t.\tA\tG\t.\tPASS\t.\tGT\t0/1",
      "garbage",
      line("10", 9, "C", "T", "GT", "1/1"),
    ]);
    const r = parseVcf(text);
    expect(r.variants.map((v) => v.pos)).toEqual([5, 9]);
    expect(r.skippedLines.map((s) => s.line)).toEqual([5, 6]);
  });

  it("warns on a missing #CHROM header", () => {
    const text = ["##fileformat=VCFv4.2", "##reference=GRCh38", line("10", 5, "A", "G", "GT", "0/1")].join("\n");
    expect(codes(text)).toContain("missing_header");
    expect(parseVcf(text).variants).toHaveLength(1);
  });

  it("warns when there are no sample columns", () => {
    const text = ["##fileformat=VCFv4.2", "##reference=GRCh38", "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO", "10\t5\t.\tA\tG\t.\tPASS\t."].join("\n");
    expect(codes(text)).toContain("no_samples");
  });

  it("handles Windows line endings and a byte-order mark", () => {
    const text = "\uFEFF" + vcf([line("10", 5, "A", "G", "GT", "0/1")]).replace(/\n/g, "\r\n");
    const r = parseVcf(text);
    expect(r.fileFormat).toBe("VCFv4.2");
    expect(r.variants).toHaveLength(1);
    expect(r.skippedLines).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

const bases = fc.stringMatching(/^[ACGT]{1,5}$/);
const bareChrom = fc.constantFrom(
  ...Array.from({ length: 22 }, (_, i) => String(i + 1)),
  "X",
  "Y",
  "MT",
);
const extraFormatKeys = fc.uniqueArray(fc.constantFrom("DP", "GQ", "AD", "PL"), { maxLength: 3 });

/** A well-formed data line (minus CHROM), with the pieces used to build it. */
const wellFormedRecord = fc
  .record({
    pos: fc.integer({ min: 1, max: 2_147_483_647 }),
    ref: bases,
    alt: fc.array(bases, { maxLength: 3 }),
    phased: fc.boolean(),
    keys: extraFormatKeys,
    gtSlot: fc.nat(),
    idx: fc.tuple(fc.nat(), fc.nat(), fc.boolean(), fc.boolean()),
  })
  .map(({ pos, ref, alt, phased, keys, gtSlot, idx }) => {
    const pick = (n: number, missing: boolean) => (missing ? "." : String(n % (alt.length + 1)));
    const gt = `${pick(idx[0], idx[2])}${phased ? "|" : "/"}${pick(idx[1], idx[3])}`;
    const slot = gtSlot % (keys.length + 1);
    const format = [...keys.slice(0, slot), "GT", ...keys.slice(slot)];
    const sample = format.map((k) => (k === "GT" ? gt : "1")).join(":");
    const altCol = alt.length === 0 ? "." : alt.join(",");
    return (chrom: string) =>
      [chrom, pos, ".", ref, altCol, ".", "PASS", ".", format.join(":"), sample].join("\t");
  });

describe("parseVcf properties", () => {
  it("parses any well-formed data line without throwing", () => {
    fc.assert(
      fc.property(bareChrom, fc.boolean(), wellFormedRecord, (chrom, prefix, record) => {
        const text = vcf([record(prefix ? `chr${chrom}` : chrom)]);
        const r = parseVcf(text);
        expect(r.skippedLines).toEqual([]);
        expect(r.variants).toHaveLength(1);
      }),
    );
  });

  it("never throws on arbitrary text", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary" }), (text) => {
        expect(() => parseVcf(text)).not.toThrow();
      }),
    );
  });

  it("always maps GT indices to REF/ALT letters", () => {
    const expected = (v: VcfVariant, i: number | null) =>
      i === null ? null : i === 0 ? v.ref : v.alt[i - 1];

    fc.assert(
      fc.property(fc.array(fc.tuple(bareChrom, wellFormedRecord), { maxLength: 10 }), (records) => {
        const { variants } = parseVcf(vcf(records.map(([c, r]) => r(c))));
        for (const v of variants) {
          for (const k of [0, 1] as const) {
            expect(v.alleles[k]).toBe(expected(v, v.gt[k]));
            if (v.alleles[k] !== null) expect([v.ref, ...v.alt]).toContain(v.alleles[k]);
          }
        }
      }),
    );
  });

  it('parses identically whether chromosomes are written "chr10" or "10"', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(bareChrom, wellFormedRecord), { maxLength: 10 }), (records) => {
        const build = (prefix: string) =>
          vcf(
            records.map(([c, r]) => r(prefix + c)),
            {
              meta: [
                "##fileformat=VCFv4.2",
                `##contig=<ID=${prefix}1,length=248956422>`,
                ...records.map(([c]) => `##contig=<ID=${prefix}${c}>`),
              ],
            },
          );
        expect(parseVcf(build("chr"))).toEqual(parseVcf(build("")));
      }),
    );
  });
});
