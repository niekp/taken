import ical from 'node-ical'
import * as calendarRepo from '../repositories/calendarRepository.js'

/**
 * Format a Date or ical date object to YYYY-MM-DD string in Europe/Amsterdam timezone.
 */
function toDateStr(d) {
  if (!d) return null
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return null

  // If the ical event has a dateOnly type, just use the date parts directly
  if (d.dateOnly || (typeof d === 'object' && d.tz === undefined && !d.toISOString)) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Otherwise convert to Amsterdam timezone
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('nl-NL', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date).map(p => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

/**
 * Fetch and parse the iCal feed, then sync events into the database.
 * Only stores events from today onwards (up to ~90 days).
 */
export async function syncCalendar() {
  const settings = calendarRepo.getSettings()
  if (!settings) {
    console.log('Calendar sync skipped: no iCal URL configured')
    return { synced: 0 }
  }

  console.log(`Syncing calendar from: ${settings.ical_url.slice(0, 60)}...`)

  let data
  try {
    data = await ical.async.fromURL(settings.ical_url)
  } catch (err) {
    console.error('Failed to fetch iCal feed:', err.message)
    throw new Error(`Failed to fetch calendar: ${err.message}`)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  // Cutoff: ~90 days in the future
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + 90)
  const cutoffStr = toDateStr(cutoff)

  const seenUids = []
  let count = 0

  for (const [key, event] of Object.entries(data)) {
    if (event.type !== 'VEVENT') continue

    const startStr = toDateStr(event.start)
    if (!startStr) continue

    // Skip events outside our window
    if (startStr < todayStr || startStr > cutoffStr) continue

    const isAllDay = !!(event.start?.dateOnly || event.datetype === 'date')
    const endStr = event.end ? toDateStr(event.end) : null

    // For recurring events, use recurrence-id to distinguish instances
    const recurrenceId = event.recurrenceid ? toDateStr(event.recurrenceid) : null

    const uid = event.uid || key
    seenUids.push(uid)

    calendarRepo.upsertEvent({
      uid,
      summary: event.summary || '(geen titel)',
      description: event.description || null,
      location: event.location || null,
      start_date: startStr,
      end_date: endStr,
      all_day: isAllDay,
      recurrence_id: recurrenceId,
    })
    count++
  }

  // Clean up old events that are no longer in the feed
  // (only remove events that start from today onwards and weren't seen)
  calendarRepo.removeEventsNotIn(seenUids)
  calendarRepo.updateLastSynced()

  console.log(`Calendar sync complete: ${count} events stored`)
  return { synced: count }
}
