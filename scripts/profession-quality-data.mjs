import { sharedId as s, authorProfessionActivity } from './profession-authoring.mjs'
import { measurementId as measure } from './measurement-foundations.mjs'

export const qualityDataId=key=>s('quality-data:'+key)
export function applyQualityData(dataset){
 authorProfessionActivity(dataset,{id:qualityDataId('frequency-table'),label:'Count classified quality observations while preserving the observation and item units',
  concept:'A frequency table counts records under an explicit classification rule and counting unit; observations and affected products are different units.',
  parents:[[measure('classify'),'Group actual observations by the stated criterion/category.'],[measure('early:numeracy:understand-counted-total'),'Count actual grouped units and retain totals.'],[s('record-observation'),'Preserve actual observation/item identities and sources.']],
  input:'Five fictional current inspection rows: A/S scratch, A/C colour, B/S scratch, C/S scratch, D/C colour. Each unique row is one recorded observation under its explicit category; four distinct products A/B/C/D are involved. Provide safe item/observation cards and an approved table with counting-unit/category/source fields. No occurrence is inferred for an uninspected product.',
  task:'Group/count actual unique rows: scratch three, colour two, total five observations affecting four identified products. Verify the table against every original row, retain both counting units and distinguish classified observation counts from accepted/rejected-item decisions. Do not count a copied record twice or infer an unrecorded cause.',
  outputs:['Builds/checks actual criterion-specific observation frequencies from source rows','Keeps observation, affected-item, inspected-item and decision units distinct'],
  variation:{change:'A/S is copied into the worksheet a second time without a new observation event.',materials:'Actual fictional original five rows plus a duplicate A/S record with the same identity.',prompt:'Check the actual observation and affected-item counts.',evidence:['The duplicate does not create a new observation.','The actual counts remain three scratch/two colour/five observations/four affected items.']},
  difficulty:['Adding category counts and calling the total rejected products, or counting a copied row as new evidence.','State the actual counting unit and reconcile unique source identities before any decision.'],minutes:[8,20,90,300,5,14]})
}
