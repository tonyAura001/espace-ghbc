/** Modèle de données de la maquette. Tout l'état vit dans un seul store (src/store). */

export type Cycle = 'creche' | 'maternelle' | 'primaire' | 'college'

export type Role =
  | 'promoteur'
  | 'direction'
  | 'responsable_cycle'
  | 'vie_scolaire'
  | 'secretariat'
  | 'comptable'
  | 'caissier'
  | 'enseignant'
  | 'professeur'
  | 'educatrice'
  | 'infirmier'
  | 'portail'
  | 'cantine_transport'
  | 'parent'
  | 'eleve'
  | 'admin_tech'

export interface Classe {
  id: string
  nom: string
  cycle: Cycle
  niveau: string
  niveauIndex: number // 0..n à l'intérieur du cycle
  salle: string
  titulaireId: string | null
  capacite: number
}

export interface Sante {
  groupeSanguin: string
  allergies: string[]
  traitements: string[]
  vaccinsAJour: boolean
  remarques: string
}

export interface Eleve {
  id: string
  matricule: string
  prenom: string
  nom: string
  sexe: 'F' | 'M'
  naissance: string // AAAA-MM-JJ
  classeId: string
  familleId: string
  statut: 'actif' | 'radie'
  nouveau: boolean
  redoublant: boolean
  cantine: boolean
  circuitId: string | null
  garderie: boolean
  bourse: number // pourcentage de remise sur la scolarité (0, 50, 100)
  sante: Sante
  dateInscription: string
}

export interface Parent {
  prenom: string
  nom: string
  tel: string
  profession: string
}

export interface Accompagnateur {
  id: string
  prenom: string
  nom: string
  lien: string
  tel: string
  autorise: boolean
}

export interface Famille {
  id: string
  nom: string
  pere: Parent | null
  mere: Parent | null
  responsable: 'pere' | 'mere'
  quartier: string
  accompagnateurs: Accompagnateur[]
  profilPaiement: 'regulier' | 'avance' | 'irregulier' | 'retard'
}

export interface Personnel {
  id: string
  prenom: string
  nom: string
  sexe: 'F' | 'M'
  role: Role
  fonction: string
  tel: string
  cycle: Cycle | null
  matiereIds: string[]
  embauche: string
  salaire: number
  contrat: 'CDI' | 'CDD' | 'Vacataire'
}

/* ---------------------------------------------------------------- Finance */

export type TypeEcheance = 'inscription' | 'reinscription' | 'scolarite' | 'cantine' | 'transport' | 'tenue' | 'examen'

export interface Echeance {
  id: string
  eleveId: string
  familleId: string
  type: TypeEcheance
  libelle: string
  mois: string | null // AAAA-MM pour les mensualités
  echeance: string // date limite AAAA-MM-JJ
  montantBrut: number
  remise: number // montant de la remise
  motifRemise: string | null
  montant: number // net à payer
  planId: string | null
}

export type ModePaiement = 'orange_money' | 'mtn_momo' | 'wave' | 'especes' | 'virement' | 'cheque'

export interface LignePaiement {
  echeanceId: string
  montant: number
}

export interface Paiement {
  id: string
  numero: number // numérotation continue, sans trou
  familleId: string
  date: string // ISO local AAAA-MM-JJTHH:MM:SS
  montant: number
  mode: ModePaiement
  reference: string | null
  canal: 'guichet' | 'parent' | 'banque'
  caissierId: string | null
  payeur: string
  lignes: LignePaiement[]
  statut: 'valide' | 'annulation_demandee' | 'annule'
  jeton: string // jeton de vérification (QR)
  annulation: { motif: string; demandeurId: string; date: string; valideurId: string | null; dateValidation: string | null } | null
  rapproche: boolean
}

export interface Depense {
  id: string
  date: string
  categorie: string
  libelle: string
  montant: number
  cycle: Cycle | null
  fournisseur: string
  piece: string | null // nom du justificatif
  saisiPar: string
}

export interface ClotureCaisse {
  id: string
  date: string // jour clôturé
  heure: string
  caissierId: string
  attenduEspeces: number
  compte: number
  ecart: number
  justification: string
  comptage: Record<string, number>
}

export interface Relance {
  id: string
  familleId: string
  date: string
  canal: 'whatsapp' | 'sms' | 'appel'
  message: string
  auteurId: string
  montant: number
}

export interface PlanPaiement {
  id: string
  familleId: string
  date: string
  montant: number
  versements: { date: string; montant: number }[]
  statut: 'actif' | 'termine'
  auteurId: string
}

export interface DemandeValidation {
  id: string
  type: 'annulation_recu' | 'remise_exceptionnelle' | 'correction_apres_conseil' | 'radiation'
  objetId: string
  libelle: string
  motif: string
  demandeurId: string
  date: string
  statut: 'en_attente' | 'approuvee' | 'refusee'
  valideurId: string | null
  dateDecision: string | null
}

/* ------------------------------------------------------------- Pédagogie */

export interface Matiere {
  id: string
  nom: string
  cycle: 'primaire' | 'college'
  domaine: string | null // primaire : Français, Mathématiques…
  coef: number
  heures: number
  abrev: string
}

export interface Evaluation {
  id: string
  classeId: string
  matiereId: string
  type: 'devoir' | 'composition'
  titre: string
  date: string
  trimestre: 1 | 2 | 3
  sur: number
  publiee: boolean
}

export interface VersionNote {
  valeur: number | null
  date: string
  auteurId: string
  motif: string | null
}

export interface Note {
  valeur: number | null // null = case vide (jamais un zéro)
  versions: VersionNote[]
}

