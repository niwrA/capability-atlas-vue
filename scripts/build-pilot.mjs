import { applyMeasurementFoundations } from './measurement-foundations.mjs'
// Reproducible, Atlas-authored content. No imported ESCO records are rewritten.
import { readDataset, writeDataset } from './atlas-data.mjs'
import { preserveIndividualRevisions, replaceOwnedRecords } from './authoring-records.mjs'
import { individualPilotBranch } from './pilot-individual-branch.mjs'
import { auditPilot } from '../src/pilot-model.js'
import { refineFoundationSteps, pruneRouteSteps } from './foundation-refinement.mjs'
import { applyQuantityPractice } from './quantity-practice.mjs'
import { reconcileAuthoredRoutes } from './reconcile-authored-routes.mjs'

const dataset = await readDataset()
const prefix = 'atlas:alu:pilot:shelf-filler:'
const source = 'Capability Atlas end-to-end pilot draft v1'
const adult = 'atlas:role:independent-adult'
const occupation = 'http://data.europa.eu/esco/occupation/d35f9e79-5778-43b4-8667-0e3ba1fcb19a'
const stages = [
  { id: 'early', label: '1. Supported early foundations', description: 'No prior learning records required. A familiar supporter offers play, communication access, choices and co-regulation. These are possible entry points, not an age test.' },
  { id: 'shared', label: '2. Shared practical foundations', description: 'Develop communication, reading, quantities, safe action and planning through repeated supported practice. Different access methods and help remain valid.' },
  { id: 'adult', label: '3. Everyday adult life', description: 'All 14 core requirements of the Atlas Independent adult role. Each branch retains its existing draft activities and adds a concrete demonstration.' },
  { id: 'work', label: '4. Shelf-filling practice', description: 'All eight essential skills in ESCO 1.2.1 for shelf filler, with contextual demonstrations. Optional ESCO skills and employer-specific induction remain outside this pilot.' },
]
const pilot = { format: 1, id: 'atlas:pilot:shelf-filler-v1', label: 'Early foundations → adult life + shelf filler',
  status: 'Unreviewed Atlas draft', version: 1, occupation_id: occupation, adult_role_id: adult,
  scope: 'Complete draft coverage of the recorded core adult and essential occupational requirements; not proof of developmental sufficiency, adult independence, employment eligibility or a qualification.',
  semantics: 'Every listed input is required (AND). Gates aggregate evidence and cannot be ticked complete. Existing completion records count only when their pilot inputs are also complete. The two endpoints are parallel goals; independent living is not an employment prerequisite.',
  access: 'Use speech, sign, AAC, accessible text, assistive tools and agreed human support. Adapt the activity and record the assistance used. There is no fixed age or duration; early tasks are supporter-mediated, and adult/work scenarios are for an appropriate later context.',
  review_needed: ['Development and accessibility review of early and intermediate steps', 'Adult-life practitioner review of scenario coverage', 'Retail practitioner review, local procedures and supervised workplace assessment'],
  stages, steps: [], entry_ids: [], end_ids: [adult, occupation], demonstrations: {} }
const id = key => prefix + key
function step(nodeId, stage, requires, mode = 'activity') {
  const prior = pilot.steps.find(step => step.id === nodeId)
  if (prior) { for (const input of requires) if (!prior.requires.includes(input)) prior.requires.push(input); return }
  pilot.steps.push({ id: nodeId, stage, requires, mode })
  if (!requires.length) pilot.entry_ids.push(nodeId)
}
const authored = []
function add(key, label, stage, requires, input, task, criteria) {
  const nodeId = id(key)
  authored.push({ id: nodeId, kind: 'learning_unit', label, source, source_version: '1', official: false,
    status: 'proposed', definition: task, input_specification: input,
    output_specification: criteria.join('; '), assessment: { method: 'Supported demonstration and discussion; record observations, access adaptations and assistance. Self-recorded completion is not independent verification.', criteria },
    notes: 'Unreviewed authored pilot hypothesis. Repeat, adapt or add intermediate practice as needed. No age, mastery or employment entitlement is inferred.' })
  step(nodeId, stage, requires)
  return nodeId
}
// Retain existing early-development content and its IDs, but make the pilot's
// precise all-input semantics explicit rather than borrowing graph reachability.
const commKeys = ['respond-to-early-signals', 'share-attention-and-turns', 'connect-symbols-with-meaning', 'use-first-meaningful-message', 'expand-and-combine-messages']
let comm
for (const key of commKeys) { const next = 'atlas:alu:development:communication:' + key; step(next, 'early', comm ? [comm] : []); comm = next }
const numKeys = ['notice-small-quantities', 'experience-number-words', 'match-count-word-to-object', 'understand-counted-total', 'connect-quantity-word-symbol', 'combine-two-small-sets', 'represent-first-addition']
let num
for (const key of numKeys) { const next = 'atlas:alu:development:numeracy:' + key; step(next, 'early', num ? [num] : []); num = next }
const movement = add('explore-and-place', 'Explore, match and place safe objects with support', 'early', [],
  'A familiar supporter, large safe objects, a reachable surface and any positioning or access aid.',
  'Offer two familiar objects during play. Support looking, touching, pointing or directing a helper to match an object and place it in a chosen location. Notice fatigue and stop signals.',
  ['Shows a choice or response using an accessible movement or signal', 'Matches or directs placement of a familiar object', 'Supporter records the access method and respects stopping'])
