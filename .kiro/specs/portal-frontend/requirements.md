# Requirements Document

## Introduction

This feature replaces the current `/patient` intake page with a demo product: a public home page, an order page, demo-only patient and clinician sign-in, and a results portal. In the portal, the loaded patient's per-gene calls drive one result card for every drug in a chosen therapeutic category. A new pure helper, `lib/pgx/drugResult.ts`, computes each card from existing `lib/pgx` functions.

All sign-in is demo only. There are no real accounts, passwords, or server storage, and no genetic or form data leaves the browser.

The feature reuses `analyzeVcf`, `findGeneDrugPairCandidates`, `findResearchRecommendationRoute`, `assessPatient`, and `listDrugTherapeuticGroups`. `lib/pgx/parseVcf.ts`, `lib/pgx/callStarAlleles.ts`, and every file under `data/` stay unchanged.

Decisions already made with the user:

- Four display statuses are kept. Each maps to one of the three result levels in `.kiro/steering/clinical-safety.md` ("typical", "may-differ", "talk-to-prescriber"). Helper output carries both.
- Uploaded VCFs get gene-based status chips but never `assessPatient()` guidance text. Guidance text appears only for the bundled sample patients whose call passes the same completeness checks as `lib/pgx/sample-assessment.ts`. This keeps the product rule "Uploaded VCFs do not produce medication guidance."
- The clinician NPI gate is demo only. Any non-empty NPI is accepted with no format check or registry lookup. The clinician view is still reachable only through this gate.

Verified sample calls (from `data/cpic-gene-drug-catalog.v1.json` sample calls, which the caller tests match): Maya has CYP2C19 `*2/*2` Poor Metabolizer; Alex has every phenotyped gene at Normal Metabolizer or Normal Function, including SLCO1B1 `*1/*1` Normal Function; Sam has CYP2C9 `*1/*3` Intermediate Metabolizer and SLCO1B1 `*1/*5` Decreased Function. VKORC1 and CYP4F2 have no CPIC phenotype (`phenotype: null`) for all three.

Out of scope: real authentication, NPI check-digit or CMS NPPES verification, NDC barcode scanning, a CYP2D6 outside-call input, new clinical wording, and any change to data files.

## Glossary

