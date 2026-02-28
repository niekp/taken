#!/usr/bin/env node

import { initDb } from './db.js'
import * as userRepo from './repositories/userRepository.js'
import * as bringRepo from './repositories/bringRepository.js'
import * as calendarRepo from './repositories/calendarRepository.js'
import { BringClient } from './lib/bring.js'
import { syncCalendar } from './lib/calendar.js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

// Ensure data directory exists
const dataDir = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(process.cwd(), 'data')
fs.mkdirSync(dataDir, { recursive: true })

const args = process.argv.slice(2)
const command = args[0]

function usage() {
  console.log(`
Huishouden CLI - User & Bring! Management

Usage:
  node server/cli.js <command> [options]

User Commands:
  list-users                          List all users
  add-user <name> <pin> [color]       Add a new user (PIN must be 4 digits)
  change-pin <name> <new-pin>         Change a user's PIN
  set-chores <name> <on|off>          Toggle whether user can do chores
  remove-user <name>                  Remove a user (with confirmation)

Bring! Commands:
  bring-login <email> <password>      Login to Bring! and store credentials
  bring-lists                         Show available Bring! lists
  bring-set-list <list-uuid> <name>   Select which Bring! list to use
  bring-status                        Show current Bring! configuration
  bring-remove                        Remove Bring! configuration

Calendar Commands:
  calendar-set-url <url> [name]       Set the iCal feed URL (Google Calendar secret address)
  calendar-status                     Show current calendar configuration
  calendar-remove                     Remove calendar configuration and events
  calendar-sync                       Manually trigger a calendar sync

Setup Commands:
  generate-vapid-keys                 Generate VAPID keys for push notifications

  help                                Show this help message

Colors: blue, pink, green, purple, orange, red, teal, yellow (default: blue)

Examples:
  node server/cli.js list-users
  node server/cli.js add-user "Alice" 1234 blue
  node server/cli.js change-pin "Alice" 5678
  node server/cli.js set-chores "Kind" off
  node server/cli.js remove-user "Alice"
  node server/cli.js bring-login "user@example.com" "password123"
  node server/cli.js bring-lists
  node server/cli.js bring-set-list "abc-123" "Boodschappen"
  node server/cli.js calendar-set-url "https://calendar.google.com/calendar/ical/xxx/basic.ics"
  node server/cli.js calendar-status
  node server/cli.js calendar-sync
`)
}

const VALID_COLORS = ['blue', 'pink', 'green', 'purple', 'orange', 'red', 'teal', 'yellow']

