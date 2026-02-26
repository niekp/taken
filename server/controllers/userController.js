import * as userRepo from '../repositories/userRepository.js'

export function list(req, res) {
  res.json(userRepo.findAll())
}

export function login(req, res) {
  const { pin } = req.body
  if (!pin) return res.status(400).json({ error: 'PIN is required' })

  const users = userRepo.findByPin(pin)
  if (users.length === 0) {
    return res.status(401).json({ error: 'Invalid PIN' })
  }

  res.json(users)
}

export function updateAvatar(req, res) {
  const { id } = req.params
  const { avatar_url } = req.body

  userRepo.updateAvatar(id, avatar_url)
  const user = userRepo.findById(id)

  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
}

export function changePin(req, res) {
  const { id } = req.params
  const { currentPin, newPin } = req.body

  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'Current PIN and new PIN are required' })
  }
  if (!/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' })
  }

  const user = userRepo.findByIdWithPin(id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.pin !== currentPin) return res.status(401).json({ error: 'Current PIN is incorrect' })

  userRepo.updatePin(id, newPin)
  res.json({ success: true })
}