- **Portal_App**: The Next.js App Router web application, including the routes `/`, `/order`, `/login`, `/portal`, `/patient`, `/drugs`, and the shared root layout.
- **Home_Page**: The public page at `/`.
- **Order_Page**: The page at `/order` describing the test, with the Order_Form.
- **Order_Form**: The demo form on the Order_Page with name, email, an "I have a prescriber" checkbox, and a Submit button.
- **Login_Page**: The page at `/login` with the Patient_Tab and the Clinician_Tab.
- **Patient_Tab**: The Login_Page tab labelled "Patient".
- **Clinician_Tab**: The Login_Page tab labelled "Clinician".
- **NPI_Gate**: The demo-only NPI entry on the Clinician_Tab that must be passed before a clinician can pick a patient.
- **Demo_NPI**: The sample NPI value `1234567890` filled by the "Judge demo access" button.
- **Patient_Picker**: The set of controls offering the three Sample_Patient account cards and a VCF file input.
- **Sample_Patient**: One of the three bundled synthetic patients, Maya (`maya`), Alex (`alex`), or Sam (`sam`), whose VCFs are served from `public/samples/{id}.vcf`.
- **Uploaded_File**: A VCF file the user selects from the device.
- **VCF_Loader**: The browser-only logic that obtains VCF text from a Sample_Patient or an Uploaded_File and runs `analyzeVcf(text)`.
- **Caller_Output**: The `DiplotypeCall[]` returned by `analyzeVcf(text)`; nine calls in the order CYP2C19, CYP2C9, VKORC1, CYP4F2, SLCO1B1, ABCG2, TPMT, NUDT15, CYP2D6.
- **Diplotype_Call**: One `DiplotypeCall` entry in the Caller_Output.
- **Session**: The in-memory demo session `{ role, npi?, patientName, source, parsed, calls }`, where role is `patient` or `clinician`.
- **Session_Store**: The React context provider that holds the Session.
- **Session_Record**: The object `{ role, npi, sampleId }` written to `sessionStorage`.
- **Portal_Page**: The results page at `/portal`.
- **Session_Banner**: The banner at the top of the Portal_Page naming the patient and the signed-in role.
- **Gene_Section**: The Portal_Page section titled "Your genes".
- **Gene_Card**: One card in the Gene_Section describing one Diplotype_Call.
- **Gene_Description**: A fixed one-line plain-language description of what a gene does, written at a 6th–8th grade reading level, with no claim about medication response, safety, or dosing.
- **Medication_Section**: The Portal_Page section titled "Check your medications".
- **Category_Select**: The labelled drop-down of Therapeutic_Groups in the Medication_Section.
- **Therapeutic_Group**: One group returned by `listDrugTherapeuticGroups()`, with its label and ordered list of drugs.
- **Drug_Result_Card**: One card in the Medication_Section showing one drug's result.
- **Drug_Result_Helper**: The pure module `lib/pgx/drugResult.ts` that computes Drug_Result_Card content and Gene_Status values.
- **Pair_Lookup**: `findGeneDrugPairCandidates(drug)` in `lib/pgx/gene-drug-catalog.ts`.
- **Research_Router**: `findResearchRecommendationRoute(input)` in `lib/pgx/research-recommendation-route.ts`.
- **Route_Status**: The `status` field of a Research_Router result.
- **Route_Population**: A distinct `population` value listed for a drug in `data/cpic-recommendation-routes.v1.json`.
- **Caller_Evidence**: The `CallerEvidence[]` argument to the Research_Router.
- **Patient_Guidance_Lookup**: `assessPatient(input)` in `lib/pgx/assess-patient.ts`.
- **Completeness_Check**: The checks in `toMayaSampleAssessment()` in `lib/pgx/sample-assessment.ts`: genome build GRCh38, exactly one sample, no skipped lines, no file-level warnings, every variant FILTER `PASS` or empty, exactly one CYP2C19 Diplotype_Call with source `vcf`, a non-null diplotype, a phenotype other than null or "Indeterminate", and `ambiguous: false`.
- **VCF_Gene**: One of the eight genes called from a VCF: CYP2C19, CYP2C9, VKORC1, CYP4F2, SLCO1B1, ABCG2, TPMT, NUDT15.
- **Untested_Guideline_Gene**: A gene symbol named in a drug's CPIC guideline title (the `guideline` field returned by the Pair_Lookup) that is not a VCF_Gene. In the current data these are CYP2D6, HLA-B, CYP2B6, SLC6A4, and HTR2A.
- **Relevant_Gene**: A gene used to compute a drug's Display_Status: every distinct gene returned by the Pair_Lookup for the drug, plus every Untested_Guideline_Gene of the drug's guideline.
- **Normal_Phenotype**: The phenotype string "Normal Metabolizer" or "Normal Function".
- **Indeterminate_Gene_Call**: A Diplotype_Call whose diplotype is null, whose phenotype is "Indeterminate", "No Result", or "n/a", or whose `ambiguous` flag is true.
- **Undetermined_Call**: A Relevant_Gene state where no single Diplotype_Call exists for the gene, the gene's Diplotype_Call is an Indeterminate_Gene_Call, or the gene's phenotype is null.
- **Display_Status**: One of the four on-screen statuses: "Typical", "Your genes may change how this works", "Can't tell from this file", "Needs a clinician-run calculation".
- **Steering_Level**: One of the three result levels from clinical-safety.md: `typical`, `may-differ`, `talk-to-prescriber`.
- **Gene_Status**: The Display_Status assigned to a single Diplotype_Call in the Gene_Section.
- **Status_Chip**: The visual element that shows a Display_Status as an icon plus the status words.
- **Generic_Prescriber_Line**: The text "Talk to your prescriber or pharmacist about what this result means for this medication."
- **Typical_Limit_Line**: The text "This test found no gene change for this medicine. Other genes and health factors can still matter."
- **Unread_Gene_Line**: The text "This medication also depends on {genes}, which can't be read from this file.", where {genes} lists the drug's Untested_Guideline_Genes in guideline-title order: one gene as "CYP2D6", two as "CYP2D6 and CYP2B6", three or more as "CYP2D6, CYP2B6, SLC6A4, and HTR2A".
- **CPIC_Classification**: The `classification` value of a CPIC source row (in the current data: "Strong", "Moderate", "Optional", "No Recommendation").
- **Route_Note**: A fixed plain-language note shown on a clinician Drug_Result_Card for a Route_Status other than `source_row_for_clinician_review`.
- **Site_Footer**: The footer rendered by the root layout on every page.

## Requirements

### Requirement 1: Public home page

**User Story:** As a visitor, I want a clear home page, so that I can view my results, order a test, or reach clinician sign-in.

#### Acceptance Criteria

1. THE Home_Page SHALL display the heading "Karyanomics" and the tagline "Know how your genes shape your medications, before your next dose."
2. THE Home_Page SHALL display a card titled "View your results" with the text "Log into your account and view your pharmacogenomic results." and a button that navigates to `/login`.
3. THE Home_Page SHALL display a card titled "Order your test" with the text "One saliva sample. Results for 8 genes that affect common medications." and a button that navigates to `/order`.
4. WHILE the viewport is narrower than 640 CSS pixels, THE Home_Page SHALL stack the two cards vertically.
5. WHILE the viewport is 640 CSS pixels or wider, THE Home_Page SHALL place the two cards side by side.
6. THE Home_Page SHALL display a "Clinician sign in" link, in the page header or the Site_Footer, that navigates to `/login?role=clinician`.
7. THE Home_Page SHALL display a "How it works" strip with three numbered steps: "Order a test", "Get your results", and "Check your medications".
8. THE Home_Page SHALL omit the text "Clinician view coming soon".

