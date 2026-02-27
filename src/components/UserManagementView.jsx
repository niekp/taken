import { useState } from 'react'
import { api } from '../lib/api'
import { COLORS, COLOR_KEYS, getUserColor } from '../lib/colors'

export default function UserManagementView({ users, onUsersChanged, onClose }) {
  const [editingUser, setEditingUser] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showResetPin, setShowResetPin] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  function showSuccess(msg) {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 2000)
  }

  async function handleToggleChores(user) {
    clearMessages()
    try {
      await api.updateUser(user.id, { can_do_chores: !user.can_do_chores })
      showSuccess(`${user.name} ${user.can_do_chores ? 'doet geen taken meer' : 'doet nu taken'}`)
      onUsersChanged()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteUser(user) {
    clearMessages()
    try {
      await api.deleteUser(user.id)
      showSuccess(`${user.name} is verwijderd`)
      setConfirmDelete(null)
      onUsersChanged()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-[60]" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto absolute bottom-0 shadow-soft-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">Gebruikersbeheer</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 py-2 px-4 rounded-xl">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 py-2 px-4 rounded-xl">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          {/* User list */}
          <div className="space-y-2">
            {users.map(user => (
              <UserRow
                key={user.id}
                user={user}
                isEditing={editingUser === user.id}
                onEdit={() => {
                  clearMessages()
                  setEditingUser(editingUser === user.id ? null : user.id)
                  setShowAddForm(false)
                  setShowResetPin(null)
                  setConfirmDelete(null)
                }}
                onToggleChores={() => handleToggleChores(user)}
                onShowResetPin={() => {
                  clearMessages()
                  setShowResetPin(showResetPin === user.id ? null : user.id)
                  setConfirmDelete(null)
                }}
                showResetPin={showResetPin === user.id}
                onResetPinDone={(msg) => {
                  setShowResetPin(null)
                  showSuccess(msg)
                }}
                onResetPinError={(msg) => setError(msg)}
                confirmDelete={confirmDelete === user.id}
                onConfirmDelete={() => {
                  clearMessages()
                  setConfirmDelete(confirmDelete === user.id ? null : user.id)
                  setShowResetPin(null)
                }}
                onDeleteUser={() => handleDeleteUser(user)}
                onCancelDelete={() => setConfirmDelete(null)}
                onSaved={(msg) => {
                  setEditingUser(null)
                  showSuccess(msg)
                  onUsersChanged()
                }}
                onSaveError={(msg) => setError(msg)}
              />
            ))}
          </div>

          {/* Add user button / form */}
          {showAddForm ? (
            <AddUserForm
              onCancel={() => {
                setShowAddForm(false)
                clearMessages()
              }}
              onCreated={(msg) => {
                setShowAddForm(false)
                showSuccess(msg)
                onUsersChanged()
              }}
              onError={(msg) => setError(msg)}
            />
          ) : (
            <button
              onClick={() => {
                clearMessages()
                setShowAddForm(true)
                setEditingUser(null)
                setShowResetPin(null)
                setConfirmDelete(null)
              }}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              Gebruiker toevoegen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function UserRow({
  user, isEditing, onEdit, onToggleChores,
  onShowResetPin, showResetPin, onResetPinDone, onResetPinError,
  confirmDelete, onConfirmDelete, onDeleteUser, onCancelDelete,
  onSaved, onSaveError,
}) {
  const color = getUserColor(user)

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
          {user.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 truncate">{user.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${user.can_do_chores ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
              {user.can_do_chores ? 'Doet taken' : 'Geen taken'}
            </span>
            <span className="text-xs text-gray-400">{COLORS[user.color]?.label || user.color}</span>
          </div>
        </div>
        <button
          onClick={onEdit}
          className={`p-2 rounded-xl transition-colors ${isEditing ? 'bg-gray-200 text-gray-600' : 'hover:bg-gray-200 text-gray-400'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>

      {isEditing && (
        <EditUserPanel
          user={user}
          onToggleChores={onToggleChores}
          onShowResetPin={onShowResetPin}
          showResetPin={showResetPin}
          onResetPinDone={onResetPinDone}
          onResetPinError={onResetPinError}
          confirmDelete={confirmDelete}
          onConfirmDelete={onConfirmDelete}
          onDeleteUser={onDeleteUser}
          onCancelDelete={onCancelDelete}
          onSaved={onSaved}
          onSaveError={onSaveError}
        />
      )}
    </div>
  )
}

function EditUserPanel({
  user, onToggleChores,
  onShowResetPin, showResetPin, onResetPinDone, onResetPinError,
  confirmDelete, onConfirmDelete, onDeleteUser, onCancelDelete,
  onSaved, onSaveError,
}) {
  const [name, setName] = useState(user.name)
  const [color, setColor] = useState(user.color)
  const [saving, setSaving] = useState(false)

  const hasChanges = name.trim() !== user.name || color !== user.color

  async function handleSave() {
    if (!hasChanges) return
    setSaving(true)
    try {
      const updates = {}
      if (name.trim() !== user.name) updates.name = name.trim()
      if (color !== user.color) updates.color = color
      await api.updateUser(user.id, updates)
      onSaved(`${name.trim()} is bijgewerkt`)
    } catch (err) {
      onSaveError(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
      {/* Name edit */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Naam</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="input-field text-sm"
          placeholder="Naam"
        />
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Kleur</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setColor(key)}
              className={`w-8 h-8 rounded-xl ${COLORS[key].bg} transition-all ${color === key ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'}`}
              title={COLORS[key].label}
            />
          ))}
        </div>
      </div>

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Opslaan'}
        </button>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          onClick={onToggleChores}
          className="w-full p-3 rounded-xl text-left flex items-center gap-3 hover:bg-gray-100 transition-colors text-sm"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${user.can_do_chores ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-500'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {user.can_do_chores ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              )}
            </svg>
          </div>
          <span className="text-gray-700">
            {user.can_do_chores ? 'Taken uitschakelen' : 'Taken inschakelen'}
          </span>
        </button>

        <button
          onClick={onShowResetPin}
          className="w-full p-3 rounded-xl text-left flex items-center gap-3 hover:bg-gray-100 transition-colors text-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <span className="text-gray-700">PIN resetten</span>
        </button>

        {showResetPin && (
          <ResetPinForm
            userId={user.id}
            userName={user.name}
            onDone={onResetPinDone}
            onError={onResetPinError}
            onCancel={onShowResetPin}
          />
        )}

        <button
          onClick={onConfirmDelete}
          className="w-full p-3 rounded-xl text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <span className="text-red-500">Gebruiker verwijderen</span>
        </button>

        {confirmDelete && (
          <div className="bg-red-50 rounded-xl p-3 space-y-2">
            <p className="text-sm text-red-600">
              Weet je zeker dat je <strong>{user.name}</strong> wilt verwijderen? Dit kan niet ongedaan gemaakt worden.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onDeleteUser}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Verwijderen
              </button>
              <button
                onClick={onCancelDelete}
                className="flex-1 py-2 px-4 bg-white text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResetPinForm({ userId, userName, onDone, onError, onCancel }) {
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPin !== confirmPin) {
      onError('PINs komen niet overeen')
      return
    }
    setSaving(true)
    try {
      await api.resetPin(userId, newPin)
      onDone(`PIN van ${userName} is gereset`)
    } catch (err) {
      onError(err.message)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 rounded-xl p-3 space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nieuwe PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={newPin}
          onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
          className="input-field text-center text-lg tracking-[0.3em] text-sm"
          autoFocus
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Bevestig PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirmPin}
          onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
          className="input-field text-center text-lg tracking-[0.3em] text-sm"
          required
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || newPin.length !== 4 || confirmPin.length !== 4}
          className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Bezig...' : 'Resetten'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 bg-white text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200"
        >
          Annuleren
        </button>
      </div>
    </form>
  )
}

function AddUserForm({ onCancel, onCreated, onError }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [color, setColor] = useState('blue')
  const [canDoChores, setCanDoChores] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      onError('Naam is verplicht')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      onError('PIN moet precies 4 cijfers zijn')
      return
    }
    if (pin !== confirmPin) {
      onError('PINs komen niet overeen')
      return
    }

    setSaving(true)
    try {
      await api.createUser({
        name: name.trim(),
        pin,
        color,
        can_do_chores: canDoChores,
      })
      onCreated(`${name.trim()} is toegevoegd`)
    } catch (err) {
      onError(err.message)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-pastel-mint/20 rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold text-gray-700">Nieuwe gebruiker</h3>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Naam</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="input-field text-sm"
          placeholder="Naam"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">PIN (4 cijfers)</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
          className="input-field text-center text-lg tracking-[0.3em] text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Bevestig PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirmPin}
          onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
          className="input-field text-center text-lg tracking-[0.3em] text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Kleur</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_KEYS.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              className={`w-8 h-8 rounded-xl ${COLORS[key].bg} transition-all ${color === key ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'}`}
              title={COLORS[key].label}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setCanDoChores(!canDoChores)}
            className={`w-10 h-6 rounded-full transition-colors relative ${canDoChores ? 'bg-green-400' : 'bg-gray-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${canDoChores ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-gray-600">Kan taken doen</span>
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim() || pin.length !== 4 || confirmPin.length !== 4}
          className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Toevoegen'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 px-4 bg-white text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200"
        >
          Annuleren
        </button>
      </div>
    </form>
  )
}
