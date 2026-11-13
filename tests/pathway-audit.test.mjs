import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { readDataset, compileDataset, nodeSections } from '../scripts/atlas-data.mjs'
import { loadAtlasData } from '../src/atlas-loader.js'
import { auditAllSkills, encodePathwayAudit, decodePathwayAudit, searchPathwayAudit } from '../src/pathway-audit.js'

const source=await readDataset(), template=source.learning_units.find(node=>node.id==='atlas:alu:foundation-exploration:scale-selection')
function fixture(){
 const unit=structuredClone(template);unit.id='u';unit.learning_design.dependency_basis=[{input_id:'start',reason:'Obtain the supplied marked scale before comparing its marks to the target.'}]
 return {roles:[],capabilities:[{id:'a',kind:'skill',label:'Target A',source:'ESCO',source_status:'released'},{id:'b',kind:'skill',label:'Target B',source:'Atlas'},{id:'obsolete',kind:'skill',label:'Old',source:'ESCO',source_status:'obsolete'}],
  learning_units:[{id:'start',kind:'learning_unit',label:'Start'},unit],decompositions:[{from:'a',to:'u',type:'decomposes_into'},{from:'b',to:'u',type:'decomposes_into'},{from:'start',to:'u',type:'prerequisite_for'}],role_capability_assertions:[],
  starting_foundations:{format:1,entries:[{id:'start',assumed_ability:'Can obtain a supplied value.',support:'A partner can read the card.'}]}}
}
const row=(report,id)=>report.rows.find(row=>row.id===id)

test('audit covers active and Atlas skills, including unlinked skills, and a genuinely complete fixture can pass',()=>{
 const report=auditAllSkills(fixture())
 assert.equal(report.summary.targets,2);assert.equal(report.summary.unlinked_targets,2)
 assert.equal(report.summary.authored_complete,2)
 assert.equal(row(report,'a').authored_complete,true)
 assert.equal(report.rows.some(row=>row.id==='obsolete'),false)
})

test('one connected branch is insufficient; optional and candidate edges cannot supply mandatory coverage',()=>{
 const d=fixture();d.learning_units.push({id:'orphan',kind:'learning_unit',label:'Unexplained input'});d.decompositions.push({from:'a',to:'orphan',type:'decomposes_into'})
 let report=auditAllSkills(d)
 assert.equal(row(report,'a').connected,true);assert.equal(row(report,'a').all_inputs_connected,false)
 assert.ok(row(report,'a').flags&2)
 d.decompositions.at(-1).completion_requirement='optional'
 assert.equal(row(auditAllSkills(d),'a').authored_complete,true)
 d.decompositions.at(-1).completion_requirement='required';d.decompositions.at(-1).type='contains_candidate'
 assert.equal(row(auditAllSkills(d),'a').authored_complete,true)
})

test('missing skill breakdowns, cycles, unknown inputs and unapproved entry points stay blocked',()=>{
 const d=fixture();d.decompositions=d.decompositions.filter(edge=>edge.from!=='a');d.decompositions.push({from:'start',to:'a',type:'prerequisite_for'})
 assert.ok(row(auditAllSkills(d),'a').flags&1)
 const cycle=fixture();cycle.learning_units.push({id:'v',kind:'learning_unit'});cycle.decompositions.push({from:'u',to:'v',type:'prerequisite_for'},{from:'v',to:'u',type:'prerequisite_for'})
 assert.ok(row(auditAllSkills(cycle),'a').flags&4)
 assert.equal(row(auditAllSkills(cycle),'a').all_inputs_connected,false)
 const missing=fixture();missing.decompositions.push({from:'missing',to:'u',type:'prerequisite_for'})
 assert.ok(row(auditAllSkills(missing),'a').flags&8)
 assert.throws(()=>auditAllSkills({...fixture(),starting_foundations:{entries:[]}}),/starting foundations/)
})

test('practice-only designs, split flags and unexplained dependencies are distinct from complete activity authoring',()=>{
 const d=fixture(),unit=d.learning_units[1]
 unit.learning_design.scope='practice_sequence'
 assert.equal(row(auditAllSkills(d),'a').all_inputs_connected,true)
 assert.equal(row(auditAllSkills(d),'a').authored_complete,false)
 assert.ok(row(auditAllSkills(d),'a').flags&128)
 unit.learning_design.scope='activity';unit.learning_design.dependency_basis=[]
 assert.ok(row(auditAllSkills(d),'a').flags&256)
 unit.learning_design.dependency_basis=[{input_id:'start',reason:'Read scale marks'}]
 Object.assign(unit.learning_design.focus,{mode:'mixed',new_concepts:['A','B'],split_reason:'Two targets',split_plan:['Introduce A','Introduce B']})
 assert.ok(row(auditAllSkills(d),'a').flags&64)
})

