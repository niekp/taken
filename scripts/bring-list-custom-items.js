#!/usr/bin/env node
/**
 * Lists all item detail entries for a Bring! list to custom-items.txt.
 * These are the "Eigen items" (custom/personal items) visible in the app.
 *
 * Usage:
 *   BRING_EMAIL=you@example.com BRING_PASSWORD=secret \
 *   BRING_LIST_UUID=ba768ded-b540-4848-862b-2cb835b70f27 \
 *   node scripts/bring-list-custom-items.js
 *
 * Edit custom-items.txt to remove items you want to KEEP, then run bring-delete-custom-items.js.
 */
import { writeFileSync } from 'fs'
import { BringClient } from '../server/lib/bring.js'

const email = process.env.BRING_EMAIL
const password = process.env.BRING_PASSWORD
const listUuid = process.env.BRING_LIST_UUID

if (!email || !password) {
  console.error('Set BRING_EMAIL and BRING_PASSWORD environment variables.')
  process.exit(1)
}
if (!listUuid) {
  console.error('Set BRING_LIST_UUID environment variable.')
  console.error('Tip: run without it to see your available lists, then set the UUID.')
  process.exit(1)
}

const client = new BringClient({ email, password })

console.log('Logging in...')
await client.login()
console.log(`Logged in (uuid: ${client.uuid})`)

// Print available lists for reference
const lists = await client.getLists()
console.log('\nAvailable lists:')
lists.forEach(l => {
  const marker = l.listUuid === listUuid ? ' ◀ using this one' : ''
  console.log(`  ${l.name} (${l.listUuid})${marker}`)
})

const listName = lists.find(l => l.listUuid === listUuid)?.name || listUuid
if (!lists.find(l => l.listUuid === listUuid)) {
  console.error(`\nList UUID ${listUuid} not found in your account.`)
  process.exit(1)
}

console.log(`\nFetching item details for "${listName}"...`)
const details = await client._request('GET', `/v2/bringlists/${listUuid}/details`)
const items = Array.isArray(details) ? details : (details?.items || [])

if (items.length === 0) {
  console.log('No item details found for this list.')
  process.exit(0)
}

console.log(`\nFound ${items.length} entries:\n`)
items.forEach(i => console.log(`  ${i.itemId}  [uuid: ${i.uuid}]`))

// Write to file: "name::uuid" so the delete script knows which uuid to target
const lines = items.map(i => `${i.itemId}::${i.uuid}`)
writeFileSync('custom-items.txt', lines.join('\n') + '\n', 'utf8')

console.log(`\nWritten to custom-items.txt`)
console.log('Remove lines for items you want to KEEP, then run bring-delete-custom-items.js.')
