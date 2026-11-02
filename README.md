# Capability Atlas — Vue learner-first prototype

Vue 3 + Vite project using 388 ESCO v1.2.1 occupations, three Atlas-authored life roles, three Atlas-authored profession pilots, and a broad, proposed learning-route scaffold. No server backend or user accounts. Personal goals and manual skill completion are saved in the browser's `localStorage`.

## Run

```bash
npm install
npm run dev
```

Open the URL displayed by Vite (normally http://localhost:5174). To use another port, run `npm run dev -- --port 5175`. For production: `npm run build`, then deploy `dist/` to any static hosting platform.

The project uses the official `@vitejs/plugin-vue` so Vite can compile Vue single-file components such as `src/App.vue`.

## Main functions

- Learner-first default screen: goal progress, recommendations, and manual completion; the graph opens as a learner route from marked completions (or possible starting points) toward a saved goal, with a separate relationship-explorer mode. Hide completed capabilities in either graph view; the focused node remains visible in the relationship explorer, and the goal remains visible in the learning route.
- Favorite a role, skill, learning activity, curriculum outcome, or qualification as a goal; see mapped progress in the goal card, detail panel and graph-node progress ring.
- Reset learning state with one action: completed learning and assessment snapshots are cleared, saved goals are removed, and the route returns to one zero-start marker with communication and number sense as parallel early-development branches. New users begin at the same point.
- Search roles, skills, curriculum outcomes, and qualifications; in the relationship explorer, click any graph node to recenter the local 1- or 2-hop view. In learner-route mode, arrows run left to right from completed/possible starting nodes through represented learning units to the selected saved goal. Choose a 1-step, 2-step, or full-route horizon; the goal stays visible and deeper paths collapse into a summary node. When focused on an ESCO occupation, Essential skill nodes are larger and prioritized; for Atlas roles, Atlas core capabilities are larger. Hide/show Optional or context-dependent links with the graph control. The software-developer detail groups optional skills by type and explains which market signals are measured, unavailable, or still unassessed.
- Drag to pan, wheel to zoom, use keyboard Enter/Space to focus a node. The package version is shown beside “Learner prototype” in the top-left header.
- Right-hand sidebar with links and provenance; status and favorites are locally persistent.

At zero learning, the route shows only connected learning nodes from that single early-development start. Partial links to school curriculum outcomes and formal qualifications do not appear as immediate learning steps. With a goal selected but no related learning completed, the same start remains visible and the goal is shown separately.

## Structure

- `src/data.json` — 388 ESCO occupations (the original 8 plus 380 selected across the ten ISCO major groups), 3 Atlas life roles, and 3 Atlas profession pilots; 5,979 ESCO skills, 36 life-role capabilities, and 15 profession capabilities; 15,152 source-backed ESCO occupation–skill mappings in total, plus the Atlas role links. The dataset contains 17,911 Atlas-proposed learning units, including 5,869 optional warm-ups and 11,496 new required draft activities. It has 17,892 `decomposes_into` edges in 35,613 total decomposition, prerequisite, and specialization relations. The v0.22 bridge adds 19 official SLO/SBB outcome records, one SBB MBO Software developer qualification, 12 official qualification requirement links, and 90 proposed partial links from Atlas activities to those outcomes.
- `src/App.vue` — learner dashboard, graph traversal, goal recommendations, manual progress for ESCO skills and proposed learning units, mapped curriculum outcomes, and qualifications, and the neighborhood SVG.
- `src/style.css` — UI and responsive styles.

## Important caveats

- Occupation–skill relationships are ESCO v1.2.1 source records. Their mapping to the original Dutch role names is approximate and still requires review. The 5,869 optional warm-ups, 11,496 new proposed learning steps, and their suggested route links are Atlas proposals, not ESCO records or validated occupational training. Warm-ups do not count toward required-skill progress; the new two-step draft breakdowns do count in Atlas progress. Earlier decompositions, prerequisite links, and specialization links are also Atlas proposals and have not been expert-validated. The three life roles and 36 associated capabilities, and the three profession pilots with 15 associated capabilities and 34 activities, are explicitly Atlas-authored and separate from the ESCO occupation/skill collection. Their four shared practical-foundation activities connect from the existing early-communication and first-addition branches. Profession pathways are draft hypotheses; the primary-teacher profile does not include the Dutch Pabo qualification and must not be read as a credential route. The v0.19 cross-occupation expansion draws on the ISTQB CTFL v4.0.1 syllabus for software testing; Belastingdienst administrative guidance and the IFRS Conceptual Framework for finance; NEN overviews of NEN 1010 and NEN 3140 for electrical work; and V&VN material on the nursing process and clinical reasoning plus the WHO Global Patient Safety Action Plan for health topics. These sources inform learning design; they do not validate Atlas units or replace local requirements and professional review.
- ESCO marks occupation links as essential or optional. Essential skills are usually required across contexts; optional skills may occur depending on employer, work context, or country. Optional links are not alternatives encoded as “choose N from this group”; ESCO relations do not specify a count or a particular employer’s stack. Goal progress for ESCO occupations includes ESCO Essential skills only; Optional links do not add steps to its denominator. Atlas life-role and profession progress includes Atlas core capabilities only; context-dependent links are excluded. The graph and role connection panel label/group both relation types; recommendations identify the source relation. The learner route can still display Optional nodes when that filter is enabled.
- Progress percentages count distinct terminal steps reached through decomposition edges marked `completion_requirement: "required"`; an undecomposed capability counts as one required step. Edges marked optional (and `contains_candidate` links) are shown as excluded optional steps. ESCO occupation goals include ESCO Essential skill roots only; ESCO Optional role skills are excluded. Atlas life-role goals include Atlas core capability roots only; context-dependent capabilities are excluded. Shared terminal steps are counted once per goal. Marking a parent capability complete is an explicit self-attestation of its required descendant steps, saved as a snapshot of the required leaf IDs at that time; it does not change the descendants’ individual completion flags. Adding new steps later does not retroactively count them as assessed. A saved parent completion from before v0.19 has no coverage snapshot, and any assessment snapshot missing newly added leaves needs review. Reopen and re-assess against the current step list. Most detailed Atlas decomposition edges are marked required within the specific draft activity breakdown. The v0.26 first-practice warm-ups remain explicitly optional and are excluded from required-step progress; the two new draft learning steps per previously undecomposed skill count as required Atlas progress but are unvalidated proposals. Steps are equally weighted and Atlas proposals are unvalidated, so the percentage is **not a qualification or mastery score**.
- Recommendations prioritize goals, nearby graph nodes, and proposed `prerequisite_for` links. These proposed links are not validated learning-path advice.
- Manual completion is a demo flag and **not an accredited skill assessment**. Completing a node highlights its proposed next learning nodes.
- No personal information is sent anywhere by the app; browser-local data can be cleared through Reset or browser storage controls.
- This is a first frontend implementation. Before real pupils use it, add backend authentication, teacher roles, appropriate privacy controls and validated capability standards.
- For software developer, ESCO Optional skills are grouped as named technologies, programming approaches/engineering practices, or domain/specialist areas. The groups are descriptive and are not prevalence, specialization-level, or future-demand scores. The pilot has not mapped the named ESCO technologies to measured vacancy mention rates. CBS publishes experimental vacancy-skill frequencies by occupation, education level, and province; UWV reports broader ICT occupation trends. Neither is used here to claim that an individual language or tool is “future-proof.”


## Decomposition pilot v0.5 — supervised basic health observations

The ESCO skill monitor basic patients signs is linked in this supplied ESCO extract as essential for healthcare assistant. It is not source-linked here to the selected nurse occupation, so the prototype does not add that mapping. Five proposed ALUs cover preparing an observation encounter from a supplied care plan, performing one assigned basic observation under its device-specific procedure, recording it objectively, comparing it only with supplied escalation criteria, and reporting a concern through a supplied route.

This is a learning-design scaffold, not clinical instruction. Assessment scenarios are simulated; no measurement technique, threshold, diagnosis, or escalation policy is supplied by Atlas. Real practice requires the current local protocol, qualified supervision, and role authorization. The general comparison ALU is reused as a proposed prerequisite/specialization, while accurate recording and concise handover are only candidate-general reuse hypotheses. V&VN guidance emphasizes person-centred care and noticing health risks in context; the national guideline emphasizes clearly documented local protocols and notes that universal thresholds/procedures cannot be recommended. Sources: [V&VN, Signalering van gezondheidsrisico’s en problemen](https://kennisplatform.venvn.nl/richtlijn/zorg-bij-algemene-dagelijkse-levensverrichtingen-adl/signalering-van-gezondheidsrisico-s-en-problemen) and [Richtlijnendatabase, Signaleren van de vitaal bedreigde patiënt](https://richtlijnendatabase.nl/richtlijn/leidraad_-_vitaal_bedreigde_patient/signaleren_van_de_vitaal_bedreigde_patient.html).

## Decomposition pilot v0.6 — software-development fundamentals

The software developer route now adds eleven Atlas-authored ALUs spanning user needs and requirements, acceptance conditions, flowcharting and small-feature design, a thin prototype, language-neutral programming practice, version control, debugging, library reuse, technical documentation, and revising a feature from clarified feedback. The units connect to the matching ESCO software-developer skill nodes; the requirement-to-acceptance-conditions unit also connects to the existing test-case strand. The proposed prerequisite links create several branches rather than a single mandatory sequence.

Programming practice is deliberately language-neutral. ESCO maps specific languages and tools as optional for this occupation; this pilot does not turn Erlang, VBScript, or any other named language into a universal prerequisite or imply that learners must choose a fixed number from that list. A learner can demonstrate the proposed programming outcome in one language available for the exercise, while a real employer’s stack remains context-dependent.

These outcomes and prerequisites remain Atlas proposals, not official ESCO definitions or expert-validated curriculum. Their broad topic selection is informed by ACM/IEEE software-engineering curriculum guidance on requirements engineering, design, construction, verification and validation, tools and environments, and software evolution. Sources: [ESCO software developer occupation](https://esco.ec.europa.eu/en/classification/occupation?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Foccupation%2Ff2b15a0e-e65a-438a-affb-29b9d50b77d1), [ACM/IEEE CS2023 Software Engineering guidance](https://csed.acm.org/knowledge-areas-software-engineering-se-cs2013-version/), and [ACM CCECC Software Engineering curriculum](https://ccecc.acm.org/guidance/software-engineering).

## Market signals pilot — software-developer optional skills

The software-developer role detail groups ESCO Optional capabilities into three descriptive categories: named languages/frameworks/tools, programming paradigms/engineering practices, and domain/specialist areas. This taxonomy is a navigation aid only. ESCO Optional does not mean rare, fashionable, future-proof, or “choose one from this group.”

The data model keeps three dimensions separate: vacancy mention frequency, skill type/specialization context, and future outlook. Vacancy frequency and individual-skill outlook are explicitly “not assessed per skill” in this release. CBS’s experimental Q1–Q2 2026 table reports how often skills occur in online vacancy texts, split by occupation, education level, and province, using CompetentNL V2. The Atlas has not yet aligned each named ESCO technology to that vocabulary or calculated frequency shares. UWV’s ICT page gives occupation-level labour-market context; it does not justify forecasts for individual languages or products. Sources: [CBS vacancy-skill statistics, Q1–Q2 2026](https://www.cbs.nl/nl-nl/maatwerk/2026/40/skills-vraag-en-aanbod-in-online-vacatures-eerste-en-tweede-kwartaal-2026) and [UWV ICT occupations](https://www.uwv.nl/nl/arbeidsmarktinformatie/sector/ict).

## Decomposition pilot v0.7 — scale increment for software development

This increment adds 63 Atlas-authored ALUs under 27 ESCO software-developer skill nodes: all 13 remaining Essential nodes and 14 selected Optional nodes covering system integration, data migration, UI work, programming paradigms, concurrency, security-rule interpretation, machine learning, IoT and engineering practices. It also adds 108 proposed decomposition/prerequisite relations, bringing the dataset to 101 ALUs and 190 relations. The named language Optional list is not decomposed as dozens of near-duplicate language courses; the existing programming practice remains language-neutral.

The larger batch tests route and graph density, not instructional validity. Sequences and effort ranges are Atlas proposals and need practitioner review and learner calibration. Technical topic selection is informed by ACM/IEEE CS2023 Software Engineering guidance; secure-development boundaries draw on NIST SSDF. Any legal-rule exercise uses only supplied, dated fictional or reviewable source material and is not legal advice. Sources: [ACM/IEEE CS2023 Software Engineering guidance](https://csed.acm.org/knowledge-areas-software-engineering-se-cs2013-version/), [NIST Secure Software Development Framework](https://csrc.nist.gov/projects/SSDF), and [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final).


## Cross-occupation expansion v0.19

This increment adds two proposed activities for each of the 157 previously undecomposed unique ESCO Essential skill nodes across bookkeeper, accountant, healthcare assistant, nurse responsible for general care, electrician, industrial electrician, software developer, and software tester: 314 new learning units, bringing the total to 415. ESCO Essential roots drive role progress; ESCO Optional occupation links remain outside that denominator. New finance activities use fictional workpapers and supplied jurisdiction-specific rules; electrical activities use diagrams or supervised de-energized training rigs; software-testing activities use sample applications and synthetic data; health activities use fictional cases, supervised simulation, current local protocols, and explicit scope/escalation boundaries.

All units remain Atlas-authored proposals that need review by subject-matter experts. Hours are illustrative. Finance exercises do not provide tax or legal advice; electrical material is not a live-work instruction; health material is not clinical guidance or authorization to practise. Parent assessments store the required-step IDs present when the learner confirms them, so newly added children begin unassessed.


## Atlas life roles v0.20

This increment adds three flexible, non-ESCO life roles: **Good friend**, **Parent**, and **Independent adult**. They use 36 reusable Atlas-authored life skills and 72 proposed learning activities (two per skill). The 46 role links are explicitly proposed: Good friend has 9 core and 1 context-dependent capability; Parent has 14 core and 3 context-dependent capabilities; Independent adult has 14 core and 5 context-dependent capabilities.

The interface labels these “Atlas core” and “Atlas context-dependent,” keeping them distinct from ESCO’s source-defined Essential and Optional classifications. Only core capabilities count toward a life-role progress percentage. The roles are a reflective scaffold, not a universal standard or validated assessment. “Independent adult” includes knowing when and how to seek support; it does not mean doing everything alone. Friendship is not treated as a pass/fail test. Parenting activities use fictional scenarios and defer to current local guidance and qualified support.

Topic selection draws on the European Commission JRC LifeComp framework, WHO/UNICEF nurturing-care and parenting guidance, DigComp, the EU/OECD-INFE financial competence framework, and WHO health literacy. These sources inform the draft, but do not validate the Atlas skills or activities.


## Developmental foundations v0.21

This increment adds 14 proposed learning activities: five early communication activities and seven early numeracy activities, plus two caregiver-practice activities. The communication route moves from noticing early signals and reciprocal exchanges toward meaningful words, signs, AAC messages, and short exchanges. It connects into the existing Parent capability **Support play, curiosity, and learning**. The numeracy route moves from noticing small quantities through number words, one-to-one counting, cardinality, and matching quantities to symbols; it continues into concrete first addition and connects to caregiver practice and the existing personal-finance route.

These are suggested learning routes, not fixed ages, universal milestones, diagnosis, or eligibility gates. Children differ in their development and access needs. Spoken language is not the only valid communication mode: the units include signs, gestures, pictures, and AAC. ASHA guidance states there are no prerequisites for considering or introducing AAC, so the route does not make spoken language a condition for communication support. Early numeracy activities use concrete, playful representations and should be adapted to what the learner already understands. The new developmental prerequisite links support route navigation and do not enter role progress percentages; the specific count-and-cardinality and addition skills are decomposed into explicit foundational steps.

Sources informing the draft include [ASHA communication milestones](https://www.asha.org/public/developmental-milestones/communication-milestones-birth-to-1-year/), [ASHA AAC guidance for early intervention](https://www.asha.org/practice/early-intervention-provider-support/augmentative-and-alternative-communication-in-early-intervention/), [Harvard Center on the Developing Child serve-and-return guidance](https://developingchild.harvard.edu/key-concept/serve-and-return/), and the [IES early mathematics practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/18). The references inform the Atlas proposals; they do not validate the activities or the proposed sequence.


## School-to-qualification bridge v0.22

The first curriculum/qualification bridge adds eleven Atlas-authored learning activities from early numeracy into primary-school mathematics and Dutch curriculum outcomes, then aligns selected activities to requirements in the SBB MBO Software developer qualification dossier (profile 25998, dossier 23399; MBO level 4, EQF level 4, effective 2024-08-01). SLO records retain framework code, sector, status, and source links. SBB work-process and generic requirement outcomes remain separate nodes, connected to the diploma by source-backed qualification-requirement links.

The 90 links from learning activities to SLO/SBB outcomes are proposed partial illustrations, not equivalences or evidence that a learner has met the official outcome. Two generic SBB requirements (career and citizenship, English) are currently unmapped. Qualification goal progress counts only mapped Atlas activities and shows official requirement coverage; it is not exam readiness, qualification attainment, or a credential. This is an initial bridge, not comprehensive coverage from first words and calculations through the full school curriculum and all qualifications.


## Learner-state reset and version display v0.23

The Reset learning control clears completed activities, assessment-coverage snapshots, saved goals, and route/focus preferences. The route returns to two parallel early starting points: responding to early communication signals and noticing small quantities. Keeping two starting branches reflects the Atlas model, where communication and number sense are not forced into one universal sequence. After reset, save a goal to trace a route from any represented early branch.

The header version is injected by Vite from the `version` field in `package.json`, so the displayed version follows the project package version on the next Vite startup or production build. A static deployment still needs a newly built and deployed bundle before a browser reload can show a newer release.


The v0.23.1 patch positions both early starting nodes with their route coordinates so the reset view displays the communication and number-sense branches separately.


The v0.23.2 reset route now traverses and displays every currently directed-reachable node from the two early developmental roots (42 nodes in this dataset), including intermediate learning units, capabilities, life and occupational roles, framework outcomes, and the qualification. The route is horizontally scrollable so later layers remain readable.


The v0.23.3 route keeps the zero-learning start for any selected goal until related learning evidence is recorded. If no directional path from the early roots to a selected goal exists yet, it shows the early network and the separate goal with that gap stated. The no-goal map retains its 1-level, 2-level, and full-map control; the default remains 2 levels. Current completions are learner-marked; importing and validating external records such as diploma subject lists is a future capability.


The v0.23.4 control labels the disconnected zero-start view as levels, matching the map-depth behavior shown there.


The v0.23.5 Learn next panel is limited to directly available nodes: developmental roots at zero, or immediate prerequisite/decomposition links after related completed learning. It no longer recommends every node on a saved goal path.


## Contrasting profession pathways v0.24.0

The pilot adds a primary-school teacher, cook, and motor-vehicle mechanic profile to broaden the graph across education, practical food work, and technical diagnosis. Each role has four draft core capabilities with two proposed learning activities each, plus one optional specialist capability with two activities. Four shared practical-foundation activities extend the existing early communication and first-addition branches toward practical texts, routine number problems, and measurement; prerequisite links then connect those foundations to profession-specific activities.

All role links, activities, decompositions, and route prerequisites are Atlas proposals. Reference materials inform topic selection but do not validate the proposed sequences. The teacher profile is explicitly capability-only: independent primary-school teaching in the Netherlands normally requires a recognized Pabo qualification, which is not modeled in this increment. Cook activities defer to current workplace food-safety plans and hygiene codes. Mechanic activities use fictional cases, documents, or simulators and do not authorize real repair or high-voltage work. Sources: [Education Inspectorate — teacher curricula](https://www.onderwijsinspectie.nl/onderwijssectoren/hoger-onderwijs/themaonderzoeken-hoger-onderwijs/lerarenopleidingen-en-de-leraar), [Education Inspectorate — primary-teaching authority](https://www.onderwijsinspectie.nl/onderwijssectoren/primair-onderwijs/onbevoegde-leraren-voor-de-klas-po), [SBB — Kok qualification dossier](https://kwalificaties.s-bb.nl/Handlers/DocumentLibrary.ashx?id=435813), [NVWA — food-safety plan and hygiene code](https://www.nvwa.nl/onderwerpen/voedselveiligheid/voedselveilig-werken-in-horeca-ambacht-en-retail/hygienecode), and [SBB — Autotechniek qualification dossier](https://kwalificaties.s-bb.nl/Handlers/DocumentLibrary.ashx?id=433325).


## Broad ESCO catalogue and skill breakdown v0.26.0

The v0.25 import retains 388 sampled ESCO occupation profiles (including eight earlier profiles), 5,869 skill concepts linked in the sample, and 14,656 new source-backed occupation–skill links across all ten ISCO major groups. The sample preserves ESCO concept identifiers and Essential/Optional relations; it is not a complete ESCO catalogue mirror and has not been independently reconciled against a separate package.

This increment adds two required Atlas-proposed learning activities to each of the 5,748 sampled skills that did not already have a required breakdown. The 121 skills with earlier detailed breakdowns were preserved. The activities use 18 reusable patterns based on ESCO skill/knowledge type and label, with task framing and assessment criteria for communication/service, quantitative work, digital information, care, environmental work, hospitality, logistics, creative production, manufacturing, public safety, planning, inspection, documentation, and related areas. Rare labels use a guided-practice pattern (307 skills in this batch). These are generated drafts, not individually expert-authored curricula.

The two new activities per skill are marked required for Atlas progress and link from the exact ESCO skill node. Their sequence and links from early reading or numeracy foundations are recommended Atlas navigation hypotheses, not official ESCO prerequisites. The existing first-practice activity for every sampled skill remains available as an optional warm-up; its ID was retained so prior learner state remains attached. Optional warm-ups are explicitly not assessments and do not count toward required progress.

The result contains 17,911 learning units and 35,613 decomposition and prerequisite relations. The generated learning content is Atlas-authored from ESCO labels/types, has not been independently or occupationally validated, and does not establish competence, qualification readiness, or authorization to practise. Sensitive, clinical, regulated, and hazardous topics are bounded to supplied references, fictional cases, simulation, learner scope, and escalation where indicated. ESCO source relationships remain unchanged.

## Zero-start graph view v0.27.0

The no-learning route continues to use one “Start at zero” marker, with early communication and number sense shown as parallel developmental branches. Partial activity-to-curriculum links and formal qualification requirement links are not treated as route steps from zero, so SLO outcomes and MBO requirements no longer appear as if a child could reach them immediately. When a goal is selected before any related learning is complete, the early start remains the same and the goal is shown separately. The 1-level, 2-level, and full-learning-map controls remain available.
