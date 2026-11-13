import { createHash } from 'node:crypto'
import { refinementId } from './foundation-refinement.mjs'
import { applyPracticeLearningDesign } from './learning-design.mjs'
import { replaceOwnedRecords } from './authoring-records.mjs'

const prefix = 'atlas:alu:quantity-practice:'
const source = 'Capability Atlas quantity practice pack v1'
export const quantityFoundationSteps = [
  { id: refinementId('unit-conversion'), stage: 'shared', mode: 'activity', requires: [refinementId('read-scale')] },
  { id: refinementId('compare-converted'), stage: 'shared', mode: 'activity', requires: [refinementId('unit-conversion'), refinementId('@count-and-compare')] },
  { id: refinementId('scale-selection'), stage: 'shared', mode: 'activity', requires: [refinementId('read-scale')] },
  { id: refinementId('reporting-resolution'), stage: 'shared', mode: 'activity', requires: [refinementId('read-scale')] },
  { id: refinementId('measurement-precision'), stage: 'shared', mode: 'activity', requires: [refinementId('scale-selection'),refinementId('reporting-resolution')] },
]
export const contextualQuantityInputs = {
  'use food preparation techniques': [refinementId('unit-conversion')],
  'wash the laundry': [refinementId('unit-conversion'), refinementId('measurement-precision')],
  'stock shelves': [refinementId('compare-converted')],
}
const quantity = (id, prompt, value, unit, steps, mistakes = []) => ({ id, type: 'quantity', prompt, expected: { value, unit }, units: ['items', 'cm', 'mm', 'm', 'mL', 'L', 'g', 'kg'], steps, mistakes })
const choice = (id, prompt, options, correct, steps) => ({ id, type: 'choice', prompt, options: options.map(([id, label, feedback]) => ({ id, label, feedback })), expected: correct, steps })
const packLessons = [
  { key: 'count', node_id: refinementId('@count-and-compare'), label: '1. Count and find a shortfall',
    goal: 'Keep the item unit consistent, count a collection and compare it with a target.',
    cards: [{ title: 'Counter tray', text: 'Each ● is one item. Three rows contain four items each. The target tray must contain 15 items.', rows: [['Row A', '● ● ● ●'], ['Row B', '● ● ● ●'], ['Row C', '● ● ● ●'], ['Target', '15 items']] }],
    questions: [quantity('total', 'How many items are in the counter tray?', 12, 'items', ['Count four in each of three rows: 4 + 4 + 4 = 12 items.', 'Check by moving one counter for each item or by calculating 3 × 4.']), quantity('shortfall', 'How many more items are needed to reach 15?', 3, 'items', ['Compare the target of 15 with the counted 12.', '15 − 12 = 3 items. Check: 12 + 3 = 15.'], [{ value: 27, unit: 'items', feedback: 'You combined the current and target amounts. Find the difference between them.' }])],
    prior: [], input: 'A way to distinguish one item from another; a reader/partner may read the target. Counting objects, a calculator and a partner are valid ways to check.',
  },
  { key: 'units', node_id: refinementId('repeat-unit'), label: '2. Repeat an equal measuring unit',
    goal: 'Use the same unit without gaps or overlaps, then keep the unit with the result.',
    cards: [{ title: 'Model length strip', text: 'This is a model, not a ruler to hold against the screen. Six adjacent blocks each represent exactly 2 cm.', rows: [['Blocks', '[2 cm][2 cm][2 cm][2 cm][2 cm][2 cm]'], ['Number of blocks', '6'], ['Size of each block', '2 cm'], ['Placement', 'Equal blocks touch, without gaps or overlaps']] }],
    questions: [quantity('length', 'What length does the strip represent?', 12, 'cm', ['Add six lengths of 2 cm: 2 + 2 + 2 + 2 + 2 + 2 = 12 cm.', 'Six blocks is a count; 12 cm is the represented length.'], [{ value: 6, unit: 'cm', feedback: 'Six is the number of blocks. Each block represents 2 cm; include the size of each unit.' }]), choice('gap', 'A second strip has a gap between two blocks. Can the same block count establish the full end-to-end length?', [['yes', 'Yes, counting blocks is sufficient.', 'The gap adds length that no block measures.'], ['no', 'No; close or measure the gap first.', 'Correct: equal repeated units must cover the measured span without an unmeasured gap.']], 'no', ['The six blocks still represent 12 cm of block length.', 'An unmeasured gap prevents establishing the full end-to-end length from that count.'])],
    prior: ['count'], input: 'Recognise or be told that each block has the same stated size. Repeated addition, a calculator or partner support can supply the arithmetic.',
  },
  { key: 'scale', node_id: refinementId('read-scale'), label: '3. Read a marked volume scale',
    goal: 'Find the reference point, tick interval and unit before reporting a reading.',
    cards: [{ title: 'Model jug card', text: 'The indicator is exactly on the 350 mL tick. Read this supplied model; it is not a calibrated physical measuring device.', rows: [['Scale unit', 'mL'], ['Marked ticks', '0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500'], ['Indicator', '350 mL tick']], visual: { kind: 'jug', ticks: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500], reading: 350, unit: 'mL' } }],
    questions: [quantity('reading', 'Report the indicated volume.', 350, 'mL', ['Start from the 0 mL reference and read the tick labels.', 'The indicator is on 350 mL. Include mL with the number.'], [{ value: 7, unit: 'mL', feedback: 'Seven is the number of 50 mL intervals. Each interval represents 50 mL.' }]), quantity('interval', 'How much volume does one interval between neighbouring ticks represent?', 50, 'mL', ['Compare two neighbouring labels, for example 300 and 350.', '350 − 300 = 50 mL per interval.'])],
    prior: ['units'], input: 'Use the text reading or a partner description if the diagram is inaccessible. The tick labels and interval card provide the needed scale information.',
  },
  { key: 'conversion', node_id: refinementId('unit-conversion'), label: '4. Change units without changing the quantity',
    goal: 'Convert within one kind of quantity and check the direction with a paired-value chart.',
    cards: [{ title: 'Paired-value reference chart', text: 'Use this chart directly, calculate, or ask a partner to read a matching pair. Volume, mass and length are separate kinds of quantity.', rows: [['Volume', '1 L = 1000 mL; 0.5 L = 500 mL; 0.75 L = 750 mL'], ['Mass', '1 kg = 1000 g; 0.5 kg = 500 g; 0.3 kg = 300 g'], ['Length', '1 m = 100 cm; 1 cm = 10 mm; 25 cm = 250 mm'], ['Check', 'Smaller unit → more units for the same quantity. Do not convert mass to volume without additional information.']] }],
    questions: [quantity('volume', 'Write 0.75 L in mL.', 750, 'mL', ['Find the paired values 0.75 L and 750 mL, or calculate 0.75 × 1000.', 'Check that the same volume needs a larger number of smaller units.'], [{ value: 0.00075, unit: 'mL', feedback: 'That moves in the opposite direction. One litre contains 1000 millilitres; look up the paired quantity.' }]), quantity('mass', 'Write 0.5 kg in g.', 500, 'g', ['Find 0.5 kg = 500 g on the chart, or calculate 0.5 × 1000.', 'The mass stays the same; only the unit and number change.']), quantity('length', 'Write 25 cm in mm.', 250, 'mm', ['Each centimetre represents 10 millimetres.', '25 × 10 = 250 mm. The paired-value chart supplies the same result.'], [{ value: 2.5, unit: 'mm', feedback: 'Millimetres are smaller than centimetres. The number of units should increase for the same length.' }])],
    prior: ['scale'], input: 'Need a same-dimension unit pair and an unambiguous target unit. Mental decimal multiplication is optional: the paired-value chart, calculator or a partner can supply it.',
  },
  { key: 'compare', node_id: refinementId('compare-converted'), label: '5. Compare quantities expressed in different units',
    goal: 'Put like quantities in the same unit before comparing or subtracting.',
    cards: [{ title: 'Two fictional water containers', text: 'These cards describe plain-water quantities for a model exercise.', rows: [['Container A', '0.75 L'], ['Container B', '600 mL'], ['Reference', '0.75 L = 750 mL; 1 L = 1000 mL']] }],
    questions: [choice('larger', 'Which card describes the greater volume?', [['a', 'Container A: 0.75 L', 'Correct: 0.75 L is 750 mL, which is greater than 600 mL.'], ['b', 'Container B: 600 mL', 'Comparing 0.75 directly with 600 mixes units. Express both volumes in mL first.']], 'a', ['Use the supplied pair: A = 750 mL.', 'Compare 750 mL with 600 mL; A is greater.']), quantity('difference', 'How much greater is A than B? Report in mL.', 150, 'mL', ['Convert A to 750 mL using the chart.', '750 mL − 600 mL = 150 mL. Check: 600 + 150 = 750.'], [{ value: 599.25, unit: 'mL', feedback: 'The subtraction used numbers with different units. Convert 0.75 L to mL before subtracting.' }])],
    prior: ['conversion'], input: 'Need quantities of the same kind and a common unit. Conversion and subtraction may be supported by the chart, a calculator or a partner.',
  },
  { key: 'scale-selection', node_id: refinementId('scale-selection'), label: '6a. Choose a scale that meets the supplied requirement',
    goal: 'Choose a tool using an explicit target and the available labelled marks.',
    cards: [{title:'Target and scale cards',text:'For these fictional tasks the target must be on a labelled tick; interpolation is outside the supplied task rule.',rows:[['Target A','750 mL on a labelled tick'],['Tool A','100 mL ticks: 600, 700, 800'],['Tool B','50 mL ticks: 650, 700, 750, 800'],['Target B','250 mL on a labelled tick'],['Tool C','100 mL ticks: 100, 200, 300'],['Tool D','50 mL ticks: 150, 200, 250, 300']]}],
    questions: [choice('target-a','Which supplied tool meets Target A?', [['a','Tool A','Its supplied marks do not include 750 mL.'],['b','Tool B','Correct: the required 750 mL mark is supplied.']],'b',['Read the target and the task rule.','Tool B includes a labelled 750 mL tick.']),choice('target-b','Which supplied tool meets Target B?', [['c','Tool C','Its supplied marks do not include 250 mL.'],['d','Tool D','Correct: the required 250 mL mark is supplied.']],'d',['Use the new target, not the answer for Target A.','Tool D includes the required 250 mL tick.'])],
    prior:['scale'],input:'Obtain the target, available marks and task rule from text, diagram or partner description. No estimation between marks or unaided arithmetic is required.',
  },
  { key: 'reporting-resolution', node_id: refinementId('reporting-resolution'), label: '6b. Report only the precision supplied by a reading',
    goal: 'Preserve the given reading and its stated resolution without adding unsupported digits.',
    cards: [{title:'Supplied reading records',text:'Use only the readings stated here. The task concerns reporting existing evidence, not selecting a tool or taking a new physical measurement.',rows:[['Reading A','Approximately 350 mL, read to the nearest 50 mL'],['Reading B','Approximately 80 cm, read to the nearest 10 cm'],['Reporting rule','Keep the approximation and stated resolution. No finer observation is supplied.']]}],
    questions:[choice('volume-report','Which report preserves Reading A?', [['supported','Approximately 350 mL, nearest 50 mL.','Correct: both the reading and its resolution are retained.'],['extra','Exactly 347 mL.','Those finer digits and exactness are not supplied.']],'supported',['Read the supplied record rather than inventing a new measurement.','Retain approximately 350 mL and nearest 50 mL.']),choice('length-report','Which report preserves Reading B?', [['supported','Approximately 80 cm, nearest 10 cm.','Correct: this retains the supplied evidence.'],['extra','Exactly 79.6 cm.','The supplied evidence does not support that exact value.']],'supported',['Apply the same reporting rule to the length record.','Retain approximately 80 cm and nearest 10 cm.'])],
    prior:['scale'],input:'Obtain a stated reading and its resolution through text, screen reader or a partner. Calculating an uncertainty interval is not part of this step.',
  },
  { key: 'precision', node_id: refinementId('measurement-precision'), label: '6. Review scale selection and reporting precision',
    goal: 'Match the supplied task requirement to a scale and report only what the provided evidence supports.',
    cards: [{ title: 'Tool-choice cards', text: 'For this fictional task, use a labelled tick for the target; do not interpolate between ticks. These are exercise rules, not general measurement standards.', rows: [['Target', '750 mL on a labelled tick'], ['Tool A', 'Ticks every 100 mL: … 600, 700, 800 …'], ['Tool B', 'Ticks every 50 mL: … 650, 700, 750, 800 …'], ['Separate reading case', 'A coarse card is reported as approximately 350 mL, read to the nearest 50 mL. No finer reading is supplied.']] }],
    questions: [choice('tool', 'Which supplied tool has a labelled tick for 750 mL?', [['a', 'Tool A, with 100 mL ticks', 'There is no labelled 750 mL tick on Tool A. The exercise asks for a labelled target tick.'], ['b', 'Tool B, with 50 mL ticks', 'Correct: Tool B explicitly includes a 750 mL tick.']], 'b', ['Inspect the supplied tick lists rather than assuming finer marks exist.', 'Tool B includes the requested 750 mL label.']), choice('report', 'Which report preserves the evidence of the separate coarse reading case?', [['rounded', 'Approximately 350 mL, read to the nearest 50 mL.', 'Correct: this states the supplied reading and its resolution.'], ['exact', 'Exactly 347 mL.', 'No 347 mL reading was supplied. Extra digits do not establish finer measurement.']], 'rounded', ['Keep the approximate reading and its stated resolution.', 'A more detailed number needs additional measurement evidence.'])],
    prior: ['scale-selection', 'reporting-resolution'], input: 'Rehearse the two separately introduced ideas using the supplied target, tick lists and reporting rule. No calculation or independent interpolation is required; a text/partner description is equivalent access.',
  },
  { key: 'cooking', node_id: prefix + 'cooking-transfer', label: '7. Cooking context: a paper ingredient plan',
    goal: 'Transfer scaling and unit conversion to a supplied ingredient card, without preparing or consuming food.',
    cards: [{ title: 'Paper recipe and stock cards', text: 'Use paper or counters only. No heating, cutting or food consumption is part of this exercise.', rows: [['Recipe for four portions', '600 g of a model dry ingredient'], ['Requested portions', '2'], ['Stock bag card', '0.5 kg'], ['Support pairs', 'Half of 600 g = 300 g; 0.5 kg = 500 g; 500 − 300 = 200']] }],
    questions: [quantity('needed', 'How much of the model ingredient is needed for two portions? Report in g.', 300, 'g', ['Two is half of four portions.', 'Use the supplied half-pair or calculate 600 ÷ 2 = 300 g.']), quantity('left', 'How much remains from the stock card after that amount is allocated? Report in g.', 200, 'g', ['Convert the bag card: 0.5 kg = 500 g.', 'Allocate 300 g; 500 − 300 = 200 g remain.'], [{ value: 499.7, unit: 'g', feedback: 'Check that both quantities use grams before subtracting. The supplied stock pair is 500 g.' }])],
    prior: ['conversion', 'compare'], input: 'Need the recipe ratio and stock conversion. A supplied half-pair replaces unaided proportion/decimal arithmetic; record the support used.', context: 'cook',
  },
  { key: 'cleaning', node_id: prefix + 'cleaning-transfer', label: '8. Cleaning context: a plain-water quantity card',
    goal: 'Transfer conversion and tool selection to a fictional refill task with plain water only.',
    cards: [{ title: 'Plain-water classroom task', text: 'No cleaning agent, chemical dilution, disinfection or real workplace procedure is involved. You can use only the cards.', rows: [['Requested quantity', '0.75 L of plain water'], ['Reference', '0.75 L = 750 mL'], ['Exercise rule', 'Choose a tool with a labelled target tick; do not interpolate.'], ['Tool A', '100 mL ticks: … 600, 700, 800 …'], ['Tool B', '50 mL ticks: … 650, 700, 750, 800 …']] }],
    questions: [quantity('target', 'Write the requested quantity in mL.', 750, 'mL', ['Read the supplied same-volume pair.', '0.75 L = 750 mL. No chemical mixing calculation is involved.']), choice('tool', 'Which tool meets this card’s labelled-tick requirement?', [['a', 'Tool A', 'Tool A lacks a labelled 750 mL tick under this exercise rule.'], ['b', 'Tool B', 'Correct: Tool B supplies the requested labelled target tick.']], 'b', ['Check the stated task rule and available marks.', 'Tool B includes 750 mL.'])],
    prior: ['conversion', 'precision'], input: 'Need the requested volume, conversion pair and tool marks. Reading a reference pair or partner description is a supported alternative to calculation or visual inspection.', context: 'domestic cleaner',
  },
  { key: 'retail', node_id: prefix + 'retail-transfer', label: '9. Retail context: reconcile a shelf quantity',
    goal: 'Transfer grouping and unit conversion to a mock shelf record while keeping item count separate from total volume.',
    cards: [{ title: 'Mock shelf and record cards', text: 'Use fictional labels or empty light packages. There is no pricing or financial task.', rows: [['Shelf count', '12 bottles'], ['Each bottle label', '250 mL'], ['Group reference', '4 × 250 mL = 1000 mL = 1 L'], ['Three groups', '12 bottles = 3 groups of 4 bottles'], ['Staged record error', 'Total volume: 3000 L']] }],
    questions: [quantity('volume', 'What total volume do the shelf cards represent? Report in L.', 3, 'L', ['Use three groups of four bottles.', 'Each group represents 1 L, so the total is 3 L (3000 mL).'], [{ value: 3000, unit: 'L', feedback: '3000 is the total in mL, not L. The group reference shows 1000 mL = 1 L.' }]), choice('correction', 'Which correction keeps the total quantity consistent?', [['ml', 'Change 3000 L to 3000 mL.', 'Correct: 3000 mL and 3 L describe the same total volume.'], ['count', 'Change the count to 3000 bottles.', 'Bottle count and total volume are different quantities. The supplied count remains 12.']], 'ml', ['Keep the source count of 12 bottles and 250 mL per bottle.', 'Correct the total-volume unit or report the equivalent 3 L.'])],
    prior: ['count', 'conversion', 'compare'], input: 'Need bottle count and per-bottle volume. The grouped reference supplies the multiplication and conversion; unaided multiplication is optional.', context: 'shop assistant',
  },
]

