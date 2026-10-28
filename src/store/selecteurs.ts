/**
 * Sélecteurs : TOUS les chiffres affichés sont calculés ici à partir du store.
 * Aucun composant n'écrit de chiffre en dur. Les calculs coûteux sont mémorisés
 * sur l'identité des tableaux du store (ils changent à chaque action).
 */
import type { Donnees } from '../data/generer'
import { ID } from '../data/generer'
import type * as T from '../data/types'
import { CYCLES, MATIERES, MATIERES_COLLEGE, MATIERES_PRIMAIRE, DOMAINES_PRIMAIRE, MODES_MOBILE } from '../data/referentiel'
import { JOUR_DEMO, ecartJours, hhmmEnMinutes, minutesDemo, joursOuvres, DEBUT_ANNEE, ajouterJours } from '../lib/temps'
import { CONFIG } from '../config'

type S = Donnees

/* ---------------------------------------------------------------- mémo */
function memo<A extends object, R>(fn: (a: A) => R): (a: A) => R {
  const cache = new WeakMap<A, R>()
  return (a: A) => {
    if (cache.has(a)) return cache.get(a)!
    const r = fn(a)
    cache.set(a, r)
    return r
  }
}
function memo2<A extends object, B extends object, R>(fn: (a: A, b: B) => R): (a: A, b: B) => R {
  const cache = new WeakMap<A, WeakMap<B, R>>()
  return (a: A, b: B) => {
    let m = cache.get(a)
    if (!m) cache.set(a, (m = new WeakMap()))
    if (m.has(b)) return m.get(b)!
    const r = fn(a, b)
    m.set(b, r)
    return r
  }
}

/* -------------------------------------------------------------- index */
export const indexClasses = memo((classes: T.Classe[]) => Object.fromEntries(classes.map((c) => [c.id, c])) as Record<string, T.Classe>)
export const indexEleves = memo((eleves: T.Eleve[]) => Object.fromEntries(eleves.map((e) => [e.id, e])) as Record<string, T.Eleve>)
export const indexFamilles = memo((f: T.Famille[]) => Object.fromEntries(f.map((x) => [x.id, x])) as Record<string, T.Famille>)
export const indexPersonnel = memo((p: T.Personnel[]) => Object.fromEntries(p.map((x) => [x.id, x])) as Record<string, T.Personnel>)
export const indexEcheances = memo((e: T.Echeance[]) => Object.fromEntries(e.map((x) => [x.id, x])) as Record<string, T.Echeance>)

export const elevesActifs = memo((eleves: T.Eleve[]) => eleves.filter((e) => e.statut === 'actif'))

export const elevesParClasse = memo((eleves: T.Eleve[]) => {
  const res: Record<string, T.Eleve[]> = {}
  for (const e of eleves) if (e.statut === 'actif') (res[e.classeId] ??= []).push(e)
  for (const l of Object.values(res)) l.sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'))
  return res
})

export const enfantsParFamille = memo((eleves: T.Eleve[]) => {
  const res: Record<string, T.Eleve[]> = {}
  for (const e of eleves) if (e.statut === 'actif') (res[e.familleId] ??= []).push(e)
  for (const l of Object.values(res)) l.sort((a, b) => a.naissance.localeCompare(b.naissance))
  return res
})

export const cycleDeEleve = (s: S, eleveId: string): T.Cycle => indexClasses(s.classes)[indexEleves(s.eleves)[eleveId]?.classeId]?.cycle ?? 'primaire'

export function nomPersonnel(s: S, id: string | null | undefined): string {
  if (!id) return '—'
  if (id === ID.direction) return CONFIG.NOM_DIRECTION || 'La Direction'
  if (id === 'PARENT-FIL') {
    const f = indexFamilles(s.familles)[ID.famille]
    return f.mere ? `${f.mere.prenom} ${f.mere.nom}` : 'Parent'
  }
  if (id === 'SYS-MOBILE') return 'Paiement mobile'
  if (id === 'SYS') return 'Système'
  const p = indexPersonnel(s.personnel)[id]
  if (p) return `${p.prenom} ${p.nom}`
  const e = indexEleves(s.eleves)[id]
  if (e) return `${e.prenom} ${e.nom}`
  return 'Système'
}

export const nomEleve = (e: T.Eleve | undefined) => (e ? `${e.prenom} ${e.nom}` : '—')

