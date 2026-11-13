const base='atlas:alu:foundation-exploration:'
const pilot='atlas:alu:pilot:shelf-filler:'
export const measurementId=key=>key.startsWith('@')?pilot+key.slice(1):key.startsWith('early:')?'atlas:alu:development:'+key.slice(6):base+key
export const measurementInputs={
  classify:['@explore-and-place','@choice-and-pause'],
  observe:['classify','@explore-and-place'],
  'repeat-unit':['early:numeracy:understand-counted-total','observe'],
  'read-scale':['repeat-unit','classify'],
}
const source='Capability Atlas measurement foundation authoring v1'
const specifications=[
 {key:'classify',concept:'Membership of a group depends on the stated property rule.',
  input:'Four accessible object cards: A = red circle; B = blue circle; C = red square; D = square with colour deliberately unspecified. A supporter may supply these descriptions; no written-word reading is required.',
  task:'Use the rule “red objects” to place A and C in the matching group, B outside it, and D in a “need to check” position. Change the rule to “squares” and regroup C and D. State the supplied rule through speech, sign, pointing, AAC or a partner-supported record.',
  outputs:['Groups the supplied cards using the stated property','Changes membership when the rule changes','Asks for missing property information instead of guessing'],
  variation:{materials:'Cards E = blue triangle, F = red triangle, G = blue square; rule: triangles.',prompt:'Group the triangles, then change the rule to blue objects. Explain or show which memberships changed.',expected_evidence:['E and F match the triangle rule; G does not.','E and G match the blue rule; F does not.','The explanation or indicated choices refer to the stated property.']},
  difficulty:['Assuming the old rule still applies or guessing an unspecified property.','Restate the current rule, compare one property at a time and use an explicit “need to check” response.'],
  parents:[['@explore-and-place','Matching and grouping require access to familiar object features or an equivalent supplied description.'],['@choice-and-pause','The person needs an accessible way to indicate a choice, uncertainty or a pause; independent movement and speech are not required.']],minutes:[5,10,15,40,2,4]},
 {key:'observe',concept:'A comparison identifies an observable difference against a supplied reference.',
  input:'Reference card: one red square in tray A. Observation card: one blue square in tray A. Both cards explicitly show one square in the same tray; a partner may describe the cards.',
  task:'Record what is the same and what differs. Identify colour as the observed difference, leaving number, shape and location unchanged. Compare “the square is blue instead of red” with “someone was careless”; the second is an explanation not established by these cards.',
  outputs:['Records supplied features without inventing a cause','Finds the difference against the reference','Checks unchanged features and records remaining uncertainty'],
  variation:{materials:'Reference: two circles in tray B. Observation: three circles in tray B. The counts are supplied, so unaided counting is not being taught or assessed here.',prompt:'Record the changed and unchanged features and identify what the cards do not explain.',expected_evidence:['The supplied count changed from two to three.','Shape and tray remain the same.','The cause of the difference is not established.']},
  difficulty:['Reporting an imagined reason as if it were an observation.','Separate supplied features from possible explanations; point to or quote the specific difference.'],
  parents:[['classify','Comparison uses matching supplied features and noticing when a property differs.'],['@explore-and-place','The activity needs access to the objects, cards or equivalent descriptions, not an entire multi-step household routine.']],minutes:[5,12,20,45,2,5]},
 {key:'early:numeracy:experience-number-words',concept:'A short number-word sequence can be encountered in a stable order through an accessible routine.',
  input:'Three safe large counters, a familiar supporter and accessible labels or signals for one, two and three. A model routine is: offer one counter while modelling “one”, add another while modelling “two”, and add the third while modelling “three”.',
  task:'The supporter offers the short sequence in the supplied order during a responsive routine. Allow looking, signing, vocalising, AAC selection or directing a partner; do not demand recitation. Record the sequence offered, the access method, any participation and pause signals.',
  outputs:['Records a stable short sequence offered in the routine','Offers a responsive accessible participation method','Distinguishes exposure or prompted participation from independent use of number words'],
  variation:{materials:'Three different safe familiar objects or their accessible representations, with the same one/two/three labels.',prompt:'Offer the same short sequence in a different familiar routine, preserving its order and recording access and responses.',expected_evidence:['The modelled sequence remains one, two, three.','The supporter adapts objects or communication access without requiring recitation.','Observations describe what was offered and the participation/support actually seen.']},
  difficulty:['Treating a recited rhyme or adult demonstration as evidence of independent counting.','Record the offered sequence and actual support separately; exposure does not establish counting mastery.'],
  parents:[['early:numeracy:notice-small-quantities','The routine builds on supported attention to a small collection or change, with a familiar supporter supplying the sequence.']],minutes:[3,8,15,45,3,6],evidence:'This check concerns the offered routine and accessible participation, not a test of independent number-word knowledge.'},
 {key:'early:numeracy:match-count-word-to-object',concept:'One count label is coordinated with each object exactly once.',
  input:'Three safe movable counters labelled A, B and C for the observer, a starting area, a counted area, and spoken/signed/AAC labels one, two and three. No printed numeral reading is required.',
  task:'Move or indicate A once with “one”, B once with “two” and C once with “three”, tracking which objects have been counted. A partner may perform the movement directed by the learner. Replay a staged example that counts B twice and identify or correct the duplicated correspondence.',
  outputs:['Coordinates one available count label with each object','Tracks counted objects without skipping or duplicating one','Records communication, movement and prompting support'],
  variation:{materials:'Four safe counters in a different arrangement, four accessible count labels and a partner if needed.',prompt:'Track each counter once in the changed arrangement. Show how you know no object was skipped or counted twice.',expected_evidence:['Each of the four counters is indicated exactly once.','Count labels remain paired one-to-one with the indications.','The record distinguishes the learner’s actions from partner-supplied tracking.']},
  difficulty:['Touching an object twice while continuing the count sequence.','Use a counted area, an accessible marker or a partner-directed move to keep correspondence visible.'],
  parents:[['early:numeracy:experience-number-words','Accessible count labels must be available in a stable sequence; a supporter can supply or read them, so independent recitation is not an entry requirement.']],minutes:[3,10,20,60,3,7]},
 {key:'early:numeracy:understand-counted-total',concept:'The final label in a one-to-one count gives the total of that collection.',
  input:'Three safe counters, accessible one/two/three labels and a “how many?” response method. Count the three objects once together, retaining the final label three as an available symbol or word.',
  task:'After the count, ask for the collection’s total without demanding a recount. Rearrange the same three objects without adding or removing any and ask again. Record whether the final label is used as the total and what prompting was supplied.',
  outputs:['Uses the final count as the total of the supplied collection','Checks the same collection after rearrangement','Records whether a helper supplied the count, the final answer or only communication access'],
  variation:{materials:'Four safe counters, count labels one to four and a different arrangement; no objects are added or removed after counting.',prompt:'Count the changed collection with available support, then indicate its total. Rearrange it and check the answer while keeping the same objects.',expected_evidence:['The final label four is used for the changed collection’s total.','The total remains four when the same objects are rearranged.','Answer prompting is recorded and is not described as unaided understanding.']},
  difficulty:['Treating the final count label as only another word rather than the collection’s total.','Link the final label to the entire collection and distinguish a changed arrangement from adding or removing objects.'],
  parents:[['early:numeracy:match-count-word-to-object','A total based on a count needs correspondence with each object; record any partner contribution to that count.']],minutes:[3,10,20,60,3,7],evidence:'A supplied-case observation with prompting recorded. If a helper supplies the total, record supported participation rather than independent cardinality evidence.'},
 {key:'repeat-unit',concept:'A measured span is covered by repeated equal units without unmeasured gaps or overlaps.',
  input:'Model strip A consists of six touching blocks, each representing 2 cm. Model strip B has six blocks with an unmeasured gap. Model strip C has blocks with unspecified unequal sizes. These are cards, not screen-calibrated rulers.',
  task:'Use strip A to connect a count of equal units with the represented span. Compare B and C and explain why their block counts alone do not establish the same length. Use the supplied count or partner support; no tens-grouping or shortfall task is required.',
  outputs:['Uses equal units for a measured span','Identifies an unmeasured gap or overlap','Explains why an unspecified unequal-unit count is insufficient'],
  variation:{materials:'Five touching model blocks, each representing 3 cm; a second five-block card has unspecified unequal sizes. A calculator or repeated-addition support is available.',prompt:'Find the represented length of the equal-unit strip and decide whether the same count establishes the unequal-unit strip’s length.',expected_evidence:['The equal-unit model represents 15 cm, with arithmetic support recorded.','The unequal-unit card cannot be assigned that length from block count alone.','The explanation uses unit size and coverage, not only the count.']},
  difficulty:['Equating the number of blocks with length regardless of unit size or placement.','Check equal unit size, coverage and the supplied relation before calculating or obtaining a total.'],
  parents:[['early:numeracy:understand-counted-total','Repeated-unit measurement uses a count of the units covering the span; counts and arithmetic may be supplied through the recorded support method.'],['observe','The learner must obtain or compare the placement information to notice gaps, overlaps or unequal units.']],minutes:[5,12,20,50,2,5],practice:true},
 {key:'read-scale',concept:'A labelled scale position corresponds to a value through its interval and unit.',
  input:'Use the supplied model jug (0–500 mL in 50 mL intervals, indicator at 350 mL) and ruler cards (0, 2, 4, 6, 8 cm; A indicates 6 cm and B indicates 4 cm). Equivalent tick lists and partner descriptions are available.',
  task:'Locate the reference, obtain the interval and unit, and report the marked position. Compare the ruler readings and preserve both values and units. Use labels or supplied descriptions; generic written-word decoding is not an additional prerequisite.',
  outputs:['Locates the supplied reference and unit','Reads the marked position using the labelled interval','Compares two readings while retaining their values and units'],
  variation:{materials:'A changed scale marked 0, 25, 50, 75, 100 mL; the indicator is on the mark immediately after 50 mL.',prompt:'Use the changed interval to report the indicated value and unit.',expected_evidence:['Reports 75 mL.','Uses the changed 25 mL interval rather than the previous 50 mL interval.','Records whether reading, numeric interpretation or arithmetic was supported.']},
  difficulty:['Counting marks without using their labelled interval or reporting a number without its unit.','Obtain two adjacent labels and their unit first, then use the indicated position; do not infer the physical size of the screen drawing.'],
  parents:[['repeat-unit','A scale encodes repeated units or intervals; the earlier activity provides that measurement relation.'],['classify','The task requires matching supplied labels/positions and distinguishing units; text or partner access can provide the labels without a separate word-decoding curriculum.']],minutes:[5,12,20,50,2,5],practice:true},
]

