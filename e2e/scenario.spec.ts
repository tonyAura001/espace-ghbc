/**
 * Joue tout le scénario de démonstration au clavier (P, →, actions de chaque étape), deux fois de suite,
 * vérifie que R remet tout à zéro, et qu'aucune erreur n'apparaît en console.
 */
import { test, expect, type Page } from '@playwright/test'

async function sansFocus(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
}
async function suivant(page: Page, route: RegExp) {
  await sansFocus(page)
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(route)
  await page.waitForTimeout(900)
}
async function lireEncaisse(page: Page) {
  await page.waitForTimeout(1600) // fin du comptage animé
  return (await page.getByTestId('encaisse').innerText()).replace(/\D/g, '')
}

test('le scénario se joue deux fois de suite, avec R entre les deux, sans erreur', async ({ page }) => {
  const erreurs: string[] = []
  page.on('pageerror', (e) => erreurs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') erreurs.push(m.text())
  })

  await page.goto('./')
  await page.locator('input[type="password"]').fill('ghbc2026')
  await page.getByRole('button', { name: 'Entrer' }).click()
  await page.getByTestId('profil-direction').click()
  await page.getByRole('button', { name: 'Recevoir le code' }).click()
  await page.getByTestId('code-auto').click()
  await expect(page).toHaveURL(/#\/accueil/)
  await sansFocus(page)
  await page.keyboard.press('l') // flux simulé coupé : les chiffres ne bougent que par nos actions
  await page.keyboard.press('p')
  await expect(page.getByTestId('barre-presentation')).toBeVisible()

  let encaisseInitial = ''
  for (let tour = 0; tour < 2; tour++) {
    // 1. Accueil
    await expect(page).toHaveURL(/#\/accueil/)
    await expect(page.getByTestId('presents')).toBeVisible()
    const encaisse = await lireEncaisse(page)
    if (tour === 0) encaisseInitial = encaisse
    else expect(encaisse, 'R remet l’encaissé du jour à sa valeur de départ').toBe(encaisseInitial)

    // 2. Inscription
    await suivant(page, /#\/inscription/)
    await page.getByTestId('remplir-demo').click()
    for (let i = 0; i < 3; i++) await page.getByTestId('etape-suivante').click()
    await page.getByTestId('confirmer-inscription').click()
    await expect(page.getByTestId('matricule')).toBeVisible({ timeout: 5000 })

    // 3. Portail : sortie autorisée puis refusée
    await suivant(page, /#\/portail/)
    await page.getByTestId('scan-oncle').click()
    await expect(page.getByTestId('resultat-autorise')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('scan-inconnu').click()
    await page.getByTestId('confirmer-refus').click()
    await expect(page.getByTestId('alerte-sortie')).toBeVisible({ timeout: 5000 })

    // 4. Journal de la crèche, vue double
    await suivant(page, /#\/creche\/journal/)
    await page.getByTestId('tuile-E-MARIAMA').click()
    await page.getByTestId('action-repas').click()
    await page.getByTestId('detail-0').click()
    await expect(page.getByTestId('app-parent')).toBeVisible()

    // 5. Notes et bulletin
    await suivant(page, /#\/primaire\/notes/)
    const cellule = page.getByTestId('cellule-EV-DEMO-CALC-E-IBRAHIMA')
    await cellule.click()
    await page.keyboard.type('9')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)

    // 6. Appel puis vie scolaire
    await suivant(page, /#\/college\/appel/)
    await page.locator('[data-testid^="eleve-appel-"]').nth(1).click()
    await page.getByTestId('valider-appel').click()
    await page.waitForTimeout(1200)
    await suivant(page, /#\/vie-scolaire/)

    // 7. Le parent paie, en vue double
    await suivant(page, /#\/accueil/)
    const avant = Number(await lireEncaisse(page))
    await page.getByTestId('payer-echeance').click()
    await page.getByTestId('mode-orange').click()
    await page.getByTestId('continuer-paiement').click()
    await page.getByTestId('code-secret').fill('1234')
    await page.getByTestId('confirmer-paiement').click()
    await expect(page.getByTestId('paiement-reussi')).toBeVisible({ timeout: 8000 })
    await page.getByTestId('voir-recu').click()
    await expect(page.getByTestId('recu-parent')).toBeVisible()
    const apres = Number(await lireEncaisse(page))
    expect(apres, 'le paiement du parent fait bouger l’accueil').toBeGreaterThan(avant)

    // 8. Caisse : encaisser, reçu, demande d'annulation, puis validation par la Direction
    await suivant(page, /#\/caisse/)
    await page.getByPlaceholder(/Nom de famille/).fill('Diallo')
    await page.locator('[data-testid^="famille-"]').first().click()
    await page.getByTestId('mode-especes').click()
    await page.getByTestId('encaisser').click()
    await expect(page).toHaveURL(/#\/caisse\/recu\//, { timeout: 5000 })
    await page.keyboard.press('Escape')
    await page.getByTestId('demander-annulation').click()
    await page.locator('textarea').last().fill('Erreur de famille au guichet')
    await page.getByTestId('envoyer-annulation').click()
    await page.waitForTimeout(900)
    await suivant(page, /#\/validations/)
    await page.getByTestId('approuver').first().click()
    await page.waitForTimeout(900)

    // 9. Impayés et relance WhatsApp
    await suivant(page, /#\/impayes/)
    await page.locator('tbody input[type="checkbox"]').first().check()
    await page.getByTestId('relance-whatsapp').click()
    await expect(page.getByTestId('apercu-whatsapp')).toBeVisible()
    await page.getByTestId('envoyer-relance').click()
    await page.waitForTimeout(900)

    // 10. Traçabilité
    await suivant(page, /#\/audit/)
    await expect(page.getByTestId('compteur-session')).toBeVisible()
    await expect(page.getByTestId('ligne-audit').first()).toBeVisible()

    // R : tout remettre à zéro, la barre revient à l'étape 1
    await sansFocus(page)
    await page.keyboard.press('r')
    await expect(page).toHaveURL(/#\/accueil/)
    await page.waitForTimeout(800)
  }

  expect(erreurs, erreurs.join('\n')).toEqual([])
})
