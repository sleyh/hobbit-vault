import { useMemo, useState } from 'react'
import { byId, Card, copies, decks, LOCATION_LABEL, Printing, versionLabel } from '../lib/data'
import { CardImg } from './CardImage'

const PLACES = ['box2', 'box3', ...decks.filter((d) => d.built).flatMap((d) => [`${d.id}:main`, `${d.id}:spares`])]
const BLURB: Record<string, string> = {
  box2: 'One of every card number, plus every rare, mythic, foil and special version.',
  box3: 'Spare normal commons and uncommons.',
}

export function Boxes({ onCard }: { onCard: (c: Card, p: Printing) => void }) {
  const [place, setPlace] = useState('box2')
  const rows = useMemo(() => copies.filter((c) => c.locations[place]).map((c) => ({ ...c, n: c.locations[place] }))
    .sort((a, b) => byId[a.card].set.localeCompare(byId[b.card].set) || byId[a.card].num - byId[b.card].num), [place])
  const total = rows.reduce((a, r) => a + r.n, 0)
  const sizes = Object.fromEntries(PLACES.map((p) => [p, copies.reduce((a, c) => a + (c.locations[p] || 0), 0)]))
  const max = Math.max(...Object.values(sizes))
  return (
    <section className="screen boxes">
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
      </header>
      <ul className="rows">
        {rows.map((r) => {
          const c = byId[r.card]
          return (
            <li key={r.card + r.printing}>
              <button className="row" onClick={() => onCard(c, r.printing)}>
                <CardImg card={c} className="thumb" />
                <span className="code">{c.set}{String(c.num).padStart(3, '0')}</span>
                <span className="row-name">{c.name}<small>{versionLabel(c, r.printing)}</small></span>
                <span className="row-n">{r.n}×</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
