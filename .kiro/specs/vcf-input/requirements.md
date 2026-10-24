# Requirements — VCF input

## Introduction

This spec covers pipeline stages 1 and 2: getting a VCF into the app and parsing
it. It has two parts:

- `lib/pgx/parseVcf.ts`: a pure, client-side parser that turns VCF text into a
  `ParsedVcf` (see `lib/pgx/types.ts`).
- `app/patient/VcfUpload.tsx`: an upload control plus three "Load sample
  patient" buttons. Uploads are read with `File.text()`; samples are fetched
  from `public/samples/`. Both go through the same `parseVcf()`.

The parser reads and reports. It does not call star alleles or interpret
results; that is the pgx-engine spec. Genetic data never leaves the browser.

## Glossary

- **Data line**: a VCF line that does not start with `#`.
- **Meta line**: a line starting with `##`.
- **Header line**: the line starting with `#CHROM`; columns after `FORMAT` are
  sample IDs.
- **No-call**: a `.` allele in GT, e.g. `./.` or `0/.`.
- **Build signal**: a `##reference`, `##assembly`, or `##contig` line naming
  GRCh38/hg38 or GRCh37/hg19, or a chr1 contig length matching one build.

## Requirements

### Requirement 1: Privacy

**User story:** As a patient, I want my genetic file to stay on my device, so
that nobody else can see it.

#### Acceptance criteria

1. WHEN a user uploads a VCF THE system SHALL read it in the browser and SHALL
   NOT send its contents to any server route or external service.
2. WHEN a sample patient is loaded THE system SHALL fetch only the static file
   from `public/samples/` and SHALL NOT send any genetic data in the request.
3. THE `parseVcf` function SHALL be pure and SHALL NOT perform network or
   storage I/O or log file contents.

### Requirement 2: Never crash

**User story:** As a patient, I want a clear message instead of a broken page
when my file has problems.

#### Acceptance criteria

1. THE `parseVcf` function SHALL NOT throw for any input text.
2. WHEN a data line is malformed THE system SHALL skip it, record its 1-based
   line number and a reason in `skippedLines`, and continue with the next line.
3. WHEN the file has no `#CHROM` header line THE system SHALL add a
   `missing_header` warning and SHALL still parse data lines that have a sample
   column.
4. WHEN the file has no `##fileformat` line THE system SHALL add a
   `missing_fileformat` warning.
5. WHEN no variant could be read THE system SHALL add a `no_variants` warning.
6. THE system SHALL accept both `\n` and `\r\n` line endings and SHALL ignore a
   leading byte-order mark.

### Requirement 3: Metadata and genome build

**User story:** As a clinician, I want to know which genome build a file uses,
so that positions are never matched against the wrong reference.

#### Acceptance criteria

1. WHEN a `##fileformat` line is present THE system SHALL record its value in
   `fileFormat`.
2. WHEN every build signal in the file points to GRCh38 THE system SHALL set
   `genomeBuild` to `GRCh38`.
3. WHEN every build signal points to GRCh37 THE system SHALL set `genomeBuild`
   to `GRCh37` and add a `build_not_grch38` warning.
4. IF the file has no build signal, or its build signals conflict, THEN THE
   system SHALL set `genomeBuild` to `unknown` and add a `build_unknown` warning.

### Requirement 4: Chromosome names

**User story:** As the engine, I want one spelling per chromosome, so that
matching does not depend on how a lab writes chromosome names.

#### Acceptance criteria

1. WHEN a CHROM value is read THE system SHALL normalize it to the `chr` form
   (`10` and `chr10` both become `chr10`).
2. WHEN a CHROM value is X, Y, M, or MT in any case, with or without `chr`, THE
   system SHALL normalize it to `chrX`, `chrY`, or `chrM`.
3. THE system SHALL produce an identical `ParsedVcf` for two files that differ
   only in whether chromosome names carry the `chr` prefix.

### Requirement 5: Genotype (GT)

**User story:** As the engine, I want each genotype read correctly, so that
star-allele calling starts from the right letters.

#### Acceptance criteria

1. WHEN a data line is read THE system SHALL take GT from the position of `GT`
   in the FORMAT column, not assume it is first.
