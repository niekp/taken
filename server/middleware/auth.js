import * as sessionRepo from '../repositories/sessionRepository.js'

/**
 * Auth middleware — validates Bearer token from the Authorization header.
 * On success, attaches `req.userId` and `req.sessionToken` for downstream use.
 * Returns 401 if token is missing, invalid, or expired.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.slice(7)
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const session = sessionRepo.findByToken(token)
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' })
  }

  req.userId = session.user_id
  req.sessionToken = token
  next()
}
