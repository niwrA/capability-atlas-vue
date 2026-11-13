import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeMetadata, decodeMetadata } from '../src/catalogue-metadata.js'
import { decodeIndex } from '../src/atlas-loader.js'

function fixture(value){const strings=[],positions=new Map(),intern=value=>{if(!positions.has(value)){positions.set(value,strings.length);strings.push(value)}return positions.get(value)};return {encoded:encodeMetadata(value,intern),strings}}

test('route metadata preserves nested source text, repeated IDs, numbers and empty collections without repeating strings',()=>{
 const id='http://data.europa.eu/esco/skill/repeated-source',text='Exact source text with a different construction and scope.'
 const value={format:1,routes:Array.from({length:20},(_,index)=>({id:'route:'+index,version:2,enabled:index%2===0,notes:null,steps:[{id,requires:[id]}],source_definition:text,empty:[]}))}
 const {encoded,strings}=fixture(value)
 assert.deepEqual(decodeMetadata(encoded,strings),value)
 assert.equal(strings.filter(value=>value===id).length,1)
 assert.equal(strings.filter(value=>value===text).length,1)
 assert.ok(JSON.stringify({encoded,strings}).length<JSON.stringify(value).length/2)
})

test('invalid string references, tags and duplicate keys cannot silently corrupt route semantics',()=>{
 for(const encoded of [2,-1,1.5,{n:'1'},{n:1,o:[]},{o:[0]},{o:[0,0,0,0]},'literal'])assert.throws(()=>decodeMetadata(encoded,['key']))
 assert.throws(()=>decodeIndex({format:2,metadata:{o:[0]},strings:['key']}),error=>error.action==='reload'&&error.code==='invalid_metadata')
 const {encoded,strings}=fixture(JSON.parse('{"__proto__":{"kept":true}}'))
 const decoded=decodeMetadata(encoded,strings)
 assert.equal(Object.hasOwn(decoded,'__proto__'),true);assert.equal(Object.getPrototypeOf(decoded),Object.prototype)
 assert.equal(decoded.__proto__.kept,true)
})

test('older raw profession metadata and absent campaigns remain readable without changing route identifiers',()=>{
 const base={format:1,strings:[],nodes:[],sections:{},edges:{},profession_pathways:{format:1,routes:[{id:'stable-route'}]},profession_coverage:{complete:1}}
 assert.deepEqual(decodeIndex(base).profession_pathways,base.profession_pathways)
 const {encoded,strings}=fixture({})
 assert.equal(decodeIndex({...base,format:2,strings,metadata:encoded}).profession_pathways,undefined)
})

test('pilot and comparison metadata preserve every requirement and saved identifier in encoded and older raw catalogues',()=>{
 const pilot={id:'pilot:stable',entry_ids:['start'],end_ids:['role'],steps:[{id:'start',stage:'early',mode:'activity',requires:[]},{id:'role',stage:'work',mode:'gate',requires:['start']}],semantics:'Every listed input is required (AND).'}
 const exploration={foundation_ids:['start'],routes:[pilot],refinement:{changes:[]},questions:[]}
 const base={format:1,strings:[],nodes:[],sections:{},edges:{},pilot_pathway:pilot,pathway_exploration:exploration}
 const {encoded,strings}=fixture({pilot_pathway:pilot,pathway_exploration:exploration})
 const current=decodeIndex({...base,format:3,strings,metadata:encoded,pilot_pathway:undefined,pathway_exploration:undefined})
 const legacyMetadata=fixture({})
 const legacy=decodeIndex({...base,format:2,strings:legacyMetadata.strings,metadata:legacyMetadata.encoded})
 for(const result of [decodeIndex(base),legacy,current]){
  assert.deepEqual(result.pilot_pathway,pilot)
  assert.deepEqual(result.pathway_exploration,exploration)
 }
 const cleared=fixture({pilot_pathway:null,pathway_exploration:null})
 const result=decodeIndex({...base,format:3,strings:cleared.strings,metadata:cleared.encoded})
 assert.equal(result.pilot_pathway,null);assert.equal(result.pathway_exploration,null)
})
