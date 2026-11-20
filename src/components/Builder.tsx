import Fuse from 'fuse.js'
import { useEffect, useMemo, useState } from 'react'
import { byId, Card, cards, decks, deName, owned, Printing, whereIs } from '../lib/data'
import { Mana } from '../lib/mana'
import { CardImg } from './CardImage'

interface MyDeck { id: string; name: string; cards: Record<string, number> }
const KEY = 'hobbit-vault:decks'
const load = (): MyDeck[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = (d: MyDeck[]) => { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* private mode */ } }
const fuse = new Fuse(cards.filter((c) => c.num <= 188 || c.set !== 'HOB'), { keys: ['name', 'types', 'adventure.name'], threshold: 0.3, ignoreLocation: true })
const ownedByName = (name: string) => whereIs(name).reduce((a, v) => a + v.qty, 0)
const freeByName = (name: string) => whereIs(name).reduce((a, v) => a + (v.locations.box2 || 0) + (v.locations.box3 || 0), 0)

export function Builder({ onCard }: { onCard: (c: Card, p: Printing) => void }) {
  const [list, setList] = useState<MyDeck[]>(load)
  const [cur, setCur] = useState<string | null>(list[0]?.id || null)
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => save(list), [list])
  const deck = list.find((d) => d.id === cur)
  const update = (fn: (d: MyDeck) => MyDeck) => setList((l) => l.map((d) => (d.id === cur ? fn(d) : d)))
  const add = (id: string, n: number) => update((d) => {
    const c = { ...d.cards }; c[id] = Math.max(0, (c[id] || 0) + n); if (!c[id]) delete c[id]; return { ...d, cards: c }
  })
  const create = (from?: string) => {
    const src = decks.find((d) => d.id === from)
    const cardsMap: Record<string, number> = {}
    if (src) for (const e of src.main) { const base = cards.find((c) => c.name === byId[e.card].name && c.num <= 188) || byId[e.card]; cardsMap[base.id] = (cardsMap[base.id] || 0) + e.qty }
    const d: MyDeck = { id: crypto.randomUUID(), name: src ? `${src.short} copy` : 'New deck', cards: cardsMap }
    setList((l) => [d, ...l]); setCur(d.id)
  }
  const results = useMemo(() => (q.trim() ? fuse.search(q.trim()).slice(0, 12).map((r) => r.item) : []), [q])
  const entries = deck ? Object.entries(deck.cards).map(([id, n]) => ({ c: byId[id], n })).sort((a, b) => a.c.cmc - b.c.cmc || a.c.name.localeCompare(b.c.name)) : []
  const total = entries.reduce((a, e) => a + e.n, 0)
  const curve = [0, 1, 2, 3, 4, 5, 6].map((m) => entries.filter((e) => !e.c.types.includes('Land') && Math.min(e.c.cmc, 6) === m).reduce((a, e) => a + e.n, 0))
  const cmax = Math.max(1, ...curve)
  const exportText = entries.slice().sort((a, b) => a.c.num - b.c.num).map((e) => `${e.n} ${e.c.name} (${e.c.set}) ${e.c.num}`).join('\n')
  const copy = async () => { try { await navigator.clipboard.writeText(exportText); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* ignore */ } }

  return (
    <section className="screen builder">
      <div className="ambient flat" aria-hidden><div className="grain" /></div>
      <header className="col-head">
        <h1 className="page-title">Build a deck</h1>
        <div className="filters">
          {list.map((d) => <button key={d.id} className={`chip-btn ${cur === d.id ? 'on' : ''}`} onClick={() => setCur(d.id)}>{d.name}</button>)}
          <button className="chip-btn add" onClick={() => create()}>New empty deck</button>
          <select className="chip-btn" value="" onChange={(e) => e.target.value && create(e.target.value)} aria-label="Start from one of your decks">
            <option value="">Start from a deck…</option>
            {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </header>
      {!deck && <p className="empty">Start a new deck, or copy one of your five decks and change it. Decks you build here are saved on this device.</p>}
      {deck && (
        <div className="build">
          <input className="deck-name" value={deck.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} aria-label="Deck name" />
          <div className="build-stats">
            <span className={`big-n ${total === 60 ? 'ok' : ''}`}>{total}<small>/60 without basics</small></span>
            <div className="mini-curve" aria-label="Mana curve">{curve.map((n, i) => <span key={i} style={{ height: 6 + (n / cmax) * 46 }} title={`${i}${i === 6 ? '+' : ''} mana: ${n}`}><em>{n || ''}</em></span>)}</div>
          </div>
          <input className="search" type="search" placeholder="Add a card…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a card to add" />
          {results.length > 0 && (
            <ul className="results">
              {results.map((c) => {
                const have = ownedByName(c.name), free = freeByName(c.name), inDeck = deck.cards[c.id] || 0
                return (
                  <li key={c.id}>
                    <button className="row" onClick={() => onCard(c, 'Normal')}><CardImg card={c} className="thumb" /><span className="row-name">{deName(c)}<small>{have ? `${have} owned · ${free} in boxes` : 'Not owned'}</small></span></button>
                    <Mana cost={c.cost} size={14} />
                    <button className="step" onClick={() => add(c.id, 1)} aria-label={`Add ${c.name}`} disabled={inDeck >= 4 && !c.types.includes('Basic')}>+</button>
                  </li>
                )
              })}
            </ul>
          )}
          <ul className="results deck-list">
            {entries.map(({ c, n }) => {
              const have = ownedByName(c.name)
              return (
                <li key={c.id} className={n > have ? 'short' : ''}>
                  <span className="row-n">{n}</span>
                  <button className="row" onClick={() => onCard(c, 'Normal')}><span className="row-name">{c.name}<small>{n > have ? `You own ${have}` : `${have} owned`}</small></span></button>
                  <Mana cost={c.cost} size={14} />
                  <button className="step" onClick={() => add(c.id, -1)} aria-label={`Remove one ${c.name}`}>−</button>
                  <button className="step" onClick={() => add(c.id, 1)} aria-label={`Add one ${c.name}`}>+</button>
                </li>
              )
            })}
          </ul>
          <div className="build-actions">
            <button className="cta" onClick={copy} disabled={!entries.length}>{copied ? 'Copied for Sorted' : 'Copy list for Sorted'}</button>
            <button className="ghost" onClick={() => { if (confirm(`Delete "${deck.name}"?`)) { setList((l) => l.filter((d) => d.id !== cur)); setCur(null) } }}>Delete deck</button>
          </div>
        </div>
      )}
    </section>
  )
}
