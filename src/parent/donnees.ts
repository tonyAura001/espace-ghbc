/** Données de la famille fil rouge vues depuis l'espace parent. */
import { useStore, type EcranParent, type Etat } from '../store'
import { ID } from '../data/generer'
import { enfantsParFamille, indexFamilles, indexClasses } from '../store/selecteurs'
import type { Eleve } from '../data/types'

export const FAMILLE = ID.famille

export function famille(s: Etat) {
  return indexFamilles(s.familles)[FAMILLE]
}

/** Enfants du plus jeune au plus âgé (Mariama, Ibrahima, Fatoumata, puis un éventuel nouvel inscrit). */
export function enfants(s: Etat): Eleve[] {
  return [...(enfantsParFamille(s.eleves)[FAMILLE] ?? [])].sort((a, b) => b.naissance.localeCompare(a.naissance))
}

export function classeDe(s: Etat, e: Eleve) {
  return indexClasses(s.classes)[e.classeId]
}

export function prenomParent(s: Etat) {
  const f = famille(s)
  return (f.responsable === 'mere' ? f.mere : f.pere)?.prenom ?? 'Madame'
}

/** Change l'enfant affiché sans empiler d'historique. */
export function choisirEnfant(id: string) {
  useStore.setState((st) => ({ session: { ...st.session, parent: { ...st.session.parent, enfantId: id } } }))
}

/** Lien d'une notification (« /parent/creche ») vers l'écran de l'application. */
export function ecranDeLien(lien: string | null): EcranParent {
  const seg = (lien ?? '').split('/').pop() as EcranParent
  const valides: EcranParent[] = ['accueil', 'creche', 'notes', 'absences', 'paiements', 'messages', 'autorisations']
  return valides.includes(seg) ? seg : 'accueil'
}

export const allerParent = (ecran: EcranParent, opts?: { enfantId?: string; paiementId?: string; conversationId?: string }) => useStore.getState().allerParent(ecran, opts)

/** « 1er novembre », « 5 novembre » */
export function jourMoisFr(iso: string): string {
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const [, m, j] = iso.slice(0, 10).split('-').map(Number)
  return `${j === 1 ? '1er' : j} ${mois[m - 1]}`
}
