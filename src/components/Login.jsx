import { useState } from 'react'

export default function Login({ onLogin, onSelectUser, users }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showUserSelect, setShowUserSelect] = useState(false)
  const [matchedUsers, setMatchedUsers] = useState([])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    
    const matched = await onLogin(pin)
    
    if (!matched) {
      setError('Ongeldige PIN')
      return
    }
    
    if (matched.length === 1) {
      onSelectUser(matched[0])
    } else {
      setMatchedUsers(matched)
      setShowUserSelect(true)
    }
  }

  function handleSelectUser(user) {
    onSelectUser(user)
  }

  if (showUserSelect) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-50 to-white">
        <h1 className="text-3xl font-bold text-emerald-600 mb-2">Divide/Chores</h1>
        <p className="text-gray-600 mb-8">Wie ben je?</p>
        
        <div className="space-y-3 w-full max-w-xs">
          {matchedUsers.map(user => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`w-full p-4 rounded-xl text-lg font-medium transition-all active:scale-95 ${
                user.name === 'Bijan' 
                  ? 'bg-bijan text-white' 
                  : 'bg-esther text-white'
              }`}
            >
              {user.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-50 to-white">
      <div className="text-5xl mb-4">🏠</div>
      <h1 className="text-3xl font-bold text-emerald-600 mb-8">Divide/Chores</h1>
      
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN Code"
          className="input-field text-center text-2xl tracking-widest mb-4"
          maxLength={6}
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
        />
        
        {error && (
          <p className="text-red-500 text-center mb-4">{error}</p>
        )}
        
        <button type="submit" className="btn-primary w-full py-4 text-lg">
          Inloggen
        </button>
      </form>
      
      <p className="mt-8 text-gray-400 text-sm text-center">
        Voer je PIN in om te beginnen
      </p>
    </div>
  )
}
