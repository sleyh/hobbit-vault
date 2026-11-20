import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { byId, Card, Copy, copies, decks, getMoves, LOCATION_LABEL, moveCopy, Printing, resetMoves, undoMove, versionLabel } from '../lib/data'
import { useVersion } from '../lib/useVersion'
import { CardImg } from './CardImage'

const PLACES = ['box2', 'box3', ...decks.flatMap((d) => [`${d.id}:main`, `${d.id}:spares`])]
const BLURB: Record<string, string> = {
  box2: 'One of every card number, plus every rare, mythic, foil and special version.',
  box3: 'Spare normal commons and uncommons.',
}
const HOLD_MS = 320

type Drag = { copy: Copy; from: string; x: number; y: number }

export function Boxes({ onCard }: { onCard: (c: Card, p: Printing) => void }) {
  const v = useVersion()
  const [place, setPlace] = useState('box2')
  const [drag, setDrag] = useState<Drag | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const overRef = useRef<string | null>(null)
  const hold = useRef<{ t: number; x: number; y: number; copy: Copy } | null>(null)
  const justDragged = useRef(false)

  const rows = useMemo(() => copies.filter((c) => c.locations[place]).map((c) => ({ ...c, n: c.locations[place] }))
    .sort((a, b) => byId[a.card].set.localeCompare(byId[b.card].set) || byId[a.card].num - byId[b.card].num), [place, v])
  const total = rows.reduce((a, r) => a + r.n, 0)
  const sizes = useMemo(() => Object.fromEntries(PLACES.map((p) => [p, copies.reduce((a, c) => a + (c.locations[p] || 0), 0)])), [v])
  const max = Math.max(...Object.values(sizes))
  const moved = getMoves().length

  const startDrag = (copy: Copy, x: number, y: number) => {
    const d = { copy, from: place, x, y }
    dragRef.current = d; setDrag(d)
    try { navigator.vibrate?.(12) } catch { /* not supported */ }
  }
  const cancelHold = () => { if (hold.current) { clearTimeout(hold.current.t); hold.current = null } }
  const onRowDown = (e: React.PointerEvent, copy: Copy) => {
    if (e.button > 0) return
    const { clientX: x, clientY: y } = e
    cancelHold()
    hold.current = { x, y, copy, t: window.setTimeout(() => { if (hold.current) startDrag(copy, hold.current.x, hold.current.y); hold.current = null }, HOLD_MS) }
  }

  // follow the finger / mouse while a card is picked up
  useEffect(() => {
    const track = (x: number, y: number) => {
      if (hold.current) {
        const dx = x - hold.current.x, dy = y - hold.current.y
        if (Math.hypot(dx, dy) > 8) cancelHold()
        return
      }
      const d = dragRef.current
      if (!d) return
      const nd = { ...d, x, y }; dragRef.current = nd; setDrag(nd)
      const el = document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null
      const t = el?.dataset.drop || null
      if (t !== overRef.current) { overRef.current = t; setOver(t) }
    }
    const finish = () => {
      cancelHold()
      const d = dragRef.current
      if (!d) return
      const to = overRef.current
      if (to && to !== d.from) {
        moveCopy(d.copy.card, d.copy.printing, d.from, to)
        setToast(`Moved ${byId[d.copy.card].name} to ${LOCATION_LABEL[to]}`)
      }
      justDragged.current = true; setTimeout(() => (justDragged.current = false), 50)
      dragRef.current = null; overRef.current = null; setDrag(null); setOver(null)
    }
    const pm = (e: PointerEvent) => track(e.clientX, e.clientY)
    const tm = (e: TouchEvent) => { if (dragRef.current) e.preventDefault(); const t = e.touches[0]; if (t) track(t.clientX, t.clientY) }
    window.addEventListener('pointermove', pm)
    window.addEventListener('touchmove', tm, { passive: false })
    window.addEventListener('pointerup', finish)
    window.addEventListener('touchend', finish)
    window.addEventListener('pointercancel', () => { if (!dragRef.current) cancelHold() })
    return () => {
      window.removeEventListener('pointermove', pm); window.removeEventListener('touchmove', tm)
      window.removeEventListener('pointerup', finish); window.removeEventListener('touchend', finish)
    }
  }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t) }, [toast, v])

  return (
    <section className={`screen boxes ${drag ? 'is-dragging' : ''}`}>
      <div className="ambient flat" aria-hidden><div className="grain" /></div>
      <header className="col-head">
        <h1 className="page-title">Where everything is</h1>
        <div className="shelf" role="tablist">
          {PLACES.map((p) => (
            <button key={p} role="tab" aria-selected={place === p} className={`shelf-item ${place === p ? 'on' : ''}`} onClick={() => setPlace(p)}>
              <span className="stack" style={{ height: 8 + (sizes[p] / max) * 70 }} />
              <span className="shelf-label">{LOCATION_LABEL[p]}</span>
              <span className="shelf-n">{sizes[p]}</span>
            </button>
          ))}
        </div>
        <p className="muted">{BLURB[place] || 'Deck box contents, basic lands not counted.'} {total} cards on {rows.length} lines.</p>
        <p className="hint">Touch and hold a card to move one copy to another box or deck.{moved > 0 && <> {moved} {moved === 1 ? 'move' : 'moves'} saved on this device. <button className="link" onClick={() => { resetMoves(); setToast('Moves reset to your Sorted export') }}>Reset</button></>}</p>
      </header>
      <ul className="rows">
        {rows.map((r) => {
          const c = byId[r.card]
          const lifted = drag?.copy.card === r.card && drag.copy.printing === r.printing
          return (
            <li key={r.card + r.printing}>
              <button className={`row draggable ${lifted ? 'lifted' : ''}`}
                onPointerDown={(e) => onRowDown(e, r)}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => { if (!justDragged.current && !drag) onCard(c, r.printing) }}>
                <CardImg card={c} className="thumb" />
                <span className="code">{c.set}{String(c.num).padStart(3, '0')}</span>
                <span className="row-name">{c.name}<small>{versionLabel(c, r.printing)}</small></span>
                <span className="row-n">{r.n}×</span>
              </button>
            </li>
          )
        })}
      </ul>

      <AnimatePresence>
        {drag && (
          <>
            <motion.div key="ghost" className="drag-ghost" style={{ left: drag.x, top: drag.y }}
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} exit={{ scale: 0.6, opacity: 0 }}>
              <CardImg card={byId[drag.copy.card]} eager />
            </motion.div>
            <motion.div key="dock" className="drop-dock" initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              <p className="dock-title">Move one {byId[drag.copy.card].name} to…</p>
              <div className="dock-grid">
                {PLACES.map((p) => (
                  <div key={p} data-drop={p} className={`dock-tile ${over === p ? 'over' : ''} ${p === drag.from ? 'here' : ''}`}>
                    <span>{LOCATION_LABEL[p]}</span><small>{p === drag.from ? 'Here now' : `${sizes[p]} cards`}</small>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && !drag && (
          <motion.div className="toast" role="status" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
            <span>{toast}</span>
            {toast.startsWith('Moved') && <button className="link" onClick={() => { undoMove(); setToast('Move undone') }}>Undo</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
