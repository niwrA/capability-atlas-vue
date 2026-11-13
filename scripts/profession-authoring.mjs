import { assessLearningDesign } from '../src/learning-design.js'

export const professionSource = 'Capability Atlas individually authored profession pathways v1'
export const sharedId = key => 'atlas:alu:profession-foundation:' + key
export const domainId = key => 'atlas:alu:profession-domain:' + key
export const foundationId = key => 'atlas:alu:foundation-exploration:' + key
export const startId = key => key === 'signals' ? 'atlas:alu:development:communication:respond-to-early-signals' : 'atlas:alu:pilot:shelf-filler:' + key

// The mechanics are shared; concepts, materials, tasks and checks are authored
// explicitly in the content modules. No ESCO-label-to-lesson fallback exists.
export function authorProfessionActivity(dataset, spec) {
  const old = dataset.learning_units.find(node => node.id === spec.id)
  const [sessionMin,sessionMax,totalMin,totalMax,revisitMin,revisitMax] = spec.minutes
  const design = { format:1,status:'authored_draft',scope:'activity',
    focus:{mode:spec.transfer?'transfer':'introduce',goal:spec.concept,new_concepts:spec.transfer?[]:[spec.concept]},
    starting_abilities:spec.parents.map(([input_id,reason])=>({ability:reason,requirement:'supportable',alternatives:['Provide accessible objects, diagrams, labels or an agreed partner description.','Record physical, communication and answer support separately; assisted performance does not establish unaided competence.']})),
    input:spec.input,task:spec.task,outputs:spec.outputs,
    understanding_check:{kind:'observed_variation',what_changes:spec.variation.change,materials:spec.variation.materials,prompt:spec.variation.prompt,expected_evidence:spec.variation.evidence,evidence_scope:spec.evidence_scope||'Record the changed case, result and support used. A supplied-case result does not establish general or independent mastery.'},
    difficulties:[{misconception:spec.difficulty[0],feedback:spec.difficulty[1]}],
    effort:{session_minutes:{min:sessionMin,max:sessionMax},total_active_minutes:{min:totalMin,max:totalMax},revisit_sessions:{min:revisitMin,max:revisitMax},spacing:'Use separate revisits with changed examples and responsive breaks; no fixed age or calendar timetable is assumed.',confidence:'low',observed:false,basis:'Atlas author judgement for planning; no learner timing observations or instructional validation.',assumptions:['Access, materials and the stated support are available.','Active time excludes setup, waiting, breaks and learning unrelated prerequisites.','The planning range is provisional; repeated occupational practice can take longer and is not inferred from successful card tasks.','Any retained earlier illustrative hour estimate describes the previous draft, not observed timing for this revised activity.']},
    reuse:{shared_core:spec.reuse||spec.concept,context:spec.context||'Transfer to a new material, tool or workplace needs the stated contextual practice and separate performance evidence.'},
    dependency_basis:spec.parents.map(([input_id,reason])=>({input_id,reason})) }
  const node = {...old,id:spec.id,label:spec.label,kind:'learning_unit',source:professionSource,source_version:'1',official:false,status:'proposed',authoring_origin:'individual',
    definition:spec.task,input_specification:spec.input,output_specification:spec.outputs.join('; '),
    assessment:{method:'Observe the authored task and changed case; record support, actual result, errors and feedback.',criteria:spec.outputs},learning_design:design,
    evidence_basis:'Individually authored Atlas proposal. Source facets are mapped in the profession route; no external practitioner review, learner observation or occupational certification is claimed.'}
  if(old && old.source!==professionSource) node.previous_authored_draft ||= {label:old.label,definition:old.definition,assessment:old.assessment,source:old.source,source_version:old.source_version}
  // A retained old translation/fallback describes the previous lesson, not the
  // revised concept. Keep it in history rather than indexing a stale name.
  if(old?.label_nl&&node.previous_authored_draft)node.previous_authored_draft.label_nl ||= old.label_nl
  if(spec.label_nl)node.label_nl=spec.label_nl
  else delete node.label_nl
  // Insert sources before the rebuilt reuse metadata on the first pass too.
  // Otherwise its object-key order changes on the next pass, republishing an
  // identical lesson in a different immutable chunk.
  if(spec.supporting_sources)node.supporting_sources=spec.supporting_sources
  for(const field of ['decomposition_family','decomposition_stage','reusability','estimated_active_learning_hours']){
    const currentReuse=field==='reusability'&&['Shared concept proposal','Contextual transfer proposal'].includes(old?.reusability?.classification)
    if(old?.[field]!==undefined&&node.previous_authored_draft&&!currentReuse)node.previous_authored_draft[field] ||= old[field]
    delete node[field]
  }
  node.reusability={classification:spec.transfer?'Contextual transfer proposal':'Shared concept proposal',hypothesis:design.reuse.shared_core+' '+design.reuse.context}
  const result=assessLearningDesign(node)
  if(result.status!=='draft_ready')throw new Error(spec.id+': '+result.errors.join('; '))
  const index=dataset.learning_units.findIndex(item=>item.id===node.id)
  if(index<0)dataset.learning_units.push(node);else dataset.learning_units[index]=node
  const expected=new Set(spec.parents.map(([id])=>id))
  // Existing non-owned canonical requirements cannot disappear during authoring.
  for(const edge of dataset.decompositions.filter(edge=>edge.type==='prerequisite_for'&&edge.to===node.id&&edge.source!==professionSource&&edge.completion_requirement!=='optional'&&edge.completionRequirement!=='optional'))if(!expected.has(edge.from))throw new Error('Unaccounted canonical prerequisite: '+edge.from+' -> '+node.id)
  dataset.decompositions=dataset.decompositions.filter(edge=>!(edge.source===professionSource&&edge.type==='prerequisite_for'&&edge.to===node.id))
  for(const [id] of spec.parents)if(!dataset.decompositions.some(edge=>edge.type==='prerequisite_for'&&edge.from===id&&edge.to===node.id))dataset.decompositions.push({from:id,to:node.id,type:'prerequisite_for',validation:'proposed',source:professionSource})
  return node
}