export function applyMeasurementFoundations(dataset){
  const byId=new Map(dataset.learning_units.map(node=>[node.id,node]))
  dataset.decompositions=dataset.decompositions.filter(edge=>edge.source!==source)
  for(const spec of specifications){
    const node=byId.get(measurementId(spec.key))
    if(!node)throw new Error('Missing measurement foundation: '+spec.key)
    const [min,max,totalMin,totalMax,revisitMin,revisitMax]=spec.minutes
    const parents=spec.parents.map(([key,reason])=>({input_id:measurementId(key),reason}))
    node.learning_design={format:1,status:'authored_draft',scope:'activity',focus:{mode:'introduce',goal:spec.concept,new_concepts:[spec.concept]},
      starting_abilities:parents.map(parent=>({ability:parent.reason,requirement:'supportable',alternatives:['Use the supplied accessible materials or labels.','Record what a partner supplies; do not call prompted answers unaided evidence.']})),
      input:spec.input,task:spec.task,outputs:spec.outputs,
      understanding_check:{kind:'observed_variation',what_changes:spec.variation.prompt,materials:spec.variation.materials,prompt:spec.variation.prompt,expected_evidence:spec.variation.expected_evidence,evidence_scope:spec.evidence||'Changed supplied case with communication, physical and arithmetic support recorded; this is not a claim of general or unaided mastery.'},
      difficulties:[{misconception:spec.difficulty[0],feedback:spec.difficulty[1]}],
      effort:{session_minutes:{min,max},total_active_minutes:{min:totalMin,max:totalMax},revisit_sessions:{min:revisitMin,max:revisitMax},spacing:'Offer short revisits on separate occasions when useful, responsive to attention and comfort; no fixed age or calendar interval is prescribed.',confidence:'low',observed:false,basis:'Atlas author judgement for planning; no learner timing observations or instructional validation.',assumptions:['Access and any partner support are available.','Active effort excludes setup, breaks, waiting and learning unrelated prerequisites.','The structured range is provisional; earlier illustrative hour estimates are retained as legacy notes, not timing evidence.']},
      reuse:{shared_core:spec.concept,context:'Reuse the stated relation with changed objects, labels and settings; wider occupational practice and independent performance need separate evidence.'},dependency_basis:parents}
    if(spec.practice&&node.practice_exercise){node.learning_design.understanding_check.kind='practice_variation';node.learning_design.understanding_check.question_ids=['variation']}
    for(const parent of parents){if(!dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===parent.input_id&&edge.to===node.id))dataset.decompositions.push({from:parent.input_id,to:node.id,type:'prerequisite_for',validation:'proposed',source})}
  }
}