test('explicit route contexts are evaluated separately, rather than merging incompatible prerequisites',()=>{
 const d=fixture();d.learning_units.push({id:'x',kind:'learning_unit',label:'Unexplained'});d.decompositions.push({from:'x',to:'u',type:'prerequisite_for'})
 const steps=[{id:'start',mode:'activity',requires:[]},{id:'u',mode:'activity',requires:['start']},{id:'a',mode:'gate',requires:['u']}]
 d.pathway_exploration={routes:[{id:'good',steps},{id:'bad',steps:steps.map(step=>step.id==='u'?{...step,requires:['missing']}:step)}]}
 const result=row(auditAllSkills(d),'a')
 assert.equal(result.route_id,'good');assert.equal(result.authored_complete,true);assert.equal(result.variants,3)
 d.decompositions.push({from:'a',to:'x',type:'decomposes_into'})
 const omitted=row(auditAllSkills(d),'a')
 assert.equal(omitted.authored_complete,false)
 assert.equal(omitted.all_inputs_connected,false)
})

test('compact audit codec preserves every row and priority, with searchable paginated targets',()=>{
 const d=fixture(),report=auditAllSkills(d),nodes=[...d.capabilities,...d.learning_units]
 const encoded=encodePathwayAudit(report,nodes.map(node=>node.id))
 assert.deepEqual(decodePathwayAudit(encoded,nodes),report)
 const byId=Object.fromEntries(nodes.map(node=>[node.id,node]))
 assert.equal(searchPathwayAudit(report,byId,{source:'ESCO'}).total,1)
 assert.equal(searchPathwayAudit(report,byId,{query:'Target B'}).items[0].id,'b')
 assert.equal(searchPathwayAudit(report,byId,{flag:'authored_complete'}).total,2)
 assert.notEqual(searchPathwayAudit(report,byId,{pageSize:1,page:1}).items[0].id,searchPathwayAudit(report,byId,{pageSize:1,page:2}).items[0].id)
})

test('full inventory keeps the initial baseline and truthfully reports remaining all-skill gaps',()=>{
 const report=auditAllSkills(source)
 assert.equal(report.summary.targets,13990);assert.equal(report.summary.esco_targets,13939);assert.equal(report.summary.atlas_targets,51)
 assert.equal(report.summary.unlinked_targets,464);assert.ok(report.summary.authored_complete>=4)
 assert.equal(searchPathwayAudit(report,Object.fromEntries(source.capabilities.map(node=>[node.id,node])),{flag:'unlinked'}).total,464)
 assert.ok(report.summary.whole_activity_designs>=9)
 assert.equal(report.baseline.summary.whole_activity_designs,0)
 assert.ok(report.priorities[0].target_count>1000)
 const nodes=nodeSections.flatMap(section=>source[section]||[]),encoded=encodePathwayAudit(report,nodes.map(node=>node.id))
 assert.ok(Buffer.byteLength(JSON.stringify(encoded))<2*1048576,'Keep the separate audit compact')
 assert.ok(gzipSync(JSON.stringify(encoded)).length<500*1024,'Audit compresses below 500 KiB')
 assert.deepEqual(decodePathwayAudit(encoded,nodes),report)
})

test('audit is lazy, deduplicated and retried; stale, HTML or mismatched assets request reload',async()=>{
 const d=fixture(),{index,files,auditFiles}=compileDataset(d),calls=[]
 let mode='good'
 const fetcher=async(url,options)=>{
  calls.push([url,options.cache])
  if(url.endsWith('index.json'))return {ok:true,json:async()=>structuredClone(index)}
  if(url.includes('pathway-audit-')){
   if(mode==='503'||mode==='404')return {ok:false,status:Number(mode)}
   if(mode==='html')return {ok:true,headers:{get:()=> 'text/html'},json:async()=>{throw Error('HTML')}}
   const encoded=JSON.parse([...auditFiles.values()][0]);if(mode==='mismatch')encoded.rows.pop()
   return {ok:true,json:async()=>encoded}
  }
  return {ok:true,json:async()=>JSON.parse(files.get(url.split('/').at(-1)))}
 }
 const app=await loadAtlasData({fetcher});assert.equal(calls.length,1)
 mode='503';await assert.rejects(app.loadPathwayAudit(),error=>error.action==='retry')
 mode='good';const [a,b]=await Promise.all([app.loadPathwayAudit(),app.loadPathwayAudit()]);assert.equal(a,b)
 assert.deepEqual(calls.filter(([url])=>url.includes('pathway-audit-')).map(([,cache])=>cache),['force-cache','reload'])
 await app.loadPathwayAudit();assert.equal(calls.length,3)
 for(const failure of ['404','html','mismatch']){mode=failure;const fresh=await loadAtlasData({fetcher});await assert.rejects(fresh.loadPathwayAudit(),error=>error.action==='reload')}
})
