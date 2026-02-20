import { useState } from 'react'

export default function MealInput({ onAdd }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('dinner')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    
    onAdd(name.trim(), type)
    setName('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-pastel-peach/20 rounded-xl p-3">
      <div className="flex gap-2">
        <select 
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-white rounded-lg px-2 py-2 text-sm text-gray-600 border-0 focus:ring-2 focus:ring-accent-mint"
        >
          <option value="lunch">🍞 Lunch</option>
          <option value="dinner">🍝 Diner</option>
        </select>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Wat gaan we eten?"
          className="flex-1 bg-white rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 border-0 focus:ring-2 focus:ring-accent-mint"
        />
        <button 
          type="submit"
          className="bg-accent-mint text-white rounded-lg px-3 py-2 text-sm font-medium"
        >
          Toevoegen
        </button>
      </div>
    </form>
  )
}
