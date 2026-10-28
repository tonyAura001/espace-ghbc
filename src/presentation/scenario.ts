/**
 * Scénario de démonstration (environ 12 minutes).
 * Les textes « À dire » peuvent contenir des valeurs calculées : {presentsAujourdhui}, {encaisseAujourdhui},
 * {famillesEnRetard}, {recouvrement}, {effectif}, {actionsJournal}.
 */
import type { EcranParent } from '../store'

export interface Etape {
  titre: string
  profil: string
  route: string
  vueDouble?: boolean
  ecranParent?: EcranParent
  enfantParent?: 'mariama' | 'ibrahima' | 'fatoumata'
  cible: number // secondes
  aDire: string
  gestes: string[]
  /** Deuxième temps de l'étape (« puis … ») : profil et écran ouverts avec la flèche droite */
  ensuite?: { profil: string; route: string; vueDouble?: boolean; ecranParent?: EcranParent; libelle: string }
}

export const SCENARIO: Etape[] = [
  {
    titre: 'Accueil « Aujourd’hui à GHBC »',
    profil: 'direction',
    route: '/accueil',
    cible: 60,
    aDire: 'Voici votre école ce matin : {presentsAujourdhui} enfants présents, {encaisseAujourdhui} encaissés depuis 8 h, et les points qui demandent votre attention. Tout se met à jour en direct.',
    gestes: ['Montrer la ligne du jour et le repère « maintenant »', 'Survoler un point vert : un paiement de ce matin', 'Pointer les points d’attention, puis les dernières actions qui arrivent'],
  },
  {
    titre: 'Inscrire un nouvel élève',
    profil: 'secretariat',
    route: '/inscription',
    cible: 90,
    aDire: 'Une famille se présente : en trois minutes, l’enfant est inscrit, son échéancier est prêt et sa carte part à l’impression. Plus de registre, plus de double saisie.',
    gestes: ['Cliquer « Remplir avec la famille de démonstration »', 'Avancer les 4 étapes : enfant, famille, frais, confirmation', 'Montrer le matricule, l’échéancier et la carte prête à imprimer'],
  },
  {
    titre: 'Carte et sortie sécurisée',
    profil: 'portail',
    route: '/portail',
    cible: 75,
    aDire: 'Chaque enfant a sa carte. Au portail, un scan suffit. Et si quelqu’un qui n’est pas autorisé vient chercher un enfant, l’école le sait aussitôt et la maman est prévenue.',
    gestes: ['Scanner la carte de l’oncle de Mariama : sortie autorisée', 'Présenter une personne sans carte : alerte rouge', 'Montrer que la maman a reçu l’alerte (touche V)'],
  },
  {
    titre: 'La journée de la crèche',
    profil: 'educatrice',
    route: '/creche/journal',
    vueDouble: true,
    ecranParent: 'creche',
    cible: 60,
    aDire: 'L’éducatrice note la journée en quelques touches : repas, sieste, soins. La maman la reçoit sur son téléphone. C’est ce qui fait choisir une crèche.',
    gestes: ['Toucher Mariama, puis « Repas » et « A tout mangé »', 'Regarder le téléphone : l’entrée apparaît dans la journée de Mariama'],
  },
  {
    titre: 'Notes et bulletin',
    profil: 'enseignant',
    route: '/primaire/notes',
    cible: 90,
    aDire: 'Le maître saisit ses notes, la moyenne se calcule seule (une case vide n’est jamais un zéro) et le bulletin est prêt en un clic.',
    gestes: ['Saisir deux ou trois notes dans la colonne du jour', 'Montrer la moyenne qui change, et la case vide ignorée', 'Ouvrir le bulletin A4 d’Ibrahima'],
  },
  {
    titre: 'Appel et conseil de classe',
    profil: 'professeur',
    route: '/college/appel',
    cible: 75,
    aDire: 'Au collège, chaque professeur fait l’appel depuis son téléphone ; le surveillant voit les absences en direct et les parents sont prévenus.',
    gestes: ['Toucher deux élèves absents, puis « Valider l’appel »', 'Flèche droite : le surveillant voit les absences arriver'],
    ensuite: { profil: 'vie_scolaire', route: '/vie-scolaire', libelle: 'Surveillant général · absences du jour' },
  },
  {
    titre: 'Le parent paie',
    profil: 'direction',
    route: '/accueil',
    vueDouble: true,
    ecranParent: 'paiements',
    cible: 90,
    aDire: 'La maman paie la mensualité depuis chez elle. Le reçu lui arrive aussitôt, et votre tableau de bord vient de bouger.',
    gestes: ['Sur le téléphone : payer la mensualité en retard de Fatoumata', 'Valider avec Orange Money : le reçu s’affiche', 'Montrer l’encaissé du jour qui augmente à gauche'],
  },
  {
    titre: 'Caisse et reçus',
    profil: 'caissier',
    route: '/caisse',
    cible: 75,
    aDire: 'Au guichet, chaque paiement donne un reçu numéroté. Scannez ce QR code : il confirme que le reçu est authentique. Un reçu ne se supprime jamais ; une annulation passe par vous.',
    gestes: ['Encaisser une famille, imprimer le reçu', 'Faire scanner le QR par le promoteur', 'Demander l’annulation d’un reçu, puis flèche droite : la Direction valide'],
    ensuite: { profil: 'direction', route: '/validations', libelle: 'Direction · validations en attente' },
  },
  {
    titre: 'Impayés et relances',
    profil: 'comptable',
    route: '/impayes',
    cible: 60,
    aDire: 'Les impayés, classe par classe. Une relance part en un clic par WhatsApp, et elle est tracée. Le système alerte, vous décidez.',
    gestes: ['Choisir une classe, sélectionner les familles', 'Ouvrir l’aperçu WhatsApp, puis envoyer'],
  },
  {
    titre: 'Traçabilité',
    profil: 'promoteur',
    route: '/audit',
    cible: 60,
    aDire: 'Tout ce que nous venons de faire est ici : qui, quand, quoi, avant et après. Personne, même un administrateur, ne peut effacer cette trace.',
    gestes: ['Filtrer sur « Aujourd’hui »', 'Ouvrir une ligne : avant et après', 'Rappeler : {actionsJournal} actions tracées pendant la démonstration'],
  },
]

export const DUREE_TOTALE = SCENARIO.reduce((a, e) => a + e.cible, 0)
