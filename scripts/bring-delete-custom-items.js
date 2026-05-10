#!/usr/bin/env node
/**
 * Deletes all custom Bring! items still listed in custom-items.txt.
 *
 * Usage:
 *   BRING_EMAIL=you@example.com BRING_PASSWORD=secret node scripts/bring-delete-custom-items.js
 *
 * Run bring-list-custom-items.js first, edit the file to keep what you want, then run this.
 */
import { readFileSync } from 'fs'
import { BringClient } from '../server/lib/bring.js'

const email = process.env.BRING_EMAIL
const password = process.env.BRING_PASSWORD

if (!email || !password) {
  console.error('Set BRING_EMAIL and BRING_PASSWORD environment variables.')
  process.exit(1)
}

let lines
try {
  lines = readFileSync('custom-items.txt', 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
} catch {
  console.error('custom-items.txt not found. Run bring-list-custom-items.js first.')
  process.exit(1)
}

if (lines.length === 0) {
  console.log('custom-items.txt is empty, nothing to delete.')
  process.exit(0)
}

// Parse "name::uuid" lines
const toDelete = lines.map(line => {
  const sep = line.lastIndexOf('::')
  if (sep === -1) {
    console.error(`Unrecognized line format (expected "name::uuid"): ${line}`)
    process.exit(1)
  }
  return { name: line.slice(0, sep), uuid: line.slice(sep + 2) }
})

console.log(`Will delete ${toDelete.length} items:`)
toDelete.forEach(({ name }) => console.log(`  - ${name}`))
console.log()

const client = new BringClient({ email, password })

console.log('Logging in...')
await client.login()
console.log(`Logged in (uuid: ${client.uuid})\n`)

let deleted = 0
let failed = 0

for (const { name, uuid } of toDelete) {
  try {
    await client._request('DELETE', `/v2/bringlistitemdetails/${uuid}`)
    console.log(`✓  ${name}`)
    deleted++
  } catch (err) {
    console.error(`✗  ${name} — ${err.message}`)
    failed++
  }
}

console.log(`\nDone. Deleted: ${deleted}, Failed: ${failed}`)
