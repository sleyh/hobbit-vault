"""Builds src/data/*.json from the Sorted export, the deck lists and the Forge card catalog.
Run locally (needs the source files); the generated JSON is committed."""
import csv, re, json, os, sys, collections, unicodedata
A = '/mnt/user-data/attachments/fdd9ec3a-46fd-5b16-a741-07cae4c59b1f/d4780b4a-3c963e3b-55e3-4dfb-a67a-c77c7fe767c1.csv'
V = '/home/claude/out/decks/v14/'
FORGE = '/tmp/claude-0/-home-claude/fdd9ec3a-46fd-5b16-a741-07cae4c59b1f/scratchpad/forge/forge-gui/res/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
BASIC = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'}
key = lambda s: unicodedata.normalize('NFC', s.split(' // ')[0])

# ---------- catalog from Forge edition ----------
RAR = {'C': 'common', 'U': 'uncommon', 'R': 'rare', 'M': 'mythic', 'L': 'land', 'S': 'special', 'T': 'token'}
def treatment(n):
    if n <= 188: return 'normal'
    if n <= 193: return 'basic'
    if n <= 198: return 'journey'
    if n <= 213: return 'scene'
    if n <= 238: return 'dragonhoard'
    if n <= 248: return 'bookcover'
    if n <= 284: return 'borderless'
    return 'extended'
catalog = {}
sec = None
for l in open(FORGE + 'editions/The Hobbit.txt', encoding='utf-8'):
    l = l.strip()
    if l.startswith('['): sec = l; continue
    m = re.match(r'^(\d+)\s+([CURML])\s+(.+?)\s+@(.*)$', l)
    if m and sec in ('[cards]', '[borderless]', '[extended art]'):
        n = int(m.group(1))
        catalog[f'HOB-{n}'] = dict(id=f'HOB-{n}', set='HOB', num=n, name=unicodedata.normalize('NFC', m.group(3)), rarity=RAR[m.group(2)],
                                  treatment=treatment(n), artist=m.group(4))
# ---------- oracle from Forge card scripts ----------
idx = {}
for root, _, files in os.walk(FORGE + 'cardsfolder'):
    for f in files:
        p = os.path.join(root, f)
        with open(p, encoding='utf-8', errors='ignore') as fh:
            t = fh.read()
        m = re.search(r'^Name:(.*)$', t, re.M)
        if m: idx.setdefault(unicodedata.normalize('NFC', m.group(1).strip()), p)
def faces(text):
    text = unicodedata.normalize('NFC', text)
    parts = text.split('\nALTERNATE\n')
    out = []
    for p in parts:
        g = lambda k: (re.search(rf'^{k}:(.*)$', p, re.M) or [None, ''])[1].strip()
        out.append(dict(name=g('Name'), cost=g('ManaCost'), types=g('Types'), pt=g('PT'),
                        text=g('Oracle').replace('\\n', '\n')))
    return out
def cmc(cost):
    v = 0
    for t in cost.split():
        if t.isdigit(): v += int(t)
        elif t in ('X', 'no', 'cost'): pass
        else: v += 1
    return v
def colors(cost):
    return sorted({c for c in cost if c in 'WUBRG'}, key='WUBRG'.index)
missing = []
for c in catalog.values():
    p = idx.get(c['name'])
    if not p: missing.append(c['name']); continue
    fs = faces(open(p, encoding='utf-8').read())
    f0 = fs[0]
    c.update(cost=f0['cost'] if f0['cost'] != 'no cost' else '', types=f0['types'], pt=f0['pt'], text=f0['text'],
             cmc=cmc(f0['cost']) if f0['cost'] != 'no cost' else 0, colors=colors(f0['cost']))
    if len(fs) > 1:
        c['adventure'] = dict(name=fs[1]['name'], cost=fs[1]['cost'], types=fs[1]['types'], text=fs[1]['text'])
    if 'Land' in f0['types']:
        cl = sorted({x for x in re.findall(r'Add \{([WUBRG])\}', f0['text'])}, key='WUBRG'.index)
        c['colors'] = cl
