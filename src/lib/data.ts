import cardsRaw from '../data/cards.json'
import copiesRaw from '../data/copies.json'
import decksRaw from '../data/decks.json'
import sf from '../data/scryfall.json'

export type Color = 'W' | 'U' | 'B' | 'R' | 'G'
export type Printing = 'Normal' | 'Foil' | 'Surge Foil'
export interface Card {
  id: string; set: string; num: number; name: string; rarity: string; treatment: string; artist: string
  cost: string; types: string; pt: string; text: string; cmc: number; colors: Color[]
  adventure?: { name: string; cost: string; types: string; text: string }
}
export interface Copy { card: string; printing: Printing; qty: number; locations: Record<string, number> }
export interface Entry { card: string; printing: Printing; qty: number }
export interface Deck {
  id: string; name: string; short: string; colors: Color[]; built: boolean; sleeves: string
  main: Entry[]; spares: Entry[]; basics: Record<string, number>
}
interface SfImg { normal?: string; large?: string; png?: string; art?: string }
interface SfEntry { en?: SfImg; de?: SfImg; deName?: string; deType?: string; deText?: string; prices?: Record<string, string | null> }

export const cards = cardsRaw as unknown as Card[]
export const byId: Record<string, Card> = Object.fromEntries(cards.map((c) => [c.id, c]))
export const copies = copiesRaw as unknown as Copy[]
export const decks = decksRaw as unknown as Deck[]
const scry = sf as unknown as Record<string, SfEntry>

export const LOCATION_LABEL: Record<string, string> = {
  'dwarves:main': 'Dwarves deck', 'dwarves:spares': 'Dwarves spares',
  'wolves:main': 'Wolves deck', 'wolves:spares': 'Wolves spares',
  'goblins:main': 'Goblins deck', 'goblins:spares': 'Goblins spares',
  'humans:main': 'Humans deck', 'humans:spares': 'Humans spares',
  box2: 'Box 2', box3: 'Box 3',
}
export const COLOR_HEX: Record<Color, string> = { W: '#efe3bd', U: '#4f9ed6', B: '#8f7aa3', R: '#e2563a', G: '#5fae63' }
export const RARITY_HEX: Record<string, string> = { common: '#cfc6b4', uncommon: '#a9c3d3', rare: '#e3b553', mythic: '#ef6a34', land: '#cfc6b4' }

/** German name when Scryfall has it, otherwise the English one. */
export const deName = (c: Card) => scry[c.id]?.deName || c.name
export const deText = (c: Card) => scry[c.id]?.deText
export const deType = (c: Card) => scry[c.id]?.deType

type Size = 'normal' | 'large' | 'art'
const api = (c: Card, size: Size, lang?: string) =>
  `https://api.scryfall.com/cards/${c.set.toLowerCase()}/${c.num}${lang ? '/' + lang : ''}?format=image&version=${size === 'art' ? 'art_crop' : size}`
/** Ordered image candidates: German print first, English as fallback. */
export function imageUrls(c: Card, size: Size = 'normal'): string[] {
  const s = scry[c.id]
  const out: string[] = []
  if (size !== 'art' && s?.de?.[size]) out.push(s.de[size]!)
  if (s?.en?.[size]) out.push(s.en[size]!)
  if (size !== 'art') out.push(api(c, size, 'de'))
  out.push(api(c, size))
  return [...new Set(out)]
}
export const price = (c: Card, p: Printing) => {
  const pr = scry[c.id]?.prices
  if (!pr) return null
  const v = p === 'Normal' ? pr.eur : pr.eur_foil
  return v ? parseFloat(v) : null
}

export const owned: Record<string, number> = {}
for (const cp of copies) owned[cp.card] = (owned[cp.card] || 0) + cp.qty
export const totalOwned = copies.reduce((a, c) => a + c.qty, 0)

/** Where are the copies of this card (all versions)? */
export function whereIs(cardName: string) {
  const ids = cards.filter((c) => c.name === cardName).map((c) => c.id)
  return copies.filter((c) => ids.includes(c.card))
}
export const isFancy = (c: Card, p: Printing) => p !== 'Normal' || (c.set === 'HOB' && c.num > 188)
export const versionLabel = (c: Card, p: Printing) => {
  const t = { normal: '', basic: '', journey: 'Journey', scene: 'Scene', dragonhoard: 'Dragon hoard', bookcover: 'Book cover', borderless: 'Borderless', extended: 'Extended art' }[c.treatment] || ''
  const f = p === 'Normal' ? '' : p
  return [t, f].filter(Boolean).join(' · ') || 'Regular'
}
export const deckCount = (d: Deck, part: 'main' | 'spares') =>
  d[part].reduce((a, e) => a + e.qty, 0) + (part === 'main' ? Object.values(d.basics).reduce((a, b) => a + b, 0) : 0)
/** Signature cards for a deck's hero fan: highest rarity + fancy first. */
export function signature(d: Deck, n = 3) {
  const R: Record<string, number> = { mythic: 4, rare: 3, uncommon: 2, common: 1, land: 0 }
  return [...d.main]
    .filter((e) => !byId[e.card].types.includes('Land'))
    .sort((a, b) => (R[byId[b.card].rarity] - R[byId[a.card].rarity]) || (+isFancy(byId[b.card], b.printing) - +isFancy(byId[a.card], a.printing)) || byId[b.card].cmc - byId[a.card].cmc)
    .slice(0, n)
}
export const sortedForCode = (e: Entry) => `${byId[e.card].set}${String(byId[e.card].num).padStart(3, '0')}`
