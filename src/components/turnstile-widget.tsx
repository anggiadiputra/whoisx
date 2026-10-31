'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

interface TurnstileWidgetProps {
  siteKey: string
  onToken: (token: string) => void
  // Change it to get a fresh challenge (a token works for one sign-in attempt only)
  resetKey?: number
}

// Explicit rendering, so the widget also appears after client-side navigation
export function TurnstileWidget({ siteKey, onToken, resetKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (window.turnstile) setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || !window.turnstile || !containerRef.current) return
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(''),
      'error-callback': () => onTokenRef.current(''),
    })
    widgetIdRef.current = widgetId
    return () => {
      window.turnstile?.remove(widgetId)
      widgetIdRef.current = null
    }
  }, [ready, siteKey])

  useEffect(() => {
    if (!resetKey || !widgetIdRef.current) return
    onTokenRef.current('')
    window.turnstile?.reset(widgetIdRef.current)
  }, [resetKey])

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  )
}
