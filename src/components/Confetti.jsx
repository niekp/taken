import { useState, useEffect } from 'react'

export default function Confetti() {
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    setShowSuccess(true)
    
    const playSound = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const playTone = (freq, startTime, duration) => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.frequency.value = freq
          oscillator.type = 'sine'
          gainNode.gain.setValueAtTime(0.3, startTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
          oscillator.start(startTime)
          oscillator.stop(startTime + duration)
        }
        const now = audioContext.currentTime
        playTone(523.25, now, 0.1)
        playTone(659.25, now + 0.1, 0.1)
        playTone(783.99, now + 0.2, 0.2)
      } catch (e) {}
    }
    
    playSound()
    
    const timeout = setTimeout(() => setShowSuccess(false), 1500)
    return () => clearTimeout(timeout)
  }, [])

  if (!showSuccess) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="text-8xl animate-bounce">
        ✅
      </div>
    </div>
  )
}