/* ------------------------------------------------------------ Effectifs */
export function effectifsParCycle(s: S): Record<T.Cycle | 'total', number> {
  return effectifsMemo(s.eleves, s.classes)
}
const effectifsMemo = memo2((eleves: T.Eleve[], classes: T.Classe[]) => {
  const ic = indexClasses(classes)
  const res = { total: 0, creche: 0, maternelle: 0, primaire: 0, college: 0 } as Record<T.Cycle | 'total', number>
  for (const e of eleves) {
    if (e.statut !== 'actif') continue
    res[ic[e.classeId].cycle]++
    res.total++
  }
  return res
})

/* ------------------------------------------------------------ Finance */
export const paiementsComptes = (p: T.Paiement) => p.statut !== 'annule'

/** Montant payé par échéance (reçus annulés exclus). */
export const payeParEcheance = memo((paiements: T.Paiement[]) => {
  const m = new Map<string, number>()
  for (const p of paiements) if (paiementsComptes(p)) for (const l of p.lignes) m.set(l.echeanceId, (m.get(l.echeanceId) ?? 0) + l.montant)
  return m
})

export type StatutEcheance = 'payee' | 'partielle' | 'a_venir' | 'due' | 'en_retard'
export const LIBELLE_STATUT_ECHEANCE: Record<StatutEcheance, string> = {
  payee: 'Payée',
  partielle: 'Partielle',
  a_venir: 'À venir',
  due: 'Due',
  en_retard: 'En retard',
}

export function statutEcheance(e: T.Echeance, paye: number, grace: number, jour = JOUR_DEMO): StatutEcheance {
  if (paye >= e.montant) return 'payee'
  if (paye > 0) return 'partielle'
  if (e.echeance > jour) return 'a_venir'
  if (ecartJours(jour, e.echeance) <= grace) return 'due'
  return 'en_retard'
}

export interface LigneEcheance extends T.Echeance {
  paye: number
  reste: number
  statut: StatutEcheance
}

export const echeancesDetail = memo2((echeances: T.Echeance[], paiements: T.Paiement[]) => {
  const pm = payeParEcheance(paiements)
  return echeances.map<LigneEcheance>((e) => {
    const paye = pm.get(e.id) ?? 0
    return { ...e, paye, reste: Math.max(0, e.montant - paye), statut: statutEcheance(e, paye, 15) }
  })
})

export const echeancesParFamille = memo2((echeances: T.Echeance[], paiements: T.Paiement[]) => {
  const res: Record<string, LigneEcheance[]> = {}
  for (const e of echeancesDetail(echeances, paiements)) (res[e.familleId] ??= []).push(e)
  for (const l of Object.values(res)) l.sort((a, b) => a.echeance.localeCompare(b.echeance) || a.eleveId.localeCompare(b.eleveId))
  return res
})

export interface SituationFamille {
  familleId: string
  du: number // échu à ce jour
  paye: number // payé sur l'échu
  resteEchu: number
  enRetard: number // montant des échéances en retard (non payées après le délai de grâce)
  totalAnnee: number
  payeAnnee: number
  resteAnnee: number
  nbEnRetard: number
  plusAncienRetard: string | null
  statut: 'a_jour' | 'partiel' | 'en_retard'
}

export const situationsFamilles = memo2((echeances: T.Echeance[], paiements: T.Paiement[]) => {
  const res: Record<string, SituationFamille> = {}
  for (const [fid, lignes] of Object.entries(echeancesParFamille(echeances, paiements))) {
    let du = 0, paye = 0, enRetard = 0, totalAnnee = 0, payeAnnee = 0, nbEnRetard = 0
    let plusAncien: string | null = null
    let partiel = false
    for (const l of lignes) {
      totalAnnee += l.montant
      payeAnnee += Math.min(l.paye, l.montant)
      if (l.echeance <= JOUR_DEMO) {
        du += l.montant
        paye += Math.min(l.paye, l.montant)
        if (l.statut === 'partielle') partiel = true
      }
      if (l.statut === 'en_retard') {
        enRetard += l.reste
        nbEnRetard++
        if (!plusAncien || l.echeance < plusAncien) plusAncien = l.echeance
      }
    }
    res[fid] = {
      familleId: fid, du, paye, resteEchu: du - paye, enRetard, totalAnnee, payeAnnee, resteAnnee: totalAnnee - payeAnnee, nbEnRetard,
      plusAncienRetard: plusAncien, statut: nbEnRetard ? 'en_retard' : partiel || du - paye > 0 ? 'partiel' : 'a_jour',
    }
  }
  return res
})

