import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Card, imageUrls, Printing } from '../lib/data'

/** Image with German→English fallback chain. */
export function CardImg({ card, size = 'normal', className, eager }: { card: Card; size?: 'normal' | 'large' | 'art'; className?: string; eager?: boolean }) {
  const urls = imageUrls(card, size)
  const [fail, setFail] = useState<{ id: string; i: number }>({ id: card.id, i: 0 })
  const i = fail.id === card.id ? fail.i : 0
  const src = urls[Math.min(i, urls.length - 1)]
  // "loaded" is tied to the exact src, so a cached image that fires onLoad before effects run still shows.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const ref = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth > 0) setLoadedSrc(src)
  }, [src])
  const loaded = loadedSrc === src
  return (
    <img
      ref={ref}
      key={src}
      className={`${className || ''} ${loaded ? 'is-loaded' : ''}`}
      src={src}
      alt={card.name}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => setLoadedSrc(src)}
      onError={() => setFail({ id: card.id, i: i < urls.length - 1 ? i + 1 : i })}
    />
  )
}

const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** A card that tilts toward the pointer (or the phone's gyro) and shows a holographic layer for foils. */
export function HoloCard({ card, printing, size = 'large', interactive = true, eager, className }: {
  card: Card; printing: Printing; size?: 'normal' | 'large'; interactive?: boolean; eager?: boolean; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0.5), my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 160, damping: 18 }), sy = useSpring(my, { stiffness: 160, damping: 18 })
  const rotY = useTransform(sx, [0, 1], [-14, 14]), rotX = useTransform(sy, [0, 1], [12, -12])
  const bgPos = useTransform([sx, sy] as any, ([x, y]: number[]) => `${x * 100}% ${y * 100}%`)
  const glare = useTransform([sx, sy] as any, ([x, y]: number[]) => `radial-gradient(farthest-corner circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,.55) 0%, rgba(255,255,255,.12) 28%, rgba(0,0,0,.28) 90%)`)
  const fancy = printing !== 'Normal'

  useEffect(() => {
    if (!interactive || reduce) return
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      mx.set(Math.min(1, Math.max(0, 0.5 + e.gamma / 50)))
      my.set(Math.min(1, Math.max(0, 0.5 + (e.beta - 45) / 60)))
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [interactive])

  const move = (e: React.PointerEvent) => {
    if (!interactive || reduce || !ref.current || e.pointerType === 'touch') return
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height)
  }
  const leave = () => { mx.set(0.5); my.set(0.5) }

  return (
    <motion.div
      ref={ref}
      className={`holo-card ${fancy ? 'is-foil' : ''} ${printing === 'Surge Foil' ? 'is-surge' : ''} ${className || ''}`}
      style={{ rotateX: interactive ? rotX : 0, rotateY: interactive ? rotY : 0 }}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <CardImg card={card} size={size} eager={eager} className="holo-img" />
      {fancy && <motion.div className="holo-shine" style={{ backgroundPosition: bgPos }} />}
      <motion.div className="holo-glare" style={{ background: glare }} />
    </motion.div>
  )
}
