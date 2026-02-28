import webpush from 'web-push'
import * as pushRepo from '../repositories/pushRepository.js'
import * as taskRepo from '../repositories/taskRepository.js'
import * as mealRepo from '../repositories/mealRepository.js'

let configured = false

export function init() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@huishouden.local'

  if (!publicKey || !privateKey) {
    console.log('Push notifications disabled: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY not set')
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  console.log('Push notifications enabled')
  return true
}

export function isConfigured() {
  return configured
}

function formatDateLocal(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the current time in Europe/Amsterdam timezone.
 * Returns { hours, minutes, today } where today is YYYY-MM-DD string.
 */
export function getAmsterdamNow() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map(p => [p.type, p.value])
  )
  return {
    hours: parseInt(parts.hour, 10),
    minutes: parseInt(parts.minute, 10),
    today: `${parts.year}-${parts.month}-${parts.day}`,
  }
}

/**
 * Build the daily summary text for a user.
 * Format: "{n} taken vandaag" + optional ", vanavond eten we {x}"
 */
export function buildSummary(userId) {
  const { today } = getAmsterdamNow()

  // Get tasks for today assigned to this user or "samen" (is_both)
  const allTasks = taskRepo.findByDateRange(today, today)
  const userTasks = allTasks.filter(t =>
    !t.completed_at && (t.assigned_to === userId || t.is_both)
  )

  // Get today's meal
  const meals = mealRepo.findByDateRange(today, today)
  const meal = meals.length > 0 ? meals[0] : null

  const parts = []

  if (userTasks.length === 0) {
    parts.push('Geen taken vandaag')
  } else if (userTasks.length === 1) {
    parts.push('1 taak vandaag')
  } else {
    parts.push(`${userTasks.length} taken vandaag`)
  }

  if (meal) {
    parts.push(`vanavond eten we ${meal.meal_name}`)
  }

  return {
    title: 'Huishouden',
    body: parts.join(', '),
  }
}

/**
 * Send a push notification to a single subscription.
 * Returns true on success, false if the subscription is expired/invalid (and removes it).
 */
export async function sendPush(subscription, payload) {
  if (!configured) return false

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys_p256dh,
      auth: subscription.keys_auth,
    }
  }

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
    return true
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired or invalid — clean up
      console.log(`Removing expired push subscription: ${subscription.endpoint.slice(0, 60)}...`)
      pushRepo.removeByEndpoint(subscription.endpoint)
    } else {
      console.error(`Push failed for ${subscription.endpoint.slice(0, 60)}:`, err.message)
    }
    return false
  }
}

/**
 * Send daily summaries for the given time slot (e.g. "08:00").
 * Called by the cron job every minute.
 */
export async function sendDailySummaries(time) {
  if (!configured) return

  const subscriptions = pushRepo.findEnabledForTime(time)
  if (subscriptions.length === 0) return

  console.log(`Sending ${subscriptions.length} daily summary notification(s) for ${time}`)

  for (const sub of subscriptions) {
    const summary = buildSummary(sub.user_id)
    await sendPush(sub, summary)
  }
}
