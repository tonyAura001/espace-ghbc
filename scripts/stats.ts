// Contrôle rapide des volumes générés : npx tsx scripts/stats.ts
import { genererDonnees, ID } from '../src/data/generer'
import { JOUR_DEMO } from '../src/lib/temps'

const t0 = Date.now()
const d = genererDonnees()
console.log('génération', Date.now() - t0, 'ms', 'jour', JOUR_DEMO)
console.log('élèves', d.eleves.length, 'familles', d.familles.length, 'personnel', d.personnel.length)
const paye = new Map<string, number>()
for (const p of d.paiements) if (p.statut !== 'annule') for (const l of p.lignes) paye.set(l.echeanceId, (paye.get(l.echeanceId) ?? 0) + l.montant)
const today = JOUR_DEMO
let du = 0
let enc = 0
const retardFam = new Set<string>()
for (const e of d.echeances)
  if (e.echeance <= today) {
    du += e.montant
    enc += Math.min(e.montant, paye.get(e.id) ?? 0)
    const days = (Date.parse(today) - Date.parse(e.echeance)) / 864e5
    if (days > 15 && (paye.get(e.id) ?? 0) === 0) retardFam.add(e.familleId)
  }
console.log('recouvrement', ((enc / du) * 100).toFixed(1), '%', 'familles en retard', retardFam.size, ((retardFam.size / d.familles.length) * 100).toFixed(1) + '%')
console.log('paiements', d.paiements.length, 'aujourdhui', d.paiements.filter((p) => p.date.startsWith(today)).length)
console.log('créneaux', d.creneaux.length, 'évaluations', d.evaluations.length, 'notes', Object.keys(d.notes).length, 'absences', d.absences.length)
console.log('fil rouge', d.eleves.filter((e) => e.familleId === ID.famille).map((e) => `${e.prenom} ${e.matricule} ${e.classeId}`))
console.log('retard Fatoumata', d.echeances.filter((e) => e.eleveId === ID.fatoumata && e.echeance <= today && !paye.get(e.id)).map((e) => e.libelle))
const tailles: Record<string, number> = {}
for (const e of d.eleves) tailles[e.classeId] = (tailles[e.classeId] ?? 0) + 1
console.log(JSON.stringify(tailles))
console.log('journal crèche', d.journal.length, 'scans', d.scans.length, 'audit', d.audit.length)
