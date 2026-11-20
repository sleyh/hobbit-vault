import { AnimatePresence, motion } from 'framer-motion'
/** Headline that re-sets itself letter by letter whenever its text changes. */
export function KineticTitle({ text, className, dir = 1 }: { text: string; className?: string; dir?: number }) {
  const words = text.split(' ')
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.h2 key={text} className={className} aria-label={text}
        initial="in" animate="show" exit="out"
        variants={{ show: { transition: { staggerChildren: 0.018 } } }}>
        {words.map((w, wi) => (
          <span className="kw" key={wi} aria-hidden>
            {[...w].map((ch, i) => (
              <motion.span key={i} className="kl"
                variants={{
                  in: { y: '0.6em', opacity: 0, rotateX: -70, x: dir * 12 },
                  show: { y: 0, opacity: 1, rotateX: 0, x: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } },
                  out: { y: '-0.4em', opacity: 0, x: -dir * 18, transition: { duration: 0.18 } },
                }}>{ch}</motion.span>
            ))}
            {wi < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </motion.h2>
    </AnimatePresence>
  )
}
