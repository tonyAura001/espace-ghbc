/**
 * Captures pleine page (le défilement interne de la coquille est déplié) :
 * OUT=dossier npx tsx scripts/captures-longues.ts profil:/route,... --tailles=390x844
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const BASE = process.env.BASE ?? 'http://localhost:5180/'
const args = process.argv.slice(2)
const tailles = (args.find((a) => a.startsWith('--tailles='))?.split('=')[1] ?? '390x844').split(',').map((t) => t.split('x').map(Number) as [number, number])
const routes = (args.find((a) => !a.startsWith('--')) ?? 'direction:/accueil').split(',')
const dossier = process.env.OUT ?? 'captures'
mkdirSync(dossier, { recursive: true })
const nav = await chromium.launch()
for (const [l, h] of tailles) {
  const page = await nav.newPage({ viewport: { width: l, height: h } })
  let courant = ''
  for (const r of routes) {
    const [profil, chemin] = r.split(':')
    if (profil !== courant) {
      await page.goto(BASE)
      await page.evaluate(() => sessionStorage.setItem('ghbc-ok', '1'))
      await page.reload()
      await page.goto(BASE + '#/connexion')
      await page.getByTestId(`profil-${profil}`).dblclick()
      await page.waitForTimeout(500)
      courant = profil
    }
    await page.goto(BASE + '#' + chemin)
    await page.waitForTimeout(1200)
    await page.addStyleTag({ content: '#contenu{overflow:visible!important}.h-dvh{height:auto!important;overflow:visible!important}' })
    await page.waitForTimeout(200)
    const nom = `${dossier}/${profil}${chemin.replace(/[/?=&]/g, '_')}-${l}x${h}.png`
    await page.screenshot({ path: nom, fullPage: true })
    console.log(nom)
  }
  await page.close()
}
await nav.close()
