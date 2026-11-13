# Capability Atlas project goals

Capability Atlas should help people explore what they could learn, understand how capabilities connect, and find useful next steps toward occupations and everyday life goals.

The long-term ambition is a connected map from early developmental foundations to advanced occupational capabilities. An approximately two-year-old starting point is a rough design reference for exploring foundations, not a fixed age requirement or a promise of a complete developmental model.

The coverage target is every in-scope skill: connect each active catalogue skill/knowledge concept and Atlas-authored capability to explicitly described starting foundations, with every intermediate learning step meeting the authoring criteria. Include skills without occupation links. Retained obsolete concepts remain historical records rather than new coverage targets. The existing occupation routes are discovery examples within this wider goal, not the limit of the intended coverage.

The current concrete milestone is at least **100 distinct professions** with complete authored routes from the documented starts through every intermediate step and occupational work outcome. Count only routes passing the strict profession audit; neither a source catalogue entry nor a generic generated scaffold counts. The milestone is currently **62 / 100** authored proposals, with no instructional validation claimed.

Use contrasting occupations as concrete examples for discovering the shared learning structure. Work backward from requirements, compare where routes converge, and progressively decompose foundations toward earlier starting abilities. Keep proposed connections, contextual differences, estimates and unresolved gaps visible.

Use explicit authoring criteria for each learning step: one primary new concept or a clearly identified transfer task, supported starting abilities, concrete input/task, observable output, a varied understanding check, likely difficulties, provisional learning effort and context/reuse. If a step introduces multiple new concepts, expose a split plan. Separate one practice session from total active effort and revisits; estimates need a basis, assumptions and confidence. Those criteria guide construction and auditing rather than claiming validated teaching or universal timing.

See [README.md](README.md) for the working application and setup, and [PLANNED_TASKS.md](PLANNED_TASKS.md) for implementation priorities.

## 1. Broad occupation and skill coverage

Include the complete occupation catalogue and skill/knowledge catalogue from a deliberately selected ESCO release, preserving official identifiers and occupation-to-skill relationships. Make occupations discoverable even when their learning pathways have not yet been developed.

Keep official Essential and Optional relationships visible. Keep Atlas-authored life roles and profession pilots identifiable alongside the official catalogue.

Catalogue completeness and learning-pathway completeness are separate goals. Importing an occupation does not mean its teaching content, prerequisites, or assessment methods are complete.

## 2. Progressively deeper learning pathways

Break broad capabilities into meaningful, observable learning activities and connect them through intermediate capabilities to shared foundations. Reuse a capability across occupations wherever the meaning and learning context support it.

Build the map in both directions: work backward from occupational tasks and forward from foundations such as communication, quantities, movement, social interaction, literacy, and reasoning. Identify missing bridges rather than forcing every occupation into a shallow connection to reading or counting.

Support branching paths, different starting points, and context-dependent learning. Age can provide context; it should not define a universal sequence or prescribe a profession for a young child.

A target has complete authored-pathway coverage only when at least one explicit route reaches its documented starting foundations, every required branch is accounted for, and every intermediate step has a clear learning focus, supported starting abilities, concrete practice, observable outputs, a varied understanding check, useful feedback, provisional effort estimates and context/reuse information. Unresolved prerequisite jumps, missing criteria and proposed concept splits remain gaps. A graph connection or valid data schema alone does not meet this target. Complete authored coverage is separate from external instructional validation or learner attainment.

## 3. A useful rough starting point that improves over time

Allow incomplete and generated draft content so the project can explore coverage early. Make the status understandable: an imported skill, an undecomposed skill, a generated activity, and a reviewed pathway represent different levels of work.

Improve representative pathways in depth before applying their patterns broadly. Add evidence, practical examples, review, and learner feedback as the map develops. A graph connection alone is not evidence that a prerequisite or developmental sequence is appropriate.

## 4. Clear learning choices and honest progress

Help a learner search for a goal, explore related capabilities, see what has already been recorded, and choose a manageable next step. Show gaps and partial routes clearly.

Base progress on the represented required steps and distinguish optional learning. Keep self-reported completion, assessment evidence, curriculum alignment, and formal qualification requirements understandable as different things.