export type NiveauCompetence = 'A' | 'EC' | 'PE' | 'NE'

export interface Competence {
  id: string
  domaine: string
  libelle: string
}

export interface Bulletin {
  id: string // classeId:trimestre
  classeId: string
  trimestre: 1 | 2 | 3
  statut: 'brouillon' | 'valide' | 'publie'
  versions: { numero: number; date: string; motif: string; auteurId: string }[]
}

export interface DecisionConseil {
  eleveId: string
  trimestre: 1 | 2 | 3
  distinction: '' | 'Tableau d’honneur' | 'Encouragements' | 'Félicitations'
  avertissement: '' | 'Avertissement travail' | 'Avertissement conduite'
  appreciation: string
}

export interface Creneau {
  id: string
  classeId: string
  jour: number // 1 = lundi … 5 = vendredi
  debut: string // HH:MM
  fin: string
  matiereId: string
  profId: string
  salle: string
}

export interface Appel {
  id: string // creneauId:date
  creneauId: string
  date: string
  absents: string[]
  retards: string[]
  faitPar: string
  heure: string
}

export interface Absence {
  id: string
  eleveId: string
  date: string
  periode: 'journee' | 'matin' | 'apres-midi' | 'cours'
  creneauId: string | null
  justifiee: boolean
  motif: string | null
  justificatif: string | null
  source: 'appel' | 'portail' | 'secretariat'
}

export interface Incident {
  id: string
  eleveId: string
  date: string
  type: string
  gravite: 1 | 2 | 3 | 4
  description: string
  sanction: string
  auteurId: string
  parentsPrevenus: boolean
}

/* ---------------------------------------------------------------- Crèche */

export type TypeJournal = 'arrivee' | 'repas' | 'sieste' | 'change' | 'soin' | 'incident' | 'activite' | 'depart'

export interface EntreeJournal {
  id: string
  eleveId: string
  date: string
  heure: string
  type: TypeJournal
  detail: string
  auteurId: string
}

export interface Jalon {
  id: string
  eleveId: string
  domaine: string
  libelle: string
  date: string | null // atteint le …
}

/* ---------------------------------------------------- Présences du jour */

export interface PresenceJour {
  eleveId: string
  arrivee: string | null // HH:MM
  depart: string | null
  recupereParId: string | null // accompagnateur
}

/* ----------------------------------------------------------------- Cartes */

export interface Carte {
  id: string
  type: 'eleve' | 'accompagnateur' | 'personnel'
  titulaireId: string // eleveId, `${familleId}:${accompagnateurId}` ou personnelId
  jeton: string
  statut: 'active' | 'desactivee'
  emiseLe: string
  remplaceId: string | null
  motifDesactivation: string | null
  imprimee: boolean
}

export interface Scan {
  id: string
  date: string
  jeton: string
  carteId: string | null
  lieu: string
  resultat: 'autorise' | 'refuse' | 'alerte'
  motif: string
  eleveId: string | null
  sens: 'entree' | 'sortie'
}

/* ---------------------------------------------------------- Communication */

export interface Message {
  id: string
  conversationId: string
  auteur: 'parent' | 'ecole'
  auteurNom: string
  date: string
  texte: string
  lu: boolean
}

export interface Conversation {
  id: string
  familleId: string
  sujet: string
  interlocuteur: string
}

export interface Annonce {
  id: string
  date: string
  titre: string
  texte: string
  cible: string // « Toute l'école », un cycle, une classe
  auteurId: string
  canaux: string[]
  lectures: number
  destinataires: number
}

export interface Autorisation {
  id: string
  titre: string
  description: string
  date: string // date de l'événement
  limite: string
  classeIds: string[]
  reponses: Record<string, 'oui' | 'non'>
}

export interface Liaison {
  id: string
  classeId: string
  eleveId: string | null
  date: string
  auteurId: string
  texte: string
  signe: boolean
}

export interface Notification {
  id: string
  date: string
  titre: string
  texte: string
  cible: 'ecole' | 'parent'
  niveau: 'info' | 'succes' | 'attention' | 'alerte'
  lien: string | null
  lu: boolean
}

export interface Audit {
  id: string
  date: string
  userId: string
  userNom: string
  role: string
  type: string // catégorie d'action
  action: string // libellé lisible
  objet: string
  eleveId: string | null
  avant: Record<string, unknown> | null
  apres: Record<string, unknown> | null
}

/* -------------------------------------------------------- Inscriptions */

export interface DemandeInscription {
  id: string
  date: string
  enfantPrenom: string
  enfantNom: string
  naissance: string
  sexe: 'F' | 'M'
  niveauSouhaite: string
  cycle: Cycle
  parentNom: string
  parentTel: string
  quartier: string
  ecoleActuelle: string
  statut: 'nouvelle' | 'entretien' | 'acceptee' | 'liste_attente' | 'refusee' | 'inscrit'
  source: 'en_ligne' | 'guichet'
  note: string
}

/* ---------------------------------------------------- Services annexes */

export interface Circuit {
  id: string
  nom: string
  chauffeurId: string
  vehicule: string
  arrets: { nom: string; heure: string }[]
}

export interface VisiteInfirmerie {
  id: string
  eleveId: string
  date: string
  motif: string
  soin: string
  suite: string
  auteurId: string
}

export interface Pointage {
  personnelId: string
  date: string
  arrivee: string | null
  depart: string | null
  statut: 'present' | 'retard' | 'absent' | 'conge'
}

export interface Remplacement {
  id: string
  date: string
  absentId: string
  remplacantId: string | null
  creneauIds: string[]
  motif: string
}

export interface MenuJour {
  date: string
  plat: string
  accompagnement: string
  dessert: string
}