### Requirement 2: Order page and demo form

**User Story:** As a visitor, I want to see what the test covers and try the order form, so that I understand the product without anything being sent.

#### Acceptance Criteria

1. THE Order_Page SHALL list the eight VCF_Genes in the order CYP2C19, CYP2C9, VKORC1, CYP4F2, SLCO1B1, ABCG2, TPMT, NUDT15, each with its Gene_Description.
2. THE Order_Page SHALL list the label of every Therapeutic_Group returned by `listDrugTherapeuticGroups()` that contains at least one drug, in the returned order.
3. THE Order_Page SHALL display three numbered steps: "Order a test", "Get your results", and "Check your medications".
4. THE Order_Form SHALL provide a labelled name text field, a labelled email field, a labelled "I have a prescriber" checkbox, and a Submit button.
5. WHEN the visitor submits the Order_Form, THE Order_Page SHALL prevent the browser's default form submission and navigation.
6. WHEN the visitor submits the Order_Form, THE Order_Page SHALL display "Thanks — this is a demo, nothing was sent or stored." in an `aria-live="polite"` region.
7. THE Order_Form SHALL keep entered values only in page memory, with no network request and no browser storage write containing Order_Form values.

### Requirement 3: Login page tabs

**User Story:** As a patient or clinician, I want separate sign-in tabs, so that I reach the view for my role.

#### Acceptance Criteria

1. THE Login_Page SHALL display two tabs labelled "Patient" and "Clinician".
2. WHEN the Login_Page loads with the query parameter `role=clinician`, THE Login_Page SHALL open the Clinician_Tab.
3. WHEN the Login_Page loads without the query parameter `role=clinician`, THE Login_Page SHALL open the Patient_Tab.
4. THE Login_Page SHALL expose the tabs with the ARIA `tablist`, `tab`, and `tabpanel` roles and `aria-selected` state.
5. WHEN a tab has keyboard focus and the user presses the Left or Right arrow key, THE Login_Page SHALL move focus to the adjacent tab and open that tab.

### Requirement 4: Patient demo sign-in

**User Story:** As a patient, I want to pick a demo account or upload my own VCF, so that I can see results without creating an account.

#### Acceptance Criteria

1. THE Patient_Tab SHALL display the heading "Choose your demo account", one account card each for Maya, Alex, and Sam, and a labelled file input titled "Or upload your own VCF".
2. THE Patient_Picker SHALL display the text "Sample patients are made-up test files, not real people."
3. WHEN the user chooses a Sample_Patient account card on the Patient_Tab and the VCF_Loader succeeds, THE Login_Page SHALL create a Session with role `patient` and navigate to `/portal`.
4. WHEN the user selects an Uploaded_File on the Patient_Tab and the VCF_Loader accepts the file, THE Login_Page SHALL create a Session with role `patient` and navigate to `/portal`.

### Requirement 5: Clinician demo NPI gate

**User Story:** As a clinician (or hackathon judge), I want a quick demo NPI sign-in, so that I can see the clinician view for a chosen patient.

#### Acceptance Criteria

1. THE Clinician_Tab SHALL display a labelled NPI number input, a "Sign in" button, and a "Judge demo access" button.
2. THE Clinician_Tab SHALL display the text "Demo access only. This does not verify your identity."
3. WHEN the user activates "Judge demo access", THE Clinician_Tab SHALL set the NPI input value to the Demo_NPI.
4. WHEN the user activates "Sign in" with an NPI value containing at least one non-whitespace character, THE NPI_Gate SHALL accept the trimmed NPI value without format, check-digit, or registry validation.
5. IF the user activates "Sign in" with an empty or whitespace-only NPI value, THEN THE NPI_Gate SHALL keep the Patient_Picker hidden and display "Enter an NPI number to continue." linked to the NPI input through `aria-describedby`.
6. THE NPI_Gate source code SHALL contain a TODO comment stating that NPI check-digit validation and a CMS NPPES registry lookup are future work.
7. WHEN the NPI_Gate accepts an NPI, THE Clinician_Tab SHALL display the Patient_Picker under the heading "Choose a patient".
8. WHEN the clinician chooses a Sample_Patient or an Uploaded_File in the Clinician_Tab and the VCF_Loader succeeds, THE Login_Page SHALL create a Session with role `clinician` and the accepted NPI, and navigate to `/portal`.

### Requirement 6: VCF loading

**User Story:** As a user, I want my file analyzed on my device with the existing caller, so that my results match the tested pipeline and my data stays private.

#### Acceptance Criteria