const agency = add('choice-and-pause', 'Express a choice, pause or need for comfort', 'early', [],
  'A trusted supporter, two familiar options, a calm routine and an agreed way to signal.',
  'During a familiar routine, offer a meaningful choice and wait for a response. Model a pause or help signal, respond to it and return only when the person is comfortable.',
  ['Supporter identifies and responds to an individual choice or discomfort signal', 'A pause or comfort request is acknowledged', 'Records what support enabled participation'])
const conversation = add('ask-and-listen', 'Ask for help and check a shared understanding', 'shared', [comm, agency],
  'A familiar cooperative task, accessible words/symbols and a partner.',
  'Explain a need, listen or attend to the response, ask for clarification and check what each person will do. Practise disagreement and refusal without pressure.',
  ['Communicates a need or question', 'Checks the partner understood', 'Respects a refusal and identifies another source of help'])
const routines = add('two-step-routine', 'Follow and check a short safe routine', 'shared', [conversation, movement],
  'Two pictorial instructions for sorting harmless objects and a clear stop/help signal.',
  'Follow the two steps, compare the result with a model and ask when an instruction is unclear. Practise stopping before an unfamiliar action.',
  ['Follows both steps in order with recorded support', 'Compares the result to the model', 'Stops and asks before an unclear action'])
const symbols = add('read-symbols', 'Recognise practical signs, words and number labels', 'shared', [comm, movement],
  'Familiar picture/word pairs, accessible print or audio and a few sample signs.',
  'Match signs and written words to familiar objects or actions. Build and read short meaningful messages with a partner, using accessible text tools as needed.',
  ['Matches a sign or word to its meaning', 'Builds or interprets a short meaningful message', 'Identifies an unfamiliar sign and asks rather than guessing'])
const texts = add('practical-texts', 'Read and produce a practical instruction or record', 'shared', [symbols, routines, conversation],
  'A short sample appointment letter, checklist and form, in an accessible format.',
  'Find who, what, when and the requested action in each sample. Write, dictate or assemble a response and a short record of the agreed action. Check meaning with a partner.',
  ['Retrieves the action and relevant details', 'Produces a usable response or record', 'Checks an unclear word or missing detail'])
const count = add('count-and-compare', 'Count, group and compare everyday quantities', 'shared', [num, routines],
  'Safe counters, quantity cards and a short list of required amounts.',
  'Count collections beyond the first small quantities by grouping, compare with a requested total and find how many are missing. Recount with a different arrangement.',
  ['Counts and records the requested collection', 'Finds a shortfall or surplus', 'Checks the result by regrouping or recounting'])
const money = add('money-and-dates', 'Use amounts, prices, dates and time in a simple plan', 'shared', [count, texts],
  'Fictional price labels, play money, a calendar and an accessible calculator.',
  'Read amounts and units, total a short list, compare with an available budget and locate an expiry or appointment date. Use a calculator and calendar to check the plan.',
  ['Distinguishes amount, unit and date', 'Checks a total against a budget', 'Orders dated events and records a reminder'])
const choices = add('compare-and-plan', 'Compare options and carry out a small plan', 'shared', [money, conversation],
  'Two fictional choices, a simple goal, constraints and a supportive partner.',
  'State the goal, compare costs and practical constraints, choose a small next action and review the result. Change the plan when a new constraint is introduced.',
  ['States the goal and relevant constraints', 'Explains a choice and records the next action', 'Reviews and adapts after a change'])
