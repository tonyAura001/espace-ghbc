// Détecte les débordements horizontaux sur chaque écran à une largeur donnée : LARGEUR=390 npx tsx scripts/debordements.ts
import { chromium } from '@playwright/test'
import { ROUTES } from './routes-liste'
const BASE = process.env.BASE ?? 'http://localhost:5180/'
const L = Number(process.env.LARGEUR ?? 390)
const nav = await chromium.launch()
const page = await nav.newPage({ viewport: { width: L, height: 844 } })
await page.goto(BASE)
await page.evaluate(() => sessionStorage.setItem('ghbc-ok', '1'))
await page.reload()
await page.goto(BASE + '#/connexion')
await page.getByTestId('profil-direction').dblclick()
await page.waitForTimeout(500)
for (const r of ROUTES) {
  await page.goto(BASE + '#' + r)
  await page.waitForTimeout(900)
  const res = await page.evaluate((L) => {
    const doc = document.scrollingElement!
    const main = document.getElementById('contenu')
    const largeurs = { page: doc.scrollWidth, contenu: main ? main.scrollWidth : 0 }
    // éléments qui dépassent du bord droit sans être dans un conteneur défilant
    const fautifs: string[] = []
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.right <= L + 1) return
      let p = el.parentElement
      while (p) {
        const st = getComputedStyle(p)
        if (['auto', 'scroll', 'hidden', 'clip'].includes(st.overflowX)) break
        p = p.parentElement
      }
      if (!p || p === document.body || p === document.documentElement) fautifs.push(`${el.tagName.toLowerCase()}.${(el.className?.toString() ?? '').slice(0, 50)} → ${Math.round(r.right)}`)
    })
    return { largeurs, fautifs: fautifs.slice(0, 3) }
  }, L)
  const ok = res.largeurs.page <= L + 1 && res.largeurs.contenu <= L + 1 && !res.fautifs.length
  console.log(`${ok ? 'OK ' : 'KO '} ${r}  page=${res.largeurs.page} contenu=${res.largeurs.contenu} ${res.fautifs.join(' | ')}`)
}
await nav.close()
