/** Liens de vérification ouverts par les QR codes des reçus et des cartes. */
import type { Donnees } from '../data/generer'
import type { Carte, Paiement } from '../data/types'
import { encoderJeton, decoderJeton } from './jeton'
import { urlBase } from '../config'
import { indexEleves, indexFamilles, indexClasses, indexPersonnel, ventilationEncaisse } from '../store/selecteurs'

export interface DonneesRecu {
  id: string
  n: number // numéro
  d: string // date ISO
  f: string // famille
  p: string // payeur
  m: number // montant
  mo: string // mode
  e: string[] // élèves concernés
}

export interface DonneesCarte {
  id: string
  t: Carte['type']
  n: string // nom complet
  c: string // classe ou fonction
  mat: string | null // matricule
  em: string // émise le
  enf?: string[] // enfants autorisés (carte accompagnateur)
}

export function jetonRecu(s: Donnees, p: Paiement): string {
  const f = indexFamilles(s.familles)[p.familleId]
  const ie = indexEleves(s.eleves)
  const eleves = [...new Set(ventilationEncaisse(s, p).map((l) => l.echeance?.eleveId).filter(Boolean) as string[])].map((id) => ie[id]?.prenom ?? '')
  const d: DonneesRecu = { id: p.id, n: p.numero, d: p.date, f: f?.nom ?? '', p: p.payeur, m: p.montant, mo: p.mode, e: eleves }
  return encoderJeton(d as unknown as Record<string, unknown>)
}

export function lienRecu(s: Donnees, p: Paiement): string {
  return `${urlBase()}#/verifier/recu/${jetonRecu(s, p)}`
}

export function jetonCarte(s: Donnees, c: Carte): string {
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)
  let d: DonneesCarte
  if (c.type === 'eleve') {
    const e = ie[c.titulaireId]
    d = { id: c.id, t: c.type, n: e ? `${e.prenom} ${e.nom}` : '', c: e ? ic[e.classeId]?.nom ?? '' : '', mat: e?.matricule ?? null, em: c.emiseLe }
  } else if (c.type === 'personnel') {
    const p = indexPersonnel(s.personnel)[c.titulaireId]
    d = { id: c.id, t: c.type, n: p ? `${p.prenom} ${p.nom}` : '', c: p?.fonction ?? '', mat: null, em: c.emiseLe }
  } else {
    const [fid, aid] = c.titulaireId.split(':')
    const f = indexFamilles(s.familles)[fid]
    const a = f?.accompagnateurs.find((x) => x.id === aid)
    const enfants = s.eleves.filter((e) => e.familleId === fid && e.statut === 'actif').map((e) => e.prenom)
    d = { id: c.id, t: c.type, n: a ? `${a.prenom} ${a.nom}` : '', c: a?.lien ?? '', mat: null, em: c.emiseLe, enf: enfants }
  }
  return encoderJeton(d as unknown as Record<string, unknown>)
}

export function lienCarte(s: Donnees, c: Carte): string {
  return `${urlBase()}#/verifier/carte/${jetonCarte(s, c)}`
}

export const lireRecu = (j: string) => decoderJeton<DonneesRecu>(j)
export const lireCarte = (j: string) => decoderJeton<DonneesCarte>(j)
