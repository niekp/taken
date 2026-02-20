import { useState } from 'react'

export default function MealModal({ dayIndex, dayName, onClose, onMealAdded }) {
  const [mealName, setMealName] = useState('')
  const [mealType, setMealType] = useState('dinner')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!mealName.trim()) return

    setLoading(true)
    onMealAdded(mealName.trim(), mealType)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto shadow-soft-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Eten toevoegen</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">{dayName}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Maaltijd</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMealType('lunch')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  mealType === 'lunch'
                    ? 'bg-accent-peach text-white shadow-soft'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                🍞 Lunch
              </button>
              <button
                type="button"
                onClick={() => setMealType('dinner')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  mealType === 'dinner'
                    ? 'bg-accent-peach text-white shadow-soft'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                🍝 Diner
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Wat gaan we eten?</label>
            <input
              type="text"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
              placeholder="Bijv. Pasta, Stamppot, Pizza..."
              className="input-field"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !mealName.trim()}
            className="btn-primary w-full py-4 text-base"
          >
            {loading ? 'Toevoegen...' : 'Toevoegen'}
          </button>
        </form>
      </div>
    </div>
  )
}
