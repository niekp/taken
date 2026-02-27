import * as userRepo from '../repositories/userRepository.js'

const VALID_COLORS = ['blue', 'pink', 'green', 'purple', 'orange', 'red', 'teal', 'yellow']

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

export function createUser(req, res) {
  const { name, pin, color, can_do_chores } = req.body

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Naam is verplicht' })
  }
  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN moet precies 4 cijfers zijn' })
  }
  if (color && !VALID_COLORS.includes(color)) {
    return res.status(400).json({ error: 'Ongeldige kleur' })
  }

  const existing = userRepo.findByName(name.trim())
  if (existing) {
    return res.status(409).json({ error: 'Er bestaat al een gebruiker met deze naam' })
  }

  const id = userRepo.create(name.trim(), pin, color || 'blue', can_do_chores !== false)
  const user = userRepo.findById(id)
  res.status(201).json(user)
}

export function updateUser(req, res) {
  const { id } = req.params
  const { avatar_url, color, name, can_do_chores } = req.body

  const user = userRepo.findById(id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (avatar_url !== undefined) {
    userRepo.updateAvatar(id, avatar_url)
  }
  if (color !== undefined) {
    if (!VALID_COLORS.includes(color)) {
      return res.status(400).json({ error: 'Ongeldige kleur' })
    }
    userRepo.updateColor(id, color)
  }
  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ error: 'Naam is verplicht' })
    }
    const existing = userRepo.findByName(name.trim())
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: 'Er bestaat al een gebruiker met deze naam' })
    }
    userRepo.updateName(id, name.trim())
  }
  if (can_do_chores !== undefined) {
    userRepo.updateCanDoChores(id, !!can_do_chores)
  }

  const updated = userRepo.findById(id)
  res.json(updated)
}

export function deleteUser(req, res) {
  const { id } = req.params

  const user = userRepo.findById(id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  userRepo.remove(id)
  res.json({ success: true })
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

export function resetPin(req, res) {
  const { id } = req.params
  const { newPin } = req.body

  if (!newPin || !/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'PIN moet precies 4 cijfers zijn' })
  }

  const user = userRepo.findById(id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  userRepo.updatePin(id, newPin)
  res.json({ success: true })
}
