/**
 * Paramètres de la maquette « Espace GHBC ».
 * C'est le SEUL fichier à modifier pour adapter la démonstration (pays, date, effectifs, couleurs…).
 */
const logoCouleur = new URL('./assets/logo-ghbc.png', import.meta.url).href
const logoBlanc = new URL('./assets/logo-ghbc-blanc.png', import.meta.url).href

export type Pays = 'Guinée' | 'Sénégal'

export const CONFIG = {
  ECOLE: 'Groupe Scolaire Hadja Bountouraby Camara',
  SIGLE: 'GHBC',
  NOM_PLATEFORME: 'Espace GHBC',
  PAYS: 'Guinée' as Pays,
  VILLE: 'Conakry',
  ANNEE_SCOLAIRE: '2026-2027',
  /** 'auto' = date du jour ; ou une date fixe 'AAAA-MM-JJ' pour figer les chiffres. */
  DATE_DEMO: 'auto' as string,
  /** 'auto' = heure réelle (bornée entre 9 h 45 et 17 h) ; ou une heure fixe 'HH:MM'. */
  HEURE_DEMO: 'auto' as string,
  EFFECTIF_TOTAL: 820,
  LOGO_COULEUR: logoCouleur,
  LOGO_BLANC: logoBlanc,
  BLEU_MARQUE: '#0249A2',
  VERT_MARQUE: '#02A73A',
  /** Vide → « la Direction ». */
  NOM_DIRECTION: '',
  MOT_DE_PASSE_DEMO: 'ghbc2026',
  /** À remplir après le 1er déploiement Vercel (sert aux QR codes), ex. 'https://espace-ghbc.vercel.app'. */
  URL_PUBLIQUE: 'https://espace-ghbc.vercel.app',
  /** Optionnel : « Conçu par … » en pied de l'écran de connexion. */
  SIGNATURE: '',
  /** Graine du générateur de données (même graine = mêmes données). */
  GRAINE: 20262027,
  ADRESSE: 'Quartier Kipé, commune de Ratoma',
  TELEPHONE_ECOLE: '+224\u00a0622\u00a040\u00a018\u00a075',
  EMAIL_ECOLE: 'contact@ghbc-ecole.gn',
}

/** Données propres au pays (§6 du brief). */
export const PAYS_DATA = {
  Guinée: {
    devise: 'GNF',
    indicatif: '+224',
    niveauxPrimaire: ['1re année', '2e année', '3e année', '4e année', '5e année', '6e année'],
    niveauxCollege: ['7e année', '8e année', '9e année', '10e année'],
    examenPrimaire: 'Examen d’entrée en 7e année',
    examenCollege: 'BEPC',
    mobileMoney: ['Orange Money', 'MTN MoMo'],
    niveauIbrahima: '4e année',
    niveauFatoumata: '9e année',
    familleFilRouge: 'Bah',
    tarifs: {
      inscription: 500_000,
      reinscription: 300_000,
      creche: 900_000,
      maternelle: 450_000,
      primaire: 500_000,
      college: 650_000,
      cantine: 250_000,
      transport: 300_000,
      tenue: 250_000,
      examen: 150_000,
    },
  },
  Sénégal: {
    devise: 'XOF',
    indicatif: '+221',
    niveauxPrimaire: ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
    niveauxCollege: ['6e', '5e', '4e', '3e'],
    examenPrimaire: 'CFEE et entrée en 6e',
    examenCollege: 'BFEM',
    mobileMoney: ['Wave', 'Orange Money'],
    niveauIbrahima: 'CE2',
    niveauFatoumata: '3e',
    familleFilRouge: 'Diop',
    tarifs: {
      inscription: 50_000,
      reinscription: 30_000,
      creche: 75_000,
      maternelle: 35_000,
      primaire: 40_000,
      college: 50_000,
      cantine: 20_000,
      transport: 20_000,
      tenue: 15_000,
      examen: 10_000,
    },
  },
}[CONFIG.PAYS]

export const NOM_DIRECTION = CONFIG.NOM_DIRECTION || 'la Direction'

/** URL de base pour les QR codes : URL publique si définie, sinon l'adresse courante. */
export function urlBase(): string {
  if (CONFIG.URL_PUBLIQUE) return CONFIG.URL_PUBLIQUE.replace(/\/?$/, '/')
  if (typeof window === 'undefined') return ''
  const { origin, pathname } = window.location
  if (origin === 'null' || origin.startsWith('file:')) return window.location.href.split('#')[0]
  return origin + pathname.replace(/index\.html$/, '').replace(/\/?$/, '/')
}
