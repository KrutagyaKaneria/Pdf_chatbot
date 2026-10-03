import React, {useEffect, useState} from 'react'
import {Loader2} from 'lucide-react'
import {pingBackend} from '../../lib/api'

// Only show the banner if the backend hasn't answered quickly, so warm visits never see it.
const SHOW_AFTER_MS = 2500
const RETRY_DELAY_MS = 4000
const GIVE_UP_AFTER_MS = 3 * 60 * 1000

type WakeState = 'checking' | 'waking' | 'ready' | 'unreachable'

export const ServerWakeBanner: React.FC = () => {
  const [state, setState] = useState<WakeState>('checking')

  useEffect(() => {
    let cancelled = false
    const startedAt = Date.now()
    const showTimer = setTimeout(() => {
      if (!cancelled) setState((s) => (s === 'checking' ? 'waking' : s))
    }, SHOW_AFTER_MS)

    const poll = async () => {
      while (!cancelled) {
        if (await pingBackend()) {
          if (!cancelled) setState('ready')
          return
        }
        if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
          if (!cancelled) setState('unreachable')
          return
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(showTimer)
    }
  }, [])

  if (state !== 'waking' && state !== 'unreachable') return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-3 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/10 bg-background/95 px-4 py-3 text-sm text-on-background shadow-lg backdrop-blur">
        {state === 'waking' ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <span>Waking up the server — this can take up to a minute after it's been idle.</span>
          </>
        ) : (
          <span className="text-error">The server isn't responding. Please refresh in a minute.</span>
        )}
      </div>
    </div>
  )
}