// Broaden these two activities beyond the original single supplied reading.
const unitsLesson = packLessons.find(lesson => lesson.key === 'units')
unitsLesson.cards.push({title:'Unequal-unit comparison',text:'Five touching blocks have unspecified unequal sizes. Their total length is not supplied.',rows:[['Block count','5'],['Individual sizes','Unequal, unspecified'],['Total length','Not supplied']]})
unitsLesson.questions.push(choice('unequal','Do five blocks of unspecified unequal sizes establish a length of 15 cm?', [['yes','Yes, five blocks always mean 15 cm.','The individual sizes are unspecified.'],['no','No, block count alone is insufficient.','Correct: obtain sizes or measure the full span.']],'no',['A count does not supply the sizes of unequal blocks.','The full length cannot be established from this card.']))
unitsLesson.prior = [] // Small-set counting is explained in the activity inputs, not the broader shortfall lesson.
const scaleLesson = packLessons.find(lesson => lesson.key === 'scale')
scaleLesson.cards.push({title:'Two model ruler readings',text:'Both cards show marks 0, 2, 4, 6, 8 cm. A indicates 6 cm; B indicates 4 cm. These are supplied model values, not screen-calibrated rulers.',rows:[['A','6 cm'],['B','4 cm']]})
scaleLesson.questions.push(quantity('reference','What value marks the jug scale reference?',0,'mL',['The jug tick list starts at 0 mL.','Retain the unit with the zero reference.']),choice('compare-readings','Which report preserves both ruler readings and their comparison?', [['a','A: 6 cm; B: 4 cm; A is greater.','Correct: the values, unit and comparison agree.'],['b','A: 4 cm; B: 6 cm; B is greater.','The two supplied readings have been swapped.']],'a',['Read each card with its label.','A is 6 cm and B is 4 cm, so A is greater.']))

