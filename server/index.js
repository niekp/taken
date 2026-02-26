import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { initDb } from './db.js'
import apiRouter from './routes.js'

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
  app.use(express.static(distPath))
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Initialize database (runs migrations) and start server
await initDb()

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Huishouden server running on port ${PORT}`)
})