1. WHEN a Sample_Patient is chosen, THE VCF_Loader SHALL request `/samples/{id}.vcf` with an HTTP GET and run `analyzeVcf(text)` in the browser on the response text.
2. WHEN an Uploaded_File is selected, THE VCF_Loader SHALL read the file with `File.text()` in the browser and run `analyzeVcf(text)` on the result.
3. THE Patient_Picker file input SHALL accept files with the `.vcf` extension.
4. IF the Uploaded_File is larger than 30,000,000 bytes, THEN THE VCF_Loader SHALL display "This demo accepts VCF files up to 30 MB." and create no Session.
5. IF the Uploaded_File cannot be read, THEN THE VCF_Loader SHALL display "We couldn't read that file. Please check it is a plain-text .vcf file." and create no Session.
6. IF the Sample_Patient VCF request fails, THEN THE VCF_Loader SHALL display "We couldn't load the sample patient {name}. Please try again." with the Sample_Patient's name and create no Session.
7. IF the parsed file's genome build is not GRCh38 or the file's sample count is not exactly 1, THEN THE VCF_Loader SHALL display the parser's warning message for that problem and create no Session.
8. WHILE the VCF_Loader is reading or analyzing a file, THE Login_Page SHALL disable the Patient_Picker controls and display a loading message in an `aria-live="polite"` region.
9. IF the VCF_Loader displays an error, THEN THE Login_Page SHALL present the error in a `role="alert"` element.

### Requirement 7: Session state and persistence

**User Story:** As a demo user, I want my sample session to survive a page refresh, so that I do not have to sign in again, while my uploaded data is never saved.

#### Acceptance Criteria

1. THE Session_Store SHALL hold the Session fields role, npi (clinician role only), patientName, source, parsed, and calls in React state.
2. WHEN a Session is created from a Sample_Patient, THE Session_Store SHALL write a Session_Record containing the role, the npi (or null for the patient role), and the Sample_Patient id.
3. WHEN a Session is created from an Uploaded_File, THE Session_Store SHALL delete any existing Session_Record.
4. THE Session_Record SHALL contain only the keys `role`, `npi`, and `sampleId`.
5. WHEN the Portal_Page loads with no in-memory Session and a Session_Record whose `sampleId` names a Sample_Patient, THE Session_Store SHALL reload that Sample_Patient through the VCF_Loader and restore the role and npi from the Session_Record.
6. IF the Session_Record is missing, is not valid JSON, has a role other than `patient` or `clinician`, has an unknown `sampleId`, or has role `clinician` with an empty npi, THEN THE Session_Store SHALL delete the Session_Record and report no restorable Session.
7. IF reloading a Sample_Patient from the Session_Record fails, THEN THE Portal_Page SHALL display "We couldn't reload your sample results." with a link to `/login`.
8. WHEN the user activates "Sign out", THE Session_Store SHALL clear the in-memory Session and delete the Session_Record, and THE Portal_App SHALL navigate to `/`.

### Requirement 8: Portal access and banner

**User Story:** As a signed-in user, I want to always see whose results I am viewing and in which role, so that I never confuse patients or views.

#### Acceptance Criteria

1. IF the Portal_Page loads with no in-memory Session and no restorable Session_Record, THEN THE Portal_Page SHALL redirect to `/login`.
2. THE Portal_Page SHALL display the Session_Banner, including a "Sign out" button, at the top of the page for both roles.
3. WHILE the Session role is `patient`, THE Session_Banner SHALL display "{patientName}'s results · Signed in as patient".
4. WHILE the Session role is `clinician`, THE Session_Banner SHALL display "{patientName}'s results · Signed in as clinician (NPI {npi}) on behalf of {patientName}".
5. WHERE the Session source is a Sample_Patient, THE Session_Store SHALL set patientName to the Sample_Patient display name (Maya, Alex, or Sam).
6. WHERE the Session source is an Uploaded_File, THE Session_Store SHALL set patientName to the parsed VCF sample ID when that ID is non-empty, and to the Uploaded_File name otherwise.
7. WHERE the Session source is an Uploaded_File, THE Session_Banner SHALL display "From an uploaded file that has not been verified. For discussion with your prescriber or pharmacist."
8. THE Portal_Page SHALL display a link labelled "Browse all medications" that navigates to `/drugs`.

### Requirement 9: Your genes section

**User Story:** As a patient or clinician, I want one card per gene, so that I can see every gene result, including genes this file cannot determine.

#### Acceptance Criteria

1. THE Gene_Section SHALL display one Gene_Card for each Diplotype_Call in the Caller_Output, in Caller_Output order, including CYP2D6.
2. THE Gene_Card SHALL display the gene symbol, the Gene_Description, the phenotype, and the Gene_Status as a Status_Chip.
3. WHEN a Diplotype_Call has a non-null diplotype, `ambiguous: false`, and a null phenotype, THE Gene_Card SHALL display "This gene has no result group. Clinicians use it in a calculation." in place of the phenotype.
4. WHEN the Diplotype_Call for CYP2D6 is displayed, THE Gene_Card SHALL display "CYP2D6 cannot be determined from this file."
5. WHEN a Diplotype_Call for a VCF_Gene is an Indeterminate_Gene_Call, THE Gene_Card SHALL display "We can't tell this gene from this file."
6. WHILE the Session role is `clinician`, THE Gene_Card SHALL also display the diplotype (or "Not determined" when null), the activity score (or "Not applicable" when null), the ambiguous flag as "Phase assumed: yes" or "Phase assumed: no", and the Diplotype_Call note when present.
7. WHEN a CYP2C19 diplotype containing the allele `*38` is displayed, THE Portal_App SHALL display that allele as "*38 (standard)" with the tooltip "*38 is the current name for the standard reference allele."
8. THE Portal_App SHALL apply the `*38 (standard)` label only to a CYP2C19 allele token exactly equal to `*38`.

