import { useLayoutEffect, useRef, useState } from 'react'
/** Card width that fits the element's real box (63:88 cards), re-measured whenever it resizes,
 *  e.g. when Safari's toolbar collapses on the first touch. */
export function useFit(maxW: number, vw: number, fill = 0.9) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.height > 0) setW(Math.floor(Math.min(maxW, window.innerWidth * vw, r.height * fill * (63 / 88))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [maxW, vw, fill])
  return { ref, style: w ? ({ ['--w' as any]: `${w}px` } as React.CSSProperties) : undefined }
}
