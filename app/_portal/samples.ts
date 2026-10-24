/**
 * Bundled sample patients. All are synthetic test files (no real people).
 * Their PharmCAT 3.4.0 reference outputs (the answer key) live in
 * data/samples/<id>.phenotype.json and <id>.report.tsv.
 *
 * DEMO ONLY: the email/password pairs below are public demo values checked in
 * the browser. They are not real accounts and protect nothing.
 * TODO: replace with real authentication before any real patient data is used.
 */
export const SAMPLE_PATIENTS = [
  // Source: PharmCAT example 2 VCF, unmodified (pharmcat.clinpgx.org/examples).
  { id: "maya", name: "Maya", file: "/samples/maya.vcf", email: "maya@example.com", password: "demo-maya" },
  // Source: PharmCAT example 1 VCF ("all reference"), unmodified.
  { id: "alex", name: "Alex", file: "/samples/alex.vcf", email: "alex@example.com", password: "demo-alex" },
  // Source: PharmCAT example 1 VCF with GT changed to 0/1 at rs1057910,
  // rs4149056 and rs9923231 (existing PharmCAT rows; no coordinates added).
  { id: "sam", name: "Sam", file: "/samples/sam.vcf", email: "sam@example.com", password: "demo-sam" },
] as const;

export type SampleId = (typeof SAMPLE_PATIENTS)[number]["id"];
export type SamplePatient = (typeof SAMPLE_PATIENTS)[number];

export function findSample(id: string): SamplePatient | undefined {
  return SAMPLE_PATIENTS.find((sample) => sample.id === id);
}

/** Demo login check: exact demo email (any case) and exact demo password. */
export function findDemoAccount(email: string, password: string): SamplePatient | undefined {
  const key = email.trim().toLowerCase();
  return SAMPLE_PATIENTS.find((sample) => sample.email === key && sample.password === password);
}