### Requirement 10: Check your medications section

**User Story:** As a patient or clinician, I want to pick a drug category and see a result for every drug in it, so that I can check medications in one step.

#### Acceptance Criteria

1. THE Medication_Section SHALL display a labelled Category_Select listing every Therapeutic_Group that contains at least one drug, in the order returned by `listDrugTherapeuticGroups()`.
2. THE Category_Select SHALL omit every Therapeutic_Group that contains zero drugs.
3. WHEN the Portal_Page loads, THE Category_Select SHALL select the first listed Therapeutic_Group.
4. THE Medication_Section SHALL display a "Search" button next to the Category_Select.
5. WHILE Search has not been activated for the currently selected Therapeutic_Group, THE Medication_Section SHALL display zero Drug_Result_Cards.
6. WHEN the user activates Search, THE Medication_Section SHALL display one Drug_Result_Card for every drug in the selected Therapeutic_Group, in the group's drug order.
7. WHEN the user changes the Category_Select value, THE Medication_Section SHALL remove every displayed Drug_Result_Card.
8. THE Medication_Section SHALL render the results area as an `aria-live="polite"` region.
9. WHEN the user activates Search, THE Medication_Section SHALL display "Showing {count} medications in {group label}." inside the results area.

### Requirement 11: Relevant genes for a drug

**User Story:** As a developer, I want a single pure rule for which genes count for a drug, so that every card is computed the same way and multi-gene guidelines are never read from one gene alone.

#### Acceptance Criteria

1. THE Drug_Result_Helper SHALL be a pure TypeScript module at `lib/pgx/drugResult.ts` that reads only its arguments and bundled `lib/pgx` and `data/` modules, with no network, storage, DOM, or console access.
2. THE Drug_Result_Helper SHALL determine the Relevant_Genes of a drug as every distinct gene returned by the Pair_Lookup for that drug, plus every Untested_Guideline_Gene of the drug's guideline.
3. THE Drug_Result_Helper SHALL pair each Relevant_Gene with the Diplotype_Call that has the same gene symbol.
4. IF a Relevant_Gene has zero matching Diplotype_Calls or more than one, THEN THE Drug_Result_Helper SHALL classify that Relevant_Gene as an Undetermined_Call.
5. WHEN a drug's CPIC guideline names one or more Untested_Guideline_Genes (for example CYP2D6 for the tricyclic antidepressants), THE Drug_Result_Helper SHALL assign the Display_Status "Can't tell from this file" and SHALL include the Unread_Gene_Line naming every such gene. This applies to CYP2D6 even though the Caller_Output contains an Indeterminate CYP2D6 call, and to every other Untested_Guideline_Gene that has no Diplotype_Call.
6. THE Drug_Result_Helper SHALL list Relevant_Genes on each result in a fixed order: Pair_Lookup genes in alphabetical order, then Untested_Guideline_Genes in the order they appear in the guideline title.

### Requirement 12: Display status, precedence, and steering level

**User Story:** As a patient, I want one clear status per medication, so that I know whether my genes may matter and when to ask my prescriber.

#### Acceptance Criteria

1. THE Drug_Result_Helper SHALL assign each drug exactly one Display_Status.
2. WHEN the Research_Router returns Route_Status `guideline_algorithm_required` for the drug, THE Drug_Result_Helper SHALL assign "Needs a clinician-run calculation".
3. IF the Route_Status is not `guideline_algorithm_required` and the drug has zero Relevant_Genes or any Relevant_Gene is an Undetermined_Call, THEN THE Drug_Result_Helper SHALL assign "Can't tell from this file".
4. WHEN rules 2 and 3 do not apply and any Relevant_Gene has a phenotype other than a Normal_Phenotype, THE Drug_Result_Helper SHALL assign "Your genes may change how this works".
5. WHEN rules 2, 3, and 4 do not apply, THE Drug_Result_Helper SHALL assign "Typical".
6. THE Drug_Result_Helper SHALL evaluate the status rules in the fixed order of criteria 2, 3, 4, then 5, and SHALL assign the status of the first rule that applies.
7. THE Drug_Result_Helper SHALL map "Typical" to Steering_Level `typical`, "Your genes may change how this works" to `may-differ`, "Can't tell from this file" to `talk-to-prescriber`, and "Needs a clinician-run calculation" to `talk-to-prescriber`.
8. THE Drug_Result_Helper SHALL include both the Display_Status and the Steering_Level in every drug result.
9. IF a Diplotype_Call is an Indeterminate_Gene_Call, THEN THE Drug_Result_Helper SHALL assign the Gene_Status "Can't tell from this file".
10. WHEN a Diplotype_Call is not an Indeterminate_Gene_Call and has a null phenotype, THE Drug_Result_Helper SHALL assign the Gene_Status "Needs a clinician-run calculation".
11. WHEN a Diplotype_Call is not an Indeterminate_Gene_Call and has a Normal_Phenotype, THE Drug_Result_Helper SHALL assign the Gene_Status "Typical".
12. WHEN a Diplotype_Call is not an Indeterminate_Gene_Call and has a non-null phenotype other than a Normal_Phenotype, THE Drug_Result_Helper SHALL assign the Gene_Status "Your genes may change how this works".
13. FOR ALL drugs in every Therapeutic_Group and all Diplotype_Call lists, calling the Drug_Result_Helper twice with equal inputs SHALL return equal results (determinism).
14. FOR ALL drugs in every Therapeutic_Group and all Diplotype_Call lists, THE Drug_Result_Helper SHALL return a result without throwing.