export const situationFamille = (s: S, familleId: string) => situationsFamilles(s.echeances, s.paiements)[familleId]

/** Recouvrement = encaissé sur l'échu ÷ échu, global, par cycle et par classe. */
export function recouvrementDetail(s: S) {
  return recouvrementMemo(s.echeances, s.paiements, s.eleves, s.classes)
}
const recouvrementCache = new WeakMap<object, unknown>()
function recouvrementMemo(echeances: T.Echeance[], paiements: T.Paiement[], eleves: T.Eleve[], classes: T.Classe[]) {
  const key = paiements
  const hit = recouvrementCache.get(key) as { e: unknown; el: unknown; r: ReturnType<typeof calc> } | undefined
  if (hit && hit.e === echeances && hit.el === eleves) return hit.r
  const r = calc()
  recouvrementCache.set(key, { e: echeances, el: eleves, r })
  return r
  function calc() {
    const ie = indexEleves(eleves)
    const ic = indexClasses(classes)
    const parClasse: Record<string, { du: number; paye: number; taux: number }> = {}
    const parCycle: Record<string, { du: number; paye: number; taux: number }> = {}
    let du = 0, paye = 0
    for (const l of echeancesDetail(echeances, paiements)) {
      if (l.echeance > JOUR_DEMO) continue
      const el = ie[l.eleveId]
      if (!el) continue
      const c = ic[el.classeId]
      const p = Math.min(l.paye, l.montant)
      du += l.montant
      paye += p
      const pc = (parClasse[c.id] ??= { du: 0, paye: 0, taux: 0 })
      pc.du += l.montant
      pc.paye += p
      const py = (parCycle[c.cycle] ??= { du: 0, paye: 0, taux: 0 })
      py.du += l.montant
      py.paye += p
    }
    for (const v of [...Object.values(parClasse), ...Object.values(parCycle)]) v.taux = v.du ? v.paye / v.du : 1
    return { du, paye, reste: du - paye, taux: du ? paye / du : 1, parClasse, parCycle }
  }
}

export const paiementsDuJour = (s: S, jour = JOUR_DEMO) => paiementsDuJourMemo(s.paiements, jour)
const pjCache = new WeakMap<T.Paiement[], Map<string, T.Paiement[]>>()
function paiementsDuJourMemo(paiements: T.Paiement[], jour: string) {
  let m = pjCache.get(paiements)
  if (!m) pjCache.set(paiements, (m = new Map()))
  if (!m.has(jour)) m.set(jour, paiements.filter((p) => p.date.startsWith(jour)))
  return m.get(jour)!
}

/** Encaissé du jour = somme des reçus valides du jour. */
export function encaisseJour(s: S, jour = JOUR_DEMO) {
  return paiementsDuJour(s, jour).filter(paiementsComptes).reduce((a, p) => a + p.montant, 0)
}

export function encaisseParMode(s: S, jour = JOUR_DEMO) {
  const res: Record<string, number> = {}
  for (const p of paiementsDuJour(s, jour).filter(paiementsComptes)) res[p.mode] = (res[p.mode] ?? 0) + p.montant
  return res
}

export const encaissementsParJour = memo((paiements: T.Paiement[]) => {
  const res: Record<string, number> = {}
  for (const p of paiements) if (paiementsComptes(p)) res[p.date.slice(0, 10)] = (res[p.date.slice(0, 10)] ?? 0) + p.montant
  return res
})

export const familleEnRetard = (s: S) => Object.values(situationsFamilles(s.echeances, s.paiements)).filter((x) => x.statut === 'en_retard')

export function ventilationEncaisse(s: S, p: T.Paiement) {
  const ie = indexEcheances(s.echeances)
  return p.lignes.map((l) => ({ ...l, echeance: ie[l.echeanceId] }))
}

export function especesAttendues(s: S, jour = JOUR_DEMO) {
  return paiementsDuJour(s, jour).filter((p) => paiementsComptes(p) && p.mode === 'especes').reduce((a, p) => a + p.montant, 0)
}

export function totalDepenses(s: S) {
  return s.depenses.reduce((a, d) => a + d.montant, 0)
}

