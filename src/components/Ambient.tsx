import { AnimatePresence, motion } from 'framer-motion'
import { Card, COLOR_HEX, Color, imageUrls } from '../lib/data'

/** Full-screen background: the current card's art, blown up and blurred, tinted with its colours. */
export function Ambient({ card, colors }: { card?: Card; colors: Color[] }) {
  const c1 = COLOR_HEX[colors[0] || 'W'] || '#e3a94a'
  const c2 = COLOR_HEX[colors[1] || colors[0] || 'W'] || '#e3a94a'
  return (
    <div className="ambient" aria-hidden>
      <AnimatePresence initial={false}>
        {card && (
          <motion.div
            key={card.id}
            className="ambient-art"
            style={{ backgroundImage: imageUrls(card, 'art').map((u) => `url("${u}")`).join(',') }}
            initial={{ opacity: 0, scale: 1.25 }}
            animate={{ opacity: 1, scale: 1.12 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          />
        )}
      </AnimatePresence>
      <motion.div className="ambient-tint" animate={{ background: `radial-gradient(120% 70% at 15% 0%, ${c1}55 0%, transparent 60%), radial-gradient(110% 70% at 100% 100%, ${c2}50 0%, transparent 60%)` }} transition={{ duration: 0.8 }} />
      <div className="ambient-vignette" />
      <div className="grain" />
    </div>
  )
}