### Requirement 13: Patient drug result card

**User Story:** As a patient, I want a short, plain card for each medication, so that I know what my result means and where it comes from.

#### Acceptance Criteria

1. THE Drug_Result_Card SHALL display the generic name, the U.S. brand names from `listDrugTherapeuticGroups()`, each Relevant_Gene with its patient-facing phenotype text, the Display_Status as a Status_Chip, a guidance line, and a link labelled "CPIC guideline" to the drug's guideline URL.
2. IF a drug has no U.S. brand names in the data, THEN THE Drug_Result_Card SHALL display "No current U.S. brand name listed".
3. WHERE the Session source is a Sample_Patient, WHEN the Drug_Result_Helper builds the clopidogrel result and the Completeness_Check passes, THE Drug_Result_Helper SHALL call the Patient_Guidance_Lookup with the CYP2C19 result, drug `clopidogrel`, context `acs_pci`, and call status `complete`.
4. WHEN the Patient_Guidance_Lookup returns status `matched`, THE Drug_Result_Card SHALL display the returned patient text as the guidance line, the condition label "For heart attack or heart stent care (ACS/PCI)", and the returned guideline URL.
5. WHEN the Patient_Guidance_Lookup returns `humanClinicalReview: false`, THE Drug_Result_Card SHALL display "Demo wording awaits qualified clinical review."
6. IF the Session source is an Uploaded_File, THEN THE Drug_Result_Helper SHALL use the Generic_Prescriber_Line as the guidance line and skip the Patient_Guidance_Lookup.
7. IF the Patient_Guidance_Lookup was not called or returned a status other than `matched`, THEN THE Drug_Result_Helper SHALL use the Generic_Prescriber_Line as the guidance line.
8. WHEN the Display_Status is "Typical", THE Drug_Result_Card SHALL also display the Typical_Limit_Line.
9. WHEN the drug result includes an Unread_Gene_Line, THE Drug_Result_Card SHALL display it next to the Status_Chip, for both roles, in addition to the guidance line.

### Requirement 14: Clinician drug result card

**User Story:** As a clinician, I want the gene detail and the matching CPIC source rows for each drug, so that I can review the evidence behind the patient card.

#### Acceptance Criteria

1. WHILE the Session role is `clinician`, THE Drug_Result_Card SHALL display all patient card content plus the diplotype and the activity score of each Relevant_Gene.
2. WHILE the Session role is `clinician`, THE Drug_Result_Helper SHALL call the Research_Router once for each Route_Population of the drug, passing the drug, the Route_Population, the Caller_Output, and the Caller_Evidence.
3. IF a drug has no Route_Population, THEN THE Drug_Result_Helper SHALL call the Research_Router once with a null population.
4. WHEN the Research_Router returns Route_Status `source_row_for_clinician_review`, THE Drug_Result_Card SHALL display one row with the population, the CPIC_Classification labelled "CPIC classification (strength)", the recommendation ID, the guideline version, and "Clinical review not complete".
5. WHEN the Research_Router returns any other Route_Status, THE Drug_Result_Card SHALL display one row with the population (or "No population") and the Route_Note for that status.
6. THE Drug_Result_Helper SHALL use these Route_Notes: `unsupported_drug` → "Not in the research index"; `guideline_algorithm_required` → "Requires the CPIC dosing algorithm and clinical factors"; `source_rows_not_indexed` → "CPIC recommendation rows not indexed for this drug"; `context_required` → "Population or clinical context required"; `context_not_indexed` → "Not indexed for this population"; `missing_gene_call` → "A required gene call is missing"; `unverified_gene_call` → "Gene call not verified for source-row lookup"; `activity_score_required` → "Activity score required"; `no_exact_source_row` → "No exact CPIC source row for this result"; `ambiguous_source_rows` → "More than one CPIC source row matched; review the guideline".
7. WHERE the Session source is a Sample_Patient that passes the Completeness_Check, THE Drug_Result_Helper SHALL supply Caller_Evidence for each VCF_Gene with genome build GRCh38, coverage complete, quality pass, the caller version from the `source.tag` of `data/allele-definitions.json`, and the phenotype table version from the `retrievedAt` of `data/cpic-diplotype-phenotypes.json`.
8. IF the Session source is an Uploaded_File or the Completeness_Check fails, THEN THE Drug_Result_Helper SHALL supply empty Caller_Evidence.
9. THE Drug_Result_Card SHALL label clinician-only content as research source rows for clinician review, not patient guidance.

