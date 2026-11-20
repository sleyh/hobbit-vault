import React from 'react'
import { motion, useDragControls } from 'framer-motion'
import { Card, deckRoles, COLOR_HEX, deName, deText, deType, LOCATION_LABEL, price, Printing, versionLabel, whereIs, byId, decks } from '../lib/data'
import { Mana, RulesText } from '../lib/mana'
import { Ambient } from './Ambient'
import { HoloCard } from './CardImage'

const PLANNED: Record<string, string> = {}
for (const d of decks.filter((d) => !d.built))
  for (const p of ['main', 'spares'] as const) for (const e of d[p]) PLANNED[byId[e.card].name] = `${d.short} ${p === 'main' ? 'deck' : 'spares'} (planned)`

export function CardSheet({ card, printing, onClose }: { card: Card; printing: Printing; onClose: () => void }) {
  const versions = whereIs(card.name)
  const total = versions.reduce((a, v) => a + v.qty, 0)
  const text = deText(card)
  const eur = price(card, printing)
  const roles = deckRoles(card)
  const drag = useDragControls()
  const startDrag = (e: React.PointerEvent) => drag.start(e)
  return (
    <motion.div className="sheet-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <Ambient card={card} colors={card.colors} />
      <motion.article className="sheet" role="dialog" aria-label={card.name} onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        drag="y" dragListener={false} dragControls={drag} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}>
        <div className="drag-zone" onPointerDown={startDrag}><div className="grabber" /></div>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <div className="sheet-hero" onPointerDown={startDrag}><HoloCard card={card} printing={printing} eager /></div>
        <div className="sheet-body">
          <div className="info-row"><Mana cost={card.cost} size={20} /><span className={`rarity r-${card.rarity}`}>{card.rarity}</span></div>
          <h2 className="sheet-title">{deName(card)}</h2>
          {deName(card) !== card.name && <p className="sheet-en">{card.name}</p>}
          <p className="sheet-type">{deType(card) || card.types}{card.pt ? ` · ${card.pt}` : ''}</p>
          <div className="rules">
            <RulesText text={text || card.text} />
            {card.adventure && (
              <div className="adventure">
                <div className="info-row"><strong>{card.adventure.name}</strong><Mana cost={card.adventure.cost} size={15} /></div>
                <RulesText text={card.adventure.text} />
              </div>
            )}
          </div>
          <h3 className="sheet-h">You own {total}</h3>
          <ul className="where">
            {versions.map((v) => (
              <li key={v.card + v.printing}>
                <span className="where-ver"><span className="code">{byId[v.card].set}{String(byId[v.card].num).padStart(3, '0')}</span> {versionLabel(byId[v.card], v.printing)}</span>
                <span className="where-loc">{Object.entries(v.locations).map(([l, q]) => <span key={l} className="chip">{q}× {LOCATION_LABEL[l] || l}</span>)}</span>
              </li>
            ))}
            {!versions.length && <li className="muted">Not in your collection yet.</li>}
          </ul>
          {PLANNED[card.name] && <p className="muted">Also on the list for the {PLANNED[card.name]}.</p>}
          {roles.length > 0 && (
            <section className="roles" aria-label="How this card plays in your decks">
              <h3 className="sheet-h">In your decks</h3>
              {roles.map((r) => (
                <article key={r.deck.id + r.part} className="role-card" style={{ ['--c1' as any]: COLOR_HEX[r.deck.colors[0]], ['--c2' as any]: COLOR_HEX[r.deck.colors[1]] }}>
                  <header className="role-head">
                    <span className="role-deck">{r.deck.short}</span>
                    <span className="role-tag">{r.part === 'main' ? `${r.qty}× in the deck` : `${r.qty}× in the spares`}{r.deck.built ? '' : ', not built yet'}</span>
                  </header>
                  {r.role && <p className="role-text">{r.role}</p>}
                  {r.play && (<><h4 className="role-sub">How to play it</h4><p className="role-text">{r.play}</p></>)}
                  {r.swap && <p className="role-text">{r.swap}</p>}
                  <details className="role-plan"><summary>Deck plan</summary><p>{r.plan}</p></details>
                </article>
              ))}
            </section>
          )}
          <p className="muted small">Illustrated by {card.artist || 'unknown'}{eur ? ` · about €${eur.toFixed(2)} on Scryfall` : ''}</p>
        </div>
      </motion.article>
    </motion.div>
  )
}
