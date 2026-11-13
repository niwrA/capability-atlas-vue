import { createHash } from 'node:crypto'
import { readDataset, writeDataset } from './atlas-data.mjs'
import { ensureStartingFoundations } from './starting-foundations.mjs'
import { auditAllSkills } from '../src/pathway-audit.js'

const dataset = await readDataset()
ensureStartingFoundations(dataset)
const report = auditAllSkills(dataset)
if (process.argv.includes('--record-baseline') && !dataset.pathway_audit_baseline) {
  dataset.pathway_audit_baseline = { format:1, policy_version:report.policy_version, summary:report.summary,
    target_ids_sha256:createHash('sha256').update(report.rows.map(row=>row.id).sort().join('\n')).digest('hex'),
    note:'Initial all-skill audit before the precision split. Counts describe recorded structure and authoring, not validated learning routes.' }
  await writeDataset(dataset)
}
console.log(JSON.stringify(report.summary,null,2))
