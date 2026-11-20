import { AnimatePresence, motion, MotionValue, useTransform } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { byId, Card, Deck, deckCount, deName, Entry, price, Printing, RARITY_HEX, versionLabel } from '../lib/data'
import { Mana } from '../lib/mana'
import { useSwipe } from '../lib/useSwipe'
import { useFit } from '../lib/useFit'
import { useVersion } from '../lib/useVersion'
import { Ambient } from './Ambient'
import { HoloCard } from './CardImage'
import { KineticTitle } from './Kinetic'

const BASIC_ID: Record<string, string> = { Plains: 'HOB-189', Island: 'HOB-190', Swamp: 'HOB-191', Mountain: 'HOB-192', Forest: 'HOB-193' }
type Row = Entry & { basic?: boolean }

export type SortKey = 'number' | 'rarity' | 'value' | 'cost'
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'number', label: 'Card number' }, { id: 'rarity', label: 'Rarity' }, { id: 'value', label: 'Value' }, { id: 'cost', label: 'Mana cost' },
]
const RANK: Record<string, number> = { mythic: 0, rare: 1, uncommon: 2, common: 3, land: 4 }
function order(d: Deck, part: 'main' | 'spares', sort: SortKey): Row[] {
  const rows: Row[] = [...d[part]]
  const c = (e: Row) => byId[e.card]
  const num = (a: Row, b: Row) => c(a).set.localeCompare(c(b).set) || c(a).num - c(b).num
  const val = (e: Row) => price(c(e), e.printing) ?? -1
  const land = (e: Row) => +c(e).types.includes('Land')
  const by: Record<SortKey, (a: Row, b: Row) => number> = {
    number: num,
    rarity: (a, b) => RANK[c(a).rarity] - RANK[c(b).rarity] || num(a, b),
    value: (a, b) => val(b) - val(a) || num(a, b),
    cost: (a, b) => land(a) - land(b) || c(a).cmc - c(b).cmc || num(a, b),
  }
  rows.sort(by[sort])
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
  const [sort, setSort] = useState<SortKey>('number')
  const [menu, setMenu] = useState(false)
  const fit = useFit(340, 0.62, 0.9)
  const v = useVersion()
  const rows = useMemo(() => order(deck, part, sort), [deck, part, sort, v])
  const { pos, index, go, onPan, onPanEnd } = useSwipe(rows.length, Math.min(window.innerWidth, 520) * 0.42)
  useEffect(() => { go(0) }, [part, sort])
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
        <button className="back" onClick={onBack} aria-label="Back to decks"><svg viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2 2 10l8 8" /></svg></button>
        <span className="topbar-title">{deck.short}</span>
        <div className="sort">
          <button className="icon-btn" aria-label="Sort cards" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v14M6 17l-3-3M6 17l3-3M14 17V3M14 3l-3 3M14 3l3 3" /></svg>
          </button>
          {menu && <button className="menu-scrim" aria-label="Close sort menu" onClick={() => setMenu(false)} />}
          <AnimatePresence>
            {menu && (
              <motion.ul className="menu" role="menu" initial={{ opacity: 0, scale: 0.9, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }}>
                <li className="menu-h">Sort by</li>
                {SORTS.map((o) => (
                  <li key={o.id}><button role="menuitemradio" aria-checked={sort === o.id} onClick={() => { setSort(o.id); setMenu(false) }}>
                    <span>{o.label}</span>{sort === o.id && <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5 6.5 12 13 4.5" /></svg>}
                  </button></li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <div className="seg" role="tablist">
          {(['main', 'spares'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={part === p} className={part === p ? 'on' : ''} onClick={() => setPart(p)}>
              {p === 'main' ? `Deck ${deckCount(deck, 'main')}` : `Spares ${deckCount(deck, 'spares')}`}
            </button>
          ))}
        </div>
      </header>

      <div className="stage" ref={fit.ref} style={fit.style}>
        {rows.map((r, i) => Math.abs(i - index) <= 4 && (
          <Slot key={part + i} row={r} i={i} pos={pos} active={i === index} onOpen={() => (i === index ? onCard(byId[r.card], r.printing) : go(i))} />
        ))}
      </div>

      <div className="info">
        <div className="info-row">
          <span className="count">{index + 1} <small>of {rows.length}</small></span>
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
