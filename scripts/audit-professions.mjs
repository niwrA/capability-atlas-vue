import { readDataset } from './atlas-data.mjs'
import { auditProfessions } from '../src/profession-audit.js'

const report=auditProfessions(await readDataset())
console.log(JSON.stringify({target:report.target,complete:report.complete,authored:report.authored,
  in_progress:report.rows.filter(row=>row.status==='incomplete').length,
  unworked:report.rows.filter(row=>row.status==='unworked').length,
  complete_professions:report.rows.filter(row=>row.complete).map(({label,essentials,activities})=>({label,essentials,activities})),errors:report.errors},null,2))
if(report.errors.length || process.argv.includes('--require-target') && report.complete<report.target)process.exitCode=1