The current percentage describes progress through the proposed model. It does not establish professional competence, certification, or qualification attainment.

## 5. Fast access as the catalogue grows

Keep search, goal selection, progress, and graph navigation responsive as coverage expands. Load a compact catalogue and graph for navigation and calculations, then load detailed content when needed.

Measure startup transfer, processing time, memory, and interaction speed on ordinary devices. Preserve complete relationship information for calculations even when descriptions and assessments have not been downloaded.

Retain the static application architecture while it meets the project's needs. A larger catalogue alone does not require a backend or user accounts.

## 6. Traceable data and durable learner state

Preserve source identifiers, release versions, provenance, and the distinction between official source relationships and Atlas proposals. Make imports repeatable and make catalogue coverage verifiable.

Preserve saved goals and learning records when data is reorganized or expanded. Handle changed or retired source concepts deliberately rather than silently losing or reinterpreting learner state.

## Current starting point

The repository currently contains:

| Content | Included |
| --- | ---: |
| Active ESCO occupation profiles | 3,039 |
| Active ESCO skill and knowledge concepts | 13,939 |
| Official ESCO occupation-to-skill links | 126,051 |
| Atlas life roles | 3 |
| Atlas profession pilots | 3 |
| Proposed learning units | 18,131 |

One end-to-end structural pilot now connects supported early foundations to all 14 core Independent adult capabilities and all eight essential ESCO shelf-filler skills. Its 104 activities use explicit all-input requirements, concrete contextual demonstrations and parallel adult/work endpoints. This is an unreviewed draft with no fixed age schedule; developmental sufficiency, workplace readiness and practitioner review remain open work.

Five contrasting occupation routes now serve as additional test cases for discovering the learning structure: domestic cleaner, shop assistant, cook, administrative assistant and software developer. They account for 101 essential links, compare 98 early/intermediate activities and include draft canonical breakdowns for the four previously missing capabilities. The purpose of further routes is to discover and recursively decompose shared foundations, distinguish occupational contexts and reveal missing learning steps. Proposed prerequisite reuse and exact shared ESCO skill identity are shown separately; neither establishes automatic transfer or validated developmental sufficiency.

Active catalogue coverage is complete for the supplied ESCO v1.2.1 archive and reconciled against its source inventory. This includes 464 skills without occupation links. Three previously represented obsolete skills are retained separately for saved-state compatibility. The import report is listed under `esco_full_catalogue_import` in `data/manifest.json`.

The UI now separates source coverage from activity coverage, supports occupation browsing by classification and coverage, and exposes missing or disconnected routes. The review register is empty; reviewed labels require documented evidence for a specific scope and content version.

Most current learning activities are generated drafts. Existing early-development branches and connections provide a rough scaffold, not complete pathways from early childhood to every occupation.

## How to judge progress toward the goals

- Catalogue coverage is measured against a versioned source inventory, with gaps explained.
- Occupations are discoverable independently of their pathway coverage.
- Pathway coverage distinguishes missing, draft, and reviewed content.
- Representative routes contain meaningful intermediate steps and reusable foundations.
- Search, routes, and progress remain correct and responsive as the dataset expands.
- Source updates and content changes preserve learner records or explain necessary migrations.

A concrete quantity practice pack now supplies eleven lessons and 37 example checks with cooking, cleaning and retail cases. Support methods and revision-bound responses are recorded separately from route completion; authoring criteria guide continued expansion, while learner/practitioner testing can refine the proposal as collaborators become available.

The all-skill audit now tracks 13,990 active/Atlas targets, including 464 without occupation links. Its baseline separates recorded connections (5,805), required-input closure (5,798) and complete authored routes (zero at baseline; 325 skill routes now pass the authored criteria). The first audit-driven increment splits precision into two focused whole-activity designs; a further batch authors seven earlier measurement/counting foundations, giving nine complete authored activity chains back to the documented starts. This established the initial measurement branch. The subsequent profession campaign adds fully authored domain branches; current skill and profession counts are reported separately in the workbench and audit commands, with remaining gaps visible.