### Requirement 15: Patient-facing safety

**User Story:** As a patient, I want results that never tell me to change my medication, so that treatment decisions stay with my prescriber.

#### Acceptance Criteria

1. WHILE the Session role is `patient`, THE Drug_Result_Helper SHALL return results that exclude diplotypes, activity scores, ambiguous flags, CPIC_Classifications, recommendation IDs, guideline versions, and Route_Notes.
2. WHILE the Session role is `patient`, THE Portal_Page SHALL omit diplotypes, activity scores, ambiguous flags, Diplotype_Call notes, CPIC_Classifications, recommendation IDs, and Route_Notes.
3. FOR ALL Sample_Patients and all drugs in every Therapeutic_Group, every string in the patient-role Drug_Result_Helper output SHALL exclude the case-insensitive substrings "stop", "dose", and "mg".
4. FOR ALL Sample_Patients and all drugs in every Therapeutic_Group, every string in the patient-role Drug_Result_Helper output SHALL exclude every CPIC_Classification value in `data/cpic-recommendation-routes.v1.json`, compared case-insensitively.
5. THE Portal_App SHALL show patient-facing text that contains no dose numbers, mg amounts, dosing frequencies, or CPIC recommendation wording.
6. THE Portal_App SHALL show patient-facing text that contains no instruction to take, start, stop, skip, switch, or change the dose of a medication.
7. THE Portal_App SHALL write every fixed patient-facing string introduced by this feature at a 6th–8th grade reading level, with any technical term paired with a plain explanation.
8. THE Status_Chip SHALL show every Display_Status as an icon plus the status words, with the icon hidden from assistive technology and the words visible.
9. THE Status_Chip SHALL use a check icon for "Typical", an alert icon for "Your genes may change how this works", a question icon for "Can't tell from this file", and a calculator icon for "Needs a clinician-run calculation".

### Requirement 16: Privacy

**User Story:** As a patient, I want my genetic file and form entries to stay on my device, so that my data is never collected.

#### Acceptance Criteria

1. THE Portal_App SHALL parse VCF text and compute Diplotype_Calls and Drug_Result_Helper results in the browser only.
2. THE Portal_App SHALL issue no network request whose URL, headers, or body contains VCF text, parsed variants, Diplotype_Calls, NPI values, Uploaded_File names, or Order_Form values.
3. THE Portal_App SHALL limit network requests made by this feature to static GET requests for application assets and for `/samples/{id}.vcf`.
4. THE Portal_App SHALL add no API route, server action, or other server-side handler for this feature.
5. THE Portal_App SHALL write the Session_Record to `sessionStorage` as the only browser storage written by this feature.
6. THE Portal_App SHALL keep VCF text, parsed results, Diplotype_Calls, and Order_Form values out of `sessionStorage`, `localStorage`, IndexedDB, cookies, and Cache Storage.
7. THE Portal_App SHALL write no VCF text, Diplotype_Calls, NPI values, or Order_Form values to the browser console.

### Requirement 17: Route clean-up

**User Story:** As a user, I want old links to land in the new flow, so that I never reach an outdated page.

#### Acceptance Criteria

1. WHEN a request for `/patient` is received, THE Portal_App SHALL redirect to `/login`.
2. THE Portal_App SHALL keep the `/drugs` page content unchanged apart from the shared root layout and Site_Footer.
3. THE Portal_App SHALL keep `/drugs` reachable from the Portal_Page through the "Browse all medications" link.

### Requirement 18: Visual design and layout

**User Story:** As a user on a phone, I want a calm, readable layout, so that I can trust and use the app on a small screen.

#### Acceptance Criteria

1. THE Portal_App SHALL render every page at a 375 CSS pixel viewport width with no horizontal scrolling.
2. THE Portal_App SHALL use a white or very light neutral page background and one deep teal accent color for primary buttons, links, and selected tabs.
3. THE Portal_App SHALL render cards with `rounded-xl` corners and generous spacing between sections.
4. THE Portal_App SHALL give every page exactly one `h1` heading and use `h2` headings for the page's main sections.
5. THE Portal_App SHALL meet WCAG 2.1 AA contrast: at least 4.5:1 for normal text, and at least 3:1 for large text, icons, focus indicators, and control boundaries.