print('no oracle for', sorted(set(missing)), file=sys.stderr)

# ---------- inventory ----------
inv = collections.Counter(); meta = {}
for r in csv.DictReader(open(A, encoding='utf-8').readlines()[1:]):
    if r['Set Code'] not in ('HOB', 'HOC'): continue
    k = (r['Set Code'], int(r['Card Number']), r['Printing'])
    inv[k] += int(r['Quantity']); meta[k] = (key(r['Card Name']), r['Rarity'])
# user corrections after the export (Nov 2026)
inv[('HOB', 207, 'Normal')] -= 1; inv[('HOB', 207, 'Foil')] += 1; meta[('HOB', 207, 'Foil')] = meta[('HOB', 207, 'Normal')]
inv = +inv
for (s, n, pr), (nm, rar) in meta.items():
    cid = f'{s}-{n}'
    if cid not in catalog:   # HOC cards
        p = idx.get(nm); f0 = faces(open(p, encoding='utf-8').read())[0] if p else {}
        catalog[cid] = dict(id=cid, set=s, num=n, name=nm, rarity=rar, treatment='normal', artist='',
                            cost=f0.get('cost', ''), types=f0.get('types', ''), pt=f0.get('pt', ''), text=f0.get('text', ''),
                            cmc=cmc(f0.get('cost', '')), colors=colors(f0.get('cost', '')))

# ---------- deck lists ----------
def parse(p):
    out = []
    for l in open(p, encoding='utf-8'):
        l = l.strip()
        m = re.match(r'(\d+)\s+(.+?)\s+\((HOB|HOC)\)\s+(\d+)', l)
        if m: out += [(m.group(2), m.group(3), int(m.group(4)))] * int(m.group(1)); continue
        m = re.match(r'(\d+)\s+(\w+)$', l)
        if m and m.group(2) in BASIC: out += [(m.group(2), None, None)] * int(m.group(1))
    return out
DECKS = [  # id, file, short, built, sleeves
    ('dwarves', 'Red-White Dwarves', 'Dwarves', True, 'Thorin'),
    ('wolves', 'Black-Green Wolves', 'Wolves', True, 'Head of the Hunt'),
    ('goblins', 'Black-Red Goblins', 'Goblins', True, 'Gandalf, Spark Starter'),
    ('humans', 'White-Blue Humans', 'Humans', True, 'Smaug'),
    ('elves', 'Green-Blue Elves', 'Elves', False, 'Gollum'),
]
def score(k):
    s, n, pr = k
    special = s == 'HOB' and 188 < n < 321          # HOB321 promo does not count as better
    return (2 if special else 0) + (2 if pr == 'Surge Foil' else 1 if pr == 'Foil' else 0)
excluded = lambda k: (meta[k][0] == 'Smaug the Magnificent' and k[1] == 229) or meta[k][0] == 'Gleaming Splendor'
pool = inv.copy()
loc = collections.defaultdict(collections.Counter)    # location -> version -> qty
plan = collections.defaultdict(collections.Counter)   # planned (unbuilt) deck contents
basics = {}
def byname(nm): return [k for k in pool if pool[k] > 0 and meta[k][0] == nm]
def take(nm, n, best):
    c = [k for k in byname(nm) if not (best and excluded(k))] or byname(nm)
    if not c: raise SystemExit(f'short {nm}')
    k = max(c, key=lambda k: (score(k), k[1] == n)) if best else min(c, key=lambda k: (score(k), k[1] != n))
    pool[k] -= 1; return k
# Humans: fancy swaps not done yet -> copies as listed, normal first
def take_listed(nm, s, n):
    for pr in ['Normal', 'Foil', 'Surge Foil']:
        k = (s, n, pr)
        if pool[k] > 0: pool[k] -= 1; return k
    return take(nm, n, False)
