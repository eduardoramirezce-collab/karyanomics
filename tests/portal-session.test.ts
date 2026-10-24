import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkParsed, loadSample } from "../app/_portal/load-vcf";
import { parseSessionRecord } from "../app/_portal/session-record";
import { analyzeVcf } from "../lib/pgx/analyzeVcf";

describe("session record", () => {
  it("accepts only { role, npi, sampleId }", () => {
    expect(parseSessionRecord('{"role":"patient","npi":null,"sampleId":"maya"}')).toEqual({ role: "patient", npi: null, sampleId: "maya" });
    expect(parseSessionRecord('{"role":"clinician","npi":"1234567890","sampleId":"sam"}')).toEqual({ role: "clinician", npi: "1234567890", sampleId: "sam" });
    for (const bad of [null, "", "{", "[]", '{"role":"admin","npi":null,"sampleId":"maya"}',
      '{"role":"patient","npi":null,"sampleId":"bob"}', '{"role":"clinician","npi":"  ","sampleId":"maya"}',
      '{"role":"patient","npi":null,"sampleId":"maya","calls":[]}']) {
      expect(parseSessionRecord(bad)).toBeNull();
    }
  });
});

describe("VCF loader", () => {
  it("accepts the three bundled samples", () => {
    for (const id of ["maya", "alex", "sam"]) {
      const { parsed } = analyzeVcf(readFileSync(join(process.cwd(), `public/samples/${id}.vcf`), "utf8"));
      expect(checkParsed(parsed)).toBeNull();
    }
  });

  it("rejects a two-sample file with the parser's message", () => {
    const text = readFileSync(join(process.cwd(), "public/samples/maya.vcf"), "utf8")
      .replace(/(#CHROM[^\n]+)\n/, "$1\tSECOND\n");
    const { parsed } = analyzeVcf(text);
    expect(checkParsed(parsed)).toBe(parsed.warnings.find((w) => w.code === "multiple_samples")!.message);
  });

  it("reports a failed sample request with the patient name", async () => {
    const result = await loadSample("alex", (async () => new Response("", { status: 500 })) as typeof fetch);
    expect(result).toEqual({ ok: false, message: "We couldn't load the sample patient Alex. Please try again." });
  });
});
