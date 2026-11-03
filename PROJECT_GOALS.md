# Capability Atlas project goals

Capability Atlas should help people explore what they could learn, understand how capabilities connect, and find useful next steps toward occupations and everyday life goals.

The long-term ambition is a connected map from early developmental foundations to advanced occupational capabilities. An approximately two-year-old starting point is a rough design reference for exploring foundations, not a fixed age requirement or a promise of a complete developmental model.

See [README.md](README.md) for the working application and setup, and [PLANNED_TASKS.md](PLANNED_TASKS.md) for implementation priorities.

## 1. Broad occupation and skill coverage

Include the complete occupation catalogue and skill/knowledge catalogue from a deliberately selected ESCO release, preserving official identifiers and occupation-to-skill relationships. Make occupations discoverable even when their learning pathways have not yet been developed.

Keep official Essential and Optional relationships visible. Keep Atlas-authored life roles and profession pilots identifiable alongside the official catalogue.

Catalogue completeness and learning-pathway completeness are separate goals. Importing an occupation does not mean its teaching content, prerequisites, or assessment methods are complete.

## 2. Progressively deeper learning pathways

Break broad capabilities into meaningful, observable learning activities and connect them through intermediate capabilities to shared foundations. Reuse a capability across occupations wherever the meaning and learning context support it.

Build the map in both directions: work backward from occupational tasks and forward from foundations such as communication, quantities, movement, social interaction, literacy, and reasoning. Identify missing bridges rather than forcing every occupation into a shallow connection to reading or counting.

Support branching paths, different starting points, and context-dependent learning. Age can provide context; it should not define a universal sequence or prescribe a profession for a young child.

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
| Proposed learning units | 17,911 |

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
