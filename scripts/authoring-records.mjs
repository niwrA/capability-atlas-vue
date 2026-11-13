// Preserve existing positions so adding another content family does not move
// unchanged owned records into different immutable data chunks on the next run.
export function preserveIndividualRevisions(records, generated) {
  const individual=new Map(records.filter(record=>record.authoring_origin==='individual').map(record=>[record.id,record]))
  return generated.map(record=>individual.get(record.id)||record)
}

export function replaceOwnedRecords(records, authored, owns) {
  const pending=new Map()
  for(const record of authored){
    if(!owns(record))throw new Error('Replacement record is outside generator ownership: '+record.id)
    if(pending.has(record.id))throw new Error('Duplicate authored record: '+record.id)
    pending.set(record.id,record)
  }
  const result=[]
  for(const record of records){
    if(!owns(record))result.push(record)
    else if(pending.has(record.id)){result.push(pending.get(record.id));pending.delete(record.id)}
  }
  result.push(...pending.values())
  return result
}
