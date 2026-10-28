/**
 * Contrôle des textes visibles sur tous les écrans : typographie française, anglais, remplissage.
 * Serveur lancé ; npx tsx scripts/controle-texte.ts
 */
import { chromium } from '@playwright/test'
import { ROUTES } from './routes-liste'

const BASE = process.env.BASE ?? 'http://localhost:5180/'
const REGLES: [string, RegExp][] = [
  ['espace simple avant : ; ! ?', /[^\s  ][ ][:;!?](?=\s|$)/g],
  ['nombre avec espace simple', /\d \d{3}\b/g],
  ['mot anglais', /\b(Loading|Submit|Cancel|Save|Delete|Edit|Search|Settings|Dashboard|Login|Logout|Error|Undefined|undefined|NaN|null|TODO|lorem|Lorem|Next|Previous|Back|Close)\b/g],
  ['apostrophe droite', /\w'\w/g],
  ['flèche dans le texte', /→/g],
]

const nav = await chromium.launch()
const page = await nav.newPage({ viewport: { width: 1536, height: 864 } })
await page.goto(BASE)
await page.evaluate(() => sessionStorage.setItem('ghbc-ok', '1'))
await page.reload()
await page.goto(BASE + '#/connexion')
await page.getByTestId('profil-direction').dblclick()
await page.waitForTimeout(500)
const vus = new Map<string, Set<string>>()
for (const r of ROUTES) {
  await page.goto(BASE + '#' + r)
  await page.waitForTimeout(900)
  const texte = await page.evaluate(() => document.body.innerText)
  for (const [nom, re] of REGLES) {
    for (const m of texte.matchAll(re)) {
      const i = m.index ?? 0
      const extrait = texte.slice(Math.max(0, i - 25), i + 20).replace(/\n/g, ' ⏎ ')
      const cle = `${nom} · ${extrait}`
      if (!vus.has(cle)) vus.set(cle, new Set())
      vus.get(cle)!.add(r)
    }
  }
}
await nav.close()
for (const [cle, routes] of vus) console.log(`${cle}   [${[...routes].slice(0, 3).join(', ')}]`)
console.log(`${vus.size} remarques`)
