import { useEffect, useRef, useState } from 'react'

export function useSmoothTime(playedSeconds: number, playing: boolean, playbackRate = 1) {
  const [smoothTime, setSmoothTime] = useState(playedSeconds)
  const lastTimeRef = useRef(playedSeconds)
  const lastSystemTimeRef = useRef(performance.now())

  // Keep refs updated when playedSeconds changes
  useEffect(() => {
    lastTimeRef.current = playedSeconds
    lastSystemTimeRef.current = performance.now()
    setSmoothTime(playedSeconds)
  }, [playedSeconds])

  useEffect(() => {
    if (!playing) return

    let frameId: number
    const update = () => {
      const delta = (performance.now() - lastSystemTimeRef.current) / 1000
      const extrapolated = lastTimeRef.current + delta * playbackRate
      setSmoothTime(extrapolated)
      frameId = requestAnimationFrame(update)
    }

    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [playing, playbackRate])

  return smoothTime
}
