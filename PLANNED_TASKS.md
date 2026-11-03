# Capability Atlas planned tasks

This is the implementation roadmap for [PROJECT_GOALS.md](PROJECT_GOALS.md). [README.md](README.md) describes the application as it works today.

Unchecked items are planned work, not implemented features. Complete catalogue coverage first, then progressively improve the depth and quality of learning pathways. The approximately two-year-old starting point remains a rough reference for shared foundations.

## Completed foundation: efficient data delivery

- [x] Split the large authoring dataset into manageable source files without changing records or IDs.
- [x] Generate a compact, complete catalogue and graph index for the initial sample, then extend it to the complete catalogue.
- [x] Fetch detailed learning content on demand, deduplicate requests, and bound the in-memory detail cache.
- [x] Calculate progress for selected items, saved goals, and visible graph nodes.
- [x] Verify source preservation, routes, saved progress, retry behavior, and browser navigation.

This foundation established efficient delivery before catalogue expansion. Source coverage is completed below; learning content remains draft.

## Completed: full source catalogue

- [x] Select and document the ESCO release, languages, inclusion rules, and treatment of obsolete concepts.
- [x] Establish a source inventory for all occupations and skill/knowledge concepts in that release. Distinguish occupation-linked concepts from concepts elsewhere in the skill catalogue.
- [x] Extend or replace the sampling importer to import all in-scope occupations and their Essential/Optional skill links.
- [x] Import remaining in-scope skill/knowledge concepts, including those not reached through occupation links.
- [x] Preserve official IDs, labels, definitions, classifications, source versions, and provenance where supplied. Record unavailable fields explicitly.
- [x] Reuse existing concepts by ID and retain Atlas-authored content and learner-state identifiers.
- [x] Support resumable imports, retries, and repeat runs without duplicate nodes or relationships. Publish the updated source manifest only after a complete import succeeds.
- [x] Reconcile imported IDs and relationship counts against the source inventory; report gaps, obsolete concepts, and unresolved references.
- [x] Regenerate browser assets and measure expanded index size, startup processing, memory, search, and route calculation.

Completed using the supplied ESCO v1.2.1 JSON-LD archive: 3,039 active occupations, 13,939 active skills, and 126,051 reconciled links. Checkpoints are local and archive-based; no network downloads are needed. The import report records source discrepancies, three retained obsolete skills, six corrected legacy links, and inventory fingerprints.

Completion criteria: the documented source scope is reconciled, graph references are valid, rerunning the import is safe, and imported occupations can be found in the UI. Counts from the earlier sample import are historical evidence, not a fixed completeness target.

## Completed: catalogue and pathway coverage visibility

- [x] Show current required-activity coverage (none, partial draft, or draft) for the focused occupation or skill.

- [x] Show whether an item has no breakdown, generated draft learning activities, or reviewed content. Define what review covers and retain its evidence.
- [x] Separate official catalogue coverage from learning-pathway coverage in the interface.
- [x] Keep newly imported occupations searchable and selectable even when learning routes are incomplete.
- [x] Show useful empty states for missing breakdowns and disconnected routes without treating them as complete or inventing prerequisites.
- [x] Add occupation browsing by classification or category so discovery can extend beyond the existing first 20 search matches.
- [x] Preserve Essential/Optional distinctions and keep Atlas life roles and profession pilots identifiable.
- [x] Check keyboard navigation, small screens, slow connections, and recovery from failed or outdated detail downloads with the expanded catalogue.

Implemented category/coverage browsing with pagination, a separate source/learning coverage overview, missing-route explanations, versioned review evidence with no invented reviews, and retry/reload recovery. Keyboard navigation, a 390px layout, throttled downloads, interrupted startup, and outdated detail assets were checked in Chrome; saved learning records survived recovery. Shared foundation next steps remain available when completed graph nodes are hidden.

Completion criteria: users can find the imported occupations and understand which learning paths have actually been developed.

## Completed: functional concept workbench

- [x] Make concept definitions, types, and functions prominent in a dedicated inspector.
- [x] Separate overview, functional inputs/outputs, relationships, and evidence into tabs.
- [x] Move goals, suggested activities, routes, and catalogue coverage into their own workspaces and views.
- [x] Search concepts and activities by English/Dutch name, type, code, or ID; sort by name or actual relationship count.
- [x] Show a bounded one-hop relationship map and a searchable list of all direct relationships; support concept-to-concept navigation with Back/Forward.
- [x] Keep missing I/O specifications explicit and preserve the distinction between recorded relationships and execution flow.
- [x] Preserve saved learning state, review evidence, the legacy route graph, keyboard operation, mobile navigation, and detail-download recovery.

Activation-frequency data is not currently recorded, so ranking uses direct link counts. This UI work does not add learning content or infer functional input/output specifications.

## Next: establish a better pathway model

- [ ] Define how to represent capabilities, learning activities, evidence, assessments, decomposition, prerequisites, recommendations, and contextual alternatives.
- [ ] Give official links, generated drafts, and reviewed Atlas proposals explicit provenance and status.
- [ ] Audit current two-stage templates and generic foundation links; identify useful scaffolds, missing intermediates, and unsupported connections.
- [ ] Define how shared capabilities can be reused without losing differences in occupational context or assessment expectations.
- [ ] Specify how alternative routes, optional activities, overlapping decompositions, and content revisions affect progress.
- [ ] Add checks for unintended cycles, duplicate activities, broken references, and disconnected route segments. Handle any intentional cycles explicitly.

Completion criteria: new learning content follows a consistent model, and progress and route calculations have defined behavior for incomplete and branching pathways.

## Longer term: connect occupations to shared foundations

- [ ] Select a small, varied set of occupation and life-role pathways for deeper work, building on the existing pilots.
- [ ] Break occupational capabilities into observable activities, then identify intermediate capabilities and prerequisite hypotheses.
- [ ] Expand shared foundations in communication, quantities, movement, social interaction, and later literacy and reasoning.
- [ ] Explore early-childhood entry points around the rough two-year-old reference, allowing different starting abilities, communication methods, and contexts.
- [ ] Connect occupational and foundational branches through meaningful intermediate activities; leave unresolved gaps visible.
- [ ] Review representative pathways with relevant practitioners and learning/development specialists, and record what was reviewed.
- [ ] Use feedback from suitable pilot use to refine granularity, activity instructions, assessment expectations, and route usefulness.
- [ ] Expand patterns that prove useful across further occupations while retaining content status and review boundaries.

Completion criteria for each pilot: a traceable draft route with explicit gaps and review status, reusable intermediate capabilities, and meaningful learning activities. A short graph connection to early numeracy or reading does not by itself meet this criterion.

## Ongoing engineering and content work

- [ ] Keep performance measurements and practical budgets as catalogue and pathway coverage grow; optimize further indexing, background computation, or partitioning when measurements justify it.
- [ ] Maintain tests for required/optional progress, saved assessments, partial routes, source integrity, and detail loading.
- [ ] Handle retired or changed concepts and revised decompositions without silently invalidating saved goals or learning evidence.
- [ ] Keep source imports and browser assets reproducible, versioned, and documented.
- [ ] Update the README's current-state summary and this task list as work is completed; keep longer-term intentions in the goals document.

## Scope for the next implementation increment

Source catalogue coverage and the coverage/discovery interface are complete. Next, establish the pathway model: define decomposition and prerequisite semantics, alternatives and context, audit generated templates and generic foundation links, and specify progress behavior for branching or incomplete paths. Reuse the review register and scope/version checks already implemented. Deeper early-childhood-to-profession content follows as a separate increment.
