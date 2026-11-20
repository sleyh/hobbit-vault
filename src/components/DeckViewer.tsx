import { AnimatePresence, motion, MotionValue, useTransform } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { byId, Card, Deck, deckCount, deName, Entry, Printing, RARITY_HEX, versionLabel } from '../lib/data'
import { Mana } from '../lib/mana'
import { useSwipe } from '../lib/useSwipe'
import { Ambient } from './Ambient'
import { HoloCard } from './CardImage'
import { KineticTitle } from './Kinetic'

const BASIC_ID: Record<string, string> = { Plains: 'HOB-189', Island: 'HOB-190', Swamp: 'HOB-191', Mountain: 'HOB-192', Forest: 'HOB-193' }
type Row = Entry & { basic?: boolean }

function order(d: Deck, part: 'main' | 'spares'): Row[] {
  const rows: Row[] = [...d[part]]
  const land = (e: Row) => byId[e.card].types.includes('Land')
  rows.sort((a, b) => +land(a) - +land(b) || byId[a.card].cmc - byId[b.card].cmc || byId[a.card].name.localeCompare(byId[b.card].name))
  if (part === 'main') for (const [n, q] of Object.entries(d.basics)) rows.push({ card: BASIC_ID[n], printing: 'Normal', qty: q, basic: true })
  return rows
}

function Slot({ row, i, pos, active, onOpen }: { row: Row; i: number; pos: MotionValue<number>; active: boolean; onOpen: () => void }) {
  const off = useTransform(pos, (p) => i - p)
  const x = useTransform(off, (o) => `${Math.sign(o) * Math.min(Math.abs(o), 3) * 58 + (Math.abs(o) > 1 ? Math.sign(o) * (Math.abs(o) - 1) * -18 : 0)}%`)
  const rotateY = useTransform(off, (o) => Math.max(-62, Math.min(62, o * -42)))
  const scale = useTransform(off, (o) => 1 - Math.min(Math.abs(o), 3) * 0.13)
  const z = useTransform(off, (o) => -Math.abs(o) * 160)
  const opacity = useTransform(off, (o) => (Math.abs(o) > 3.2 ? 0 : 1 - Math.abs(o) * 0.18))
  const zIndex = useTransform(off, (o) => 100 - Math.round(Math.abs(o) * 10))
  const brightness = useTransform(off, (o) => `brightness(${1 - Math.min(Math.abs(o), 2) * 0.28})`)
  const card = byId[row.card]
  return (
    <motion.div className="slot" style={{ x, rotateY, scale, z, opacity, zIndex, filter: brightness }}>
      <button className="slot-hit" onClick={onOpen} tabIndex={active ? 0 : -1} aria-label={`${card.name}, details`}>
        <HoloCard card={card} printing={row.printing} interactive={active} eager={Math.abs(i) < 3} />
      </button>
      {row.qty > 1 && <span className="qty-badge">×{row.qty}</span>}
    </motion.div>
  )
}

/** The scrubber is the deck's mana curve: one bar per card, height by cost, drag across to jump. */
function CurveScrubber({ rows, index, go }: { rows: Row[]; index: number; go: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const pick = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    go(Math.round(((clientX - r.left) / r.width) * (rows.length - 1)))
  }
  return (
    <div className="scrubber" ref={ref} role="slider" aria-valuemin={1} aria-valuemax={rows.length} aria-valuenow={index + 1} aria-label="Card position"
      onPointerDown={(e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); pick(e.clientX) }}
      onPointerMove={(e) => e.buttons && pick(e.clientX)}>
      {rows.map((r, i) => {
        const c = byId[r.card]
        const h = c.types.includes('Land') ? 10 : 16 + Math.min(c.cmc, 7) * 9
        return <span key={i} className={`bar ${i === index ? 'on' : ''}`} style={{ height: h, background: i === index ? undefined : RARITY_HEX[c.rarity] }} />
      })}
    </div>
  )
}

export function DeckViewer({ deck, onBack, onCard }: { deck: Deck; onBack: () => void; onCard: (c: Card, p: Printing) => void }) {
  const [part, setPart] = useState<'main' | 'spares'>('main')
  const rows = useMemo(() => order(deck, part), [deck, part])
  const { pos, index, go, onPan, onPanEnd } = useSwipe(rows.length, Math.min(window.innerWidth, 520) * 0.42)
  useEffect(() => { go(0) }, [part])
  const row = rows[Math.min(index, rows.length - 1)]
  const card = byId[row.card]
  const [dir, setDir] = useState(1)
  const last = useRef(index)
  useEffect(() => { setDir(index >= last.current ? 1 : -1); last.current = index }, [index])
  const typeLine = card.types.replace(/^Legendary /, 'Legendary ').split(' ').slice(0, 4).join(' ')
  return (
    <motion.section className="screen viewer" onPan={onPan} onPanEnd={onPanEnd}>
      <Ambient card={card} colors={card.colors.length ? card.colors : deck.colors} />
      <header className="topbar">
        <button className="back" onClick={onBack} aria-label="Back to decks">‹</button>
        <span className="topbar-title">{deck.short}</span>
        <div className="seg" role="tablist">
          {(['main', 'spares'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={part === p} className={part === p ? 'on' : ''} onClick={() => setPart(p)}>
              {p === 'main' ? `Deck ${deckCount(deck, 'main')}` : `Spares ${deckCount(deck, 'spares')}`}
            </button>
          ))}
        </div>
      </header>

      <div className="stage">
        {rows.map((r, i) => Math.abs(i - index) <= 4 && (
          <Slot key={part + i} row={r} i={i} pos={pos} active={i === index} onOpen={() => (i === index ? onCard(byId[r.card], r.printing) : go(i))} />
        ))}
      </div>

      <div className="info">
        <div className="info-row">
          <span className="count">{index + 1}<small>/{rows.length}</small></span>
          <Mana cost={card.cost} size={18} />
        </div>
        <KineticTitle text={deName(card)} className="card-title" dir={dir} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={card.id + row.printing} className="info-meta" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <span>{deName(card) !== card.name ? card.name + ' · ' : ''}{typeLine}{card.pt ? ` · ${card.pt}` : ''}</span>
            <span className={`ver ${row.printing !== 'Normal' || card.num > 188 ? 'fancy' : ''}`}>{row.basic ? 'Basic land' : versionLabel(card, row.printing)}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <CurveScrubber rows={rows} index={index} go={go} />
    </motion.section>
  )
}