### Requirement 19: Accessibility

**User Story:** As a keyboard or screen reader user, I want every control to be reachable and announced, so that I can use the whole app without a mouse.

#### Acceptance Criteria

1. THE Portal_App SHALL make every interactive control reachable and operable with the keyboard in a logical focus order.
2. THE Portal_App SHALL show a visible focus indicator on every focusable element.
3. THE Portal_App SHALL associate every form field with a programmatic label.
4. THE Portal_App SHALL show the `*38 (standard)` tooltip on keyboard focus and on pointer hover, and expose the tooltip text through `aria-describedby`.

### Requirement 20: Site footer and data credits

**User Story:** As a visitor, I want every page to state that this is a demo and credit its data sources, so that I understand the app's limits.

#### Acceptance Criteria

1. THE Site_Footer SHALL appear on every page of the Portal_App through the root layout.
2. THE Site_Footer SHALL display "Demo prototype for education only. Not medical advice. Talk to your prescriber or pharmacist."
3. THE Site_Footer SHALL credit "ClinPGx/CPIC (CC BY-SA 4.0)" with a link to the ClinPGx data usage policy URL recorded in the `data/` source metadata.
4. THE Site_Footer SHALL credit NLM RxNorm with the sentence "This product uses publicly available data from the U.S. National Library of Medicine (NLM), National Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and does not endorse or recommend this or any other product."

### Requirement 21: Code reuse and frozen files

**User Story:** As a team member, I want the portal built on the existing PGx engine, so that tested parser, caller, and data stay the single source of truth.

#### Acceptance Criteria

1. THE Portal_App SHALL compute every Caller_Output with `analyzeVcf(text)` from `lib/pgx/analyzeVcf.ts`.
2. THE Drug_Result_Helper SHALL obtain gene–drug pairs from the Pair_Lookup, CPIC source-row routing from the Research_Router, patient guidance text from the Patient_Guidance_Lookup, and categories, generic names, and brand names from `listDrugTherapeuticGroups()`.
3. THE feature SHALL leave `lib/pgx/parseVcf.ts`, `lib/pgx/callStarAlleles.ts`, and every file under `data/` byte-for-byte unchanged.
4. THE feature SHALL keep all existing tests in `tests/` passing.

### Requirement 22: Tests

**User Story:** As a developer, I want example and property-based tests for the helper, so that the status rules and patient safety rules are enforced in CI.

#### Acceptance Criteria

1. WHEN the Drug_Result_Helper evaluates the Maya Sample_Patient with clopidogrel, THE test suite SHALL assert Display_Status "Your genes may change how this works" and a guidance line equal to the Poor Metabolizer patient text in `data/patient-guidance.v1.json`.
2. WHEN the Drug_Result_Helper evaluates the Sam Sample_Patient with simvastatin, THE test suite SHALL assert Display_Status "Your genes may change how this works" with SLCO1B1 phenotype "Decreased Function".
3. WHEN the Drug_Result_Helper evaluates the Alex Sample_Patient with simvastatin, THE test suite SHALL assert Display_Status "Typical".
4. WHEN the Drug_Result_Helper evaluates each Sample_Patient with warfarin, THE test suite SHALL assert Display_Status "Needs a clinician-run calculation".
4a. WHEN the Drug_Result_Helper evaluates each Sample_Patient with amitriptyline, THE test suite SHALL assert Display_Status "Can't tell from this file" and the Unread_Gene_Line "This medication also depends on CYP2D6, which can't be read from this file."
4b. WHEN the Drug_Result_Helper evaluates each Sample_Patient with sertraline, THE test suite SHALL assert the Unread_Gene_Line "This medication also depends on CYP2D6, CYP2B6, SLC6A4, and HTR2A, which can't be read from this file.", and with phenytoin the line naming HLA-B.
5. WHEN the Drug_Result_Helper evaluates the Maya VCF text as an Uploaded_File with clopidogrel, THE test suite SHALL assert the Generic_Prescriber_Line as the guidance line.
6. THE test suite SHALL assert the Display_Status to Steering_Level mapping in Requirement 12, criterion 7.
7. FOR ALL Sample_Patients, both roles, and all drugs in every Therapeutic_Group, THE fast-check test suite SHALL assert that the Drug_Result_Helper returns exactly one of the four Display_Statuses without throwing.
8. FOR ALL Sample_Patients and all drugs in every Therapeutic_Group, THE fast-check test suite SHALL assert that patient-role output excludes "stop", "dose", "mg", and every CPIC_Classification value, compared case-insensitively.
9. FOR ALL generated Diplotype_Call lists and all drugs whose Route_Status is not `guideline_algorithm_required`, THE fast-check test suite SHALL assert that replacing any Relevant_Gene's call with an Indeterminate call yields "Can't tell from this file" (metamorphic property).
10. THE test files SHALL live in `tests/` and run with `npm test`.
11. WHEN the feature is complete, THE project SHALL pass `npm test` and `npm run build`.
