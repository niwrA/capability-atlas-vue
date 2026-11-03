# Capability Atlas — concept and learning workbench

Vue 3 + Vite project using all 3,039 active ESCO v1.2.1 occupations and 13,939 active skill/knowledge concepts, three Atlas-authored life roles, three Atlas-authored profession pilots, and a broad, proposed learning-route scaffold. No server backend or user accounts. Personal goals and manual skill completion are saved in the browser's `localStorage`.

## Project documents

- [README.md](README.md): current application overview, setup, data workflow, and historical notes.
- [PROJECT_GOALS.md](PROJECT_GOALS.md): project direction, intended outcomes, and current coverage.
- [PLANNED_TASKS.md](PLANNED_TASKS.md): completed foundations and the prioritized implementation roadmap.

## Run

```bash
npm install
npm run dev
```

Open the URL displayed by Vite (normally http://localhost:5174). To use another port, run `npm run dev -- --port 5175`. For production: `npm run build`, then deploy `dist/` to any static hosting platform.

The project uses the official `@vitejs/plugin-vue` so Vite can compile Vue single-file components such as `src/App.vue`.

## Data loading and authoring

The browser loads a compact catalogue and complete graph index at startup. Search, routes, and progress use this index; descriptions, assessment criteria, and sources load separately when an item is opened. Missing detail downloads never change required-step counts. Detail requests share in-flight downloads and retain at most twelve batches in memory. A failed request can be retried in the detail panel.

Canonical source records live in `data/`, with `data/manifest.json` listing the ordered files for each section. Array sections are split into batches of 500 records with content hashes in their filenames. Writers publish the manifest atomically after all new files are ready. All original IDs, source fields, assessments, and relationship explanations are preserved. The Python import and expansion scripts use `scripts/dataset_io.py` to read and update this format; run them from the repository root as before.

`npm run dev` and `npm run build` automatically generate the browser files in ignored `public/atlas-data/`. Use `npm run data:build` after editing source data while a dev server is already running, then reload the page. Generated node-detail filenames contain a content hash; the index is revalidated on startup. Deploy the complete `dist/` directory together. Enable gzip or Brotli on the static host, revalidate `atlas-data/index.json`, and allow long caching for the hashed detail files. Existing browser-local goals and assessments keep their IDs.

`npm test` runs Node and Python tests for source reconciliation, interrupted imports, atomic publication, data preservation, graph integrity, download deduplication, retries, cache limits, search, routes, and saved progress. Python 3.10+ must be available as `python`. Progress is calculated for saved goals, the focused item, and visible graph nodes rather than the entire catalogue.

## Workbench navigation

The default screen is a concept inspector. The concept library stays beside the selected record, with name search, type filters, pagination, and sorting by **Most linked**, **Name A-Z**, or **Name Z-A**. Search covers English and Dutch names, occupation codes, and IDs. Link count is the number of direct recorded relationships. Activation frequency is not recorded.

| Area | Purpose |
| --- | --- |
| Inspect / Overview | A prominent concept definition, type, connectivity, activity coverage, and a few related concepts. |
| Inspect / Inputs & outputs | Mapped prerequisites/components, the exact activity brief, and recorded assessment outputs in separate columns. |
| Inspect / Relationships | Up to eight nearby connections, plus every direct relationship in a searchable, sortable, paginated list. |
| Inspect / Evidence & status | Source identity, references, coverage gaps, review evidence, and recorded model progress. |
| Learning workspace | Separate tabs for saved goals, next activities, and learning routes. |
| Catalogue & coverage | Verified source coverage and occupation browsing by classification and activity coverage. |

Click related concepts to inspect them, then use Back/Forward to retrace the inspection path. Library filters remain in place while inspecting different records. Tab groups support Left/Right arrows and Home/End. On a small screen, selecting a concept brings its heading into view.

The functional view describes learning activities, not executable software functions. Inputs are shown only when separately specified or mapped as prerequisites/components; missing specifications remain explicit gaps. Assessment criteria are presented as expected evidence. For occupations and capabilities, downstream relationships describe use rather than function return values. No input/output facts are generated from prose.

Learning state remains browser-local. Save a concept as a goal from the inspector, inspect a next activity before recording completion, or open a goal's learning route. Route graph controls retain depth, optional/completed links, pan/zoom, and the relationship explorer; clicking a graph node opens the inspector. Reset learning is available under Learning workspace / Saved goals.

## Structure

- `data/` — all 3,039 active ESCO occupations, 13,939 active ESCO skill/knowledge concepts, and 126,051 official occupation–skill links; 3 Atlas life roles and 3 Atlas profession pilots; 17,911 existing draft learning units. Three previously represented obsolete skills remain accessible for saved records. Classification records and an import reconciliation report are included separately from the browser graph. `data/manifest.json` lists the current source files.
- `src/App.vue` — tabbed concept inspector, functional I/O views, learning workspace, catalogue, and route graph.
- `src/inspection-model.js` — name search, connectivity ranking, nearby relationships, and functional inspection semantics.
- `src/workbench.css` — responsive workbench layout and presentation.
- `src/style.css` — shared controls and the learning-route graph presentation.

## Catalogue and pathway coverage

The Catalogue & coverage view separates verified ESCO catalogue coverage from Atlas activity coverage. A complete source catalogue can contain occupations with no learning activities or only partial draft breakdowns. Saved goals in the Learning workspace show the same distinction beside recorded model progress.

Open **Catalogue & coverage** to explore all occupations, the ten ISCO major groups, or the separate Atlas life-role and profession categories. Filter by English/Dutch name, occupation code, or activity coverage, then page through the results. Catalogue browsing provides classification and coverage filters alongside the concept library.

The inspector distinguishes missing activities, generated draft activities, other draft activities, and content with a current documented review. Coverage counts required activities; optional or candidate links do not fill required coverage. An item can have a partial breakdown even when some of its activities have been reviewed. Required capabilities still missing activities are listed with links.

When no required activities or connecting route exist, the route view explains the gap and offers **Explore linked capabilities**. General starting suggestions are identified separately from a mapped route to the saved goal. A progress percentage describes represented required items and self-reports, including capabilities without activity breakdowns; it does not measure pathway completeness.

Failed downloads offer **Try again**. Missing or mismatched versioned detail files offer **Reload catalogue**, retaining browser-local goals and learning records. Downloads have a 30-second timeout, and retries revalidate failed detail downloads. Catalogue counts, coverage, and goal controls remain available while selected details load.

## Content reviews

The review register is the object listed as `content_reviews` in `data/manifest.json`. It starts empty: existing source references and draft activities have not been labelled as reviewed. A review records a named reviewer, relevant expertise, a date, a decision, a summary, and linked evidence. Its fingerprint binds that evidence to a specific scope and content version.

| Scope | What is included in the fingerprint |
| --- | --- |
| `activity_content` | The activity's instructions, assessment, and other content fields. |
| `skill_breakdown` | The skill, its activities, decompositions, and represented prerequisite context. |
| `occupation_pathway` | The occupation, required/optional skills, activities, and represented route context. |
| `mapped_learning` | An outcome or qualification, mapped Atlas learning, and represented alignment context. |

A documented review applies only to its recorded scope. Reviewing one activity does not mark its parent occupation as reviewed. Later content or dependency changes mark the review as needing an update. A newer request for changes supersedes an older acceptance. Review history and evidence remain available in the selected-item panel; review does not establish learner competence or qualification attainment.

After an actual review, obtain the current fingerprint:

```bash
node scripts/content-reviews.mjs "TARGET_ID" "SCOPE"
```

Prepare a JSON review record using this shape, replacing all placeholders with the actual review information:

```json
{
  "id": "unique-review-id",
  "target_id": "TARGET_ID",
  "scope": "activity_content",
  "decision": "accepted",
  "reviewer": { "name": "Reviewer name", "expertise": "Relevant expertise" },
  "reviewed_at": "YYYY-MM-DD",
  "summary": "What was checked and the conclusion within that scope.",
  "evidence": [{ "title": "Review evidence", "url": "https://example.org/actual-review" }],
  "content_fingerprint": "FINGERPRINT_FROM_COMMAND"
}
```

Use `changes_requested` instead of `accepted` when revisions are needed. Record the file and rebuild:

```bash
node scripts/content-reviews.mjs --record input/review.json
npm run build
```

The command validates required evidence and target/scope, preserves prior reviews, and publishes the source manifest atomically. Incomplete or duplicate review records fail validation. All review metadata and evidence links are part of the static app's published content.

## Complete catalogue import

The active catalogue is reconciled against the supplied ESCO v1.2.1 JSON-LD ZIP. Put that archive in ignored `input/`, then run:

```bash
python scripts/import_esco_full.py --inventory-only
python scripts/import_esco_full.py
npm run build
```

Use `--archive "path/to/archive.zip"` if more than one ZIP is present. The importer streams the archive without extracting it and keeps resumable SQLite checkpoints in `input/.cache/`, keyed by the archive SHA-256. Repeat imports do not duplicate records or generate learning activities.

The manifest's `esco_full_catalogue_import` section records the source checksum, exact counts, inventory fingerprints, missing fields, obsolete concepts, and link reconciliation. All 126,051 forward occupation?skill properties agree with the corresponding inverse skill?occupation properties. Embedded AssociationObject lists differ and are documented rather than used to override those matching properties.

The inventory includes 464 active skills with no occupation links. Seven obsolete occupations and 318 obsolete skills are excluded from active coverage; three obsolete skills already used by the prototype are retained with their IDs and marked obsolete. Six earlier occupation?skill links were removed from active role requirements after reconciliation; their details are retained in the report. Existing Atlas learning units, assessments, decompositions, and curriculum links are unchanged.

Search includes English and Dutch labels and occupation codes. Obsolete concepts are accessible through saved records or exact-ID search. The inspector shows activity-breakdown coverage separately from catalogue membership. Complete source coverage does not imply complete or reviewed learning pathways.

## Important caveats

- Occupation–skill relationships are ESCO v1.2.1 source records. Their mapping to the original Dutch role names is approximate and still requires review. The 5,869 optional warm-ups, 11,496 new proposed learning steps, and their suggested route links are Atlas proposals, not ESCO records or validated occupational training. Warm-ups do not count toward required-skill progress; the new two-step draft breakdowns do count in Atlas progress. Earlier decompositions, prerequisite links, and specialization links are also Atlas proposals and have not been expert-validated. The three life roles and 36 associated capabilities, and the three profession pilots with 15 associated capabilities and 34 activities, are explicitly Atlas-authored and separate from the ESCO occupation/skill collection. Their four shared practical-foundation activities connect from the existing early-communication and first-addition branches. Profession pathways are draft hypotheses; the primary-teacher profile does not include the Dutch Pabo qualification and must not be read as a credential route. The v0.19 cross-occupation expansion draws on the ISTQB CTFL v4.0.1 syllabus for software testing; Belastingdienst administrative guidance and the IFRS Conceptual Framework for finance; NEN overviews of NEN 1010 and NEN 3140 for electrical work; and V&VN material on the nursing process and clinical reasoning plus the WHO Global Patient Safety Action Plan for health topics. These sources inform learning design; they do not validate Atlas units or replace local requirements and professional review.
- ESCO marks occupation links as essential or optional. Essential skills are usually required across contexts; optional skills may occur depending on employer, work context, or country. Optional links are not alternatives encoded as “choose N from this group”; ESCO relations do not specify a count or a particular employer’s stack. Goal progress for ESCO occupations includes ESCO Essential skills only; Optional links do not add steps to its denominator. Atlas life-role and profession progress includes Atlas core capabilities only; context-dependent links are excluded. The graph and role connection panel label/group both relation types; recommendations identify the source relation. The learner route can still display Optional nodes when that filter is enabled.
- Progress percentages count distinct terminal steps reached through decomposition edges marked `completion_requirement: "required"`; an undecomposed capability counts as one required step. Edges marked optional (and `contains_candidate` links) are shown as excluded optional steps. ESCO occupation goals include ESCO Essential skill roots only; ESCO Optional role skills are excluded. Atlas life-role goals include Atlas core capability roots only; context-dependent capabilities are excluded. Shared terminal steps are counted once per goal. Marking a parent capability complete is an explicit self-attestation of its required descendant steps, saved as a snapshot of the required leaf IDs at that time; it does not change the descendants’ individual completion flags. Adding new steps later does not retroactively count them as assessed. A saved parent completion from before v0.19 has no coverage snapshot, and any assessment snapshot missing newly added leaves needs review. Reopen and re-assess against the current step list. Most detailed Atlas decomposition edges are marked required within the specific draft activity breakdown. The v0.26 first-practice warm-ups remain explicitly optional and are excluded from required-step progress; the two new draft learning steps per previously undecomposed skill count as required Atlas progress but are unvalidated proposals. Steps are equally weighted and Atlas proposals are unvalidated, so the percentage is **not a qualification or mastery score**.
- Recommendations prioritize goals, nearby graph nodes, and proposed `prerequisite_for` links. These proposed links are not validated learning-path advice.
- Manual completion is a demo flag and **not an accredited skill assessment**. Completing a node highlights its proposed next learning nodes.
- No personal information is sent anywhere by the app; browser-local data can be cleared through Reset or browser storage controls.
- This is a first frontend implementation. Before real pupils use it, add backend authentication, teacher roles, appropriate privacy controls and validated capability standards.
- For software developer, ESCO Optional skills are grouped as named technologies, programming approaches/engineering practices, or domain/specialist areas. The groups are descriptive and are not prevalence, specialization-level, or future-demand scores. The pilot has not mapped the named ESCO technologies to measured vacancy mention rates. CBS publishes experimental vacancy-skill frequencies by occupation, education level, and province; UWV reports broader ICT occupation trends. Neither is used here to claim that an individual language or tool is “future-proof.”

## Historical implementation and import notes

The notes below record earlier versions and import stages. Counts within these historical entries describe those stages; use the overview and source data for the current state. The original import report is retained here so the project has three Markdown documents.

<details>
<summary>Implementation history</summary>

### Decomposition pilot v0.5 — supervised basic health observations

The ESCO skill monitor basic patients signs is linked in this supplied ESCO extract as essential for healthcare assistant. It is not source-linked here to the selected nurse occupation, so the prototype does not add that mapping. Five proposed ALUs cover preparing an observation encounter from a supplied care plan, performing one assigned basic observation under its device-specific procedure, recording it objectively, comparing it only with supplied escalation criteria, and reporting a concern through a supplied route.

This is a learning-design scaffold, not clinical instruction. Assessment scenarios are simulated; no measurement technique, threshold, diagnosis, or escalation policy is supplied by Atlas. Real practice requires the current local protocol, qualified supervision, and role authorization. The general comparison ALU is reused as a proposed prerequisite/specialization, while accurate recording and concise handover are only candidate-general reuse hypotheses. V&VN guidance emphasizes person-centred care and noticing health risks in context; the national guideline emphasizes clearly documented local protocols and notes that universal thresholds/procedures cannot be recommended. Sources: [V&VN, Signalering van gezondheidsrisico’s en problemen](https://kennisplatform.venvn.nl/richtlijn/zorg-bij-algemene-dagelijkse-levensverrichtingen-adl/signalering-van-gezondheidsrisico-s-en-problemen) and [Richtlijnendatabase, Signaleren van de vitaal bedreigde patiënt](https://richtlijnendatabase.nl/richtlijn/leidraad_-_vitaal_bedreigde_patient/signaleren_van_de_vitaal_bedreigde_patient.html).

### Decomposition pilot v0.6 — software-development fundamentals

The software developer route now adds eleven Atlas-authored ALUs spanning user needs and requirements, acceptance conditions, flowcharting and small-feature design, a thin prototype, language-neutral programming practice, version control, debugging, library reuse, technical documentation, and revising a feature from clarified feedback. The units connect to the matching ESCO software-developer skill nodes; the requirement-to-acceptance-conditions unit also connects to the existing test-case strand. The proposed prerequisite links create several branches rather than a single mandatory sequence.

Programming practice is deliberately language-neutral. ESCO maps specific languages and tools as optional for this occupation; this pilot does not turn Erlang, VBScript, or any other named language into a universal prerequisite or imply that learners must choose a fixed number from that list. A learner can demonstrate the proposed programming outcome in one language available for the exercise, while a real employer’s stack remains context-dependent.

These outcomes and prerequisites remain Atlas proposals, not official ESCO definitions or expert-validated curriculum. Their broad topic selection is informed by ACM/IEEE software-engineering curriculum guidance on requirements engineering, design, construction, verification and validation, tools and environments, and software evolution. Sources: [ESCO software developer occupation](https://esco.ec.europa.eu/en/classification/occupation?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Foccupation%2Ff2b15a0e-e65a-438a-affb-29b9d50b77d1), [ACM/IEEE CS2023 Software Engineering guidance](https://csed.acm.org/knowledge-areas-software-engineering-se-cs2013-version/), and [ACM CCECC Software Engineering curriculum](https://ccecc.acm.org/guidance/software-engineering).

### Market signals pilot — software-developer optional skills

The software-developer role detail groups ESCO Optional capabilities into three descriptive categories: named languages/frameworks/tools, programming paradigms/engineering practices, and domain/specialist areas. This taxonomy is a navigation aid only. ESCO Optional does not mean rare, fashionable, future-proof, or “choose one from this group.”

The data model keeps three dimensions separate: vacancy mention frequency, skill type/specialization context, and future outlook. Vacancy frequency and individual-skill outlook are explicitly “not assessed per skill” in this release. CBS’s experimental Q1–Q2 2026 table reports how often skills occur in online vacancy texts, split by occupation, education level, and province, using CompetentNL V2. The Atlas has not yet aligned each named ESCO technology to that vocabulary or calculated frequency shares. UWV’s ICT page gives occupation-level labour-market context; it does not justify forecasts for individual languages or products. Sources: [CBS vacancy-skill statistics, Q1–Q2 2026](https://www.cbs.nl/nl-nl/maatwerk/2026/40/skills-vraag-en-aanbod-in-online-vacatures-eerste-en-tweede-kwartaal-2026) and [UWV ICT occupations](https://www.uwv.nl/nl/arbeidsmarktinformatie/sector/ict).

### Decomposition pilot v0.7 — scale increment for software development

This increment adds 63 Atlas-authored ALUs under 27 ESCO software-developer skill nodes: all 13 remaining Essential nodes and 14 selected Optional nodes covering system integration, data migration, UI work, programming paradigms, concurrency, security-rule interpretation, machine learning, IoT and engineering practices. It also adds 108 proposed decomposition/prerequisite relations, bringing the dataset to 101 ALUs and 190 relations. The named language Optional list is not decomposed as dozens of near-duplicate language courses; the existing programming practice remains language-neutral.

The larger batch tests route and graph density, not instructional validity. Sequences and effort ranges are Atlas proposals and need practitioner review and learner calibration. Technical topic selection is informed by ACM/IEEE CS2023 Software Engineering guidance; secure-development boundaries draw on NIST SSDF. Any legal-rule exercise uses only supplied, dated fictional or reviewable source material and is not legal advice. Sources: [ACM/IEEE CS2023 Software Engineering guidance](https://csed.acm.org/knowledge-areas-software-engineering-se-cs2013-version/), [NIST Secure Software Development Framework](https://csrc.nist.gov/projects/SSDF), and [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final).


### Cross-occupation expansion v0.19

This increment adds two proposed activities for each of the 157 previously undecomposed unique ESCO Essential skill nodes across bookkeeper, accountant, healthcare assistant, nurse responsible for general care, electrician, industrial electrician, software developer, and software tester: 314 new learning units, bringing the total to 415. ESCO Essential roots drive role progress; ESCO Optional occupation links remain outside that denominator. New finance activities use fictional workpapers and supplied jurisdiction-specific rules; electrical activities use diagrams or supervised de-energized training rigs; software-testing activities use sample applications and synthetic data; health activities use fictional cases, supervised simulation, current local protocols, and explicit scope/escalation boundaries.

All units remain Atlas-authored proposals that need review by subject-matter experts. Hours are illustrative. Finance exercises do not provide tax or legal advice; electrical material is not a live-work instruction; health material is not clinical guidance or authorization to practise. Parent assessments store the required-step IDs present when the learner confirms them, so newly added children begin unassessed.


### Atlas life roles v0.20

This increment adds three flexible, non-ESCO life roles: **Good friend**, **Parent**, and **Independent adult**. They use 36 reusable Atlas-authored life skills and 72 proposed learning activities (two per skill). The 46 role links are explicitly proposed: Good friend has 9 core and 1 context-dependent capability; Parent has 14 core and 3 context-dependent capabilities; Independent adult has 14 core and 5 context-dependent capabilities.

The interface labels these “Atlas core” and “Atlas context-dependent,” keeping them distinct from ESCO’s source-defined Essential and Optional classifications. Only core capabilities count toward a life-role progress percentage. The roles are a reflective scaffold, not a universal standard or validated assessment. “Independent adult” includes knowing when and how to seek support; it does not mean doing everything alone. Friendship is not treated as a pass/fail test. Parenting activities use fictional scenarios and defer to current local guidance and qualified support.

Topic selection draws on the European Commission JRC LifeComp framework, WHO/UNICEF nurturing-care and parenting guidance, DigComp, the EU/OECD-INFE financial competence framework, and WHO health literacy. These sources inform the draft, but do not validate the Atlas skills or activities.


### Developmental foundations v0.21

This increment adds 14 proposed learning activities: five early communication activities and seven early numeracy activities, plus two caregiver-practice activities. The communication route moves from noticing early signals and reciprocal exchanges toward meaningful words, signs, AAC messages, and short exchanges. It connects into the existing Parent capability **Support play, curiosity, and learning**. The numeracy route moves from noticing small quantities through number words, one-to-one counting, cardinality, and matching quantities to symbols; it continues into concrete first addition and connects to caregiver practice and the existing personal-finance route.

These are suggested learning routes, not fixed ages, universal milestones, diagnosis, or eligibility gates. Children differ in their development and access needs. Spoken language is not the only valid communication mode: the units include signs, gestures, pictures, and AAC. ASHA guidance states there are no prerequisites for considering or introducing AAC, so the route does not make spoken language a condition for communication support. Early numeracy activities use concrete, playful representations and should be adapted to what the learner already understands. The new developmental prerequisite links support route navigation and do not enter role progress percentages; the specific count-and-cardinality and addition skills are decomposed into explicit foundational steps.

Sources informing the draft include [ASHA communication milestones](https://www.asha.org/public/developmental-milestones/communication-milestones-birth-to-1-year/), [ASHA AAC guidance for early intervention](https://www.asha.org/practice/early-intervention-provider-support/augmentative-and-alternative-communication-in-early-intervention/), [Harvard Center on the Developing Child serve-and-return guidance](https://developingchild.harvard.edu/key-concept/serve-and-return/), and the [IES early mathematics practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/18). The references inform the Atlas proposals; they do not validate the activities or the proposed sequence.


### School-to-qualification bridge v0.22

The first curriculum/qualification bridge adds eleven Atlas-authored learning activities from early numeracy into primary-school mathematics and Dutch curriculum outcomes, then aligns selected activities to requirements in the SBB MBO Software developer qualification dossier (profile 25998, dossier 23399; MBO level 4, EQF level 4, effective 2024-08-01). SLO records retain framework code, sector, status, and source links. SBB work-process and generic requirement outcomes remain separate nodes, connected to the diploma by source-backed qualification-requirement links.

The 90 links from learning activities to SLO/SBB outcomes are proposed partial illustrations, not equivalences or evidence that a learner has met the official outcome. Two generic SBB requirements (career and citizenship, English) are currently unmapped. Qualification goal progress counts only mapped Atlas activities and shows official requirement coverage; it is not exam readiness, qualification attainment, or a credential. This is an initial bridge, not comprehensive coverage from first words and calculations through the full school curriculum and all qualifications.


### Learner-state reset and version display v0.23

The Reset learning control clears completed activities, assessment-coverage snapshots, saved goals, and route/focus preferences. The route returns to two parallel early starting points: responding to early communication signals and noticing small quantities. Keeping two starting branches reflects the Atlas model, where communication and number sense are not forced into one universal sequence. After reset, save a goal to trace a route from any represented early branch.

The header version is injected by Vite from the `version` field in `package.json`, so the displayed version follows the project package version on the next Vite startup or production build. A static deployment still needs a newly built and deployed bundle before a browser reload can show a newer release.


The v0.23.1 patch positions both early starting nodes with their route coordinates so the reset view displays the communication and number-sense branches separately.


The v0.23.2 reset route now traverses and displays every currently directed-reachable node from the two early developmental roots (42 nodes in this dataset), including intermediate learning units, capabilities, life and occupational roles, framework outcomes, and the qualification. The route is horizontally scrollable so later layers remain readable.


The v0.23.3 route keeps the zero-learning start for any selected goal until related learning evidence is recorded. If no directional path from the early roots to a selected goal exists yet, it shows the early network and the separate goal with that gap stated. The no-goal map retains its 1-level, 2-level, and full-map control; the default remains 2 levels. Current completions are learner-marked; importing and validating external records such as diploma subject lists is a future capability.


The v0.23.4 control labels the disconnected zero-start view as levels, matching the map-depth behavior shown there.


The v0.23.5 Learn next panel is limited to directly available nodes: developmental roots at zero, or immediate prerequisite/decomposition links after related completed learning. It no longer recommends every node on a saved goal path.


### Contrasting profession pathways v0.24.0

The pilot adds a primary-school teacher, cook, and motor-vehicle mechanic profile to broaden the graph across education, practical food work, and technical diagnosis. Each role has four draft core capabilities with two proposed learning activities each, plus one optional specialist capability with two activities. Four shared practical-foundation activities extend the existing early communication and first-addition branches toward practical texts, routine number problems, and measurement; prerequisite links then connect those foundations to profession-specific activities.

All role links, activities, decompositions, and route prerequisites are Atlas proposals. Reference materials inform topic selection but do not validate the proposed sequences. The teacher profile is explicitly capability-only: independent primary-school teaching in the Netherlands normally requires a recognized Pabo qualification, which is not modeled in this increment. Cook activities defer to current workplace food-safety plans and hygiene codes. Mechanic activities use fictional cases, documents, or simulators and do not authorize real repair or high-voltage work. Sources: [Education Inspectorate — teacher curricula](https://www.onderwijsinspectie.nl/onderwijssectoren/hoger-onderwijs/themaonderzoeken-hoger-onderwijs/lerarenopleidingen-en-de-leraar), [Education Inspectorate — primary-teaching authority](https://www.onderwijsinspectie.nl/onderwijssectoren/primair-onderwijs/onbevoegde-leraren-voor-de-klas-po), [SBB — Kok qualification dossier](https://kwalificaties.s-bb.nl/Handlers/DocumentLibrary.ashx?id=435813), [NVWA — food-safety plan and hygiene code](https://www.nvwa.nl/onderwerpen/voedselveiligheid/voedselveilig-werken-in-horeca-ambacht-en-retail/hygienecode), and [SBB — Autotechniek qualification dossier](https://kwalificaties.s-bb.nl/Handlers/DocumentLibrary.ashx?id=433325).


### Broad ESCO catalogue and skill breakdown v0.26.0

The v0.25 import retains 388 sampled ESCO occupation profiles (including eight earlier profiles), 5,869 skill concepts linked in the sample, and 14,656 new source-backed occupation–skill links across all ten ISCO major groups. The sample preserves ESCO concept identifiers and Essential/Optional relations; it is not a complete ESCO catalogue mirror and has not been independently reconciled against a separate package.

This increment adds two required Atlas-proposed learning activities to each of the 5,748 sampled skills that did not already have a required breakdown. The 121 skills with earlier detailed breakdowns were preserved. The activities use 18 reusable patterns based on ESCO skill/knowledge type and label, with task framing and assessment criteria for communication/service, quantitative work, digital information, care, environmental work, hospitality, logistics, creative production, manufacturing, public safety, planning, inspection, documentation, and related areas. Rare labels use a guided-practice pattern (307 skills in this batch). These are generated drafts, not individually expert-authored curricula.

The two new activities per skill are marked required for Atlas progress and link from the exact ESCO skill node. Their sequence and links from early reading or numeracy foundations are recommended Atlas navigation hypotheses, not official ESCO prerequisites. The existing first-practice activity for every sampled skill remains available as an optional warm-up; its ID was retained so prior learner state remains attached. Optional warm-ups are explicitly not assessments and do not count toward required progress.

The result contains 17,911 learning units and 35,613 decomposition and prerequisite relations. The generated learning content is Atlas-authored from ESCO labels/types, has not been independently or occupationally validated, and does not establish competence, qualification readiness, or authorization to practise. Sensitive, clinical, regulated, and hazardous topics are bounded to supplied references, fictional cases, simulation, learner scope, and escalation where indicated. ESCO source relationships remain unchanged.

### Zero-start graph view v0.27.0

The no-learning route continues to use one “Start at zero” marker, with early communication and number sense shown as parallel developmental branches. Partial activity-to-curriculum links and formal qualification requirement links are not treated as route steps from zero, so SLO outcomes and MBO requirements no longer appear as if a child could reach them immediately. When a goal is selected before any related learning is complete, the early start remains the same and the goal is shown separately. The 1-level, 2-level, and full-learning-map controls remain available.

</details>

<details>
<summary>Original import report (formerly IMPORT_REPORT.md)</summary>

### ESCO 1.2.1 import

Source: user-provided JSON-LD archive. Exact ESCO concept URIs retained. Occupation–skill links are official, classified essential/optional.

#### Selected ESCO occupations (approximate matches to original Dutch pilot roles)

- bookkeeper — http://data.europa.eu/esco/occupation/c3aae59e-1441-4b3e-bdd1-6da50dc7cf42
- accountant — http://data.europa.eu/esco/occupation/eda0d957-3c3c-4139-b89a-a18bc9e18897
- healthcare assistant — http://data.europa.eu/esco/occupation/d38c2107-98f2-47b7-8bb4-f69750d51082
- nurse responsible for general care — http://data.europa.eu/esco/occupation/8d3e8aaa-791b-4c75-a465-f3f827028f50
- electrician — http://data.europa.eu/esco/occupation/4910419f-b4af-4f59-b544-9dbebc8a74f0
- industrial electrician — http://data.europa.eu/esco/occupation/5df63943-f1bc-4438-90f1-92768a7a23c8
- software developer — http://data.europa.eu/esco/occupation/f2b15a0e-e65a-438a-affb-29b9d50b77d1
- software tester — http://data.europa.eu/esco/occupation/106f79e4-6264-45f1-9e7a-297435cd684b

8 ESCO occupations, 365 unique ESCO skills, and 496 source-backed ESCO occupation–skill relationships. The v0.20 Atlas life-role framework adds 3 non-ESCO life roles, 36 Atlas-authored life skills, 46 proposed life-role links, 72 proposed learning units, and 72 required decomposition edges. The v0.21 developmental-foundations increment adds 14 proposed learning units and 22 proposed relations, including 9 new decomposition edges. The combined dataset contains 11 roles, 401 skill capabilities, 542 role–capability links, 512 learning units, and 604 decomposition/prerequisite/specialization relations (including 497 `decomposes_into` edges). The v0.22 increment also adds 19 SLO/SBB framework-outcome records, one SBB Software developer qualification record, 12 official requirement links, and 90 proposed partial learning-unit-to-outcome links.

**Caution:** These ESCO occupation titles are approximations to the eight originally proposed Dutch professions, not verified equivalences. ESCO occupation–skill links are not prerequisite edges. At the time of source import no Atlas decomposition had yet been added; the proposed decompositions are documented separately below.


#### Capability Atlas decomposition pilot v0.1

Added six Atlas-authored learning units under the ESCO skill `execute software tests` (`http://data.europa.eu/esco/skill/913e7e83-b8f8-4574-b1ca-1b38f3fd974a`). They cover identifying testable expectations, deriving test cases, preparing conditions, executing and recording tests, comparing observed and expected results, and reporting reproducible defects. The ESCO source node is unchanged; Atlas units live in a separate `learning_units` collection, and all decomposition and prerequisite relationships are marked `proposed`.

Each learning unit includes an illustrative active-learning time range and draft assessment criteria. Estimates are not empirically calibrated. The cross-context reuse status of “Compare an observation with a stated expectation” is a hypothesis, and this pilot adds no unsupported occupation mappings. Manual completion now allows these proposed units to be marked complete; proposed `prerequisite_for` links surface related next learning units. This is a learner prototype behavior, not formal assessment or expert-approved sequencing.


#### Decomposition pilot v0.2 — tax calculation and percentage foundations

The next source skill is ESCO `calculate tax` (`http://data.europa.eu/esco/skill/2ecf90f1-c511-464b-b26f-598d69182c70`). The supplied dataset links that exact skill to both selected finance occupations: optional for bookkeeper and essential for accountant. The relationship types are preserved as source evidence; they do not mean the learning standard is higher for one job or establish prerequisites.

Six Atlas-authored ALUs now model a bounded exercise: identify the stated tax base and rate from a supplied dated jurisdictional reference; interpret percent as parts per hundred; convert percent to a decimal factor; calculate a percentage of an amount; estimate the result to check plausibility; and apply supplied rounding and recordkeeping instructions. Four units are marked as candidate-general for reuse, but no other occupation mappings have been invented. The exercise explicitly requires supplied, current rules; it does not teach legal selection of tax regimes or provide tax advice.

All six units have illustrative 0.5–3 hour effort ranges, assessment criteria, and proposed decomposition/prerequisite relationships. This continues the path from a professional skill toward arithmetic foundations while keeping the tax-specific context at the top of the branch. Practitioner review and learner calibration are still required.


#### Decomposition pilot v0.3 — electrical measurement and reuse

The ESCO skill `electrical testing methods` (`http://data.europa.eu/esco/skill/c8bd9f9f-0ec6-447a-ab78-ad6eeeed9aa8`) is source-linked to electrician as essential and industrial electrician as optional. This provides a second cross-occupation source skill and a useful context for testing reuse.

Three Atlas-authored ALUs were added: selecting an instrument and range for a specified check, performing and recording a measurement with a supplied safe method, and comparing the reading with specified limits. The last unit is linked by a `specializes` relationship to the existing general ALU `Compare an observation with a stated expectation`. The specialized version adds electrical units, measurement resolution, stated limits, and safety context. The graph also proposes the general comparison unit as a recommended foundation, while explicitly stating that it does not establish electrical competence.

The practical units are safety-critical draft standards. Their effort ranges are illustrative; the selection and performance criteria require review by a qualified electrical practitioner. No new occupational mappings were inferred beyond the existing ESCO links.


#### Decomposition pilot v0.4 — recursive numeracy foundations

The percentage-calculation branch is now decomposed one level further. `Calculate a percentage of an amount` has three lower-level components: multiply a whole number by a one-digit factor, understand decimal place value through hundredths, and scale an integer product using a decimal factor. Whole-number multiplication is further decomposed into representing equal groups and adding within twenty; addition within twenty is decomposed into single-digit addition within ten; that unit depends on counting small sets one-to-one and matching their cardinality to numerals. The single-digit addition assessment explicitly includes `1 + 1 = 2`.

These seven new ALUs are marked candidate-general as foundational numeracy, but the graph adds no new occupation mappings. Each node has draft observable assessment criteria and illustrative 1–4 hour active-learning estimates, assuming stated prerequisites. They remain proposed learning standards; no empirical learning-time study or expert review has been conducted. This recursive branch also tests a stopping principle: stop expanding a unit when it has one coherent outcome and can be demonstrated meaningfully within the target effort range; do not split it into interface actions or arbitrary micro-steps.


#### Decomposition pilot v0.5 — supervised basic health observations

The ESCO skill monitor basic patients signs (http://data.europa.eu/esco/skill/d3b74d50-7fc9-4051-9335-58d129a4a064) is source-linked to healthcare assistant as essential. It is not source-linked to nurse responsible for general care in this selected extract. Five Atlas-authored ALUs model a supervised simulation sequence: prepare an observation encounter from a supplied plan; perform one assigned basic observation with the supplied device-specific procedure; record the value, unit, time and context; compare only with supplied escalation criteria; report through the supplied escalation route. The specific comparison unit specializes the existing general compare-observation ALU.

The prototype contains no clinical techniques, diagnostic guidance, thresholds, or real escalation route. Assessment criteria require fictional scenarios, current local protocols, qualified supervision, and role authorization. Accurate recording and factual handover are marked as candidate-general reuse hypotheses without any new occupation mappings.

This safety boundary is informed by V&VN’s guideline on signalering during ADL care, which frames health-risk noticing in person-centred context, and the Richtlijnendatabase guideline for the deteriorating patient, which says escalation procedures should be clear in local protocols and that universal cut-offs/procedures cannot be recommended. Sources: https://kennisplatform.venvn.nl/richtlijn/zorg-bij-algemene-dagelijkse-levensverrichtingen-adl/signalering-van-gezondheidsrisico-s-en-problemen and https://richtlijnendatabase.nl/richtlijn/leidraad_-_vitaal_bedreigde_patient/signaleren_van_de_vitaal_bedreigde_patient.html.


#### Decomposition pilot v0.6 — software-development fundamentals

Eleven proposed ALUs expand the software developer role beyond its existing software-testing strand. The route covers extracting user needs, writing observable acceptance conditions, mapping control flow, separating design responsibilities, building a thin prototype, implementing and explaining a small function, recording a change in version control, tracing a fault with a debugger, using a library through its documented interface, documenting technical behavior, and revising a feature from clarified feedback. The requirements unit connects to the existing proposed test-case unit. Fifteen prerequisite relations are marked proposed and recommended; they represent learning-design hypotheses and do not establish a compulsory curriculum.

The programming outcome is language-neutral and can be demonstrated in one language available for the exercise. The route does not treat ESCO’s optional language and tool entries (including Erlang and VBScript) as universal prerequisites or as a fixed-number choice group. ESCO source-backed occupation links remain distinct from Atlas-authored learning-unit relations. ACM/IEEE CS2023 and ACM CCECC guidance informed the broad topic selection; the unit definitions, assessment criteria, effort ranges, and sequence still require practitioner review and learner calibration. Sources: [ESCO software developer occupation](https://esco.ec.europa.eu/en/classification/occupation?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Foccupation%2Ff2b15a0e-e65a-438a-affb-29b9d50b77d1), [ACM/IEEE CS2023 Software Engineering guidance](https://csed.acm.org/knowledge-areas-software-engineering-se-cs2013-version/), and [ACM CCECC Software Engineering curriculum](https://ccecc.acm.org/guidance/software-engineering).


#### Market signals pilot — software-developer optional skills

The role detail groups optional capabilities as named languages/frameworks/tools, programming paradigms/engineering practices, or domain/specialist areas. This is a descriptive taxonomy, not a rating of frequency, niche status, or future-proofing. The data separates three dimensions: vacancy mention frequency, skill type/specialization context, and future outlook. Skill-level vacancy rates and individual-skill forecasts remain explicitly unassessed.

CBS publishes experimental Q1–Q2 2026 vacancy-skill frequencies by occupation, education level, and province using CompetentNL V2. The pilot has not yet mapped the named ESCO technologies to CompetentNL concepts or calculated mention rates. UWV provides broader ICT occupation-level labour-market context; it is not used to forecast any named language or product. Sources: [CBS vacancy-skill statistics, Q1–Q2 2026](https://www.cbs.nl/nl-nl/maatwerk/2026/40/skills-vraag-en-aanbod-in-online-vacatures-eerste-en-tweede-kwartaal-2026) and [UWV ICT occupations](https://www.uwv.nl/nl/arbeidsmarktinformatie/sector/ict).


#### Decomposition pilot v0.7 — scale increment for software development

This increment adds 63 proposed ALUs under 27 software-developer ESCO skill nodes: all 13 remaining Essential nodes in the selected ESCO role and 14 representative Optional nodes. The Optional sample covers system integration, data migration, UI work, programming paradigms, concurrency, supplied security-rule interpretation, software anomalies, machine learning, IoT and engineering practices. The increment adds 108 proposed decomposition/prerequisite relations; the full dataset now contains 101 ALUs and 190 decomposition, prerequisite and specialization relations.

The batch tests how route and graph density scale. It does not validate the proposed outcomes, sequencing, or estimated learning times. Named programming-language nodes remain grouped as context-dependent technologies rather than receiving repetitive language-specific beginner decompositions. The topic selection is informed by [ACM/IEEE CS2023 Software Engineering guidance](https://csed.acm.org/knowledge-areas-software-engineering-se-cs2013-version/) and [NIST’s Secure Software Development Framework](https://csrc.nist.gov/projects/SSDF). Legal-rule practice is limited to fictional or supplied dated source material and is not a compliance determination or legal advice; see [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) for secure-development process context.


#### Cross-occupation essential-skill expansion v0.19

The data now decomposes all 185 unique ESCO Essential skill roots linked to the eight selected occupations. This increment adds two Atlas-authored learning activities to each of the 157 roots that were previously undecomposed: 314 new units and 314 required decomposition edges, bringing the dataset to 415 learning units and 416 decomposition edges. Shared ESCO skill nodes are decomposed once and reused across the occupations that link to them. The source-backed activities are classified by finance, electrical work, software testing, health, or cross-occupational reasoning.

Learning designs are informed by the ISTQB CTFL v4.0.1 syllabus, Belastingdienst administrative guidance, the IFRS Conceptual Framework, NEN overviews of NEN 1010 and NEN 3140, V&VN nursing-process and clinical-reasoning material, and the WHO Global Patient Safety Action Plan. Finance scenarios use fictional workpapers and supplied jurisdiction-specific rules; electrical scenarios use diagrams or supervised de-energized equipment; health scenarios use fictional cases, local protocols, supervision, and scope boundaries. None of these Atlas proposals is expert-validated or an operational professional protocol.


#### Atlas life-role framework v0.20

Added three Atlas-authored, non-ESCO life roles: Good friend, Parent, and Independent adult. The model includes 36 reusable capabilities, with 9/14/14 core capabilities and 1/3/5 context-dependent capabilities for those roles respectively. Each capability has two draft learning activities, producing 72 proposed units and 72 required decomposition edges. These join the existing 415 occupational learning units for a total of 487.

Role links use proposed relation types `atlas_required` and `atlas_optional`, presented in the UI as “Atlas core” and “Atlas context-dependent.” They are not ESCO Essential/Optional classifications. Only Atlas core capabilities contribute to life-role progress. All life-role content is explicitly Atlas-authored, reflective, non-prescriptive, and unvalidated. The “Independent adult” role includes seeking support; it does not equate independence with self-sufficiency.

Topic selection is informed by the European Commission JRC LifeComp conceptual framework, WHO/UNICEF/World Bank nurturing care material, UNICEF parenting guidance for adolescents, European Commission DigComp, EU/OECD-INFE adult financial competence, and WHO health literacy. These sources inform topic coverage, not validation of the Atlas content.


#### Developmental foundations v0.21

Fourteen proposed learning activities extend the graph toward early communication and first calculations: five communication units, seven numeracy units, and two caregiver-practice units. The communication strand covers responsive attention and turn-taking, meaningful symbols and early messages, and short exchanges. It links into Parent’s **Support play, curiosity, and learning** capability. The math strand covers small quantities, early number words, one-to-one counting, cardinality, quantity-word-numeral mapping, combining sets, and representing first addition. It decomposes the existing count-and-cardinality and single-digit-addition activities into clearer foundational steps; later in the route, addition within twenty links to personal-finance practice.

The proposed route relations are learning-design suggestions, not universal developmental prerequisites or age thresholds. They are not screening criteria or a diagnosis. ASHA guidance says there are no prerequisites for considering AAC; the content treats speech, sign, gesture, pictures, and AAC as valid communication forms and never requires speech before AAC. Learning-route prerequisites are navigation links and do not enter role progress percentages. The new decomposition steps do affect progress for the specific counting and first-addition learning units.

The draft is informed by ASHA communication milestones and early-intervention AAC guidance, Harvard Center on the Developing Child serve-and-return material, and IES early mathematics practice guidance. Sources: https://www.asha.org/public/developmental-milestones/communication-milestones-birth-to-1-year/ ; https://www.asha.org/practice/early-intervention-provider-support/augmentative-and-alternative-communication-in-early-intervention/ ; https://developingchild.harvard.edu/key-concept/serve-and-return/ ; https://ies.ed.gov/ncee/wwc/PracticeGuide/18. These references inform topic selection but do not validate the Atlas units or sequencing.


#### School-to-qualification bridge v0.22

This increment adds 11 proposed school-facing learning activities: accessible short-text understanding, purposeful writing and conversation, whole-number place value and operations, decimals, common fractions, ratios/percentages, data displays, and a technical-result presentation. Six Atlas-proposed prerequisite relations connect the new school numeracy sequence with the existing early numeracy foundations. These activities intentionally avoid fixed age assumptions and permit spoken, signed, written, or AAC-supported responses where appropriate.

Official SLO primary Dutch and mathematics and lower-secondary mathematics outcomes are stored as `framework_outcomes`, distinct from learning activities. The SBB software developer dossier is represented as one formal MBO level 4 qualification (profile 25998, dossier 23399; effective 2024-08-01), with its eight work-process outcomes and four generic requirements as separate official outcome nodes. The 12 requirement-to-qualification edges are source-backed. Ninety Atlas activity-to-outcome links are explicitly marked as proposed partial illustrations. Career and citizenship and English remain unmapped, and the UI reports mapping coverage separately from Atlas activity progress. No Atlas progress percentage implies official attainment, examination readiness, EQF/NLQF assessment, or diploma award.

SLO records link to the 2025 revised kerndoelen documents and current SLO status page; SBB records link to the current Software developer qualification dossier. Source metadata is stored on each official outcome and qualification node for inspection in the application. This is a small initial bridge across school and vocational education, not an exhaustive national curriculum or a complete birth-to-lifelong-learning progression.


#### Broad ESCO catalogue sample v0.25.0

Source: the official ESCO v1.2.1 Web-service API (`https://ec.europa.eu/esco/api/search`), queried in English with full occupation search results and `viewObsolete=false`. The API returned 3,039 current search records. A systematic sample selected up to 40 occupation records per ISCO major group, spread across occupation codes: group 0 had 21 available records and groups 1–9 had 40 each. One sampled occupation was already represented in the project, so 380 new occupation profiles were added. The sample contains 388 ESCO occupation profiles in total, including the eight earlier profiles.

The import adds 5,869 unique ESCO skill concepts linked by the selected occupations and 14,656 source-backed occupation–skill links: 7,957 `hasEssentialSkill` and 6,699 `hasOptionalSkill` relationships. It preserves official concept URIs, English relation labels, Dutch preferred occupation labels when supplied, ISCO codes, and the source relation property. Official ESCO Essential and Optional links remain distinct from Atlas learning links. The sample is not a complete catalogue mirror and has not been independently reconciled against a separate ESCO package.

The import initially attached one generic optional first-practice activity per represented skill. Those activities remain optional orientation scaffolds, not assessments or skill breakdowns. Their IDs are retained in v0.26 so any saved learner state remains attached.

#### ESCO skill breakdown scale increment v0.26.0

Two required Atlas-proposed learning activities are added to each of 5,748 sampled skill nodes that lacked a required breakdown; 121 earlier detailed breakdowns were preserved. This adds 11,496 learning units, 11,496 required skill-to-activity decomposition edges, and 11,635 recommended prerequisite relations. Recommended links suggest sequencing the context-setting task before the bounded application and connect the first task to practical-reading foundations; 139 quantitative skills also receive a numeracy bridge. Counts overlap because these are route edges, not additional required steps.

The rule-based content uses 18 activity patterns derived from the ESCO labels and skill/knowledge types. Families include knowledge, operation, communication, manufacturing, analysis, regulation/quality, coordination, documentation, environment/agriculture, craft, digital skills, transport, hospitality, quantitative work, healthcare, public safety, and military governance. A guided-practice fallback is used for 307 rarer labels. The activities include task framing and observable assessment criteria but are generated pattern applications rather than individually expert-authored curricula.

The activity definitions, assessment criteria, effort estimates, and proposed prerequisites are Atlas content, not ESCO learning outcomes. They are not independently or occupationally validated. Regulated, clinical, public-safety, military, and hazardous topics use supplied current references, fictional cases or simulations, learner-scope limits, and escalation framing where indicated. The app’s required-step percentage now includes these draft activities; it is a progress indicator for the proposed graph, not a qualification or mastery score. ESCO occupation–skill links and Essential/Optional classifications remain unchanged.


#### Zero-start graph view v0.27.0

The no-learning route retains a single “Start at zero” marker with early communication and number sense as parallel developmental branches. The graph previously traversed `supports_outcome` and `qualification_requirement` links as if they were learning-route edges. Because these relationships represent partial curriculum alignment or formal requirement structure, they could place SLO outcomes or MBO requirements beside the earliest learning activities. Zero-state traversal now excludes those two relation types. If a goal is selected before related learning is recorded, the same early start remains and the goal is displayed separately. This changes navigation presentation only; source outcome links and qualification data are preserved.

</details>
