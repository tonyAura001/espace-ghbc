/** Formats français : montants, nombres, pourcentages, noms. */
import { PAYS_DATA } from '../config'

const NBSP = ' ' // espace fine insécable (séparateur de milliers français)

const fmtMonnaie = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: PAYS_DATA.devise,
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})
const fmtNombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** Libellé de la devise tel qu'on l'écrit au quotidien. */
export const DEVISE = PAYS_DATA.devise === 'XOF' ? 'FCFA' : 'GNF'

/** 1 250 000 GNF */
export function money(n: number): string {
  // Intl écrit « GNF » ou « F CFA » ; on garde le libellé local et l'espace insécable
  const s = fmtMonnaie.format(Math.round(n))
  return s.replace(/F\s?CFA|XOF/, 'FCFA')
}

/** Montant compact pour les grands écrans : « 37,4 M GNF » */
export function moneyCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md ${DEVISE}`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M ${DEVISE}`
  return money(n)
}

export function nombre(n: number): string {
  return fmtNombre.format(Math.round(n))
}

export function pct(n: number, decimales = 0): string {
  return `${(n * 100).toLocaleString('fr-FR', { maximumFractionDigits: decimales, minimumFractionDigits: decimales })} %`
}

/** Note : 7,5 ; vide → « — » */
export function note(n: number | null | undefined, dec = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: dec, minimumFractionDigits: n % 1 === 0 ? 0 : Math.min(dec, 1) })
}

export function noteFixe(n: number | null | undefined, dec = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: dec, minimumFractionDigits: dec })
}

export function initiales(prenom: string, nom: string): string {
  return (prenom.trim()[0] ?? '') + (nom.trim()[0] ?? '')
}

export function pluriel(n: number, sing: string, plur?: string): string {
  return `${nombre(n)} ${n > 1 ? (plur ?? sing + 's') : sing}`
}

/** Numéro de reçu : R-2026-004512 */
export function numeroRecu(n: number): string {
  return `R-2026-${String(n).padStart(6, '0')}`
}

export function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export { NBSP }
