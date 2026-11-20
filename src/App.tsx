import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Boxes } from './components/Boxes'
import { Builder } from './components/Builder'
import { CardSheet } from './components/CardSheet'
import { Collection } from './components/Collection'
import { DeckCarousel } from './components/DeckCarousel'
import { DeckViewer } from './components/DeckViewer'
import { Nav, Tab } from './components/Nav'
import { Card, Deck, decks, Printing } from './lib/data'

export default function App() {
  const [tab, setTab] = useState<Tab>('decks')
  const [open, setOpen] = useState<Deck | null>(null)
  const [lastDeck, setLastDeck] = useState(0)
  const [sheet, setSheet] = useState<{ card: Card; printing: Printing } | null>(null)
  const onCard = (card: Card, printing: Printing) => setSheet({ card, printing })
  return (
    <div className="app">
      <AnimatePresence mode="wait">
        <motion.main key={tab + (open?.id || '')} className="view"
          initial={{ opacity: 0, scale: open ? 1.04 : 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.985 }} transition={{ duration: 0.28 }}>
          {tab === 'decks' && !open && <DeckCarousel start={lastDeck} onOpen={(d) => { setLastDeck(decks.indexOf(d)); setOpen(d) }} />}
          {tab === 'decks' && open && <DeckViewer deck={open} onBack={() => setOpen(null)} onCard={onCard} />}
          {tab === 'cards' && <Collection onCard={onCard} />}
          {tab === 'boxes' && <Boxes onCard={onCard} />}
          {tab === 'build' && <Builder onCard={onCard} />}
        </motion.main>
      </AnimatePresence>
      <Nav tab={tab} setTab={(t) => { setTab(t); if (t !== 'decks') setOpen(null) }} />
      <AnimatePresence>{sheet && <CardSheet key="sheet" card={sheet.card} printing={sheet.printing} onClose={() => setSheet(null)} />}</AnimatePresence>
    </div>
  )
}