for did, f, short, built, _ in DECKS:
    for part in ('main', 'spares'):
        path = V + f + '.txt' if part == 'main' else V + 'spares/' + f + ' - Spares.txt'
        target = loc if built else plan
        for nm, s, n in parse(path):
            if s is None:
                fancy_basic = [k for k in byname(nm) if score(k) > 0] if (built and part == 'main') else []
                if fancy_basic:   # e.g. the special Island HOB195 replaces one basic Island
                    k = fancy_basic[0]; pool[k] -= 1; target[f'{did}:{part}'][k] += 1
                else:
                    basics.setdefault(did, collections.Counter())[nm] += 1
                continue
            if did == 'dwarves' and part == 'main' and nm == 'The Misty Mountains Cold':
                k = ('HOB', 104, 'Foil'); pool[k] -= 1
            elif did == 'dwarves' and part == 'spares' and nm == 'Dwalin, Weaponmaster':
                k = ('HOB', 311, 'Normal') if pool[('HOB', 311, 'Normal')] > 0 else take(nm, n, False); pool[k] -= (1 if k == ('HOB', 311, 'Normal') else 0)
            elif part == 'spares': k = take_listed(nm, s, n)
            else: k = take(nm, n, True)
            target[f'{did}:{part}'][k] += 1
# Elves not built: its planned cards go back to the boxes
for L, c in plan.items():
    for k, q in c.items(): pool[k] += q
# Boxes: per number one copy in box 2 (rares/mythics/specials/foils: all), rest box 3
bynum = collections.defaultdict(list)
for k, q in pool.items():
    if q > 0: bynum[k[:2]].append(k)
for (s, n), ks in bynum.items():
    rar = meta[ks[0]][1]
    if s == 'HOC' or n > 188 or rar in ('rare', 'mythic'):
        for k in ks: loc['box2'][k] += pool[k]
        continue
    foil = [k for k in ks if k[2] != 'Normal']
    for k in foil: loc['box2'][k] += pool[k]
    k = (s, n, 'Normal'); q = pool[k]
    if q > 0:
        if not foil: loc['box2'][k] += 1; q -= 1
        if q: loc['box3'][k] += q
# ---------- sanity ----------
tot = sum(sum(c.values()) for c in loc.values())
assert tot == sum(inv.values()), (tot, sum(inv.values()))
# ---------- write ----------
vid = lambda k: f'{k[0]}-{k[1]}'
copies = []
for k, q in sorted(inv.items(), key=lambda x: (x[0][0] != 'HOB', x[0][1], x[0][2])):
    copies.append(dict(card=vid(k), printing=k[2], qty=q,
                       locations={L: c[k] for L, c in loc.items() if c[k]}))
def lst(c):
    return [dict(card=vid(k), printing=k[2], qty=q) for k, q in sorted(c.items(), key=lambda x: (x[0][1], x[0][2]))]
decks = []
COL = {'dwarves': 'RW', 'wolves': 'BG', 'goblins': 'BR', 'humans': 'WU', 'elves': 'GU'}
for did, f, short, built, sleeve in DECKS:
    src = loc if built else plan
    decks.append(dict(id=did, name=f, short=short, colors=list(COL[did]), built=built, sleeves=sleeve,
                      main=lst(src[f'{did}:main']), spares=lst(src[f'{did}:spares']),
                      basics=dict(basics.get(did, {}))))
os.makedirs(OUT, exist_ok=True)
used = {c['card'] for c in copies} | {e['card'] for d in decks for e in d['main'] + d['spares']}
json.dump(sorted(catalog.values(), key=lambda c: (c['set'] != 'HOB', c['num'])), open(f'{OUT}/cards.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(copies, open(f'{OUT}/copies.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(decks, open(f'{OUT}/decks.json', 'w'), ensure_ascii=False, indent=1)
print('cards', len(catalog), 'owned versions', len(copies), 'owned cards', sum(inv.values()))
for L, c in sorted(loc.items()): print(L, sum(c.values()))
for d in decks: print(d['id'], sum(e['qty'] for e in d['main']) + sum(d['basics'].values()), sum(e['qty'] for e in d['spares']))
