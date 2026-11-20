import Fuse from 'fuse.js'
import { useMemo, useState } from 'react'
import { byId, Card, cards, Color, copies, deName, owned, Printing, totalOwned } from '../lib/data'
import { CardImg } from './CardImage'
import { useVersion } from '../lib/useVersion'

const COLORS: Color[] = ['W', 'U', 'B', 'R', 'G']
const PLACES = [
  { id: 'any', label: 'Anywhere' }, { id: 'decks', label: 'In decks' }, { id: 'box2', label: 'Box 2' }, { id: 'box3', label: 'Box 3' },
]
const docs = cards.map((c) => ({ id: c.id, name: c.name, de: deName(c), types: c.types, text: c.text, adv: c.adventure?.name || '', num: String(c.num) }))
const fuse = new Fuse(docs, { keys: [{ name: 'name', weight: 3 }, { name: 'de', weight: 3 }, { name: 'adv', weight: 2 }, { name: 'types', weight: 1.5 }, { name: 'text', weight: 0.6 }, { name: 'num', weight: 2 }], threshold: 0.32, ignoreLocation: true })

export function Collection({ onCard }: { onCard: (c: Card, p: Printing) => void }) {
  const v = useVersion()
  const [q, setQ] = useState('')
  const [cols, setCols] = useState<Color[]>([])
  const [place, setPlace] = useState('any')
  const [fancy, setFancy] = useState(false)
  const [mine, setMine] = useState(true)
  const list = useMemo(() => {
    let ids = q.trim() ? fuse.search(q.trim()).map((r) => r.item.id) : cards.map((c) => c.id)
    const rows: { card: Card; printing: Printing; qty: number }[] = []
    for (const id of ids) {
      const c = byId[id]
      if (cols.length && !cols.every((x) => c.colors.includes(x))) continue
      const vs = copies.filter((v) => v.card === id)
      if (!vs.length) { if (!mine && !fancy && place === 'any') rows.push({ card: c, printing: 'Normal', qty: 0 }); continue }
      for (const v of vs) {
        if (fancy && v.printing === 'Normal' && c.num <= 188) continue
        const locs = Object.keys(v.locations)
        if (place === 'decks' && !locs.some((l) => l.includes(':'))) continue
        if ((place === 'box2' || place === 'box3') && !locs.includes(place)) continue
        rows.push({ card: c, printing: v.printing, qty: place === 'any' ? v.qty : locs.filter((l) => (place === 'decks' ? l.includes(':') : l === place)).reduce((a, l) => a + v.locations[l], 0) })
      }
    }
    return rows
  }, [q, cols, place, fancy, mine, v])
  const count = list.reduce((a, r) => a + r.qty, 0)
  return (
    <section className="screen collection">
      <div className="ambient flat" aria-hidden><div className="grain" /></div>
      <header className="col-head">
        <h1 className="page-title">Your cards</h1>
        <p className="muted">{totalOwned} cards in {Object.keys(owned).length} printings</p>
        <input className="search" type="search" placeholder="Search names, types or rules — German or English" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cards" />
        <div className="filters">
          {COLORS.map((c) => (
            <button key={c} className={`sym-btn ${cols.includes(c) ? 'on' : ''}`} aria-pressed={cols.includes(c)} onClick={() => setCols((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}>
              <img src={`https://svgs.scryfall.io/card-symbols/${c}.svg`} alt={c} width={22} height={22} />
            </button>
          ))}
          <span className="sep" />
          {PLACES.map((p) => <button key={p.id} className={`chip-btn ${place === p.id ? 'on' : ''}`} onClick={() => setPlace(p.id)}>{p.label}</button>)}
          <button className={`chip-btn ${fancy ? 'on' : ''}`} aria-pressed={fancy} onClick={() => setFancy(!fancy)}>Foils and specials</button>
          <button className={`chip-btn ${!mine ? 'on' : ''}`} aria-pressed={!mine} onClick={() => setMine(!mine)}>Show missing</button>
        </div>
        <p className="result-count">{list.length} printings, {count} cards</p>
      </header>
      <div className="grid">
        {list.map((r, i) => (
          <button key={r.card.id + r.printing + i} className={`tile ${r.qty === 0 ? 'missing' : ''} ${r.printing !== 'Normal' ? 'foil-tile' : ''}`} onClick={() => onCard(r.card, r.printing)}>
            <CardImg card={r.card} />
            {r.qty > 0 && <span className="qty-badge sm">{r.qty}</span>}
            {r.printing !== 'Normal' && <span className="foil-badge">{r.printing === 'Surge Foil' ? 'Surge' : 'Foil'}</span>}
          </button>
        ))}
        {!list.length && <p className="empty">Nothing matches. Clear a filter or try the English name.</p>}
      </div>
      <p className="fcp">Unofficial Fan Content permitted under the Fan Content Policy. Not approved or endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. Card images, set and mana symbols from Scryfall.</p>
    </section>
  )
}
