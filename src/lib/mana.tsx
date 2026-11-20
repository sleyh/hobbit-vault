import React from 'react'
const sym = (s: string) => `https://svgs.scryfall.io/card-symbols/${s.replace('/', '')}.svg`
/** Renders a Forge-style cost ("2 R W", "RW", "X 2 W") as Scryfall mana symbols. */
export function Mana({ cost, size = 16 }: { cost: string; size?: number }) {
  if (!cost) return null
  const parts = cost.split(' ').filter(Boolean).map((p) => (p.length === 2 && /^[WUBRG]{2}$/.test(p) ? p : p))
  return (
    <span className="mana" aria-label={`Mana cost ${cost}`}>
      {parts.map((p, i) => <img key={i} src={sym(p)} width={size} height={size} alt={p} draggable={false} />)}
    </span>
  )
}
/** Replace {T}, {R}, {2} in rules text with symbols. */
export function RulesText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i}>
          {line.split(/(\{[^}]+\})/g).map((t, j) =>
            /^\{[^}]+\}$/.test(t) ? <img key={j} className="inline-sym" src={sym(t.slice(1, -1).replace('/', ''))} alt={t} /> : <React.Fragment key={j}>{t}</React.Fragment>,
          )}
        </p>
      ))}
    </>
  )
}
export const SetIcon = ({ rarity = 'common', size = 18 }: { rarity?: string; size?: number }) => (
  <span className={`set-icon r-${rarity}`} style={{ width: size, height: size }} aria-hidden />
)