2. WHEN GT uses `|` THE system SHALL set `phased` to true; WHEN it uses `/` THE
   system SHALL set `phased` to false.
3. WHEN a GT allele is `.` THE system SHALL record it as `null` in `gt` and
   `alleles` (e.g. `./.` is `[null, null]`, `0/.` is `[0, null]`).
4. WHEN GT is `.` alone, empty, or missing from the sample field THE system SHALL
   record a full no-call `[null, null]`.
5. THE system SHALL resolve every GT index to a letter in `alleles`: 0 to REF,
   n to the nth ALT.
6. IF a GT index is greater than the number of ALT alleles THEN THE system SHALL
   skip the line with a reason.
7. IF GT is not diploid, mixes `|` and `/`, or has a non-numeric allele THEN THE
   system SHALL skip the line with a reason.
8. IF FORMAT has no `GT` field THEN THE system SHALL skip the line with a reason.

### Requirement 6: REF and ALT

**User story:** As the engine, I want multi-allelic sites handled, so that a
second or third ALT allele is not lost.

#### Acceptance criteria

1. WHEN ALT lists several alleles separated by commas THE system SHALL keep all
   of them in order in `alt`.
2. WHEN ALT is `.` THE system SHALL set `alt` to an empty list.
3. THE system SHALL uppercase REF and base ALT alleles, and SHALL accept `*` and
   symbolic `<...>` ALT alleles.
4. IF REF is not made of A/C/G/T/N, or an ALT allele is not a base string, `*`,
   or symbolic, THEN THE system SHALL skip the line with a reason.
5. IF POS is not a positive integer THEN THE system SHALL skip the line with a
   reason.

### Requirement 7: Samples

**User story:** As a patient, I want to be told when a file holds more than one
person, so that I know whose results I'm seeing.

#### Acceptance criteria

1. WHEN the header lists one sample THE system SHALL read that sample and set
   `sampleId` and `sampleCount`.
2. WHEN the header lists more than one sample THE system SHALL read only the
   first sample and add a `multiple_samples` warning naming it.
3. WHEN the header lists no samples THE system SHALL return no variants and add a
   `no_samples` warning.

### Requirement 8: Upload component

**User story:** As a patient or judge, I want to load my own file or a sample
patient in one click, and see plainly what was read.

#### Acceptance criteria

1. THE component SHALL offer a labeled file input and three buttons: "Load
   sample patient: Maya", "Load sample patient: Alex", "Load sample patient: Sam".
2. WHEN a file is chosen or a sample button is pressed THE component SHALL run
   the text through `parseVcf()` and show the sample ID, genome build, positions
   read, no-calls, phased calls, and lines skipped.
3. WHEN the result has warnings THE component SHALL show each one with an icon
   and the word "Warning", never by color alone.
4. WHEN a file cannot be read or a sample cannot be fetched THE component SHALL
   show a plain-language error with an icon and the word "Error".
5. THE component SHALL announce loading, results, and errors through a polite
   live region.
6. THE component SHALL NOT show any clinical interpretation (diplotype,
   phenotype, or recommendation).
7. THE component SHALL label sample patients as made-up test files, not real
   people.

### Requirement 9: Property-based tests

**User story:** As a reviewer, I want parser guarantees checked across generated
input, not just hand-picked examples.

#### Acceptance criteria

1. THE system SHALL hold the property that any well-formed VCF data line parses
   without throwing, into exactly one variant, with no skipped lines.
2. THE system SHALL hold the property that `parseVcf` never throws on arbitrary
   text.
3. THE system SHALL hold the property that for every variant, each non-null GT
   index maps to REF (0) or the matching ALT allele, and `alleles` agrees with
   `gt`.
4. THE system SHALL hold the property that parsing is identical whether
   chromosomes are written `chr10` or `10`.

## Note for downstream stages

The parser warns rather than rejects, so a user can see what was wrong with
their file. Per `clinical-safety.md`, later stages SHALL NOT produce gene results
WHILE the parse result carries `build_not_grch38`, `build_unknown`, or
`no_samples`, and SHALL show the warning as a user-facing error instead.
