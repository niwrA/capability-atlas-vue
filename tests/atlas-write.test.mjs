import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, stat, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { readDataset, writeDataset } from '../scripts/atlas-data.mjs'

test('repeat publication reuses immutable source files and publishes changed records in a new file', async () => {
  const temporaryRoot = resolve(tmpdir())
  const directory = await mkdtemp(join(temporaryRoot, 'atlas-write-'))
  try {
    const original = { metadata: { revision: 1 }, learning_units: [{ id: 'activity', label: 'Original' }] }
    await writeDataset(original, directory)
    const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
    const path = join(directory, manifest.sections.learning_units[0])
    const old = new Date('2020-01-01T00:00:00Z')
    await utimes(path, old, old)
    await writeDataset(original, directory)
    assert.equal((await stat(path)).mtimeMs, old.getTime(), 'Unchanged published content was not replaced')
    const changed = { ...original, learning_units: [{ id: 'activity', label: 'Changed' }] }
    await writeDataset(changed, directory)
    assert.deepEqual(await readDataset(directory), changed)
    const current = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
    assert.notEqual(current.sections.learning_units[0], manifest.sections.learning_units[0])
  } finally {
    if (dirname(resolve(directory)) !== temporaryRoot || !basename(directory).startsWith('atlas-write-')) throw new Error('Unexpected test cleanup path')
    await rm(directory, { recursive: true, force: true })
  }
})
