import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { compileDataset, readDataset, root } from './atlas-data.mjs'

const { index, files, auditFiles } = compileDataset(await readDataset())
const directory = resolve(root, 'public/atlas-data')
await mkdir(directory, { recursive: true })
// Content-addressed details allow safe browser caching across data releases.
await Promise.all([...files].map(([file, text]) => writeFile(resolve(directory, file), text)))
await Promise.all([...auditFiles].map(([file, text]) => writeFile(resolve(directory, file), text)))
const text = JSON.stringify(index)
await writeFile(resolve(directory, 'index.json'), text)
for (const file of await readdir(directory)) {
  if (/^details-[a-f0-9]{2}-[a-f0-9]{20}\.json$/.test(file) && !files.has(file)) await unlink(resolve(directory, file))
  if (/^pathway-audit-[a-f0-9]{20}\.json$/.test(file) && !auditFiles.has(file)) await unlink(resolve(directory,file))
}
console.log(`Atlas: ${index.nodes.length} nodes, ${(Buffer.byteLength(text) / 1048576).toFixed(2)} MiB index, ${files.size} on-demand detail batches`)
if(index.pathway_audit)console.log(`Pathway audit: ${index.pathway_audit.summary.targets} target skills; ${index.pathway_audit.summary.authored_complete} complete authored routes; separate on-demand report`)
