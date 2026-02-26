#!/usr/bin/env node

import { initDb } from './db.js'
import * as userRepo from './repositories/userRepository.js'
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
Huishouden CLI - User Management

Usage:
  node server/cli.js <command> [options]

Commands:
  list-users                          List all users
  add-user <name> <pin> [color]        Add a new user (PIN must be 4 digits)
  change-pin <name> <new-pin>         Change a user's PIN
  remove-user <name>                  Remove a user (with confirmation)
  help                                Show this help message

Colors: blue, pink, green, purple, orange, red, teal, yellow (default: blue)

Examples:
  node server/cli.js list-users
  node server/cli.js add-user "Alice" 1234 blue
  node server/cli.js change-pin "Alice" 5678
  node server/cli.js remove-user "Alice"
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

  await initDb()

  switch (command) {
    case 'list-users': {
      const users = userRepo.findAllWithIdAndName()
      if (users.length === 0) {
        console.log('No users found.')
      } else {
        console.log('\nUsers:')
        console.log('-'.repeat(60))
        for (const user of users) {
          console.log(`  ${user.name.padEnd(20)} Color: ${(user.color || 'blue').padEnd(8)} ID: ${user.id}`)
        }
        console.log('-'.repeat(60))
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
