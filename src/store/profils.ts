/** Profils de démonstration et droits par rôle (séparation des tâches). */
import type { Role } from '../data/types'
import { ID } from '../data/generer'
import { CONFIG } from '../config'

export interface Profil {
  id: string
  role: Role
  userId: string // personnelId, ou identifiant parent / élève
  libelle: string // fonction affichée
  accueil: string // route d'arrivée
}

export const PROFILS: Profil[] = [
  { id: 'promoteur', role: 'promoteur', userId: ID.promoteur, libelle: 'Promoteur', accueil: '/accueil' },
  { id: 'direction', role: 'direction', userId: ID.direction, libelle: 'Direction générale', accueil: '/accueil' },
  { id: 'secretariat', role: 'secretariat', userId: ID.secretaire, libelle: 'Secrétariat', accueil: '/eleves' },
  { id: 'comptable', role: 'comptable', userId: ID.comptable, libelle: 'Comptable', accueil: '/impayes' },
  { id: 'caissier', role: 'caissier', userId: ID.caissier, libelle: 'Caissier', accueil: '/caisse' },
  { id: 'portail', role: 'portail', userId: ID.portail, libelle: 'Agent du portail', accueil: '/portail' },
  { id: 'educatrice', role: 'educatrice', userId: ID.educatrice, libelle: 'Éducatrice, crèche', accueil: '/creche' },
  { id: 'enseignant', role: 'enseignant', userId: ID.maitre, libelle: 'Maître, primaire', accueil: '/primaire/notes' },
  { id: 'professeur', role: 'professeur', userId: ID.profMaths, libelle: 'Professeure, collège', accueil: '/college/appel' },
  { id: 'vie_scolaire', role: 'vie_scolaire', userId: ID.surveillant, libelle: 'Surveillant général', accueil: '/vie-scolaire' },
  { id: 'responsable_cycle', role: 'responsable_cycle', userId: ID.respCycle, libelle: 'Responsable du primaire', accueil: '/primaire/notes' },
  { id: 'infirmier', role: 'infirmier', userId: ID.infirmier, libelle: 'Infirmière', accueil: '/sante' },
  { id: 'cantine_transport', role: 'cantine_transport', userId: ID.cantine, libelle: 'Cantine et transport', accueil: '/cantine' },
  { id: 'admin_tech', role: 'admin_tech', userId: ID.admin, libelle: 'Administrateur technique', accueil: '/parametres' },
  { id: 'parent', role: 'parent', userId: 'PARENT-FIL', libelle: 'Parent', accueil: '/parent' },
  { id: 'eleve', role: 'eleve', userId: ID.fatoumata, libelle: 'Élève, collège', accueil: '/eleve' },
]

export const profilParId = (id: string) => PROFILS.find((p) => p.id === id) ?? PROFILS[1]

/** Actions sensibles et rôles autorisés. Celui qui encaisse n'annule pas ; celui qui note ne publie pas. */
export const DROITS = {
  encaisser: ['caissier', 'comptable'],
  demanderAnnulation: ['caissier', 'comptable'],
  validerAnnulation: ['direction', 'promoteur'],
  validerRemise: ['direction', 'promoteur'],
  saisirNotes: ['enseignant', 'professeur', 'responsable_cycle'],
  publierBulletin: ['direction', 'responsable_cycle'],
  inscrire: ['secretariat', 'direction'],
  cartes: ['secretariat', 'direction', 'admin_tech'],
  relancer: ['comptable', 'direction'],
  cloturerCaisse: ['caissier'],
  ficheSante: ['infirmier', 'direction', 'educatrice', 'vie_scolaire', 'secretariat', 'responsable_cycle', 'promoteur'],
  depenses: ['comptable', 'direction'],
  parametres: ['admin_tech', 'direction', 'promoteur'],
} satisfies Record<string, Role[]>

export type Droit = keyof typeof DROITS

export function peut(role: Role, droit: Droit): boolean {
  return (DROITS[droit] as Role[]).includes(role)
}

export const NOM_PLATEFORME = CONFIG.NOM_PLATEFORME
