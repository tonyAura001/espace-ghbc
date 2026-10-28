/** Barre latérale : modules et rôles autorisés. */
import {
  Sun, ShieldCheck, ScrollText, Users, UserPlus, IdCard, DoorOpen, Baby, Shapes, BookOpenCheck, FileText, CalendarDays,
  ClipboardCheck, Gavel, UserX, Wallet, Receipt, Lock, AlertTriangle, BarChart3, ShoppingCart, Smartphone, MessagesSquare,
  HeartPulse, Utensils, Bus, Clock, BriefcaseBusiness, Settings, Download, Inbox, type LucideIcon,
} from 'lucide-react'
import type { Role } from '../data/types'

export interface ElementNav {
  route: string
  libelle: string
  icone: LucideIcon
  roles: Role[] | 'tous'
}
export interface GroupeNav {
  titre: string
  elements: ElementNav[]
}

const DIR: Role[] = ['promoteur', 'direction']

export const NAVIGATION: GroupeNav[] = [
  {
    titre: 'Pilotage',
    elements: [
      { route: '/accueil', libelle: 'Aujourd’hui à GHBC', icone: Sun, roles: [...DIR, 'responsable_cycle', 'comptable'] },
      { route: '/validations', libelle: 'Validations', icone: ShieldCheck, roles: DIR },
      { route: '/audit', libelle: 'Journal d’audit', icone: ScrollText, roles: [...DIR, 'admin_tech'] },
    ],
  },
  {
    titre: 'Élèves',
    elements: [
      { route: '/eleves', libelle: 'Élèves', icone: Users, roles: [...DIR, 'secretariat', 'comptable', 'caissier', 'vie_scolaire', 'responsable_cycle', 'infirmier', 'enseignant', 'professeur', 'cantine_transport'] },
      { route: '/inscription', libelle: 'Inscrire un élève', icone: UserPlus, roles: [...DIR, 'secretariat'] },
      { route: '/inscriptions', libelle: 'Demandes d’inscription', icone: Inbox, roles: [...DIR, 'secretariat'] },
      { route: '/cartes', libelle: 'Cartes', icone: IdCard, roles: [...DIR, 'secretariat', 'admin_tech'] },
      { route: '/portail', libelle: 'Portail', icone: DoorOpen, roles: [...DIR, 'portail', 'vie_scolaire'] },
    ],
  },
  {
    titre: 'Pédagogie',
    elements: [
      { route: '/creche', libelle: 'Crèche', icone: Baby, roles: [...DIR, 'educatrice', 'responsable_cycle', 'infirmier'] },
      { route: '/maternelle', libelle: 'Maternelle', icone: Shapes, roles: [...DIR, 'responsable_cycle', 'enseignant'] },
      { route: '/primaire/notes', libelle: 'Notes du primaire', icone: BookOpenCheck, roles: [...DIR, 'enseignant', 'responsable_cycle'] },
      { route: '/bulletins', libelle: 'Bulletins', icone: FileText, roles: [...DIR, 'enseignant', 'responsable_cycle', 'secretariat', 'professeur'] },
      { route: '/college/emploi-du-temps', libelle: 'Emploi du temps', icone: CalendarDays, roles: [...DIR, 'professeur', 'vie_scolaire', 'responsable_cycle'] },
      { route: '/college/appel', libelle: 'Appel', icone: ClipboardCheck, roles: [...DIR, 'professeur', 'vie_scolaire'] },
      { route: '/college/notes', libelle: 'Notes du collège', icone: BookOpenCheck, roles: [...DIR, 'professeur', 'responsable_cycle'] },
      { route: '/college/conseil', libelle: 'Conseil de classe', icone: Gavel, roles: [...DIR, 'professeur', 'vie_scolaire', 'responsable_cycle'] },
      { route: '/vie-scolaire', libelle: 'Vie scolaire', icone: UserX, roles: [...DIR, 'vie_scolaire', 'responsable_cycle', 'professeur'] },
    ],
  },
  {
    titre: 'Finance',
    elements: [
      { route: '/caisse', libelle: 'Encaisser', icone: Wallet, roles: ['caissier', 'comptable'] },
      { route: '/caisse/recus', libelle: 'Reçus', icone: Receipt, roles: [...DIR, 'caissier', 'comptable'] },
      { route: '/caisse/cloture', libelle: 'Clôture de caisse', icone: Lock, roles: [...DIR, 'caissier', 'comptable'] },
      { route: '/impayes', libelle: 'Impayés et relances', icone: AlertTriangle, roles: [...DIR, 'comptable'] },
      { route: '/finance', libelle: 'Tableau financier', icone: BarChart3, roles: [...DIR, 'comptable'] },
      { route: '/depenses', libelle: 'Dépenses', icone: ShoppingCart, roles: [...DIR, 'comptable'] },
      { route: '/rapprochement', libelle: 'Mobile money', icone: Smartphone, roles: [...DIR, 'comptable'] },
    ],
  },
  {
    titre: 'Vie de l’école',
    elements: [
      { route: '/communication', libelle: 'Communication', icone: MessagesSquare, roles: [...DIR, 'secretariat', 'enseignant', 'professeur', 'educatrice', 'vie_scolaire', 'responsable_cycle'] },
      { route: '/sante', libelle: 'Santé et infirmerie', icone: HeartPulse, roles: [...DIR, 'infirmier', 'vie_scolaire'] },
      { route: '/cantine', libelle: 'Cantine', icone: Utensils, roles: [...DIR, 'cantine_transport', 'comptable'] },
      { route: '/transport', libelle: 'Transport', icone: Bus, roles: [...DIR, 'cantine_transport'] },
      { route: '/garderie', libelle: 'Garderie', icone: Clock, roles: [...DIR, 'cantine_transport', 'educatrice', 'secretariat'] },
      { route: '/personnel', libelle: 'Personnel', icone: BriefcaseBusiness, roles: [...DIR, 'secretariat', 'responsable_cycle'] },
    ],
  },
  {
    titre: 'Administration',
    elements: [
      { route: '/parametres', libelle: 'Paramètres', icone: Settings, roles: [...DIR, 'admin_tech'] },
      { route: '/exports', libelle: 'Exports', icone: Download, roles: [...DIR, 'comptable', 'admin_tech', 'secretariat'] },
    ],
  },
]

export function navigationPour(role: Role): GroupeNav[] {
  return NAVIGATION.map((g) => ({ ...g, elements: g.elements.filter((e) => e.roles === 'tous' || e.roles.includes(role)) })).filter((g) => g.elements.length)
}

export function routeAutorisee(role: Role, chemin: string): boolean {
  if (role === 'promoteur' || role === 'direction') return true
  const tous = NAVIGATION.flatMap((g) => g.elements)
  const el = tous.filter((e) => chemin === e.route || chemin.startsWith(e.route + '/')).sort((a, b) => b.route.length - a.route.length)[0]
  if (!el) return true
  return el.roles === 'tous' || el.roles.includes(role)
}
