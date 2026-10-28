// Sonde : affiche les erreurs de la page au chargement (npx tsx scripts/sonde.ts)
import { chromium } from '@playwright/test'
const b = await chromium.launch(); const p = await b.newPage()
const errs: string[] = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()) })
await p.goto('http://localhost:5180/'); await p.evaluate(() => sessionStorage.setItem('ghbc-ok','1')); await p.reload(); await p.waitForTimeout(2500)
console.log((await p.content()).slice(0, 300)); console.log(errs.slice(0,5).join('\n'))
await b.close()
