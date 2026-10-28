/** Référentiels fixes : matières, compétences, jalons, libellés. */
import type { Competence, Matiere, Cycle, TypeEcheance, ModePaiement } from './types'
import { PAYS_DATA } from '../config'

export const CYCLES: Cycle[] = ['creche', 'maternelle', 'primaire', 'college']

export const NOM_CYCLE: Record<Cycle, string> = {
  creche: 'Crèche',
  maternelle: 'Maternelle',
  primaire: 'Primaire',
  college: 'Collège',
}

/** Volumes de référence du brief (§5), recalés sur EFFECTIF_TOTAL. */
export const STRUCTURE: Record<Cycle, { niveaux: string[]; sections: string[]; effectif: number }> = {
  creche: { niveaux: ['Bébés', 'Trotteurs', 'Grands'], sections: [''], effectif: 36 },
  maternelle: { niveaux: ['Petite section', 'Moyenne section', 'Grande section'], sections: ['A', 'B'], effectif: 150 },
  primaire: { niveaux: PAYS_DATA.niveauxPrimaire, sections: ['A', 'B'], effectif: 384 },
  college: { niveaux: PAYS_DATA.niveauxCollege, sections: ['A', 'B'], effectif: 256 },
}

export const MATIERES_PRIMAIRE: Matiere[] = [
  { id: 'PR-LEC', nom: 'Lecture', domaine: 'Français', coef: 1, heures: 5, abrev: 'Lect.', cycle: 'primaire' },
  { id: 'PR-EXP', nom: 'Expression écrite', domaine: 'Français', coef: 1, heures: 2, abrev: 'Expr.', cycle: 'primaire' },
  { id: 'PR-DIC', nom: 'Dictée', domaine: 'Français', coef: 1, heures: 2, abrev: 'Dict.', cycle: 'primaire' },
  { id: 'PR-GRA', nom: 'Grammaire et conjugaison', domaine: 'Français', coef: 1, heures: 3, abrev: 'Gram.', cycle: 'primaire' },
  { id: 'PR-CAL', nom: 'Calcul', domaine: 'Mathématiques', coef: 2, heures: 5, abrev: 'Calc.', cycle: 'primaire' },
  { id: 'PR-PRO', nom: 'Problèmes', domaine: 'Mathématiques', coef: 1, heures: 2, abrev: 'Prob.', cycle: 'primaire' },
  { id: 'PR-GEO', nom: 'Géométrie et mesures', domaine: 'Mathématiques', coef: 1, heures: 2, abrev: 'Géom.', cycle: 'primaire' },
  { id: 'PR-SCI', nom: 'Sciences d’observation', domaine: 'Éveil', coef: 1, heures: 2, abrev: 'Sci.', cycle: 'primaire' },
  { id: 'PR-HG', nom: 'Histoire et géographie', domaine: 'Éveil', coef: 1, heures: 2, abrev: 'H.-G.', cycle: 'primaire' },
  { id: 'PR-ECM', nom: 'Éducation civique et morale', domaine: 'Éveil', coef: 1, heures: 1, abrev: 'ECM', cycle: 'primaire' },
]

export const MATIERES_COLLEGE: Matiere[] = [
  { id: 'CO-FR', nom: 'Français', domaine: null, coef: 3, heures: 5, abrev: 'Fr.', cycle: 'college' },
  { id: 'CO-MA', nom: 'Mathématiques', domaine: null, coef: 3, heures: 5, abrev: 'Maths', cycle: 'college' },
  { id: 'CO-AN', nom: 'Anglais', domaine: null, coef: 2, heures: 3, abrev: 'Angl.', cycle: 'college' },
  { id: 'CO-PC', nom: 'Physique-chimie', domaine: null, coef: 2, heures: 2, abrev: 'P.-C.', cycle: 'college' },
  { id: 'CO-SV', nom: 'Sciences de la vie et de la Terre', domaine: null, coef: 2, heures: 2, abrev: 'SVT', cycle: 'college' },
  { id: 'CO-HG', nom: 'Histoire-géographie', domaine: null, coef: 2, heures: 3, abrev: 'H.-G.', cycle: 'college' },
  { id: 'CO-EC', nom: 'Éducation civique et morale', domaine: null, coef: 1, heures: 1, abrev: 'ECM', cycle: 'college' },
  { id: 'CO-AR', nom: 'Arabe', domaine: null, coef: 1, heures: 2, abrev: 'Arabe', cycle: 'college' },
  { id: 'CO-IN', nom: 'Informatique', domaine: null, coef: 1, heures: 1, abrev: 'Info.', cycle: 'college' },
  { id: 'CO-EP', nom: 'Éducation physique et sportive', domaine: null, coef: 1, heures: 2, abrev: 'EPS', cycle: 'college' },
]

export const MATIERES = [...MATIERES_PRIMAIRE, ...MATIERES_COLLEGE]

export const DOMAINES_PRIMAIRE = ['Français', 'Mathématiques', 'Éveil']