export function applyQuantityPractice(dataset) {
  const additions = [
    ['unit-conversion', ['read-scale'], 'Convert a supplied quantity between compatible units', 'A paired-value chart for length, volume and mass, an accessible calculator and fictional quantity cards.', 'Identify the kind of quantity and target unit, use the supplied conversion pair and check that the quantity is unchanged. Record chart, calculator or partner support.', ['Keeps the kind of quantity consistent', 'Uses the supplied pair and target unit', 'Checks the conversion direction and records support']],
    ['compare-converted', ['unit-conversion', '@count-and-compare'], 'Compare and subtract quantities after expressing them in one unit', 'Two same-dimension quantity cards in different units and a paired-value chart.', 'Convert both to a common unit, compare them and calculate or obtain a checked difference. State why numbers with different units cannot be subtracted directly.', ['Uses a common compatible unit', 'Checks the comparison and difference', 'Explains the unit mismatch in a staged error']],
    ['scale-selection', ['read-scale'], 'Choose a scale using a supplied target and task rule', 'Explicit target quantities, labelled scale cards and a rule requiring a labelled target tick.', 'Match the target to the available marks under the supplied task rule. Compare a second target and explain which available tool meets that requirement.', ['Reads or obtains the target and available marks', 'Chooses a tool meeting the supplied rule', 'Checks a changed target without copying the earlier choice']],
    ['reporting-resolution', ['read-scale'], 'Preserve the resolution of a supplied measurement report', 'Stated approximate volume/length readings with their labelled resolutions.', 'Report the supplied value and its resolution. Reject unsupported extra digits or exactness, then apply the same check to a changed reading.', ['Retains the supplied value and unit', 'Retains the approximation and stated resolution', 'Rejects unsupported precision in a changed example']],
    ['measurement-precision', ['scale-selection','reporting-resolution'], 'Match a scale to a supplied target and report supported precision', 'A target quantity, labelled scale cards and an explicit reporting rule.', 'Rehearse separately introduced tool selection and evidence-preserving reporting. Check the scale marks against the task, and keep the resolution supplied with a reading.', ['Checks the target against available marks', 'Uses the supplied reporting rule', 'Does not invent finer measurement evidence']],
  ]
  const units=[]
  for (const [key, parents, label, materials, definition, criteria] of additions) {
    const id = refinementId(key)
    units.push({ id, label, kind: 'learning_unit', source, source_version: '1', status: 'proposed', official: false,
      input_specification: materials, definition, output_specification: criteria.join('; '), assessment: { method: 'Supplied-card practice with recorded support; check examples separately from wider competence.', criteria } })
  }
  for (const lesson of packLessons.filter(lesson => lesson.context)) units.push({ id: lesson.node_id, label: lesson.label.slice(3), kind: 'learning_unit', source, source_version: '1', status: 'proposed', official: false,
    definition: lesson.goal, input_specification: 'Use the supplied practice cards and reference pairs; no real workplace action is required.', output_specification: 'Checked example answers and an explicit record of support; no automatic occupational completion.', assessment: { method: 'Supplied-case answer checks and explanation.', criteria: ['Uses supplied quantities with compatible units', 'Checks the result against the supplied reference', 'Records the support and remaining uncertainty'] } })
  const additionIds=new Set(additions.map(([key])=>refinementId(key)))
  dataset.learning_units=replaceOwnedRecords(dataset.learning_units,units,node=>additionIds.has(node.id)||node.id.startsWith(prefix))
  dataset.decompositions = dataset.decompositions.filter(edge => edge.source !== source)
  for (const [key, parents] of additions) for (const parent of parents) dataset.decompositions.push({ from: refinementId(parent), to: refinementId(key), type: 'prerequisite_for', validation: 'proposed', source })
  for(const child of ['scale-selection','reporting-resolution'])dataset.decompositions.push({from:refinementId('measurement-precision'),to:refinementId(child),type:'decomposes_into',completion_requirement:'required',validation:'proposed',source})
  const contextSkills = { cook: 'use food preparation techniques', 'domestic cleaner': 'maintain inventory of cleaning supplies', 'shop assistant': 'stock shelves' }
  for (const lesson of packLessons.filter(lesson => lesson.context)) {
    const skill = dataset.capabilities.find(node => node.label === contextSkills[lesson.context] && node.source === 'ESCO' && node.source_status === 'released')
    if (!skill) throw new Error('Missing quantity context: ' + lesson.context)
    dataset.decompositions.push({ from: skill.id, to: lesson.node_id, type: 'contains_candidate', completion_requirement: 'optional', validation: 'proposed', source })
    for (const prior of lesson.prior) dataset.decompositions.push({ from: packLessons.find(item => item.key === prior).node_id, to: lesson.node_id, type: 'prerequisite_for', validation: 'proposed', source })
  }
  const byId = new Map(dataset.learning_units.map(node => [node.id, node]))
  const lessons = packLessons.map(lesson => {
    const exercise = { format: 1, id: 'quantity:' + lesson.key, version: 2, label: lesson.label, goal: lesson.goal, cards: structuredClone(lesson.cards), questions: structuredClone(lesson.questions), prior: lesson.prior,
      input: lesson.input, access: 'Read the cards visually or with a screen reader; a partner may read, point or enter your stated answer. You may use objects, the supplied reference chart or a calculator. Record the method; these checks do not establish unaided fluency.' }
    const node = byId.get(lesson.node_id)
    if (!node) throw new Error('Missing practice activity: ' + lesson.node_id)
    applyPracticeLearningDesign(node, lesson.key, exercise, lesson)
    exercise.revision = createHash('sha256').update(JSON.stringify(exercise)).digest('hex')
    node.practice_exercise = exercise
    return { id: exercise.id, node_id: lesson.node_id, label: lesson.label, prior: lesson.prior.map(key => 'quantity:' + key), context: lesson.context || null }
  })
  dataset.quantity_practice = { format: 1, id: 'atlas:practice:quantities-v1', version: 3, label: 'Quantities → measurement → unit conversion', lessons,
    purpose: 'Use supplied materials and checked examples to test a shared learning branch in cooking, cleaning and retail.',
    progress_note: 'Checked answers describe these supplied examples and recorded support. They do not mark Atlas activities, roles or qualifications complete. You can practise any lesson; earlier lessons are suggestions, not enforced barriers.',
    methods: [{ id: 'reference', label: 'Supplied chart or worked reference' }, { id: 'calculator', label: 'Calculator' }, { id: 'objects', label: 'Objects or drawing' }, { id: 'partner', label: 'Partner or assistive support' }, { id: 'unaided', label: 'Without these aids' }],
    prerequisite_audit: [
      { need: 'A value and its unit must refer to the same kind of quantity.', status: 'Necessary task information', alternative: 'Use the supplied quantity cards or have a partner describe them; mass cannot be converted to volume from these cards.' },
      { need: 'A common unit is needed for a numerical comparison or difference.', status: 'Necessary relation', alternative: 'Obtain the equivalent quantities from a paired-value chart, calculator or partner instead of requiring unaided decimal arithmetic.' },
      { need: 'Read or obtain the scale marks and reporting rule.', status: 'Necessary task information', alternative: 'The text tick list and stated reading provide equivalent information to the diagram.' },
      { need: 'Count, multiply, subtract or scale without assistance.', status: 'Practice option, not an entry barrier', alternative: 'Objects, grouped references, calculators and partner support are offered. Independent fluency requires separate evidence.' },
      { need: 'Complete all earlier lessons or all adult-life requirements first.', status: 'Suggested preparation only', alternative: 'Open any lesson and inspect its cards and support. This pack does not change the route engine’s AND semantics.' },
    ] }
  return { additions: additions.map(([key, parents]) => ({ id: refinementId(key), requires: parents.map(refinementId) })), pack: dataset.quantity_practice }
}
