# ESCO 1.2.1 import

Source: user-provided JSON-LD archive. Exact ESCO concept URIs retained. Occupation–skill links are official, classified essential/optional.

## Selected ESCO occupations (approximate matches to original Dutch pilot roles)

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


## Capability Atlas decomposition pilot v0.1

Added six Atlas-authored learning units under the ESCO skill `execute software tests` (`http://data.europa.eu/esco/skill/913e7e83-b8f8-4574-b1ca-1b38f3fd974a`). They cover identifying testable expectations, deriving test cases, preparing conditions, executing and recording tests, comparing observed and expected results, and reporting reproducible defects. The ESCO source node is unchanged; Atlas units live in a separate `learning_units` collection, and all decomposition and prerequisite relationships are marked `proposed`.

Each learning unit includes an illustrative active-learning time range and draft assessment criteria. Estimates are not empirically calibrated. The cross-context reuse status of “Compare an observation with a stated expectation” is a hypothesis, and this pilot adds no unsupported occupation mappings. Manual completion now allows these proposed units to be marked complete; proposed `prerequisite_for` links surface related next learning units. This is a learner prototype behavior, not formal assessment or expert-approved sequencing.


## Decomposition pilot v0.2 — tax calculation and percentage foundations

The next source skill is ESCO `calculate tax` (`http://data.europa.eu/esco/skill/2ecf90f1-c511-464b-b26f-598d69182c70`). The supplied dataset links that exact skill to both selected finance occupations: optional for bookkeeper and essential for accountant. The relationship types are preserved as source evidence; they do not mean the learning standard is higher for one job or establish prerequisites.

Six Atlas-authored ALUs now model a bounded exercise: identify the stated tax base and rate from a supplied dated jurisdictional reference; interpret percent as parts per hundred; convert percent to a decimal factor; calculate a percentage of an amount; estimate the result to check plausibility; and apply supplied rounding and recordkeeping instructions. Four units are marked as candidate-general for reuse, but no other occupation mappings have been invented. The exercise explicitly requires supplied, current rules; it does not teach legal selection of tax regimes or provide tax advice.

All six units have illustrative 0.5–3 hour effort ranges, assessment criteria, and proposed decomposition/prerequisite relationships. This continues the path from a professional skill toward arithmetic foundations while keeping the tax-specific context at the top of the branch. Practitioner review and learner calibration are still required.


## Decomposition pilot v0.3 — electrical measurement and reuse

The ESCO skill `electrical testing methods` (`http://data.europa.eu/esco/skill/c8bd9f9f-0ec6-447a-ab78-ad6eeeed9aa8`) is source-linked to electrician as essential and industrial electrician as optional. This provides a second cross-occupation source skill and a useful context for testing reuse.

Three Atlas-authored ALUs were added: selecting an instrument and range for a specified check, performing and recording a measurement with a supplied safe method, and comparing the reading with specified limits. The last unit is linked by a `specializes` relationship to the existing general ALU `Compare an observation with a stated expectation`. The specialized version adds electrical units, measurement resolution, stated limits, and safety context. The graph also proposes the general comparison unit as a recommended foundation, while explicitly stating that it does not establish electrical competence.

The practical units are safety-critical draft standards. Their effort ranges are illustrative; the selection and performance criteria require review by a qualified electrical practitioner. No new occupational mappings were inferred beyond the existing ESCO links.


## Decomposition pilot v0.4 — recursive numeracy foundations

The percentage-calculation branch is now decomposed one level further. `Calculate a percentage of an amount` has three lower-level components: multiply a whole number by a one-digit factor, understand decimal place value through hundredths, and scale an integer product using a decimal factor. Whole-number multiplication is further decomposed into representing equal groups and adding within twenty; addition within twenty is decomposed into single-digit addition within ten; that unit depends on counting small sets one-to-one and matching their cardinality to numerals. The single-digit addition assessment explicitly includes `1 + 1 = 2`.

These seven new ALUs are marked candidate-general as foundational numeracy, but the graph adds no new occupation mappings. Each node has draft observable assessment criteria and illustrative 1–4 hour active-learning estimates, assuming stated prerequisites. They remain proposed learning standards; no empirical learning-time study or expert review has been conducted. This recursive branch also tests a stopping principle: stop expanding a unit when it has one coherent outcome and can be demonstrated meaningfully within the target effort range; do not split it into interface actions or arbitrary micro-steps.


## Decomposition pilot v0.5 — supervised basic health observations