export const estMobile = (m: T.ModePaiement) => MODES_MOBILE.includes(m)

/* ------------------------------------------------------------ Présences */
const presentsCache = new WeakMap<object, unknown>()
/** Présents = arrivés et pas encore repartis. */
export function presentsParCycle(s: S): { presents: Record<T.Cycle | 'total', number>; arrives: Record<T.Cycle | 'total', number>; effectif: Record<T.Cycle | 'total', number> } {
  const hit = presentsCache.get(s.presences) as { el: unknown; r: ReturnType<typeof presentsParCycle> } | undefined
  if (hit && hit.el === s.eleves) return hit.r
  const ic = indexClasses(s.classes)
  const z = () => ({ total: 0, creche: 0, maternelle: 0, primaire: 0, college: 0 }) as Record<T.Cycle | 'total', number>
  const presents = z(), arrives = z()
  for (const e of s.eleves) {
    if (e.statut !== 'actif') continue
    const p = s.presences[e.id]
    const c = ic[e.classeId].cycle
    if (p?.arrivee) {
      arrives[c]++
      arrives.total++
      if (!p.depart) {
        presents[c]++
        presents.total++
      }
    }
  }
  const r = { presents, arrives, effectif: effectifsParCycle(s) }
  presentsCache.set(s.presences, { el: s.eleves, r })
  return r
}

export function absentsDuJour(s: S) {
  const ie = indexEleves(s.eleves)
  return s.absences.filter((a) => a.date === JOUR_DEMO && ie[a.eleveId]?.statut === 'actif')
}

/** Taux de présence depuis la rentrée (absences en journée ou demi-journée). */
export const tauxPresenceAnnee = memo2((absences: T.Absence[], eleves: T.Eleve[]) => {
  const jours = joursOuvres(DEBUT_ANNEE, JOUR_DEMO).length
  const nb = eleves.filter((e) => e.statut === 'actif').length
  const manque = absences.reduce((a, x) => a + (x.periode === 'journee' ? 1 : x.periode === 'cours' ? 0.15 : 0.5), 0)
  return 1 - manque / (jours * nb)
})

export function tauxPresenceEleve(s: S, eleveId: string) {
  const jours = joursOuvres(DEBUT_ANNEE, JOUR_DEMO).length
  const abs = s.absences.filter((a) => a.eleveId === eleveId)
  const manque = abs.reduce((a, x) => a + (x.periode === 'journee' ? 1 : x.periode === 'cours' ? 0.15 : 0.5), 0)
  return { taux: 1 - manque / jours, absences: abs, jours }
}

/* --------------------------------------------------------------- Crèche */
export const RATIO_MAX: Record<number, number> = { 0: 4, 1: 6, 2: 8 }

export function crecheGroupes(s: S) {
  const parClasse = elevesParClasse(s.eleves)
  return s.classes
    .filter((c) => c.cycle === 'creche')
    .map((c) => {
      const enfants = parClasse[c.id] ?? []
      const presents = enfants.filter((e) => s.presences[e.id]?.arrivee && !s.presences[e.id]?.depart)
      const adultes = s.adultesCreche[c.id] ?? []
      const ratio = adultes.length ? presents.length / adultes.length : Infinity
      return { classe: c, enfants, presents, adultes, ratio, ratioMax: RATIO_MAX[c.niveauIndex], depasse: ratio > RATIO_MAX[c.niveauIndex] }
    })
}

export const journalParEleve = memo((journal: T.EntreeJournal[]) => {
  const res: Record<string, T.EntreeJournal[]> = {}
  for (const j of journal) (res[j.eleveId] ??= []).push(j)
  for (const l of Object.values(res)) l.sort((a, b) => a.heure.localeCompare(b.heure))
  return res
})

/* ------------------------------------------------------------ Notes */
export const notesKey = (evalId: string, eleveId: string) => `${evalId}|${eleveId}`

export const evaluationsParClasse = memo((evaluations: T.Evaluation[]) => {
  const res: Record<string, T.Evaluation[]> = {}
  for (const e of evaluations) (res[e.classeId] ??= []).push(e)
  for (const l of Object.values(res)) l.sort((a, b) => a.date.localeCompare(b.date))
  return res
})

const moyenne = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null)

