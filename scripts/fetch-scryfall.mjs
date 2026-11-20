// Runs before every build (also on Vercel). Pulls German + English printings of the Hobbit set
// from Scryfall: image URLs, German names, type lines and rules text. If Scryfall can't be
// reached, the committed src/data/scryfall.json is kept and the app falls back to API image links.
import fs from 'node:fs'
const OUT = new URL('../src/data/scryfall.json', import.meta.url)
const HEADERS = { 'User-Agent': 'HobbitVault/0.1 (personal collection app)', Accept: 'application/json' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function all(q) {
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints&include_extras=true&include_variations=true`
  const cards = []
  while (url) {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) throw new Error(`${res.status} for ${url}`)
    const page = await res.json()
    cards.push(...page.data)
    url = page.has_more ? page.next_page : null
    await sleep(120)
  }
  return cards
}
const pick = (c) => {
  const iu = c.image_uris || c.card_faces?.[0]?.image_uris || {}
  return { normal: iu.normal, large: iu.large, png: iu.png, art: iu.art_crop }
}
try {
  const out = {}
  for (const set of ['hob', 'hoc']) {
    const en = await all(`set:${set} lang:en`)
    let de = []
    try { de = await all(`set:${set} lang:de`) } catch (e) { console.warn('no German printings for', set, e.message) }
    for (const c of en) {
      const id = `${set.toUpperCase()}-${parseInt(c.collector_number, 10)}`
      if (!/^\d+$/.test(c.collector_number)) continue
      out[id] = { en: pick(c), prices: c.prices, oracleName: c.name }
    }
    for (const c of de) {
      const id = `${set.toUpperCase()}-${parseInt(c.collector_number, 10)}`
      if (!/^\d+$/.test(c.collector_number)) continue
      const f0 = c.card_faces?.[0]
      out[id] = { ...(out[id] || {}), de: pick(c),
        deName: c.printed_name || f0?.printed_name, deType: c.printed_type_line || f0?.printed_type_line,
        deText: c.printed_text || f0?.printed_text }
    }
  }
  if (Object.keys(out).length < 100) throw new Error('too few cards: ' + Object.keys(out).length)
  fs.writeFileSync(OUT, JSON.stringify(out))
  console.log('scryfall: wrote', Object.keys(out).length, 'printings')
} catch (e) {
  console.warn('scryfall: kept committed data —', e.message)
}
