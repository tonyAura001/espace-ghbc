// Génère scenario.md (aide-mémoire papier) depuis src/presentation/scenario.ts : npx tsx scripts/scenario-md.ts
import { writeFileSync } from 'node:fs'
import { SCENARIO, DUREE_TOTALE } from '../src/presentation/scenario'
import { PROFILS } from '../src/store/profils'

const VALEURS: Record<string, string> = {
  presentsAujourdhui: '[nombre de présents affiché]',
  encaisseAujourdhui: '[montant encaissé affiché]',
  famillesEnRetard: '[familles en retard]',
  recouvrement: '[taux de recouvrement]',
  effectif: '[effectif total]',
  actionsJournal: '[nombre d’actions affiché]',
}
const remplir = (t: string) => t.replace(/\{(\w+)\}/g, (_, k) => VALEURS[k] ?? k)
const duree = (s: number) => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`
const libelleProfil = (id: string) => PROFILS.find((p) => p.id === id)?.libelle ?? id

let md = `# Scénario de démonstration : aide-mémoire\n\nDurée visée : environ ${Math.round(DUREE_TOTALE / 60)} minutes (${duree(DUREE_TOTALE)}).\n\n`
md += `**Avant de commencer** : ouvrir la démo, entrer le mot de passe, se connecter en Direction, appuyer sur **P**. `
md += `Entre deux présentations : **R** remet tout à zéro.\n\n`
md += `Touches : **→** ou **Espace** avancer · **←** reculer · **V** vue double · **T** minuteur · **D** badge Démo · **L** flux simulé.\n\n---\n\n`
let cumul = 0
SCENARIO.forEach((e, i) => {
  cumul += e.cible
  md += `## ${i + 1}. ${e.titre} (${duree(e.cible)}, cumul ${duree(cumul)})\n\n`
  md += `**Profil** : ${libelleProfil(e.profil)}${e.vueDouble ? ' · vue double avec le téléphone de la maman' : ''}`
  if (e.ensuite) md += `, puis (touche →) ${e.ensuite.libelle}`
  md += `\n\n**À dire** : « ${remplir(e.aDire)} »\n\n**Gestes** :\n\n`
  for (const g of e.gestes) md += `- ${remplir(g)}\n`
  md += `\n---\n\n`
})
md += `**En cas de panne** : ouvrir \`ghbc-demo.html\` (fonctionne sans internet) ou dérouler \`secours-scenario.pdf\`.\n`
writeFileSync('scenario.md', md)
console.log('scenario.md écrit')
