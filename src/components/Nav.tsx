import { motion } from 'framer-motion'
export type Tab = 'decks' | 'cards' | 'boxes' | 'build'
const TABS: { id: Tab; label: string }[] = [{ id: 'decks', label: 'Decks' }, { id: 'cards', label: 'Cards' }, { id: 'boxes', label: 'Boxes' }, { id: 'build', label: 'Build' }]
export function Nav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav className="nav" aria-label="Sections">
      {TABS.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          {tab === t.id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
