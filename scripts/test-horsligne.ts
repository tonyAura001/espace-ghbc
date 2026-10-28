// Vérifie que ghbc-demo.html s'ouvre en fichier local, sans réseau : npx tsx scripts/test-horsligne.ts
import { chromium } from '@playwright/test'
import { resolve } from 'node:path'
const nav = await chromium.launch()
const ctx = await nav.newContext({ offline: true, viewport: { width: 1536, height: 864 } })
const page = await ctx.newPage()
const erreurs: string[] = []
page.on('pageerror', (e) => erreurs.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()) })
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) erreurs.push('requête réseau : ' + r.url()) })
await page.goto('file://' + resolve('ghbc-demo.html'))
await page.locator('input[type="password"]').fill('ghbc2026')
await page.getByRole('button', { name: 'Entrer' }).click()
await page.getByTestId('profil-direction').dblclick()
await page.waitForTimeout(1500)
const logo = await page.evaluate(() => { const i = document.querySelector('nav img') as HTMLImageElement; return i ? i.naturalWidth : 0 })
const presents = await page.getByTestId('presents').innerText()
console.log('logo', logo, 'présents', presents.replace(/\s+/g, ' '), 'police', await page.evaluate(() => document.fonts.check('16px Lexend')))
await page.screenshot({ path: process.env.OUT ?? 'horsligne.png' })
console.log(erreurs.length ? erreurs.join('\n') : 'aucune erreur')
await nav.close()
