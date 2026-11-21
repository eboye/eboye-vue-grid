/** Deterministic data so screenshots and browser tests are stable. */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const firstNames = ['Ana', 'Marko', 'Jelena', 'Nikola', 'Milica', 'Stefan', 'Ivana', 'Luka', 'Sara', 'Petar']
const lastNames = ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Pavlović']
const cities = ['Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Zrenjanin']
const statuses = ['Won', 'Lost', 'Open', 'Void'] as const

export interface Bet {
  id: number
  player: { name: string; city: string }
  status: (typeof statuses)[number]
  stake: number
  payout: number
  change: number
  placedAt: string
  verified: boolean
  rating: number
  site: string
  meta: Record<string, unknown>
}

export function makeBets(count: number, seed = 7): Bet[] {
  const r = rng(seed)
  const pick = <T>(list: readonly T[]) => list[Math.floor(r() * list.length)]!
  return Array.from({ length: count }, (_, i) => {
    const stake = Math.round(r() * 50000) / 100
    const status = pick(statuses)
    return {
      id: i + 1,
      player: { name: `${pick(firstNames)} ${pick(lastNames)}`, city: pick(cities) },
      status,
      stake,
      payout: status === 'Won' ? Math.round(stake * (1 + r() * 4) * 100) / 100 : 0,
      change: Math.round((r() - 0.5) * 200) / 10,
      placedAt: new Date(Date.UTC(2026, 0, 1) + Math.floor(r() * 300 * 86400000)).toISOString(),
      verified: r() > 0.3,
      rating: Math.floor(r() * 6),
      site: `https://example.com/bets/${i + 1}`,
      meta: { channel: pick(['web', 'retail', 'mobile']), odds: [Math.round(r() * 300) / 100], tags: { vip: r() > 0.8 } },
    }
  })
}

export interface Market {
  id: string
  name: string
  selections: number
  turnover: number
  margin: number
  status: 'Active' | 'Suspended' | 'Closed'
  children?: Market[]
}

export function makeMarkets(): Market[] {
  const r = rng(42)
  const status = (): Market['status'] => (['Active', 'Suspended', 'Closed'] as const)[Math.floor(r() * 3)]!
  const market = (id: string, name: string, children?: Market[]): Market => ({
    id,
    name,
    selections: Math.floor(r() * 30) + 2,
    turnover: Math.round(r() * 1e6) / 100,
    margin: Math.round(r() * 120) / 10,
    status: status(),
    children,
  })
  return [
    market('fb', 'Football', [
      market('fb-1x2', 'Match result', [market('fb-1x2-h', 'Home'), market('fb-1x2-d', 'Draw'), market('fb-1x2-a', 'Away')]),
      market('fb-ou', 'Over / under 2.5'),
      market('fb-btts', 'Both teams to score'),
    ]),
    market('bb', 'Basketball', [market('bb-ml', 'Money line'), market('bb-hc', 'Handicap')]),
    market('tn', 'Tennis'),
    market('hb', 'Handball', [market('hb-1x2', 'Match result')]),
  ]
}

export interface Folder {
  id: string
  name: string
  size: number
  modified: string
  hasChildren: boolean
}

/** Simulated lazy API: folder "Broken" fails on the first request. */
let brokenAttempts = 0
export async function loadFolder(parent: Folder): Promise<Folder[]> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  if (parent.name === 'Broken' && brokenAttempts++ === 0) throw new Error('Network error')
  return Array.from({ length: 3 }, (_, i) => ({
    id: `${parent.id}/${i + 1}`,
    name: `${parent.name} › item ${i + 1}`,
    size: (i + 1) * 1024 * 37,
    modified: new Date(Date.UTC(2026, 5, i + 1)).toISOString(),
    hasChildren: i === 0 && parent.id.split('/').length < 3,
  }))
}

export const rootFolders: Folder[] = [
  { id: 'docs', name: 'Documents', size: 0, modified: '2026-10-01T09:00:00Z', hasChildren: true },
  { id: 'pics', name: 'Pictures', size: 0, modified: '2026-09-12T09:00:00Z', hasChildren: true },
  { id: 'broken', name: 'Broken', size: 0, modified: '2026-08-02T09:00:00Z', hasChildren: true },
  { id: 'readme', name: 'README.md', size: 2048, modified: '2026-07-20T09:00:00Z', hasChildren: false },
]