export const COMPETENCES_MATERNELLE: Competence[] = [
  { id: 'MA-L1', domaine: 'Langage oral', libelle: 'S’exprime dans une phrase complète' },
  { id: 'MA-L2', domaine: 'Langage oral', libelle: 'Comprend une consigne simple' },
  { id: 'MA-L3', domaine: 'Langage oral', libelle: 'Récite une comptine' },
  { id: 'MA-E1', domaine: 'Graphisme et écriture', libelle: 'Tient correctement son crayon' },
  { id: 'MA-E2', domaine: 'Graphisme et écriture', libelle: 'Reproduit des lignes et des ronds' },
  { id: 'MA-E3', domaine: 'Graphisme et écriture', libelle: 'Écrit son prénom' },
  { id: 'MA-N1', domaine: 'Nombres et formes', libelle: 'Compte jusqu’à dix' },
  { id: 'MA-N2', domaine: 'Nombres et formes', libelle: 'Reconnaît le carré, le rond, le triangle' },
  { id: 'MA-N3', domaine: 'Nombres et formes', libelle: 'Trie des objets selon leur couleur' },
  { id: 'MA-M1', domaine: 'Motricité', libelle: 'Saute à pieds joints' },
  { id: 'MA-M2', domaine: 'Motricité', libelle: 'Lance et attrape un ballon' },
  { id: 'MA-V1', domaine: 'Vivre ensemble', libelle: 'Attend son tour' },
  { id: 'MA-V2', domaine: 'Vivre ensemble', libelle: 'Range le matériel après usage' },
  { id: 'MA-A1', domaine: 'Arts et découverte', libelle: 'Chante en groupe' },
  { id: 'MA-A2', domaine: 'Arts et découverte', libelle: 'Nomme les parties du corps' },
]

export const LIBELLE_COMPETENCE = {
  A: 'Acquis',
  EC: 'En cours',
  PE: 'Pas encore',
  NE: 'Non évalué',
} as const

export const JALONS_CRECHE: { domaine: string; libelle: string; moisMin: number }[] = [
  { domaine: 'Motricité', libelle: 'Tient sa tête', moisMin: 3 },
  { domaine: 'Motricité', libelle: 'Se tient assis sans appui', moisMin: 7 },
  { domaine: 'Motricité', libelle: 'Marche seul', moisMin: 13 },
  { domaine: 'Motricité', libelle: 'Monte un escalier en se tenant', moisMin: 20 },
  { domaine: 'Langage', libelle: 'Babille', moisMin: 6 },
  { domaine: 'Langage', libelle: 'Dit ses premiers mots', moisMin: 12 },
  { domaine: 'Langage', libelle: 'Associe deux mots', moisMin: 22 },
  { domaine: 'Langage', libelle: 'Dit son prénom', moisMin: 28 },
  { domaine: 'Autonomie', libelle: 'Boit au gobelet', moisMin: 15 },
  { domaine: 'Autonomie', libelle: 'Mange seul à la cuillère', moisMin: 20 },
  { domaine: 'Autonomie', libelle: 'Demande le pot', moisMin: 26 },
  { domaine: 'Relations', libelle: 'Sourit aux visages familiers', moisMin: 3 },
  { domaine: 'Relations', libelle: 'Joue à côté des autres enfants', moisMin: 18 },
  { domaine: 'Relations', libelle: 'Partage un jouet', moisMin: 30 },
]

export const LIBELLE_ECHEANCE: Record<TypeEcheance, string> = {
  inscription: 'Frais d’inscription',
  reinscription: 'Frais de réinscription',
  scolarite: 'Scolarité',
  cantine: 'Cantine',
  transport: 'Transport',
  tenue: 'Tenue scolaire',
  examen: 'Frais d’examen',
}

export const LIBELLE_MODE: Record<ModePaiement, string> = {
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  wave: 'Wave',
  especes: 'Espèces',
  virement: 'Virement bancaire',
  cheque: 'Chèque',
}

export const MODES_MOBILE: ModePaiement[] = PAYS_DATA.devise === 'GNF' ? ['orange_money', 'mtn_momo'] : ['wave', 'orange_money']

/** Billets et pièces pour le comptage de caisse. */
export const COUPURES: number[] =
  PAYS_DATA.devise === 'GNF' ? [20000, 10000, 5000, 2000, 1000, 500] : [10000, 5000, 2000, 1000, 500, 250, 100, 50, 25]

export const CATEGORIES_DEPENSES = [
  'Salaires',
  'Cantine et vivres',
  'Électricité et carburant groupe',
  'Eau',
  'Fournitures pédagogiques',
  'Entretien et réparations',
  'Transport scolaire',
  'Internet et téléphone',
  'Santé et infirmerie',
] as const

export const LIBELLE_ROLE: Record<string, string> = {
  promoteur: 'Promoteur',
  direction: 'Direction générale',
  responsable_cycle: 'Responsable de cycle',
  vie_scolaire: 'Vie scolaire',
  secretariat: 'Secrétariat',
  comptable: 'Comptable',
  caissier: 'Caissier',
  enseignant: 'Enseignant',
  professeur: 'Professeur',
  educatrice: 'Éducatrice',
  infirmier: 'Infirmier',
  portail: 'Agent du portail',
  cantine_transport: 'Cantine et transport',
  parent: 'Parent',
  eleve: 'Élève',
  admin_tech: 'Administrateur technique',
}

export const HORAIRES_COLLEGE = [
  { debut: '08:00', fin: '09:00' },
  { debut: '09:00', fin: '10:00' },
  { debut: '10:15', fin: '11:15' },
  { debut: '11:15', fin: '12:15' },
  { debut: '14:00', fin: '15:00' },
  { debut: '15:00', fin: '16:00' },
]
/** Créneaux de l'après-midi seulement lundi, mardi et jeudi. */
export const JOURS_APRES_MIDI = [1, 2, 4]
