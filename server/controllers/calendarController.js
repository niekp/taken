import * as calendarRepo from '../repositories/calendarRepository.js'
import * as dayStatusRepo from '../repositories/dayStatusRepository.js'
import { syncCalendar } from '../lib/calendar.js'
import { broadcast } from '../lib/liveSync.js'

export function status(req, res) {
  const settings = calendarRepo.getSettings()
  res.json({
    configured: !!settings,
    name: settings?.name || null,
    last_synced_at: settings?.last_synced_at || null,
  })
}

export async function sync(req, res) {
  try {
    const result = await syncCalendar()
    broadcast('calendar')
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export function events(req, res) {
  const { from } = req.query
  if (!from) {
    return res.status(400).json({ error: 'from date param required (YYYY-MM-DD)' })
  }

  const settings = calendarRepo.getSettings()
  if (!settings) {
    return res.json({ configured: false, events: [], statuses: {} })
  }

  const events = calendarRepo.getAllFutureEvents(from)

  // Also fetch day statuses for the same date range so the frontend can
  // show which events already have a corresponding pill
  const dates = [...new Set(events.map(e => e.start_date))]
  let statusesMap = {}
  if (dates.length > 0) {
    const minDate = dates[0]
    const maxDate = dates[dates.length - 1]
    statusesMap = dayStatusRepo.getForDateRange(minDate, maxDate)
  }

  res.json({
    configured: true,
    events,
    statuses: statusesMap,
    last_synced_at: settings.last_synced_at,
  })
}
