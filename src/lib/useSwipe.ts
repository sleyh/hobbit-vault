import { animate, MotionValue, PanInfo, useMotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

/** A fractional position (0..count-1) driven by horizontal drags, with momentum and snapping. */
export function useSwipe(count: number, step: number, start = 0) {
  const pos = useMotionValue(start)
  const [index, setIndex] = useState(start)
  const base = useRef(start)
  const go = useCallback((i: number) => {
    const t = Math.max(0, Math.min(count - 1, i))
    setIndex(t); base.current = t
    animate(pos, t, { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 })
  }, [count, pos])
  useEffect(() => { if (index > count - 1) go(count - 1) }, [count])
  const onPan = (_: unknown, info: PanInfo) => {
    const raw = base.current - info.offset.x / step
    const lo = -0.35, hi = count - 1 + 0.35
    pos.set(raw < 0 ? Math.max(lo, raw * 0.35) : raw > count - 1 ? Math.min(hi, count - 1 + (raw - count + 1) * 0.35) : raw)
  }
  const onPanEnd = (_: unknown, info: PanInfo) => {
    const projected = pos.get() - (info.velocity.x / step) * 0.18
    go(Math.round(projected))
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') go(base.current + 1)
      if (e.key === 'ArrowLeft') go(base.current - 1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [go])
  return { pos: pos as MotionValue<number>, index, go, onPan, onPanEnd }
}
