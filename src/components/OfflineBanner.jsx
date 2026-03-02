import useOfflineStatus from '../hooks/useOfflineStatus'

/**
 * Thin banner shown at the top of the app when offline or syncing.
 * Uses pastel design tokens — never intrusive, dismisses automatically.
 */
export default function OfflineBanner() {
  const { online, pendingCount, syncing } = useOfflineStatus()

  // Nothing to show when online and no pending mutations
  if (online && !syncing) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] px-4 pt-[env(safe-area-inset-top)]">
      <div
        className={`mt-2 flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-2xl shadow-lg transition-all duration-300 ${
          syncing
            ? 'bg-accent-mint text-white'
            : 'bg-gray-600 text-white'
        }`}
      >
        {syncing ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Synchroniseren...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M8.464 15.536a5 5 0 010-7.072" />
              <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
            </svg>
            <span>
              Offline
              {pendingCount > 0 && ` \u2014 ${pendingCount} ${pendingCount === 1 ? 'wijziging' : 'wijzigingen'} wacht${pendingCount === 1 ? '' : 'en'}`}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