function validatePin(pin) {
  if (!/^\d{4}$/.test(pin)) {
    console.error('Error: PIN must be exactly 4 digits')
    process.exit(1)
  }
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  if (!command || command === 'help') {
    usage()
    process.exit(0)
  }

  // Commands that don't need DB
  if (command === 'generate-vapid-keys') {
    const webpushModule = await import('web-push')
    const webpush = webpushModule.default || webpushModule
    const keys = webpush.generateVAPIDKeys()
    console.log('\nVAPID Keys generated:\n')
    console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
    console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
    console.log(`\nAdd these to your docker-compose.yml environment section.`)
    console.log(`The public key is also needed as VAPID_PUBLIC_KEY.\n`)
    process.exit(0)
  }

  await initDb()

  switch (command) {
    case 'list-users': {
      const users = userRepo.findAllWithIdAndName()
      if (users.length === 0) {
        console.log('No users found.')
      } else {
        console.log('\nUsers:')
        console.log('-'.repeat(70))
        for (const user of users) {
          const chores = user.can_do_chores ? 'ja' : 'nee'
          console.log(`  ${user.name.padEnd(20)} Color: ${(user.color || 'blue').padEnd(8)} Taken: ${chores.padEnd(4)} ID: ${user.id}`)
        }
        console.log('-'.repeat(70))
        console.log(`Total: ${users.length} user(s)`)
      }
      break
    }

    case 'add-user': {
      const name = args[1]
      const pin = args[2]
      const color = args[3] || 'blue'
      if (!name || !pin) {
        console.error('Usage: add-user <name> <pin> [color]')
        process.exit(1)
      }
      validatePin(pin)

      if (!VALID_COLORS.includes(color)) {
        console.error(`Error: Invalid color "${color}". Valid colors: ${VALID_COLORS.join(', ')}`)
        process.exit(1)
      }

      const existing = userRepo.findByName(name)
      if (existing) {
        console.error(`Error: User "${name}" already exists`)
        process.exit(1)
      }

      const id = userRepo.create(name, pin, color)
      console.log(`User "${name}" created successfully (ID: ${id}, color: ${color})`)
      break
    }

    case 'change-pin': {
      const name = args[1]
      const newPin = args[2]
      if (!name || !newPin) {
        console.error('Usage: change-pin <name> <new-pin>')
        process.exit(1)
      }
      validatePin(newPin)

      const user = userRepo.findByName(name)
      if (!user) {
        console.error(`Error: User "${name}" not found`)
        process.exit(1)
      }

      userRepo.updatePin(user.id, newPin)
      console.log(`PIN for "${name}" updated successfully`)
      break
    }

    case 'set-chores': {
      const name = args[1]
      const value = args[2]
      if (!name || !value) {
        console.error('Usage: set-chores <name> <on|off>')
        process.exit(1)
      }

      if (!['on', 'off'].includes(value.toLowerCase())) {
        console.error('Error: Value must be "on" or "off"')
        process.exit(1)
      }

      const user = userRepo.findByName(name)
      if (!user) {
        console.error(`Error: User "${name}" not found`)
        process.exit(1)
      }

      const canDoChores = value.toLowerCase() === 'on'
      userRepo.updateCanDoChores(user.id, canDoChores)
      console.log(`Taken voor "${name}" ${canDoChores ? 'ingeschakeld' : 'uitgeschakeld'}`)
      break
    }

    case 'remove-user': {
      const name = args[1]
      if (!name) {
        console.error('Usage: remove-user <name>')
        process.exit(1)
      }

      const user = userRepo.findByName(name)
      if (!user) {
        console.error(`Error: User "${name}" not found`)
        process.exit(1)
      }

      const answer = await prompt(`Are you sure you want to remove user "${name}"? This will also remove their completed tasks. (y/N) `)
      if (answer.toLowerCase() !== 'y') {
        console.log('Cancelled')
        process.exit(0)
      }

      userRepo.remove(user.id)
      console.log(`User "${name}" removed successfully`)
      break
    }

    case 'bring-login': {
      const email = args[1]
      const password = args[2]
      if (!email || !password) {
        console.error('Usage: bring-login <email> <password>')
        process.exit(1)
      }

      // Save credentials
      bringRepo.saveConfig({ email, password, list_uuid: null, list_name: null })

      // Login to Bring! API
      const client = new BringClient({ email, password })
      try {
        await client.login()
        // Store tokens
        bringRepo.updateTokens(client.getTokenData())
        console.log(`Bring! login successful (user: ${email})`)
        console.log(`UUID: ${client.uuid}`)
        console.log(`Country: ${client.country}`)

        // Show available lists
        const lists = await client.getLists()
        if (lists.length > 0) {
          console.log(`\nBeschikbare lijsten:`)
          for (const list of lists) {
            console.log(`  ${list.listUuid}  ${list.name}`)
          }
          console.log(`\nGebruik 'bring-set-list <uuid> <naam>' om een lijst te selecteren.`)
        }
      } catch (err) {
        console.error(`Bring! login failed: ${err.message}`)
        // Clean up the saved config since login failed
        bringRepo.removeConfig()
        process.exit(1)
      }
      break
    }

    case 'bring-lists': {
      const config = bringRepo.getConfig()
      if (!config) {
        console.error('Bring! is not configured. Use bring-login first.')
        process.exit(1)
      }

      const client = new BringClient({
        email: config.email,
        password: config.password,
        uuid: config.uuid,
        publicUuid: config.public_uuid,
        accessToken: config.access_token,
        refreshToken: config.refresh_token,
        expiresAt: config.expires_at,
        country: config.country,
      })
      client.onTokenUpdate = (tokens) => bringRepo.updateTokens(tokens)

      try {
        const lists = await client.getLists()
        if (lists.length === 0) {
          console.log('No lists found.')
        } else {
          console.log('\nBeschikbare lijsten:')
          console.log('-'.repeat(60))
          for (const list of lists) {
            const marker = config.list_uuid === list.listUuid ? ' ← actief' : ''
            console.log(`  ${list.listUuid}  ${list.name}${marker}`)
          }
          console.log('-'.repeat(60))
        }
      } catch (err) {
        console.error(`Failed to fetch lists: ${err.message}`)
        process.exit(1)
      }
      break
    }

    case 'bring-set-list': {
      const listUuid = args[1]
      const listName = args[2]
      if (!listUuid || !listName) {
        console.error('Usage: bring-set-list <list-uuid> <list-name>')
        process.exit(1)
      }

      const config = bringRepo.getConfig()
      if (!config) {
        console.error('Bring! is not configured. Use bring-login first.')
        process.exit(1)
      }

      bringRepo.setList(listUuid, listName)
      console.log(`Bring! list set to "${listName}" (${listUuid})`)
      break
    }

    case 'bring-status': {
      const config = bringRepo.getConfig()
      if (!config) {
        console.log('Bring! is not configured.')
      } else {
        console.log('\nBring! configuratie:')
        console.log('-'.repeat(40))
        console.log(`  Email:    ${config.email}`)
        console.log(`  Lijst:    ${config.list_name || '(niet geselecteerd)'}`)
        console.log(`  List ID:  ${config.list_uuid || '-'}`)
        console.log(`  Country:  ${config.country || '-'}`)
        console.log(`  Ingelogd: ${config.access_token ? 'Ja' : 'Nee'}`)
        if (config.expires_at) {
          const expiresDate = new Date(config.expires_at)
          const isExpired = Date.now() >= config.expires_at
          console.log(`  Token:    ${isExpired ? 'Verlopen' : `Geldig tot ${expiresDate.toLocaleString('nl-NL')}`}`)
        }
        console.log('-'.repeat(40))
      }
      break
    }

    case 'bring-remove': {
      const config = bringRepo.getConfig()
      if (!config) {
        console.log('Bring! is not configured.')
        break
      }

      const answer = await prompt('Are you sure you want to remove Bring! configuration? (y/N) ')
      if (answer.toLowerCase() !== 'y') {
        console.log('Cancelled')
        break
      }

      bringRepo.removeConfig()
      console.log('Bring! configuration removed.')
      break
    }

    // ── Calendar Commands ───────────────────────────────────────────

    case 'calendar-set-url': {
      const url = args[1]
      const name = args[2] || 'Google Agenda'
      if (!url) {
        console.error('Usage: calendar-set-url <ical-url> [name]')
        process.exit(1)
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.error('Error: URL must start with http:// or https://')
        process.exit(1)
      }

      calendarRepo.saveSettings({ ical_url: url, name })
      console.log(`Calendar URL set: ${name}`)
      console.log(`  URL: ${url.slice(0, 80)}${url.length > 80 ? '...' : ''}`)

      // Trigger initial sync
      console.log('\nSyncing calendar...')
      try {
        const result = await syncCalendar()
        console.log(`Sync complete: ${result.synced} events stored`)
      } catch (err) {
        console.error(`Sync failed: ${err.message}`)
        console.log('The URL is saved, sync will retry automatically every 30 minutes.')
      }
      break
    }

    case 'calendar-status': {
      const settings = calendarRepo.getSettings()
      if (!settings) {
        console.log('Calendar is not configured.')
      } else {
        console.log('\nAgenda configuratie:')
        console.log('-'.repeat(60))
        console.log(`  Naam:         ${settings.name || 'Google Agenda'}`)
        console.log(`  URL:          ${settings.ical_url?.slice(0, 60)}${(settings.ical_url?.length || 0) > 60 ? '...' : ''}`)
        console.log(`  Laatste sync: ${settings.last_synced_at || '(nog niet gesynchroniseerd)'}`)
        console.log('-'.repeat(60))
      }
      break
    }

    case 'calendar-remove': {
      const settings = calendarRepo.getSettings()
      if (!settings) {
        console.log('Calendar is not configured.')
        break
      }

      const answer = await prompt('Are you sure you want to remove calendar configuration and all events? (y/N) ')
      if (answer.toLowerCase() !== 'y') {
        console.log('Cancelled')
        break
      }

      calendarRepo.removeSettings()
      console.log('Calendar configuration and events removed.')
      break
    }

    case 'calendar-sync': {
      const settings = calendarRepo.getSettings()
      if (!settings) {
        console.error('Calendar is not configured. Use calendar-set-url first.')
        process.exit(1)
      }

      console.log('Syncing calendar...')
      try {
        const result = await syncCalendar()
        console.log(`Sync complete: ${result.synced} events stored`)
      } catch (err) {
        console.error(`Sync failed: ${err.message}`)
        process.exit(1)
      }
      break
    }

    default:
      console.error(`Unknown command: ${command}`)
      usage()
      process.exit(1)
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
