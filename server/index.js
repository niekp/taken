import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cron from 'node-cron'
import { initDb } from './db.js'
import apiRouter from './routes.js'
import * as notifications from './lib/notifications.js'
import { syncCalendar } from './lib/calendar.js'
import * as sessionRepo from './repositories/sessionRepository.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// Ensure data directory exists
const dataDir = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(process.cwd(), 'data')
fs.mkdirSync(dataDir, { recursive: true })

app.use(express.json({ limit: '10mb' }))

// API routes
app.use('/api', apiRouter)

// Serve static frontend files
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  // Service worker and manifest must never be cached by the browser
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Content-Type', 'application/javascript')
    res.sendFile(path.join(distPath, 'sw.js'))
  })

  app.get('/manifest.webmanifest', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(path.join(distPath, 'manifest.webmanifest'))
  })

  // Hashed assets (in /assets/) can be cached forever
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }))

  // Everything else (icons, etc.) with short cache
  app.use(express.static(distPath, {
    maxAge: '1h',
  }))

  // SPA fallback — index.html should always be re-validated
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Initialize database (runs migrations) and start server
await initDb()

// Initialize push notifications (no-op if VAPID keys not set)
notifications.init()

// Cron: every 15 minutes, check if any subscriptions need their daily notification
cron.schedule('*/15 * * * *', () => {
  const { hours, minutes } = notifications.getAmsterdamNow()
  const roundedMinutes = Math.floor(minutes / 15) * 15
  const time = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`
  notifications.sendDailySummaries(time).catch(err => {
    console.error('Error sending daily summaries:', err)
  })
})

// Cron: every 30 minutes, sync calendar events from iCal feed
cron.schedule('*/30 * * * *', () => {
  syncCalendar().catch(err => {
    console.error('Error syncing calendar:', err.message)
  })
})

// Cron: daily at 3:00 AM, clean up expired sessions
cron.schedule('0 3 * * *', () => {
  try {
    sessionRepo.deleteExpired()
  } catch (err) {
    console.error('Error cleaning up expired sessions:', err.message)
  }
})

// Initial calendar sync on startup (non-blocking)
syncCalendar().catch(() => {})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Huishouden server running on port ${PORT}`)
})
