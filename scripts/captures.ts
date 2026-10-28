/**
 * Captures d'écran de contrôle : npx tsx scripts/captures.ts [route,...] [--tailles=1920x1080,1280x720]
 * Le serveur doit tourner (npm run dev). Les images vont dans captures/.
 */
import { chromium, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5180/'
const args = process.argv.slice(2)
const tailles = (args.find((a) => a.startsWith('--tailles='))?.split('=')[1] ?? '1920x1080,1536x864,1366x768,1280x720').split(',').map((t) => t.split('x').map(Number) as [number, number])
const routes = (args.find((a) => !a.startsWith('--')) ?? 'direction:/accueil').split(',')
const dossier = process.env.OUT ?? 'captures'
mkdirSync(dossier, { recursive: true })

async function connecter(page: Page, profil: string) {
  await page.goto(BASE)
  await page.evaluate(() => sessionStorage.setItem('ghbc-ok', '1'))
  await page.goto(BASE + '#/connexion')
  await page.reload()
  await page.getByTestId(`profil-${profil}`).dblclick()
  await page.waitForTimeout(400)
}

const navigateur = await chromium.launch()
const erreurs: string[] = []
for (const [l, h] of tailles) {
  const ctx = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(`${l}x${h} ${m.text()}`) })
  page.on('pageerror', (e) => erreurs.push(`${l}x${h} ${e.message}`))
  let profilCourant = ''
  for (const r of routes) {
    const [profil, chemin] = r.split(':')
    if (profil !== profilCourant) {
      await connecter(page, profil)
      profilCourant = profil
    }
    await page.goto(BASE + '#' + chemin)
    await page.waitForTimeout(1100)
    const nom = `${dossier}/${profil}${chemin.replace(/[/?=&]/g, '_')}-${l}x${h}.png`
    await page.screenshot({ path: nom, fullPage: process.env.FULL === '1' })
    console.log(nom)
  }
  await ctx.close()
}
await navigateur.close()
if (erreurs.length) {
  console.log('ERREURS CONSOLE :')
  for (const e of [...new Set(erreurs)]) console.log('  ' + e)
}