const safety = add('safe-routines', 'Recognise a hazard, stop and seek suitable help', 'shared', [routines, texts],
  'Pictures or mock-ups of routine hazards, supplied safe procedures and a help contact card. No live hazards.',
  'Sort examples into routine actions and situations requiring a stop. Use the supplied procedure to explain a safe response and who should help. Practise reporting the location and concern.',
  ['Identifies a supplied hazard cue', 'Stops instead of improvising an unsafe response', 'Communicates the concern and appropriate help contact'])
const cooperation = add('work-with-others', 'Agree roles, boundaries and accessible ways to cooperate', 'shared', [conversation, routines],
  'A cooperative sorting task, two participants and different access preferences.',
  'Ask how each person can participate, agree roles, take turns and renegotiate a role when someone needs a break or cannot use the original materials.',
  ['Checks access preferences without assuming them', 'Agrees and follows roles', 'Adapts the task while respecting boundaries'])
const digital = add('digital-practice', 'Use a practice account and check a digital message', 'shared', [texts, safety, choices],
  'An offline mock service with fictional credentials and messages; no real personal data.',
  'Enter a practice service, protect fictional credentials, find an action and compare a suspicious message with a trusted contact route. Ask for help without sharing a secret.',
  ['Uses the intended practice service', 'Keeps credentials private and signs out', 'Checks a suspicious request through the supplied trusted route'])

