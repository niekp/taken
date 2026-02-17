import { useEffect, useRef } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'

function playSuccessSound() {
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
}

export default function Confetti() {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f472b6', '#fbbf24', '#a855f7']
      })
    }

    playSuccessSound()

    const timeout = setTimeout(() => {
      if (ref.current) {
        ref.current({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f472b6', '#fbbf24', '#a855f7']
        })
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <ReactCanvasConfetti ref={ref} />
  )
}
