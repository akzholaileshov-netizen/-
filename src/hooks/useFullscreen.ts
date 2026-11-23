import { useEffect, useState } from 'react'

export const fullscreenSupported = () =>
  typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

export function toggleFullscreen() {
  if (!fullscreenSupported()) return
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  else void document.documentElement.requestFullscreen().catch(() => {})
}

export function useFullscreen() {
  const [active, setActive] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  return { active, toggle: toggleFullscreen, supported: fullscreenSupported() }
}
