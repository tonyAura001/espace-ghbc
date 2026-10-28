/** Date et heure de la démonstration (DATE_DEMO / HEURE_DEMO dans config.ts). */
import { format, parseISO, addDays, differenceInCalendarDays, isWeekend } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CONFIG } from '../config'

export const DEBUT_ANNEE = '2026-10-01'
export const FIN_ANNEE = '2027-06-30'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Jour de la démo, borné à l'année scolaire (après la rentrée, avant les vacances). */
function calculerJourDemo(): string {
  let d = CONFIG.DATE_DEMO === 'auto' ? isoDate(new Date()) : CONFIG.DATE_DEMO
  if (d < '2026-10-12') d = '2026-10-22'
  if (d > '2027-06-25') d = '2027-06-24'
  return d
}

export const JOUR_DEMO = calculerJourDemo()

/** Décalage entre l'heure réelle et l'heure de démo, pour que l'horloge avance en direct. */
function calculerHeureInitiale(): number {
  if (CONFIG.HEURE_DEMO !== 'auto') {
    const [h, m] = CONFIG.HEURE_DEMO.split(':').map(Number)
    return h * 60 + m
  }
  const n = new Date()
  const mins = n.getHours() * 60 + n.getMinutes()
  return Math.min(Math.max(mins, 9 * 60 + 45), 17 * 60)
}

const minutesInitiales = calculerHeureInitiale()
const departReel = Date.now()

/** Minutes écoulées depuis minuit dans la journée de démo (avance en temps réel, plafonnée à 18 h). */
export function minutesDemo(): number {
  const ecoule = (Date.now() - departReel) / 60000
  return Math.min(minutesInitiales + ecoule, 18 * 60)
}

export const MINUTES_INITIALES = minutesInitiales

export function heureDemo(): string {
  const m = Math.floor(minutesDemo())
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

/** Horodatage ISO local de l'instant présent de la démo. */
export function maintenant(): string {
  const m = minutesDemo()
  const s = Math.floor((m % 1) * 60)
  const mi = Math.floor(m)
  return `${JOUR_DEMO}T${pad(Math.floor(mi / 60))}:${pad(mi % 60)}:${pad(s)}`
}

export function hhmmEnMinutes(h: string): number {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + b
}

export function minutesEnHhmm(m: number): string {
  const mi = Math.floor(m)
  return `${pad(Math.floor(mi / 60))}:${pad(mi % 60)}`
}

/* ------------------------------------------------------------- Formats */

export function dateLongue(iso: string): string {
  const d = parseISO(iso)
  return format(d, d.getDate() === 1 ? "EEEE '1er' MMMM yyyy" : 'EEEE d MMMM yyyy', { locale: fr })
}
/** « Jeudi 22 octobre 2026 » (majuscule initiale seulement). */
export function dateLongueMaj(iso: string): string {
  const s = dateLongue(iso)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function dateCourte(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy')
}
export function dateMoyenne(iso: string): string {
  const d = parseISO(iso)
  return format(d, d.getDate() === 1 ? "'1er' MMM yyyy" : 'd MMM yyyy', { locale: fr })
}
export function jourMois(iso: string): string {
  const d = parseISO(iso)
  return d.getDate() === 1 ? `1er ${format(d, 'MMMM', { locale: fr })}` : format(d, 'd MMMM', { locale: fr })
}
export function moisAnnee(mois: string): string {
  return format(parseISO(mois + '-01'), 'MMMM yyyy', { locale: fr })
}
export function moisCourt(mois: string): string {
  return format(parseISO(mois + '-01'), 'MMM', { locale: fr })
}
/** « 10 h 42 » */
export function heureFr(isoOuHhmm: string): string {
  const hhmm = isoOuHhmm.includes('T') ? isoOuHhmm.slice(11, 16) : isoOuHhmm.slice(0, 5)
  const [h, m] = hhmm.split(':')
  return `${Number(h)} h ${m}`
}
export function dateHeure(iso: string): string {
  return `${dateCourte(iso)} à ${heureFr(iso)}`
}

/** Libellé relatif : « aujourd'hui à 10 h 42 », « hier », « il y a 3 jours ». */
export function relatif(iso: string): string {
  const jours = differenceInCalendarDays(parseISO(JOUR_DEMO), parseISO(iso.slice(0, 10)))
  if (jours === 0) return `aujourd’hui à ${heureFr(iso)}`
  if (jours === 1) return `hier à ${heureFr(iso)}`
  if (jours < 7) return `il y a ${jours} jours`
  return dateMoyenne(iso)
}

export function age(naissance: string, ref = JOUR_DEMO): number {
  const n = parseISO(naissance)
  const r = parseISO(ref)
  let a = r.getFullYear() - n.getFullYear()
  if (r.getMonth() < n.getMonth() || (r.getMonth() === n.getMonth() && r.getDate() < n.getDate())) a--
  return a
}

export function ageEnMois(naissance: string, ref = JOUR_DEMO): number {
  const n = parseISO(naissance)
  const r = parseISO(ref)
  return (r.getFullYear() - n.getFullYear()) * 12 + r.getMonth() - n.getMonth() - (r.getDate() < n.getDate() ? 1 : 0)
}

export function ageLisible(naissance: string): string {
  const a = age(naissance)
  if (a < 3) {
    const m = ageEnMois(naissance)
    return m < 24 ? `${m} mois` : `${Math.floor(m / 12)} ans et ${m % 12} mois`
  }
  return `${a} ans`
}

/** Jours ouvrés (lundi-vendredi) entre deux dates incluses. */
export function joursOuvres(debut: string, fin: string): string[] {
  const res: string[] = []
  let d = parseISO(debut)
  const f = parseISO(fin)
  while (d <= f) {
    if (!isWeekend(d)) res.push(isoDate(d))
    d = addDays(d, 1)
  }
  return res
}

export function ajouterJours(iso: string, n: number): string {
  return isoDate(addDays(parseISO(iso), n))
}

export function ecartJours(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b))
}

/** Jour de la semaine 1 = lundi … 7 = dimanche */
export function jourSemaine(iso: string): number {
  const d = parseISO(iso).getDay()
  return d === 0 ? 7 : d
}

export function trimestreDe(iso: string): 1 | 2 | 3 {
  if (iso < '2027-01-01') return 1
  if (iso < '2027-04-01') return 2
  return 3
}

export const TRIMESTRE_COURANT = trimestreDe(JOUR_DEMO)

export const NOMS_JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

/** Mois de l'échéancier : octobre à juin. */
export const MOIS_ECHEANCIER = ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06']