/**
 * Moyenne d'une matière pour un élève sur un trimestre.
 * Primaire : moyenne des évaluations. Collège : (moyenne des devoirs + composition) ÷ 2.
 * Une case vide n'est jamais un zéro : elle est ignorée.
 */
export function moyenneMatiere(s: S, eleveId: string, classeId: string, matiereId: string, trimestre: number): number | null {
  const evs = (evaluationsParClasse(s.evaluations)[classeId] ?? []).filter((e) => e.matiereId === matiereId && e.trimestre === trimestre)
  const val = (ev: T.Evaluation) => s.notes[notesKey(ev.id, eleveId)]?.valeur ?? null
  const devoirs = evs.filter((e) => e.type === 'devoir').map(val).filter((v): v is number => v !== null)
  const compo = evs.filter((e) => e.type === 'composition').map(val).filter((v): v is number => v !== null)
  const md = moyenne(devoirs)
  const mc = moyenne(compo)
  const cyc = indexClasses(s.classes)[classeId]?.cycle
  if (cyc === 'college') {
    if (md !== null && mc !== null) return (md + mc) / 2
    return md ?? mc
  }
  return moyenne([...devoirs, ...compo])
}

export interface ResultatEleve {
  eleveId: string
  matieres: Record<string, number | null>
  domaines: Record<string, number | null>
  generale: number | null
  rang: number | null
}

/** Résultats d'une classe sur un trimestre (moyennes et rangs). */
export function resultatsClasse(s: S, classeId: string, trimestre: number): ResultatEleve[] {
  let entree = resCache.get(s.notes)
  if (!entree || entree.ev !== s.evaluations || entree.el !== s.eleves) {
    entree = { ev: s.evaluations, el: s.eleves, m: new Map() }
    resCache.set(s.notes, entree)
  }
  const k = `${classeId}|${trimestre}`
  if (!entree.m.has(k)) entree.m.set(k, calculerResultats(s, classeId, trimestre))
  return entree.m.get(k)!
}
const resCache = new WeakMap<object, { ev: object; el: object; m: Map<string, ResultatEleve[]> }>()

function calculerResultats(s: S, classeId: string, trimestre: number): ResultatEleve[] {
  const c = indexClasses(s.classes)[classeId]
  const mats = c.cycle === 'college' ? MATIERES_COLLEGE : MATIERES_PRIMAIRE
  const res: ResultatEleve[] = (elevesParClasse(s.eleves)[classeId] ?? []).map((e) => {
    const matieres: Record<string, number | null> = {}
    for (const mt of mats) matieres[mt.id] = moyenneMatiere(s, e.id, classeId, mt.id, trimestre)
    const domaines: Record<string, number | null> = {}
    if (c.cycle === 'primaire') {
      for (const d of DOMAINES_PRIMAIRE) domaines[d] = moyennePonderee(mats.filter((x) => x.domaine === d), matieres)
    }
    return { eleveId: e.id, matieres, domaines, generale: moyennePonderee(mats, matieres), rang: null }
  })
  const classees = res.filter((r) => r.generale !== null).sort((a, b) => b.generale! - a.generale!)
  classees.forEach((r, i) => {
    r.rang = i > 0 && Math.abs(classees[i - 1].generale! - r.generale!) < 1e-9 ? classees[i - 1].rang : i + 1
  })
  return res
}

/** Σ(moyenne × coefficient) ÷ Σ coefficients des matières notées. */
export function moyennePonderee(mats: T.Matiere[], moy: Record<string, number | null>): number | null {
  let num = 0, den = 0
  for (const m of mats) {
    const v = moy[m.id]
    if (v === null || v === undefined) continue
    num += v * m.coef
    den += m.coef
  }
  return den ? num / den : null
}

export function statsClasse(res: ResultatEleve[]) {
  const g = res.map((r) => r.generale).filter((v): v is number => v !== null)
  return { moyenne: moyenne(g), max: g.length ? Math.max(...g) : null, min: g.length ? Math.min(...g) : null }
}

export const matiere = (id: string) => MATIERES.find((m) => m.id === id)!

/* ------------------------------------------------------- Emploi du temps */
export function conflitsEmploiDuTemps(s: S) {
  const parCle = new Map<string, T.Creneau[]>()
  for (const c of s.creneaux) {
    const k = `${c.profId}|${c.jour}|${c.debut}`
    parCle.set(k, [...(parCle.get(k) ?? []), c])
  }
  return [...parCle.values()].filter((l) => l.length > 1)
}

