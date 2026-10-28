/**
 * Génère secours-scenario.pdf : une page par étape du scénario, avec sa capture d'écran.
 * Prérequis : `npm run build && npm run preview` (ou npm run dev) ; BASE=http://localhost:5181/ npx tsx scripts/secours-pdf.ts
 */
import { chromium } from '@playwright/test'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFileSync } from 'node:fs'
import { SCENARIO } from '../src/presentation/scenario'

const BASE = process.env.BASE ?? 'http://localhost:5180/'

const VALEURS: Record<string, string> = {
  presentsAujourdhui: '[présents affichés]', encaisseAujourdhui: '[encaissé affiché]', famillesEnRetard: '[familles en retard]',
  recouvrement: '[taux]', effectif: '[effectif]', actionsJournal: '[nombre d’actions]',
}
// Les polices standard du PDF (WinAnsi) n'ont pas l'espace fine insécable ni la flèche : on les remplace.
const propre = (t: string) => t.replace(/\{(\w+)\}/g, (_, k) => VALEURS[k] ?? k).replace(/\u202f/g, '\u00a0').replace(/…/g, '...').replace(/→/g, '>')

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto(BASE)
await page.evaluate(() => sessionStorage.setItem('ghbc-ok', '1'))
await page.reload()
await page.goto(BASE + '#/connexion')
await page.getByTestId('profil-direction').dblclick()
await page.waitForTimeout(800)
await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
await page.keyboard.press('p')
await page.waitForTimeout(1200)

// les écrans qui placent le curseur dans un champ captureraient les touches : on retire le focus avant chaque touche
const touche = async (k: string) => {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press(k)
}
const captures: Buffer[] = []
for (let i = 0; i < SCENARIO.length; i++) {
  await page.waitForTimeout(1500)
  // masquer la barre de présentation sur la capture
  await touche('p')
  await page.waitForTimeout(400)
  captures.push(await page.screenshot())
  await touche('p')
  await page.waitForTimeout(300)
  if (SCENARIO[i].ensuite) await touche('ArrowRight')
  await touche('ArrowRight')
}
await navigateur.close()

const pdf = await PDFDocument.create()
const police = await pdf.embedFont(StandardFonts.Helvetica)
const gras = await pdf.embedFont(StandardFonts.HelveticaBold)
const bleu = rgb(2 / 255, 73 / 255, 162 / 255)
const W = 842, H = 595 // A4 paysage

function texte(p: ReturnType<typeof pdf.addPage>, t: string, x: number, y: number, taille: number, largeur: number, f = police, couleur = rgb(0.08, 0.13, 0.24)) {
  const mots = propre(t).split(' ')
  let ligne = ''
  for (const m of mots) {
    const essai = ligne ? ligne + ' ' + m : m
    if (f.widthOfTextAtSize(essai, taille) > largeur) {
      p.drawText(ligne, { x, y, size: taille, font: f, color: couleur })
      y -= taille * 1.35
      ligne = m
    } else ligne = essai
  }
  if (ligne) p.drawText(ligne, { x, y, size: taille, font: f, color: couleur })
  return y - taille * 1.35
}

for (let i = 0; i < SCENARIO.length; i++) {
  const e = SCENARIO[i]
  const p = pdf.addPage([W, H])
  p.drawRectangle({ x: 0, y: H - 6, width: W * 0.75, height: 6, color: bleu })
  p.drawRectangle({ x: W * 0.75, y: H - 6, width: W * 0.25, height: 6, color: rgb(2 / 255, 167 / 255, 58 / 255) })
  p.drawText(propre(`${i + 1}/${SCENARIO.length} · ${e.titre}`), { x: 32, y: H - 42, size: 18, font: gras, color: bleu })
  p.drawText(propre(`Temps cible : ${Math.floor(e.cible / 60)} min ${String(e.cible % 60).padStart(2, '0')}`), { x: W - 200, y: H - 42, size: 11, font: police })
  const img = await pdf.embedPng(captures[i])
  const largeur = W - 64
  const hauteur = (largeur * 1080) / 1920
  const haut = H - 58
  p.drawImage(img, { x: 32, y: haut - hauteur, width: largeur, height: hauteur })
  p.drawRectangle({ x: 32, y: haut - hauteur, width: largeur, height: hauteur, borderColor: rgb(0.86, 0.89, 0.93), borderWidth: 0.6 })
  let y = haut - hauteur - 20
  let y2 = y
  y = texte(p, 'À dire', 32, y, 11, 470, gras, bleu)
  texte(p, `« ${e.aDire} »`, 32, y, 10, 470)
  y2 = texte(p, 'Gestes', 530, y2, 11, 280, gras, bleu)
  for (const g of e.gestes) y2 = texte(p, `- ${g}`, 530, y2, 9.5, 280)
  if (e.ensuite) texte(p, `Puis (flèche droite) : ${e.ensuite.libelle}`, 530, y2 - 4, 9.5, 280)
  p.drawText('Espace GHBC · démonstration · données fictives', { x: 32, y: 14, size: 8.5, font: police, color: rgb(0.42, 0.46, 0.56) })
}
writeFileSync('secours-scenario.pdf', await pdf.save())
console.log('secours-scenario.pdf écrit')
