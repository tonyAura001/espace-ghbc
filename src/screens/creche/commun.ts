/** Libellés et préréglages partagés par les écrans de la crèche. */
import type { TypeJournal } from '../../data/types'
import { Baby, Utensils, Moon, Droplets, Stethoscope, TriangleAlert, Palette, LogOut, type LucideIcon } from 'lucide-react'

export const ACTIONS: { type: TypeJournal; libelle: string; icone: LucideIcon; couleur: string }[] = [
  { type: 'arrivee', libelle: 'Arrivée', icone: Baby, couleur: '#2F6FD6' },
  { type: 'repas', libelle: 'Repas', icone: Utensils, couleur: '#00782A' },
  { type: 'sieste', libelle: 'Sieste', icone: Moon, couleur: '#5B3F9A' },
  { type: 'change', libelle: 'Change', icone: Droplets, couleur: '#1F6A73' },
  { type: 'soin', libelle: 'Soin', icone: Stethoscope, couleur: '#B26A00' },
  { type: 'incident', libelle: 'Incident', icone: TriangleAlert, couleur: '#C0262D' },
  { type: 'activite', libelle: 'Activité', icone: Palette, couleur: '#A4482F' },
  { type: 'depart', libelle: 'Départ', icone: LogOut, couleur: '#46526B' },
]

export const LIBELLE_TYPE: Record<TypeJournal, string> = Object.fromEntries(ACTIONS.map((a) => [a.type, a.libelle])) as Record<TypeJournal, string>
export const ACTION_PAR_TYPE = Object.fromEntries(ACTIONS.map((a) => [a.type, a])) as Record<TypeJournal, (typeof ACTIONS)[number]>

/** Moment du repas selon l'heure. */
export function momentRepas(minutes: number): string {
  if (minutes < 10 * 60 + 30) return 'Collation'
  if (minutes < 14 * 60) return 'Déjeuner'
  return 'Goûter'
}

/** Détails préréglés, accordés au genre (F/M) quand c'est utile. */
export function details(type: TypeJournal, sexe: 'F' | 'M' | 'mixte', minutes: number): string[] {
  const e = (f: string, m: string) => (sexe === 'F' ? f : sexe === 'M' ? m : m.replace(/é$/, 'é(e)'))
  switch (type) {
    case 'arrivee':
      return ['Arrivée avec sa maman', 'Arrivée avec son papa', 'Arrivée avec un proche autorisé', 'Arrivée en pleine forme']
    case 'repas': {
      const m = momentRepas(minutes)
      return [`${m} · a tout mangé`, `${m} · a bien mangé`, `${m} · a peu mangé`, `${m} · n’a pas mangé`]
    }
    case 'sieste':
      return [`Sieste · ${e('endormie', 'endormi')}`, `Sieste · ${e('réveillée', 'réveillé')}, bien ${e('reposée', 'reposé')}`, 'Sieste agitée, câlin pour se rendormir', 'N’a pas dormi, temps calme']
    case 'change':
      return ['Change · couche mouillée', 'Change · selles normales', 'Passage au pot · réussi', 'Toilette et lavage des mains']
    case 'soin':
      return ['Température prise : 37,2 °C', 'Lavage du nez au sérum', 'Crème apaisante appliquée', 'Médicament donné selon l’ordonnance']
    case 'incident':
      return ['Petite chute, rien de grave · surveillance', 'Mordu par un camarade · soin fait', `Pleurs prolongés, ${e('consolée', 'consolé')}`, 'Bosse au front · glace appliquée']
    case 'activite':
      return ['Peinture aux doigts', 'Comptines en français et en soussou', 'Jeux d’eau dans la cour', 'Lecture d’un imagier', 'Parcours de motricité', 'Pâte à modeler']
    default:
      return []
  }
}