// key, inputs, supplied materials, task, observable outputs. These scenarios
// supplement the retained two-stage drafts rather than silently replacing them.
const adultTasks = [
  ['communicate-respectfully', [cooperation], 'A fictional disagreement over a shared task.', 'Explain your concern without attributing motives, ask about the other perspective and agree a next step that permits refusal.', ['Separates observation from assumption', 'Checks understanding and consent', 'Records a mutually acceptable next step or a respectful pause']],
  ['include-different-needs', [cooperation, choices], 'A proposed outing and three fictional access preferences.', 'Revise the plan with the participants so communication, cost and physical access are considered.', ['Asks rather than assumes needs', 'Changes at least one relevant barrier', 'Checks the revised plan with the people concerned']],
  ['parent-self-regulation', [agency, conversation, choices], 'A fictional overloaded day and a list of support options.', 'Notice stress cues, choose a pause, reduce the immediate demand and ask a suitable person for support.', ['Names a personal warning cue', 'Chooses a feasible pause or adjustment', 'Makes a specific support request']],
  ['manage-personal-finances', [money, choices], 'Fictional income, essential expenses and an unexpected cost.', 'Build a short budget, prioritise essential costs and revise it when the unexpected cost is added.', ['Totals income and expenses with checks', 'Identifies a shortfall', 'Records a realistic revision and support option']],
  ['pay-bills-and-keep-records', [money, digital], 'A fictional bill, due date and mock payment record.', 'Match the bill to the expected service, verify the recipient through the supplied trusted route and file a mock receipt with a reminder.', ['Checks amount, recipient and due date', 'Does not disclose real financial details', 'Retrieves the receipt and reminder']],
  ['organize-household', [safety, choices, cooperation], 'A sample week of household tasks and agreed responsibilities.', 'Make a manageable task schedule, allocate responsibilities by agreement and revise it after a missed task.', ['Includes recurring tasks and supplies', 'Agrees responsibilities and support', 'Reviews and revises the schedule']],
  ['plan-food-safely', [money, safety], 'Mock food labels, a shopping list and supplied storage instructions.', 'Plan a simple basket within the budget, check dates and storage instructions and flag items that need advice or replacement.', ['Checks amounts and budget', 'Uses supplied date/storage instructions', 'Separates an uncertain item and seeks help']],
  ['use-digital-services-safely', [digital], 'An offline service form, fake credentials and a suspicious request.', 'Complete a fictional service action, retain its confirmation and explain how to recover access using the supplied official route.', ['Shares only the requested fictional information', 'Checks and stores the confirmation', 'Identifies the supplied recovery route']],
  ['evaluate-information', [texts, digital, choices], 'Two conflicting fictional messages and a provided authoritative reference.', 'Trace who issued each message, compare its date and evidence and state what must be checked before acting.', ['Identifies source and date', 'Distinguishes assertion from supplied evidence', 'Records a verification step and remaining uncertainty']],
  ['navigate-health-services', [texts, digital, conversation], 'A fictional appointment invitation, service directory and access preferences. No clinical advice.', 'Locate the supplied appropriate service contact, prepare questions and arrange the sample appointment with required communication support.', ['Finds the contact in the supplied directory', 'Records appointment details and access needs', 'Prepares questions for a qualified professional']],
  ['manage-time-and-mobility', [money, choices, safety], 'A mock timetable, appointment time, fares and an accessible route option.', 'Plan a journey with a time allowance, check access and cost and choose a backup if a service is cancelled.', ['Checks arrival time and cost', 'Checks the required access option', 'Records a workable backup or help contact']],
  ['navigate-public-services', [texts, digital, choices], 'A fictional eligibility scenario, service directory and sample form.', 'Find the relevant service in the supplied directory, identify required documents and prepare a question about an unclear requirement.', ['Selects the relevant supplied service', 'Lists required documents without real personal data', 'Records a deadline and clarification contact']],
  ['everyday-problem-solving', [choices, safety, cooperation], 'A fictional failed delivery and two possible contact routes.', 'Describe the problem, gather the order facts, choose a proportionate action and review whether the response resolved it.', ['Separates facts from assumptions', 'Uses an appropriate supplied contact route', 'Records an outcome and escalation or follow-up']],
  ['prepare-for-emergencies', [safety, choices, conversation], 'A tabletop power-loss scenario and supplied local contact/procedure cards.', 'Identify immediate concerns in the scenario, locate the supplied instructions and plan communication and support without attempting hazardous repairs.', ['Uses the supplied procedure and contacts', 'Identifies actions to leave to qualified responders', 'Includes communication and access needs']],
]
const workTasks = [
  ['0ff99f51-40d9-42f1-a1ec-377b2bb5e15f', [safety, texts], 'Apply the supplied food-hygiene checklist', 'Mock food packages, an illustrated store hygiene checklist and a reporting form.', 'Prepare the mock area using the supplied checklist, separate an example with damaged packaging and report the issue. Use no real contaminated food.', ['Completes each supplied hygiene check', 'Separates the flagged example', 'Records and reports the issue using the procedure']],
  ['119fe928-401d-4254-9273-dd1c171fe84e', [texts, money, routines], 'Replace and verify a shelf label', 'Mock products, old and new labels, a supplied product/price record and a safe display board.', 'Match the product identifier to the authorised sample record, replace the correct label and check adjacent labels for an accidental mismatch.', ['Matches identifier, amount and unit', 'Replaces the intended label in the correct position', 'Checks the result and reports a mismatch']],
  ['25fce4fb-35b6-49b6-a4fa-c7aa168fd770', [safety, routines, texts], 'Inspect a delivery of mock merchandise', 'Sample packages with staged damage, a delivery record and supplied acceptance criteria.', 'Compare identity, amount and condition with the supplied record. Separate discrepancies and prepare a concise report.', ['Checks identity, quantity and condition', 'Separates staged discrepancies', 'Reports findings against the supplied criteria']],
  ['44f6a65f-6be7-4818-9a66-73908797283f', [count, texts, choices], 'Count a shelf and prepare a replenishment request', 'A mock shelf, stock sheet and supplied target quantities.', 'Count by product, compare with the target, record a replenishment quantity and reconcile a deliberately incorrect entry.', ['Records quantities by product', 'Calculates and checks the shortfall', 'Resolves or reports the inconsistent entry']],
  ['7e9daad3-8604-4839-af9b-dc6f8db3ef68', [safety, movement, count, routines], 'Replenish a safe mock shelf from a plan', 'Light empty packages, a reachable display, shelf plan and supplied rotation instructions.', 'Match products to positions, rotate according to the supplied dates and keep the access route clear. Stop for unsafe height, weight or damaged shelving; no ladder or machinery use.', ['Matches the supplied shelf plan', 'Applies the supplied rotation instruction', 'Keeps access clear and identifies when to stop']],
  ['a5e51fb1-b3b6-49fd-8deb-f96c4d46da81', [money, texts], 'Check shelf prices against a supplied record', 'Mock shelf labels and an authorised sample price list with deliberate discrepancies.', 'Compare identifiers, prices and units, record each mismatch and request correction through the supplied process.', ['Checks product identity and pricing unit', 'Finds the staged discrepancies', 'Records an accurate correction request']],
  ['c7e8948c-e7e4-406a-957d-55daaa4cdb44', [safety, texts, routines], 'Check a storage layout and report hazards', 'A diagram of a store area and supplied storage/access rules.', 'Check the diagram against the rules, mark blocked access and unsuitable placements, and propose a correction for supervisor confirmation. Do not handle heavy goods or equipment.', ['Finds the staged storage hazards', 'Uses the supplied limits and access rules', 'Reports a correction and work requiring supervision']],
  ['cf441bdc-450b-4f44-8b21-3ca946c5d96b', [money, texts, safety], 'Check dates and storage history on mock food', 'Fictional date labels, supplied date-type guidance, storage logs and an escalation procedure.', 'Identify the label type, compare dates and supplied storage records, and separate examples requiring a supervisor decision rather than guessing.', ['Reads the supplied date type and date', 'Checks the sample storage record', 'Separates and escalates uncertain examples']],
]
function requiredLeaves(root, seen = new Set()) {
  if (seen.has(root)) throw new Error(`Decomposition cycle: ${root}`)
  const children = dataset.decompositions.filter(edge => edge.from === root && edge.type === 'decomposes_into' && edge.completion_requirement !== 'optional' && edge.completionRequirement !== 'optional')
  if (!children.length) return [root]
  return [...new Set(children.flatMap(edge => requiredLeaves(edge.to, new Set([...seen, root]))))]
}
function branch(target, key, stage, inputs, label, materials, task, criteria) {
  const individual=individualPilotBranch(dataset,target,id(key),stage)
  if(individual){
    authored.push(individual.demonstration)
    for(const item of individual.steps)step(item.id,item.stage,item.requires,item.mode)
    pilot.demonstrations[target]=individual.demonstration.id
    return
  }
  const leaves = requiredLeaves(target)
  let prior = inputs
  // Existing activities are retained and all are required in this pilot.
  for (const leaf of leaves.filter(leaf => leaf !== target)) { step(leaf, stage, prior); prior = [leaf] }
  const demo = add(key, label, stage, prior, materials, task, criteria)
  if (leaves.includes(target)) {
    // Fill the one actual missing skill breakdown, preserving its official ID.
    dataset.decompositions.push({ from: target, to: demo, type: 'decomposes_into', validation: 'proposed', completion_requirement: 'required', source })
  }
  step(target, stage, [demo], 'gate'); pilot.demonstrations[target] = demo
}
// Rebuild only this generator's relations; replace owned records in place below.
dataset.decompositions = dataset.decompositions.filter(edge => edge.source !== source)
for (const [key, inputs, materials, task, criteria] of adultTasks) {
  const target = 'atlas:skill:' + key
  const label = dataset.capabilities.find(node => node.id === target)?.label
  if (!label) throw new Error(`Unknown adult skill: ${target}`)
  branch(target, 'adult-' + key, 'adult', inputs, label + ' — practical scenario', materials, task, criteria)
}
for (const [key, inputs, label, materials, task, criteria] of workTasks) branch('http://data.europa.eu/esco/skill/' + key, 'work-' + key, 'work', inputs, label, materials, task, criteria)
for (const role of [adult, occupation]) {
  const roots = dataset.role_capability_assertions.filter(edge => edge.from === role && ['atlas_required', 'esco_essential'].includes(edge.type)).map(edge => edge.to)
  step(role, role === adult ? 'adult' : 'work', roots, 'gate')
}
dataset.learning_units=replaceOwnedRecords(dataset.learning_units,preserveIndividualRevisions(dataset.learning_units,authored),node=>node.id.startsWith(prefix))
if (dataset.quantity_practice) { applyQuantityPractice(dataset); applyMeasurementFoundations(dataset) }
dataset.pilot_pathway = pilot
if (dataset.pathway_exploration?.refinement) {
  const known = new Set(pilot.steps.map(step => step.id))
  for (const route of dataset.pathway_exploration.routes) for (const step of route.steps) {
    if (!['early', 'shared'].includes(step.stage) || known.has(step.id)) continue
    pilot.steps.push(structuredClone(step)); known.add(step.id)
  }
  pilot.steps = pruneRouteSteps(refineFoundationSteps(pilot.steps), pilot.end_ids)
  pilot.version = 2
  pilot.entry_ids = pilot.steps.filter(step => !step.requires.length).map(step => step.id)
}
reconcileAuthoredRoutes(dataset)
const audit = auditPilot(dataset)
if (!audit.valid) throw new Error(audit.errors.join('\n'))
await writeDataset(dataset)
console.log(`Pilot: ${audit.requirements.length} required capabilities; ${audit.activities} activities; ${authored.length} authored activities; all branches structurally covered; unreviewed draft.`)