export function coursEnCours(s: S, profId: string) {
  const jour = new Date(JOUR_DEMO + 'T12:00:00').getDay() || 7
  const now = minutesDemo()
  const cours = s.creneaux.filter((c) => c.profId === profId && c.jour === jour).sort((a, b) => a.debut.localeCompare(b.debut))
  const enCours = cours.find((c) => hhmmEnMinutes(c.debut) <= now && now < hhmmEnMinutes(c.fin))
  const prochain = cours.find((c) => hhmmEnMinutes(c.debut) > now)
  return { cours, enCours, prochain }
}

/* --------------------------------------------------------------- Alertes */
export interface Alerte {
  id: string
  niveau: 'attention' | 'alerte'
  titre: string
  detail: string
  lien: string
}

export function alertesDirection(s: S): Alerte[] {
  const res: Alerte[] = []
  const ie = indexEleves(s.eleves)
  for (const v of s.validations.filter((x) => x.statut === 'en_attente')) {
    res.push({ id: v.id, niveau: 'attention', titre: v.libelle, detail: `Demandée par ${nomPersonnel(s, v.demandeurId)} · ${v.motif}`, lien: '/validations' })
  }
  for (const sc of s.scans.filter((x) => x.resultat === 'alerte' && x.date.startsWith(JOUR_DEMO))) {
    const e = sc.eleveId ? ie[sc.eleveId] : undefined
    res.push({ id: sc.id, niveau: 'alerte', titre: `Sortie refusée${e ? ` · ${e.prenom} ${e.nom}` : ''}`, detail: sc.motif, lien: '/portail' })
  }
  for (const g of crecheGroupes(s).filter((x) => x.depasse)) {
    res.push({ id: 'ratio-' + g.classe.id, niveau: 'alerte', titre: `Taux d’encadrement dépassé · ${g.classe.nom}`, detail: `${g.presents.length} enfants pour ${g.adultes.length} adultes (maximum 1 pour ${g.ratioMax})`, lien: '/creche' })
  }
  const conflits = conflitsEmploiDuTemps(s)
  if (conflits.length) {
    const c = conflits[0]
    res.push({ id: 'edt', niveau: 'attention', titre: 'Conflit d’emploi du temps au collège', detail: `${nomPersonnel(s, c[0].profId)} est prévu dans ${c.length} classes le même créneau`, lien: '/college/emploi-du-temps' })
  }
  const nonJustifiees = absentsDuJour(s).filter((a) => !a.justifiee).length
  if (nonJustifiees) res.push({ id: 'abs', niveau: 'attention', titre: `${nonJustifiees} absences non justifiées aujourd’hui`, detail: 'Les familles ont été prévenues par SMS', lien: '/vie-scolaire' })
  const retard = familleEnRetard(s)
  if (retard.length) res.push({ id: 'imp', niveau: 'attention', titre: `${retard.length} familles en retard de paiement`, detail: 'Relances prêtes à partir, à votre décision', lien: '/impayes' })
  const rem = s.remplacements.filter((r) => !r.remplacantId && r.date === JOUR_DEMO)
  for (const r of rem) res.push({ id: r.id, niveau: 'attention', titre: `Remplacement à organiser`, detail: `${nomPersonnel(s, r.absentId)} est absent · ${r.creneauIds.length} cours aujourd’hui`, lien: '/personnel' })
  return res
}

/* --------------------------------------------------------------- Divers */
export function classeDe(s: S, eleveId: string) {
  return indexClasses(s.classes)[indexEleves(s.eleves)[eleveId]?.classeId]
}

export function carteActive(s: S, type: T.Carte['type'], titulaireId: string) {
  return s.cartes.find((c) => c.type === type && c.titulaireId === titulaireId && c.statut === 'active')
}

export function joursDepuisRentree() {
  return joursOuvres(DEBUT_ANNEE, JOUR_DEMO).length
}

export const CYCLES_LISTE = CYCLES

export function hierOuvre(): string {
  let d = ajouterJours(JOUR_DEMO, -1)
  while ([0, 6].includes(new Date(d + 'T12:00:00').getDay())) d = ajouterJours(d, -1)
  return d
}

export function estMobileMoney(mode: T.ModePaiement) {
  return MODES_MOBILE.includes(mode)
}