The ESCO skill monitor basic patients signs (http://data.europa.eu/esco/skill/d3b74d50-7fc9-4051-9335-58d129a4a064) is source-linked to healthcare assistant as essential. It is not source-linked to nurse responsible for general care in this selected extract. Five Atlas-authored ALUs model a supervised simulation sequence: prepare an observation encounter from a supplied plan; perform one assigned basic observation with the supplied device-specific procedure; record the value, unit, time and context; compare only with supplied escalation criteria; report through the supplied escalation route. The specific comparison unit specializes the existing general compare-observation ALU.

The prototype contains no clinical techniques, diagnostic guidance, thresholds, or real escalation route. Assessment criteria require fictional scenarios, current local protocols, qualified supervision, and role authorization. Accurate recording and factual handover are marked as candidate-general reuse hypotheses without any new occupation mappings.

This safety boundary is informed by V&VN’s guideline on signalering during ADL care, which frames health-risk noticing in person-centred context, and the Richtlijnendatabase guideline for the deteriorating patient, which says escalation procedures should be clear in local protocols and that universal cut-offs/procedures cannot be recommended. Sources: https://kennisplatform.venvn.nl/richtlijn/zorg-bij-algemene-dagelijkse-levensverrichtingen-adl/signalering-van-gezondheidsrisico-s-en-problemen and https://richtlijnendatabase.nl/richtlijn/leidraad_-_vitaal_bedreigde_patient/signaleren_van_de_vitaal_bedreigde_patient.html.


## Decomposition pilot v0.6 — software-development fundamentals

Eleven proposed ALUs expand the software developer role beyond its existing software-testing strand. The route covers extracting user needs, writing observable acceptance conditions, mapping control flow, separating design responsibilities, building a thin prototype, implementing and explaining a small function, recording a change in version control, tracing a fault with a debugger, using a library through its documented interface, documenting technical behavior, and revising a feature from clarified feedback. The requirements unit connects to the existing proposed test-case unit. Fifteen prerequisite relations are marked proposed and recommended; they represent learning-design hypotheses and do not establish a compulsory curriculum.

The programming outcome is language-neutral and can be demonstrated in one language available for the exercise. The route does not treat ESCO’s optional language and tool entries (including Erlang and VBScript) as universal prerequisites or as a fixed-number choice group. ESCO source-backed occupation links remain distinct from Atlas-authored learning-unit relations. ACM/IEEE CS2023 and ACM CCECC guidance informed the broad topic selection; the unit definitions, assessment criteria, effort ranges, and sequence still require practitioner review and learner calibration. Sources: [ESCO software developer occupation](https://esco.ec.europa.eu/en/classification/occupation?uri=http%3A%2F%2Fdata.europa.eu%2Fesco%2Foccupation%2Ff2b15a0e-e65a-438a-affb-29b9d50b77d1), [ACM/IEEE CS2023 Software Engineering guidance](https://csed.acm.org/knowledge-areas-software-engineering-se-cs2013-version/), and [ACM CCECC Software Engineering curriculum](https://ccecc.acm.org/guidance/software-engineering).


## Market signals pilot — software-developer optional skills

The role detail groups optional capabilities as named languages/frameworks/tools, programming paradigms/engineering practices, or domain/specialist areas. This is a descriptive taxonomy, not a rating of frequency, niche status, or future-proofing. The data separates three dimensions: vacancy mention frequency, skill type/specialization context, and future outlook. Skill-level vacancy rates and individual-skill forecasts remain explicitly unassessed.

CBS publishes experimental Q1–Q2 2026 vacancy-skill frequencies by occupation, education level, and province using CompetentNL V2. The pilot has not yet mapped the named ESCO technologies to CompetentNL concepts or calculated mention rates. UWV provides broader ICT occupation-level labour-market context; it is not used to forecast any named language or product. Sources: [CBS vacancy-skill statistics, Q1–Q2 2026](https://www.cbs.nl/nl-nl/maatwerk/2026/40/skills-vraag-en-aanbod-in-online-vacatures-eerste-en-tweede-kwartaal-2026) and [UWV ICT occupations](https://www.uwv.nl/nl/arbeidsmarktinformatie/sector/ict).


## Decomposition pilot v0.7 — scale increment for software development

This increment adds 63 proposed ALUs under 27 software-developer ESCO skill nodes: all 13 remaining Essential nodes in the selected ESCO role and 14 representative Optional nodes. The Optional sample covers system integration, data migration, UI work, programming paradigms, concurrency, supplied security-rule interpretation, software anomalies, machine learning, IoT and engineering practices. The increment adds 108 proposed decomposition/prerequisite relations; the full dataset now contains 101 ALUs and 190 decomposition, prerequisite and specialization relations.

The batch tests how route and graph density scale. It does not validate the proposed outcomes, sequencing, or estimated learning times. Named programming-language nodes remain grouped as context-dependent technologies rather than receiving repetitive language-specific beginner decompositions. The topic selection is informed by [ACM/IEEE CS2023 Software Engineering guidance](https://csed.acm.org/knowledge-areas-software-engineering-se-cs2013-version/) and [NIST’s Secure Software Development Framework](https://csrc.nist.gov/projects/SSDF). Legal-rule practice is limited to fictional or supplied dated source material and is not a compliance determination or legal advice; see [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) for secure-development process context.


## Cross-occupation essential-skill expansion v0.19

The data now decomposes all 185 unique ESCO Essential skill roots linked to the eight selected occupations. This increment adds two Atlas-authored learning activities to each of the 157 roots that were previously undecomposed: 314 new units and 314 required decomposition edges, bringing the dataset to 415 learning units and 416 decomposition edges. Shared ESCO skill nodes are decomposed once and reused across the occupations that link to them. The source-backed activities are classified by finance, electrical work, software testing, health, or cross-occupational reasoning.

Learning designs are informed by the ISTQB CTFL v4.0.1 syllabus, Belastingdienst administrative guidance, the IFRS Conceptual Framework, NEN overviews of NEN 1010 and NEN 3140, V&VN nursing-process and clinical-reasoning material, and the WHO Global Patient Safety Action Plan. Finance scenarios use fictional workpapers and supplied jurisdiction-specific rules; electrical scenarios use diagrams or supervised de-energized equipment; health scenarios use fictional cases, local protocols, supervision, and scope boundaries. None of these Atlas proposals is expert-validated or an operational professional protocol.


## Atlas life-role framework v0.20

Added three Atlas-authored, non-ESCO life roles: Good friend, Parent, and Independent adult. The model includes 36 reusable capabilities, with 9/14/14 core capabilities and 1/3/5 context-dependent capabilities for those roles respectively. Each capability has two draft learning activities, producing 72 proposed units and 72 required decomposition edges. These join the existing 415 occupational learning units for a total of 487.

Role links use proposed relation types `atlas_required` and `atlas_optional`, presented in the UI as “Atlas core” and “Atlas context-dependent.” They are not ESCO Essential/Optional classifications. Only Atlas core capabilities contribute to life-role progress. All life-role content is explicitly Atlas-authored, reflective, non-prescriptive, and unvalidated. The “Independent adult” role includes seeking support; it does not equate independence with self-sufficiency.

Topic selection is informed by the European Commission JRC LifeComp conceptual framework, WHO/UNICEF/World Bank nurturing care material, UNICEF parenting guidance for adolescents, European Commission DigComp, EU/OECD-INFE adult financial competence, and WHO health literacy. These sources inform topic coverage, not validation of the Atlas content.


## Developmental foundations v0.21

Fourteen proposed learning activities extend the graph toward early communication and first calculations: five communication units, seven numeracy units, and two caregiver-practice units. The communication strand covers responsive attention and turn-taking, meaningful symbols and early messages, and short exchanges. It links into Parent’s **Support play, curiosity, and learning** capability. The math strand covers small quantities, early number words, one-to-one counting, cardinality, quantity-word-numeral mapping, combining sets, and representing first addition. It decomposes the existing count-and-cardinality and single-digit-addition activities into clearer foundational steps; later in the route, addition within twenty links to personal-finance practice.

The proposed route relations are learning-design suggestions, not universal developmental prerequisites or age thresholds. They are not screening criteria or a diagnosis. ASHA guidance says there are no prerequisites for considering AAC; the content treats speech, sign, gesture, pictures, and AAC as valid communication forms and never requires speech before AAC. Learning-route prerequisites are navigation links and do not enter role progress percentages. The new decomposition steps do affect progress for the specific counting and first-addition learning units.

The draft is informed by ASHA communication milestones and early-intervention AAC guidance, Harvard Center on the Developing Child serve-and-return material, and IES early mathematics practice guidance. Sources: https://www.asha.org/public/developmental-milestones/communication-milestones-birth-to-1-year/ ; https://www.asha.org/practice/early-intervention-provider-support/augmentative-and-alternative-communication-in-early-intervention/ ; https://developingchild.harvard.edu/key-concept/serve-and-return/ ; https://ies.ed.gov/ncee/wwc/PracticeGuide/18. These references inform topic selection but do not validate the Atlas units or sequencing.


## School-to-qualification bridge v0.22

This increment adds 11 proposed school-facing learning activities: accessible short-text understanding, purposeful writing and conversation, whole-number place value and operations, decimals, common fractions, ratios/percentages, data displays, and a technical-result presentation. Six Atlas-proposed prerequisite relations connect the new school numeracy sequence with the existing early numeracy foundations. These activities intentionally avoid fixed age assumptions and permit spoken, signed, written, or AAC-supported responses where appropriate.

Official SLO primary Dutch and mathematics and lower-secondary mathematics outcomes are stored as `framework_outcomes`, distinct from learning activities. The SBB software developer dossier is represented as one formal MBO level 4 qualification (profile 25998, dossier 23399; effective 2024-08-01), with its eight work-process outcomes and four generic requirements as separate official outcome nodes. The 12 requirement-to-qualification edges are source-backed. Ninety Atlas activity-to-outcome links are explicitly marked as proposed partial illustrations. Career and citizenship and English remain unmapped, and the UI reports mapping coverage separately from Atlas activity progress. No Atlas progress percentage implies official attainment, examination readiness, EQF/NLQF assessment, or diploma award.

SLO records link to the 2025 revised kerndoelen documents and current SLO status page; SBB records link to the current Software developer qualification dossier. Source metadata is stored on each official outcome and qualification node for inspection in the application. This is a small initial bridge across school and vocational education, not an exhaustive national curriculum or a complete birth-to-lifelong-learning progression.


## Broad ESCO catalogue sample v0.25.0

Source: the official ESCO v1.2.1 Web-service API (`https://ec.europa.eu/esco/api/search`), queried in English with full occupation search results and `viewObsolete=false`. The API returned 3,039 current search records. A systematic sample selected up to 40 occupation records per ISCO major group, spread across occupation codes: group 0 had 21 available records and groups 1–9 had 40 each. One sampled occupation was already represented in the project, so 380 new occupation profiles were added. The sample contains 388 ESCO occupation profiles in total, including the eight earlier profiles.

The import adds 5,869 unique ESCO skill concepts linked by the selected occupations and 14,656 source-backed occupation–skill links: 7,957 `hasEssentialSkill` and 6,699 `hasOptionalSkill` relationships. It preserves official concept URIs, English relation labels, Dutch preferred occupation labels when supplied, ISCO codes, and the source relation property. Official ESCO Essential and Optional links remain distinct from Atlas learning links. The sample is not a complete catalogue mirror and has not been independently reconciled against a separate ESCO package.

The import initially attached one generic optional first-practice activity per represented skill. Those activities remain optional orientation scaffolds, not assessments or skill breakdowns. Their IDs are retained in v0.26 so any saved learner state remains attached.

## ESCO skill breakdown scale increment v0.26.0

Two required Atlas-proposed learning activities are added to each of 5,748 sampled skill nodes that lacked a required breakdown; 121 earlier detailed breakdowns were preserved. This adds 11,496 learning units, 11,496 required skill-to-activity decomposition edges, and 11,635 recommended prerequisite relations. Recommended links suggest sequencing the context-setting task before the bounded application and connect the first task to practical-reading foundations; 139 quantitative skills also receive a numeracy bridge. Counts overlap because these are route edges, not additional required steps.

The rule-based content uses 18 activity patterns derived from the ESCO labels and skill/knowledge types. Families include knowledge, operation, communication, manufacturing, analysis, regulation/quality, coordination, documentation, environment/agriculture, craft, digital skills, transport, hospitality, quantitative work, healthcare, public safety, and military governance. A guided-practice fallback is used for 307 rarer labels. The activities include task framing and observable assessment criteria but are generated pattern applications rather than individually expert-authored curricula.

The activity definitions, assessment criteria, effort estimates, and proposed prerequisites are Atlas content, not ESCO learning outcomes. They are not independently or occupationally validated. Regulated, clinical, public-safety, military, and hazardous topics use supplied current references, fictional cases or simulations, learner-scope limits, and escalation framing where indicated. The app’s required-step percentage now includes these draft activities; it is a progress indicator for the proposed graph, not a qualification or mastery score. ESCO occupation–skill links and Essential/Optional classifications remain unchanged.


## Zero-start graph view v0.27.0

The no-learning route retains a single “Start at zero” marker with early communication and number sense as parallel developmental branches. The graph previously traversed `supports_outcome` and `qualification_requirement` links as if they were learning-route edges. Because these relationships represent partial curriculum alignment or formal requirement structure, they could place SLO outcomes or MBO requirements beside the earliest learning activities. Zero-state traversal now excludes those two relation types. If a goal is selected before related learning is recorded, the same early start remains and the goal is displayed separately. This changes navigation presentation only; source outcome links and qualification data are preserved.
