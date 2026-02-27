import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Service worker update detection
// Registration itself is handled by VitePWA's registerSW.js injected into index.html
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    // Check for updates every 5 minutes
    setInterval(() => registration.update(), 5 * 60 * 1000)
  })

  // When a new SW takes over (after skipWaiting), reload to get new assets
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
