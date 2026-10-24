import { describe, expect, it } from "vitest";
import { inspectPgxUpload } from "../lib/pgx/upload";
import synthetic from "../data/examples/synthetic-pgx-report.v1.json";

describe("local PGx intake", () => {
  it("parses a structured report but requires verification", () => {
    const result = inspectPgxUpload("report.json", JSON.stringify(synthetic));
    expect(result.kind).toBe("lab_report_json");
    expect(result.readiness).toBe("review_required");
    expect(result.geneResults[0].phenotype).toBe("Poor Metabolizer");
    expect(result.message).toMatch(/verification/i);
  });

  it("never treats no-call report data as complete", () => {
    const input = structuredClone(synthetic);
    input.geneResults[0].callStatus = "incomplete";
    expect(inspectPgxUpload("report.json", JSON.stringify(input)).readiness).toBe("missing_calls");
  });

  it("recognizes consumer raw data without inferring a phenotype", () => {
    const raw = "# rsid\tchromosome\tposition\tgenotype\nrs1\t1\t123\tAA\nrs2\t1\t456\t--\n";
    const result = inspectPgxUpload("raw.txt", raw);
    expect(result.kind).toBe("consumer_raw_tsv");
    expect(result.metrics).toEqual({ records: 2, noCalls: 1 });
    expect(result.geneResults).toEqual([]);
    expect(result.readiness).toBe("needs_external_caller");
  });

  it("recognizes a VCF but requires an external caller", () => {
    const vcf = "##fileformat=VCFv4.2\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE\n1\t123\trs1\tA\tG\t.\tPASS\t.\tGT\t0/1\n";
    const result = inspectPgxUpload("test.vcf", vcf);
    expect(result.kind).toBe("vcf");
    expect(result.metrics.records).toBe(1);
    expect(result.geneResults).toEqual([]);
  });

  it("rejects malformed VCF rows and unsupported formats", () => {
    const bad = "##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n1\tbad\trs1\tA\tG\t.\tPASS\t.\n";
    expect(inspectPgxUpload("bad.vcf", bad).readiness).toBe("invalid");
    expect(inspectPgxUpload("report.pdf", "pdf").readiness).toBe("invalid");
  });
});
