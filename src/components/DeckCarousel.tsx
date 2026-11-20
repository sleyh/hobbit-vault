import { motion, MotionValue, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { byId, COLOR_HEX, Deck, deckCount, decks, signature } from '../lib/data'
import { useSwipe } from '../lib/useSwipe'
import { Ambient } from './Ambient'
import { HoloCard } from './CardImage'
import { KineticTitle } from './Kinetic'

const pipUrl = (c: string) => `https://svgs.scryfall.io/card-symbols/${c}.svg`

function Fan({ deck, offset }: { deck: Deck; offset: MotionValue<number> }) {
  const sig = signature(deck, 3)
  const spread = useTransform(offset, [-1, 0, 1], [0.35, 1, 0.35])
  return (
    <div className="fan">
      {sig.map((e, i) => {
        const k = i - 1
        // each card fans out as the deck comes to the centre
        const rot = useTransform(spread, (s) => k * 11 * s)
        const x = useTransform(spread, (s) => `${k * 30 * s}%`)
        const y = useTransform(spread, (s) => `${Math.abs(k) * 7 * s}%`)
        return (
          <motion.div key={e.card + i} className="fan-card" style={{ rotate: rot, x, y, zIndex: k === 0 ? 3 : 1 }}
            initial={{ y: '40%', opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 120, damping: 18 }}>
            <HoloCard card={byId[e.card]} printing={e.printing} size="normal" interactive={k === 0} eager />
          </motion.div>
        )
      })}
    </div>
  )
}

function Slide({ deck, i, pos, onOpen }: { deck: Deck; i: number; pos: MotionValue<number>; onOpen: () => void }) {
  const offset = useTransform(pos, (p) => i - p)
  const x = useTransform(offset, (o) => `${o * 78}vw`)
  const scale = useTransform(offset, (o) => 1 - Math.min(Math.abs(o), 1.5) * 0.22)
  const opacity = useTransform(offset, (o) => 1 - Math.min(Math.abs(o), 1.6) * 0.55)
  const rotateY = useTransform(offset, (o) => o * -22)
  return (
    <motion.div className="deck-slide" style={{ x, scale, opacity, rotateY }}>
      <button className="deck-hit" onClick={onOpen} aria-label={`Open ${deck.name}`}>
        <Fan deck={deck} offset={offset} />
      </button>
    </motion.div>
  )
}

export function DeckCarousel({ onOpen, start }: { onOpen: (d: Deck) => void; start: number }) {
  const { pos, index, go, onPan, onPanEnd } = useSwipe(decks.length, Math.min(window.innerWidth, 520) * 0.7, start)
  const deck = decks[index]
  const hero = byId[signature(deck, 1)[0].card]
  const [dir, setDir] = useState(1)
  const [prev, setPrev] = useState(index)
  useEffect(() => { setDir(index >= prev ? 1 : -1); setPrev(index) }, [index])
  const spares = deckCount(deck, 'spares')
  return (
    <motion.section className="screen decks-screen" onPan={onPan} onPanEnd={onPanEnd}>
      <Ambient card={hero} colors={deck.colors} />
      <header className="topbar">
        <span className="brand"><span className="set-icon r-mythic" /> Hobbit Vault</span>
        <span className="topbar-meta">{index + 1} of {decks.length} decks</span>
      </header>
      <div className="deck-stage">
        {decks.map((d, i) => <Slide key={d.id} deck={d} i={i} pos={pos} onOpen={() => (i === index ? onOpen(d) : go(i))} />)}
      </div>
      <div className="deck-caption">
        <div className="pips">{deck.colors.map((c) => <img key={c} src={pipUrl(c)} alt={c} width={22} height={22} />)}</div>
        <KineticTitle text={deck.short} className="deck-title" dir={dir} />
        <p className="deck-sub">{deck.name.replace(' ' + deck.short, '')}, {deckCount(deck, 'main')} cards{spares ? ` and ${spares} spares` : ''}</p>
        <div className="deck-facts">
          <span className={`chip ${deck.built ? '' : 'chip-warn'}`}>{deck.built ? `In ${deck.sleeves} sleeves` : 'Not built yet'}</span>
          <span className="chip">{deck.main.filter((e) => e.printing !== 'Normal' || byId[e.card].num > 188).reduce((a, e) => a + e.qty, 0)} foils and specials</span>
        </div>
        <button className="cta" onClick={() => onOpen(deck)} style={{ ['--glow' as any]: COLOR_HEX[deck.colors[0]] }}>Browse the deck</button>
        <div className="dots" role="tablist">
          {decks.map((d, i) => (
            <button key={d.id} role="tab" aria-selected={i === index} aria-label={d.name} className={`dot ${i === index ? 'on' : ''}`} onClick={() => go(i)}
              style={{ background: `linear-gradient(90deg, ${COLOR_HEX[d.colors[0]]}, ${COLOR_HEX[d.colors[1]]})` }} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
