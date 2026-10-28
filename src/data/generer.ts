/**
 * Générateur déterministe des données de démonstration.
 * Même graine (CONFIG.GRAINE) + même date de démo = exactement les mêmes données.
 * Pour modifier les volumes, les noms ou les comportements de paiement, c'est ici.
 */
import { CONFIG, PAYS_DATA } from '../config'
import { Rng } from './rng'
import { NOMS, PROFESSIONS_F, PROFESSIONS_H, formatTel } from './noms'
import {
  CYCLES, STRUCTURE, MATIERES_PRIMAIRE, MATIERES_COLLEGE, COMPETENCES_MATERNELLE, JALONS_CRECHE, HORAIRES_COLLEGE,
  JOURS_APRES_MIDI, LIBELLE_ECHEANCE, MODES_MOBILE, COUPURES,
} from './referentiel'
import type * as T from './types'
import {
  JOUR_DEMO, MINUTES_INITIALES, MOIS_ECHEANCIER, joursOuvres, ajouterJours, ecartJours, jourSemaine, minutesEnHhmm,
  hhmmEnMinutes, ageEnMois, trimestreDe, DEBUT_ANNEE, isoDate,
} from '../lib/temps'
import { parseISO, subMonths, addDays } from 'date-fns'

export interface Parametres {
  afficherRang: boolean
  relanceAuto: boolean
  delaiGrace: number
  remiseFratrie: number
  doubleValidation: boolean
  tarifs: typeof PAYS_DATA.tarifs
}

export interface Donnees {
  classes: T.Classe[]
  eleves: T.Eleve[]
  familles: T.Famille[]
  personnel: T.Personnel[]
  evaluations: T.Evaluation[]
  notes: Record<string, T.Note> // `${evaluationId}|${eleveId}`
  competences: Record<string, T.NiveauCompetence> // `${eleveId}|${competenceId}|${trimestre}`
  bulletins: T.Bulletin[]
  decisions: T.DecisionConseil[]
  creneaux: T.Creneau[]
  appels: T.Appel[]
  absences: T.Absence[]
  incidents: T.Incident[]
  journal: T.EntreeJournal[]
  jalons: T.Jalon[]
  presences: Record<string, T.PresenceJour>
  adultesCreche: Record<string, string[]> // classeId → personnelIds présents
  cartes: T.Carte[]
  scans: T.Scan[]
  echeances: T.Echeance[]
  paiements: T.Paiement[]
  depenses: T.Depense[]
  clotures: T.ClotureCaisse[]
  relances: T.Relance[]
  plans: T.PlanPaiement[]
  validations: T.DemandeValidation[]
  conversations: T.Conversation[]
  messages: T.Message[]
  annonces: T.Annonce[]
  autorisations: T.Autorisation[]
  liaisons: T.Liaison[]
  notifications: T.Notification[]
  audit: T.Audit[]
  demandesInscription: T.DemandeInscription[]
  circuits: T.Circuit[]
  visites: T.VisiteInfirmerie[]
  pointages: T.Pointage[]
  remplacements: T.Remplacement[]
  menus: T.MenuJour[]
  parametres: Parametres
  compteurs: { recu: number; matricule: Record<string, number>; id: number }
}

/* Identifiants fixes de la famille fil rouge et des profils de démo */
export const ID = {
  famille: 'F-FIL',
  mariama: 'E-MARIAMA',
  ibrahima: 'E-IBRAHIMA',
  fatoumata: 'E-FATOUMATA',
  oncle: 'A-FIL-ONCLE',
  mere: 'A-FIL-MERE',
  pere: 'A-FIL-PERE',
  classeMariama: 'C-CR-2',
  classeIbrahima: 'C-PR-3-A',
  classeFatoumata: 'C-CO-2-A',
  promoteur: 'P-PROMOTEUR',
  direction: 'P-DG',
  secretaire: 'P-SECRETAIRE',
  comptable: 'P-COMPTABLE',
  caissier: 'P-CAISSIER',
  portail: 'P-PORTAIL',
  educatrice: 'P-EDUC',
  maitre: 'P-MAITRE',
  profMaths: 'P-PROF-MA',
  surveillant: 'P-SURVEILLANT',
  infirmier: 'P-INFIRMIER',
  respCycle: 'P-RESP-PR',
  cantine: 'P-CANTINE',
  admin: 'P-ADMIN',
} as const

const estSenegal = CONFIG.PAYS === 'Sénégal'
const FIL = estSenegal
  ? { nom: 'Diop', mere: { prenom: 'Kadiatou', nom: 'Sow' }, pere: 'Alpha', oncle: 'Mamadou' }
  : { nom: 'Bah', mere: { prenom: 'Kadiatou', nom: 'Sow' }, pere: 'Alpha', oncle: 'Mamadou' }

export function genererDonnees(): Donnees {
  const r = new Rng(CONFIG.GRAINE)
  const tarifs = PAYS_DATA.tarifs
  const jourDemo = JOUR_DEMO
  const minutesNow = MINUTES_INITIALES
  const heureNow = minutesEnHhmm(minutesNow)

  let idSeq = 1
  const nid = (p: string) => `${p}-${(idSeq++).toString(36).toUpperCase()}`

  const telsUtilises = new Set<string>()
  const tel = (): string => {
    for (;;) {
      const prefix = r.pick(NOMS.prefixesTel)
      const digits = Array.from({ length: estSenegal ? 7 : 6 }, () => r.int(0, 9))
      const t = formatTel(prefix, digits)
      if (!telsUtilises.has(t)) {
        telsUtilises.add(t)
        return t
      }
    }
  }
  // le nom de la famille fil rouge lui est réservé : une recherche « Bah » tombe directement sur elle
  const nomFamille = (): string => {
    const n = r.chance(0.45) ? r.pick(NOMS.nomsFrequents) : r.pick(NOMS.noms)
    return n === FIL.nom ? nomFamille() : n
  }
  const prenom = (s: 'F' | 'M') => r.pick(s === 'F' ? NOMS.prenomsF : NOMS.prenomsM)

  /* ------------------------------------------------------------- Personnel */
  const personnel: T.Personnel[] = []
  const addPers = (
    id: string | null, p: string, n: string, sexe: 'F' | 'M', role: T.Role, fonction: string,
    cycle: T.Cycle | null, salaire: number, matiereIds: string[] = [],
  ) => {
    const pers: T.Personnel = {
      id: id ?? nid('P'), prenom: p, nom: n, sexe, role, fonction, tel: tel(), cycle, matiereIds,
      embauche: `${r.int(2012, 2025)}-${String(r.int(1, 12)).padStart(2, '0')}-01`, salaire,
      contrat: role === 'professeur' && r.chance(0.25) ? 'Vacataire' : r.chance(0.85) ? 'CDI' : 'CDD',
    }
    personnel.push(pers)
    return pers
  }
  // prénoms du fil rouge réservés : aucun autre personnage ne porte le même nom complet
  const reserve = (p: string, n: string) => n === FIL.nom && ['Mariama', 'Ibrahima', 'Fatoumata', 'Kadiatou', 'Alpha', 'Mamadou'].includes(p)
  const randPers = (sexe: 'F' | 'M' | null, role: T.Role, fonction: string, cycle: T.Cycle | null, salaire: number, mat: string[] = []) => {
    const s = sexe ?? (r.chance(0.5) ? 'F' : 'M')
    let p = prenom(s), n = nomFamille()
    while (reserve(p, n)) { p = prenom(s); n = nomFamille() }
    return addPers(null, p, n, s, role, fonction, cycle, salaire, mat)
  }

  // profils de démo (noms fictifs)
  addPers(ID.promoteur, 'Sékou', 'Kaba', 'M', 'promoteur', 'Promoteur', null, 0)
  addPers(ID.direction, 'Aïssatou', 'Barry', 'F', 'direction', 'Directrice générale', null, 14_000_000)
  addPers(ID.secretaire, 'Fanta', 'Condé', 'F', 'secretariat', 'Secrétaire principale', null, 3_200_000)
  addPers(ID.comptable, 'Ousmane', 'Diallo', 'M', 'comptable', 'Comptable', null, 6_500_000)
  addPers(ID.caissier, 'Lansana', 'Soumah', 'M', 'caissier', 'Caissier principal', null, 3_500_000)
  addPers(ID.portail, 'Mory', 'Kourouma', 'M', 'portail', 'Agent du portail', null, 1_900_000)
  addPers(ID.educatrice, 'Hawa', 'Sylla', 'F', 'educatrice', 'Éducatrice, groupe des Grands', 'creche', 2_600_000)
  addPers(ID.maitre, 'Abdoulaye', 'Touré', 'M', 'enseignant', 'Maître de 4e année A', 'primaire', 4_200_000)
  addPers(ID.profMaths, 'Djénabou', 'Baldé', 'F', 'professeur', 'Professeure de mathématiques', 'college', 5_200_000, ['CO-MA'])
  addPers(ID.surveillant, 'Thierno', 'Bangoura', 'M', 'vie_scolaire', 'Surveillant général', 'college', 4_500_000)
  addPers(ID.infirmier, 'Kadija', 'Cissé', 'F', 'infirmier', 'Infirmière', null, 3_800_000)
  addPers(ID.respCycle, 'Mamady', 'Keïta', 'M', 'responsable_cycle', 'Responsable du primaire', 'primaire', 7_500_000)
  addPers(ID.cantine, 'Mabinty', 'Yansané', 'F', 'cantine_transport', 'Responsable cantine et transport', null, 3_000_000)
  addPers(ID.admin, 'Ismaël', 'Fofana', 'M', 'admin_tech', 'Administrateur technique', null, 5_000_000)
  if (estSenegal) {
    const fix: Record<string, [string, string]> = {
      [ID.promoteur]: ['Cheikh', 'Ndiaye'], [ID.direction]: ['Aminata', 'Fall'], [ID.secretaire]: ['Khady', 'Sarr'],
      [ID.comptable]: ['Moussa', 'Gueye'], [ID.caissier]: ['Modou', 'Faye'], [ID.portail]: ['Assane', 'Thiam'],
      [ID.educatrice]: ['Awa', 'Seck'], [ID.maitre]: ['Abdoulaye', 'Mbaye'], [ID.profMaths]: ['Coumba', 'Diagne'],
      [ID.surveillant]: ['Babacar', 'Sy'], [ID.infirmier]: ['Rokhaya', 'Ndao'], [ID.respCycle]: ['Malick', 'Kane'],
      [ID.cantine]: ['Penda', 'Ly'], [ID.admin]: ['Omar', 'Wade'],
    }
    personnel.forEach((p) => { if (fix[p.id]) [p.prenom, p.nom] = fix[p.id] })
  }

  randPers('F', 'responsable_cycle', 'Responsable de la crèche et de la maternelle', 'maternelle', 7_000_000)
  randPers('M', 'responsable_cycle', 'Directeur des études du collège', 'college', 8_000_000)
  randPers('F', 'secretariat', 'Secrétaire', null, 2_600_000)
  randPers('M', 'caissier', 'Caissier', null, 2_900_000)
  randPers('M', 'vie_scolaire', 'Surveillant', 'college', 2_400_000)
  randPers('F', 'vie_scolaire', 'Surveillante', 'college', 2_400_000)
  randPers('M', 'portail', 'Agent du portail', null, 1_900_000)
  for (let i = 0; i < 3; i++) randPers('F', 'cantine_transport', 'Cuisinière', null, 1_700_000)
  for (let i = 0; i < 3; i++) randPers('M', 'cantine_transport', 'Chauffeur', null, 2_200_000)
  for (let i = 0; i < 4; i++) randPers(null, 'cantine_transport', 'Agent d’entretien', null, 1_500_000)

  /* --------------------------------------------------------------- Classes */
  const total0 = CYCLES.reduce((a, c) => a + STRUCTURE[c].effectif, 0)
  const classes: T.Classe[] = []
  const tailles: Record<string, number> = {}
  let reste = CONFIG.EFFECTIF_TOTAL
  CYCLES.forEach((cycle, ci) => {
    const st = STRUCTURE[cycle]
    const nbClasses = st.niveaux.length * st.sections.length
    const effCycle = ci === CYCLES.length - 1 ? reste : Math.round((st.effectif * CONFIG.EFFECTIF_TOTAL) / total0)
    reste -= effCycle
    const base = Math.floor(effCycle / nbClasses)
    let surplus = effCycle - base * nbClasses
    const variations = Array.from({ length: nbClasses }, () => 0)
    // petites variations ±2 à somme nulle pour le réalisme
    for (let i = 0; i + 1 < nbClasses; i += 2) {
      const v = cycle === 'creche' ? 0 : r.int(0, 2)
      variations[i] += v
      variations[i + 1] -= v
    }
    let k = 0
    st.niveaux.forEach((niv, ni) => {
      st.sections.forEach((sec) => {
        const prefix = { creche: 'CR', maternelle: 'MA', primaire: 'PR', college: 'CO' }[cycle]
        const id = cycle === 'creche' ? `C-CR-${ni}` : `C-${prefix}-${ni}-${sec}`
        const nom = cycle === 'creche' ? niv : `${niv} ${sec}`
        let t = base + variations[k]
        if (surplus > 0) { t++; surplus-- }
        tailles[id] = t
        classes.push({
          id, nom, cycle, niveau: niv, niveauIndex: ni,
          salle: cycle === 'creche' ? `Crèche ${ni + 1}` : `${prefix === 'MA' ? 'M' : prefix === 'PR' ? 'P' : 'C'}${ni + 1}${sec}`,
          titulaireId: null, capacite: cycle === 'creche' ? 12 : cycle === 'maternelle' ? 28 : 36,
        })
        k++
      })
    })
  })

  // personnel pédagogique
  for (const c of classes) {
    if (c.cycle === 'creche') {
      const nb = c.niveauIndex === 0 ? 3 : 2
      for (let i = 0; i < nb; i++) {
        if (c.id === ID.classeMariama && i === 0) { c.titulaireId = ID.educatrice; continue }
        const p = randPers('F', 'educatrice', `Éducatrice, groupe des ${c.nom}`, 'creche', 2_500_000)
        if (i === 0) c.titulaireId = p.id
      }
    } else if (c.cycle === 'maternelle') {
      const p = randPers('F', 'enseignant', `Maîtresse de ${c.nom.toLowerCase()}`, 'maternelle', 3_600_000)
      c.titulaireId = p.id
      randPers('F', 'educatrice', `Aide maternelle, ${c.nom.toLowerCase()}`, 'maternelle', 1_800_000)
    } else if (c.cycle === 'primaire') {
      if (c.id === ID.classeIbrahima) { c.titulaireId = ID.maitre; continue }
      const p = randPers(null, 'enseignant', `${r.chance(0.5) ? 'Maître' : 'Maîtresse'} de ${c.nom}`, 'primaire', r.int(38, 46) * 100_000)
      p.fonction = `${p.sexe === 'F' ? 'Maîtresse' : 'Maître'} de ${c.nom}`
      c.titulaireId = p.id
    }
  }
  // professeurs du collège
  const profsParMatiere: Record<string, string[]> = {}
  const nbProfs: Record<string, number> = { 'CO-FR': 2, 'CO-MA': 2, 'CO-AN': 2, 'CO-PC': 1, 'CO-SV': 1, 'CO-HG': 2, 'CO-EC': 1, 'CO-AR': 1, 'CO-IN': 1, 'CO-EP': 1 }
  for (const m of MATIERES_COLLEGE) {
    profsParMatiere[m.id] = []
    for (let i = 0; i < nbProfs[m.id]; i++) {
      if (m.id === 'CO-MA' && i === 0) { profsParMatiere[m.id].push(ID.profMaths); continue }
      const s: 'F' | 'M' = r.chance(0.4) ? 'F' : 'M'
      const p = randPers(s, 'professeur', `${s === 'F' ? 'Professeure' : 'Professeur'} de ${m.nom.toLowerCase()}`, 'college', r.int(45, 58) * 100_000, [m.id])
      profsParMatiere[m.id].push(p.id)
    }
  }
  // titulaires (professeurs principaux) du collège
  classes.filter((c) => c.cycle === 'college').forEach((c, i) => {
    const pool = Object.values(profsParMatiere).flat()
    c.titulaireId = c.id === ID.classeFatoumata ? ID.profMaths : pool[(i * 3 + 1) % pool.length]
  })

  /* ------------------------------------------------- Élèves et familles */
  const eleves: T.Eleve[] = []
  const familles: T.Famille[] = []
  const matriculeCompteur: Record<string, number> = {}
  const nouveauMatricule = (annee: number) => {
    const k = String(annee)
    matriculeCompteur[k] = (matriculeCompteur[k] ?? r.int(80, 140)) + r.int(1, 3)
    return `${annee}-${String(matriculeCompteur[k]).padStart(5, '0')}`
  }

  type Place = { classe: T.Classe }
  const places: Place[] = []
  for (const c of classes) for (let i = 0; i < tailles[c.id]; i++) places.push({ classe: c })

  const groupesSanguins = ['O+', 'O+', 'O+', 'A+', 'A+', 'B+', 'B+', 'AB+', 'O−', 'A−']
  const sante = (): T.Sante => {
    const allergies: string[] = []
    if (r.chance(0.04)) allergies.push('Arachide')
    if (r.chance(0.02)) allergies.push('Pénicilline')
    if (r.chance(0.02)) allergies.push('Lactose')
    const traitements: string[] = []
    if (r.chance(0.025)) traitements.push('Asthme : ventoline en cas de crise')
    if (r.chance(0.008)) traitements.push('Drépanocytose : protocole de crise, prévenir les parents')
    return {
      groupeSanguin: r.pick(groupesSanguins), allergies, traitements, vaccinsAJour: r.chance(0.93),
      remarques: r.chance(0.05) ? 'Porte des lunettes' : '',
    }
  }

  const naissancePour = (c: T.Classe, redoublant: boolean): string => {
    if (c.cycle === 'creche') {
      const [mn, mx] = [[4, 12], [13, 23], [24, 35]][c.niveauIndex]
      const mois = r.int(mn, mx)
      const d = subMonths(parseISO(jourDemo), mois)
      return isoDate(addDays(d, -r.int(0, 27)))
    }
    const ageBase = c.cycle === 'maternelle' ? 3 + c.niveauIndex : c.cycle === 'primaire' ? 6 + c.niveauIndex : 12 + c.niveauIndex
    const annee = 2026 - ageBase - (redoublant ? 1 : 0)
    const m = r.int(1, 12)
    return `${annee}-${String(m).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`
  }

  const creerEleve = (c: T.Classe, famille: T.Famille, opts: Partial<T.Eleve> = {}): T.Eleve => {
    const sexe: 'F' | 'M' = opts.sexe ?? (r.chance(0.5) ? 'F' : 'M')
    const redoublant = opts.redoublant ?? (c.cycle !== 'creche' && c.cycle !== 'maternelle' && r.chance(0.05))
    const nouveau = opts.nouveau ?? (c.cycle === 'creche' ? c.niveauIndex === 0 || r.chance(0.4) : r.chance(c.niveauIndex === 0 ? 0.55 : 0.12))
    const naissance = opts.naissance ?? naissancePour(c, redoublant)
    const anciennete = nouveau ? 0 : Math.max(1, Math.min(c.cycle === 'creche' ? 1 : c.niveauIndex + (c.cycle === 'college' ? 3 : c.cycle === 'primaire' ? 2 : 0) , 8))
    const anneeEntree = 2026 - anciennete
    const e: T.Eleve = {
      id: opts.id ?? nid('E'),
      matricule: nouveauMatricule(anneeEntree),
      prenom: opts.prenom ?? (() => { let p = prenom(sexe); while (reserve(p, famille.nom)) p = prenom(sexe); return p })(),
      nom: famille.nom,
      sexe,
      naissance,
      classeId: c.id,
      familleId: famille.id,
      statut: 'actif',
      nouveau,
      redoublant,
      cantine: opts.cantine ?? (c.cycle === 'creche' ? false : r.chance(c.cycle === 'college' ? 0.42 : 0.55)),
      circuitId: null,
      garderie: c.cycle !== 'college' && r.chance(0.12),
      bourse: 0,
      sante: opts.sante ?? sante(),
      dateInscription: nouveau ? `2026-0${r.int(6, 9)}-${String(r.int(1, 28)).padStart(2, '0')}` : `${anneeEntree}-09-${String(r.int(1, 28)).padStart(2, '0')}`,
    }
    eleves.push(e)
    return e
  }

  const creerFamille = (nom: string, opts: Partial<T.Famille> = {}): T.Famille => {
    const pereP = r.pick(NOMS.prenomsM)
    const mereNom = nomFamille()
    const f: T.Famille = {
      id: opts.id ?? nid('F'),
      nom,
      pere: opts.pere !== undefined ? opts.pere : r.chance(0.94) ? { prenom: pereP, nom, tel: tel(), profession: r.pick(PROFESSIONS_H) } : null,
      mere: opts.mere !== undefined ? opts.mere : { prenom: r.pick(NOMS.prenomsF), nom: mereNom === nom ? r.pick(NOMS.noms) : mereNom, tel: tel(), profession: r.pick(PROFESSIONS_F) },
      responsable: opts.responsable ?? (r.chance(0.55) ? 'mere' : 'pere'),
      quartier: opts.quartier ?? r.pick(NOMS.quartiers),
      accompagnateurs: [],
      profilPaiement: opts.profilPaiement ?? r.weighted([['regulier', 35.5], ['avance', 21.5], ['irregulier', 34.5], ['retard', 8.5]]),
    }
    if (!f.pere) f.responsable = 'mere'
    if (opts.accompagnateurs) f.accompagnateurs = opts.accompagnateurs
    else {
      if (f.mere) f.accompagnateurs.push({ id: nid('A'), prenom: f.mere.prenom, nom: f.mere.nom, lien: 'Mère', tel: f.mere.tel, autorise: true })
      if (f.pere) f.accompagnateurs.push({ id: nid('A'), prenom: f.pere.prenom, nom: f.pere.nom, lien: 'Père', tel: f.pere.tel, autorise: true })
      const nbAutres = r.weighted([[0, 45], [1, 40], [2, 15]])
      for (let i = 0; i < nbAutres; i++) {
        const lien = r.pick(['Oncle', 'Tante', 'Grand-mère', 'Grand frère', 'Chauffeur de la famille', 'Cousine'])
        const s: 'F' | 'M' = ['Tante', 'Grand-mère', 'Cousine'].includes(lien) ? 'F' : 'M'
        f.accompagnateurs.push({ id: nid('A'), prenom: prenom(s), nom: ['Oncle', 'Grand frère'].includes(lien) ? nom : nomFamille(), lien, tel: tel(), autorise: true })
      }
    }
    familles.push(f)
    return f
  }

  // famille fil rouge
  const filFamille = creerFamille(FIL.nom, {
    id: ID.famille,
    pere: { prenom: FIL.pere, nom: FIL.nom, tel: estSenegal ? '+221\u00a077\u00a0412\u00a058\u00a030' : '+224\u00a0622\u00a058\u00a041\u00a030', profession: 'Ingénieur des travaux publics' },
    mere: { prenom: FIL.mere.prenom, nom: FIL.mere.nom, tel: estSenegal ? '+221\u00a077\u00a0638\u00a021\u00a047' : '+224\u00a0628\u00a063\u00a021\u00a047', profession: 'Pharmacienne' },
    responsable: 'mere',
    quartier: estSenegal ? 'Mermoz' : 'Kipé',
    profilPaiement: 'regulier',
    accompagnateurs: [
      { id: ID.mere, prenom: FIL.mere.prenom, nom: FIL.mere.nom, lien: 'Mère', tel: estSenegal ? '+221\u00a077\u00a0638\u00a021\u00a047' : '+224\u00a0628\u00a063\u00a021\u00a047', autorise: true },
      { id: ID.pere, prenom: FIL.pere, nom: FIL.nom, lien: 'Père', tel: estSenegal ? '+221\u00a077\u00a0412\u00a058\u00a030' : '+224\u00a0622\u00a058\u00a041\u00a030', autorise: true },
      { id: ID.oncle, prenom: FIL.oncle, nom: FIL.nom, lien: 'Oncle', tel: estSenegal ? '+221\u00a078\u00a0205\u00a066\u00a014' : '+224\u00a0664\u00a020\u00a056\u00a014', autorise: true },
    ],
  })
  ;[telsUtilises].forEach((s) => filFamille.accompagnateurs.forEach((a) => s.add(a.tel)))

  const classeParId = Object.fromEntries(classes.map((c) => [c.id, c]))
  const retirerPlace = (classeId: string) => {
    const i = places.findIndex((p) => p.classe.id === classeId)
    places.splice(i, 1)
  }
  const naissanceMariama = isoDate(addDays(subMonths(parseISO(jourDemo), 27), -9))
  creerEleve(classeParId[ID.classeMariama], filFamille, {
    id: ID.mariama, prenom: 'Mariama', sexe: 'F', naissance: naissanceMariama, nouveau: false, redoublant: false, cantine: false,
    sante: { groupeSanguin: 'O+', allergies: ['Arachide'], traitements: [], vaccinsAJour: true, remarques: 'Sieste avec son doudou (lapin bleu)' },
  })
  retirerPlace(ID.classeMariama)
  creerEleve(classeParId[ID.classeIbrahima], filFamille, {
    id: ID.ibrahima, prenom: 'Ibrahima', sexe: 'M', naissance: '2017-03-14', nouveau: false, redoublant: false, cantine: true,
    sante: { groupeSanguin: 'O+', allergies: [], traitements: [], vaccinsAJour: true, remarques: '' },
  })
  retirerPlace(ID.classeIbrahima)
  creerEleve(classeParId[ID.classeFatoumata], filFamille, {
    id: ID.fatoumata, prenom: 'Fatoumata', sexe: 'F', naissance: '2012-06-02', nouveau: false, redoublant: false, cantine: true,
    sante: { groupeSanguin: 'A+', allergies: [], traitements: ['Asthme léger : ventoline dans le cartable'], vaccinsAJour: true, remarques: '' },
  })
  retirerPlace(ID.classeFatoumata)

  // répartition des autres places en fratries de 1 à 4 enfants
  const restantes = r.shuffle(places)
  const prise = new Array(restantes.length).fill(false)
  const cle = (c: T.Classe) => `${c.cycle}-${c.niveauIndex}`
  for (let i = 0; i < restantes.length; i++) {
    if (prise[i]) continue
    prise[i] = true
    const taille = r.weighted([[1, 72], [2, 21], [3, 6], [4, 1]])
    const membres = [restantes[i].classe]
    const niveaux = new Set([cle(restantes[i].classe)])
    for (let j = i + 1; j < restantes.length && membres.length < taille; j++) {
      if (prise[j]) continue
      const c = restantes[j].classe
      if (niveaux.has(cle(c))) continue
      prise[j] = true
      membres.push(c)
      niveaux.add(cle(c))
    }
    const fam = creerFamille(nomFamille())
    for (const c of membres) creerEleve(c, fam)
  }

  // remise fratrie : l'aîné paie plein tarif, les suivants ont 10 %
  const enfantsParFamille: Record<string, T.Eleve[]> = {}
  for (const e of eleves) (enfantsParFamille[e.familleId] ??= []).push(e)
  for (const list of Object.values(enfantsParFamille)) list.sort((a, b) => a.naissance.localeCompare(b.naissance))

  // quelques bourses (hors famille fil rouge)
  eleves.forEach((e) => {
    if (e.familleId !== ID.famille && e.classeId.startsWith('C-PR') || e.classeId.startsWith('C-CO')) {
      if (e.familleId !== ID.famille && r.chance(0.018)) e.bourse = r.chance(0.7) ? 50 : 100
    }
  })

  /* ---------------------------------------------------------- Transport */
  const chauffeurs = personnel.filter((p) => p.fonction === 'Chauffeur')
  const circuits: T.Circuit[] = (estSenegal
    ? [
        { nom: 'Circuit 1 · Ouakam - Ngor', arrets: ['Ouakam Cité Avion', 'Mosquée de la Divinité', 'Ngor Village', 'Almadies'] },
        { nom: 'Circuit 2 · Liberté - Grand Yoff', arrets: ['Liberté 6 Extension', 'Grand Yoff Arafat', 'Dieuppeul', 'Castors'] },
        { nom: 'Circuit 3 · Parcelles', arrets: ['Parcelles U17', 'Parcelles U26', 'Golf Sud', 'Patte d’Oie'] },
      ]
    : [
        { nom: 'Circuit 1 · Lambanyi - Kipé', arrets: ['Carrefour Lambanyi', 'Kaporo Rails', 'Rond-point Kipé', 'Cité des Nations'] },
        { nom: 'Circuit 2 · Sonfonia - Bambeto', arrets: ['Sonfonia Gare', 'Cosa Mosquée', 'Carrefour Bambeto', 'Hamdallaye Pharmacie'] },
        { nom: 'Circuit 3 · Taouyah - Dixinn', arrets: ['Taouyah Marché', 'Dixinn Port', 'Camayenne Corniche', 'Minière Cité'] },
      ]
  ).map((c, i) => ({
    id: `CIR-${i + 1}`,
    nom: c.nom,
    chauffeurId: chauffeurs[i % chauffeurs.length].id,
    vehicule: ['Minibus Toyota Hiace · RC 4512 A', 'Minibus Toyota Coaster · RC 7781 B', 'Minibus Nissan Civilian · RC 2209 C'][i],
    arrets: c.arrets.map((a, k) => ({ nom: a, heure: minutesEnHhmm(6 * 60 + 40 + k * 12 + i * 5) })),
  }))
  eleves.forEach((e) => {
    const c = classeParId[e.classeId]
    if (c.cycle !== 'creche' && e.familleId !== ID.famille && r.chance(0.2)) e.circuitId = r.pick(circuits).id
  })

  /* ------------------------------------------------------------- Échéances */
  const echeances: T.Echeance[] = []
  const tarifCycle: Record<T.Cycle, number> = { creche: tarifs.creche, maternelle: tarifs.maternelle, primaire: tarifs.primaire, college: tarifs.college }
  const addEch = (e: T.Eleve, type: T.TypeEcheance, mois: string | null, date: string, brut: number, remise = 0, motif: string | null = null) => {
    echeances.push({
      id: nid('ECH'), eleveId: e.id, familleId: e.familleId, type,
      libelle: mois ? `${LIBELLE_ECHEANCE[type]} · ${moisLib(mois)}` : LIBELLE_ECHEANCE[type],
      mois, echeance: date, montantBrut: brut, remise, motifRemise: motif, montant: brut - remise, planId: null,
    })
  }
  for (const e of eleves) {
    const c = classeParId[e.classeId]
    const rang = enfantsParFamille[e.familleId].indexOf(e)
    if (e.nouveau) {
      addEch(e, 'inscription', null, '2026-09-15', tarifs.inscription)
      if (c.cycle !== 'creche') addEch(e, 'tenue', null, '2026-09-15', tarifs.tenue)
    } else addEch(e, 'reinscription', null, '2026-09-15', tarifs.reinscription)
    for (const m of MOIS_ECHEANCIER) {
      const brut = tarifCycle[c.cycle]
      let remise = 0
      let motif: string | null = null
      if (rang >= 1) { remise = Math.round(brut * 0.1); motif = 'Remise fratrie 10 %' }
      if (e.bourse) { remise = Math.round(brut * e.bourse / 100); motif = `Bourse ${e.bourse} %` }
      addEch(e, 'scolarite', m, `${m}-05`, brut, remise, motif)
      if (e.cantine) addEch(e, 'cantine', m, `${m}-05`, tarifs.cantine)
      if (e.circuitId) addEch(e, 'transport', m, `${m}-05`, tarifs.transport)
    }
    if ((c.cycle === 'primaire' || c.cycle === 'college') && c.niveauIndex === STRUCTURE[c.cycle].niveaux.length - 1) {
      addEch(e, 'examen', null, '2027-02-05', tarifs.examen)
    }
  }
  const echParFamille: Record<string, T.Echeance[]> = {}
  for (const ec of echeances) (echParFamille[ec.familleId] ??= []).push(ec)

  /* ------------------------------------------------------------ Paiements */
  type PaiementBrut = Omit<T.Paiement, 'numero'>
  const paiementsBruts: PaiementBrut[] = []
  const caissiers = personnel.filter((p) => p.role === 'caissier')
  const tempsLimite = `${jourDemo}T${heureNow}:00`
  const joursEcole = joursOuvres('2026-09-01', jourDemo)
  const jourOuvrableProche = (iso: string) => {
    let d = iso
    while (jourSemaine(d) > 5) d = ajouterJours(d, 1)
    if (d > jourDemo) return null
    return d
  }
  const choisirMode = (): T.ModePaiement =>
    r.weighted<T.ModePaiement>([[MODES_MOBILE[0], 40], [MODES_MOBILE[1], 15], ['especes', 30], ['virement', 10], ['cheque', 5]])
  const refMobile = (mode: T.ModePaiement, date: string) => {
    const d = date.slice(2, 10).replace(/-/g, '')
    if (mode === 'orange_money') return `MP${d}.${date.slice(11, 13)}${date.slice(14, 16)}.${r.token(6)}`
    if (mode === 'mtn_momo') return `${r.int(10000, 99999)}${r.int(10000, 99999)}`
    if (mode === 'wave') return `T_${r.token(14)}`
    if (mode === 'cheque') return `Chèque n° ${r.int(1000000, 9999999)}`
    if (mode === 'virement') return `VIR ${r.pick(['Ecobank', 'Orabank', 'Société Générale', 'BICIGUI', 'UBA'])} ${r.token(8)}`
    return null
  }
  const heureAleatoire = (jour: string, min = 7 * 60 + 45, max = 16 * 60 + 30) => {
    const lim = jour === jourDemo ? Math.min(max, minutesNow - 2) : max
    if (lim < min) return null
    return `${jour}T${minutesEnHhmm(r.int(min, lim))}:${String(r.int(0, 59)).padStart(2, '0')}`
  }
  const dejaPaye = new Map<string, number>()
  const resteA = (e: T.Echeance) => e.montant - (dejaPaye.get(e.id) ?? 0)
  const payer = (familleId: string, items0: { ech: T.Echeance; montant: number }[], date: string, modeForce?: T.ModePaiement) => {
    const items = items0.map((i) => ({ ech: i.ech, montant: Math.min(i.montant, resteA(i.ech)) })).filter((i) => i.montant > 0)
    if (!items.length || date > tempsLimite) return
    for (const i of items) dejaPaye.set(i.ech.id, (dejaPaye.get(i.ech.id) ?? 0) + i.montant)
    const mode = modeForce ?? choisirMode()
    const mobile = MODES_MOBILE.includes(mode)
    const canal: T.Paiement['canal'] = mode === 'virement' ? 'banque' : mobile && r.chance(0.6) ? 'parent' : 'guichet'
    const f = familles.find((x) => x.id === familleId)!
    const payeurP = f.responsable === 'mere' ? f.mere : f.pere
    paiementsBruts.push({
      id: nid('PAY'), familleId, date, montant: items.reduce((a, i) => a + i.montant, 0), mode,
      reference: refMobile(mode, date), canal, caissierId: canal === 'guichet' ? r.pick(caissiers).id : null,
      payeur: payeurP ? `${payeurP.prenom} ${payeurP.nom}` : f.nom,
      lignes: items.map((i) => ({ echeanceId: i.ech.id, montant: i.montant })), statut: 'valide', jeton: r.token(16),
      annulation: null, rapproche: mobile ? date.slice(0, 10) < ajouterJours(jourDemo, -1) : true,
    })
  }

  for (const f of familles) {
    const ech = echParFamille[f.id] ?? []
    const profil = f.profilPaiement
    // rentrée : inscription, tenue et (selon profil) mensualités payées en septembre
    const rentree = ech.filter((e) => e.echeance === '2026-09-15')
    const jRentree = jourOuvrableProche(`2026-09-${String(r.int(1, 26)).padStart(2, '0')}`)!
    const moisAvance = profil === 'avance' ? MOIS_ECHEANCIER.slice(0, 3) : []
    if (profil === 'retard' && r.chance(0.5)) {
      // a payé l'inscription en partie seulement
      payer(f.id, rentree.map((e) => ({ ech: e, montant: Math.round(e.montant * 0.5 / 1000) * 1000 })), heureAleatoire(jRentree)!)
      continue
    }
    const premier = [...rentree, ...ech.filter((e) => e.mois && moisAvance.includes(e.mois) && f.id !== ID.famille)]
    // famille fil rouge : rentrée payée, octobre payé pour les deux petits, pas pour Fatoumata
    if (f.id === ID.famille) {
      premier.push(...ech.filter((e) => e.mois === '2026-10' && e.eleveId !== ID.fatoumata))
    }
    if (profil === 'retard') {
      payer(f.id, rentree.map((e) => ({ ech: e, montant: e.montant })), heureAleatoire(jRentree)!)
      continue
    }
    payer(f.id, premier.map((e) => ({ ech: e, montant: e.montant })), heureAleatoire(jRentree)!)
    // mois suivants
    for (const [mi, m] of MOIS_ECHEANCIER.entries()) {
      if (moisAvance.includes(m)) continue
      const dues = ech.filter((e) => e.mois === m)
      if (!dues.length) continue
      if (profil === 'avance' && mi % 3 === 0) {
        // paie le trimestre suivant d'un coup, avant la première échéance
        const trimestre = MOIS_ECHEANCIER.slice(mi, mi + 3)
        const jour = jourOuvrableProche(ajouterJours(`${m}-05`, -r.int(2, 9)))
        if (jour) payer(f.id, ech.filter((e) => e.mois && trimestre.includes(e.mois)).map((e) => ({ ech: e, montant: e.montant })), heureAleatoire(jour)!)
        continue
      }
      if (profil === 'avance') continue
      const decal = profil === 'regulier' ? r.int(-6, 4) : r.int(0, 14)
      const jour = jourOuvrableProche(ajouterJours(`${m}-05`, decal))
      if (!jour) continue
      const h = heureAleatoire(jour)
      if (!h) continue
      const items = dues
        .filter((e) => !(f.id === ID.famille && e.eleveId === ID.fatoumata && m <= mensualiteRetardFil()))
        .map((e) => ({ ech: e, montant: e.montant }))
      if (profil === 'irregulier' && r.chance(0.85)) {
        // paiement partiel : une partie de chaque ligne (l'échéance reste « partielle »)
        const part = r.pick([0.15, 0.2, 0.25, 0.3])
        payer(f.id, items.map((i) => ({ ech: i.ech, montant: Math.round((i.montant * part) / 1000) * 1000 })), h)
      } else payer(f.id, items, h)
    }
  }
  // famille fil rouge : la mensualité en retard de Fatoumata (la plus récente échue de plus de 15 jours)
  function mensualiteRetardFil(): string {
    let res = '2026-10'
    for (const m of MOIS_ECHEANCIER) if (ecartJours(jourDemo, `${m}-05`) > 15) res = m
    return res
  }
  // les mois antérieurs de Fatoumata sont payés en retard (s'il y en a)
  {
    const retard = mensualiteRetardFil()
    const anterieures = echeances.filter((e) => e.eleveId === ID.fatoumata && e.mois && e.mois < retard)
    for (const e of anterieures) {
      const d = jourOuvrableProche(ajouterJours(e.echeance, 9))
      if (d) payer(ID.famille, [{ ech: e, montant: e.montant }], heureAleatoire(d)!, MODES_MOBILE[0])
    }
  }

  // flux quotidien : chaque jour d'école, des familles régularisent un solde ou paient le mois suivant en avance
  for (const d of joursEcole) {
    if (d < '2026-10-08' || d >= jourDemo) continue
    const k = r.int(8, 15)
    let faits = 0
    for (const f of r.shuffle(familles.filter((x) => x.id !== ID.famille && (x.profilPaiement === 'regulier' || x.profilPaiement === 'irregulier')))) {
      if (faits >= k) break
      const avance = f.profilPaiement === 'regulier'
      const ech = (echParFamille[f.id] ?? []).filter((e) => e.echeance <= ajouterJours(d, 20) && resteA(e) > 0 && (!avance || e.echeance > d))
      if (!ech.length) continue
      const part = avance ? 1 : 0.3
      payer(f.id, ech.map((e) => ({ ech: e, montant: Math.round((resteA(e) * part) / 1000) * 1000 })), heureAleatoire(d)!)
      faits++
    }
  }

  // paiements du jour (avant l'heure de démo) : retardataires qui régularisent, avances
  {
    const deja = dejaPaye
    const heures = Math.max(0, (minutesNow - (7 * 60 + 45)) / 60)
    const nb = Math.round(heures * 6.5)
    const candidates = r.shuffle(familles.filter((f) => f.id !== ID.famille && (f.profilPaiement === 'irregulier' || f.profilPaiement === 'regulier')))
    let faits = 0
    for (const f of candidates) {
      if (faits >= nb) break
      const ech = (echParFamille[f.id] ?? []).filter((e) => e.echeance <= ajouterJours(jourDemo, 25) && (deja.get(e.id) ?? 0) < e.montant)
      if (!ech.length) continue
      const h = heureAleatoire(jourDemo)
      if (!h) break
      payer(f.id, ech.map((e) => ({ ech: e, montant: e.montant })), h)
      faits++
    }
  }

  // numérotation continue, chronologique, sans trou
  paiementsBruts.sort((a, b) => a.date.localeCompare(b.date))
  const paiements: T.Paiement[] = paiementsBruts.map((p, i) => ({ ...p, numero: 1001 + i }))

  // quelques reçus annulés (ils restent dans la série) et ré-émis
  const validations: T.DemandeValidation[] = []
  {
    const candidats = paiements.filter((p) => p.canal === 'guichet' && p.date < ajouterJours(jourDemo, -3) && p.date > '2026-09-10')
    const choisis = r.shuffle(candidats).slice(0, 3)
    const motifs = ['Erreur de famille à la saisie', 'Montant saisi en double', 'Chèque rejeté par la banque']
    choisis.forEach((p, i) => {
      const dateDemande = p.date.slice(0, 10) + 'T' + minutesEnHhmm(hhmmEnMinutes(p.date.slice(11, 16)) + 20) + ':00'
      const dateValid = ajouterJours(p.date.slice(0, 10), 1) + 'T09:12:00'
      p.statut = 'annule'
      p.annulation = { motif: motifs[i], demandeurId: p.caissierId ?? ID.caissier, date: dateDemande, valideurId: ID.direction, dateValidation: dateValid }
      validations.push({
        id: nid('VAL'), type: 'annulation_recu', objetId: p.id, libelle: `Annulation du reçu R-2026-${String(p.numero).padStart(6, "0")}`, motif: motifs[i],
        demandeurId: p.caissierId ?? ID.caissier, date: dateDemande, statut: 'approuvee', valideurId: ID.direction, dateDecision: dateValid,
      })
      // ré-émission correcte le lendemain (sauf chèque rejeté)
      if (i < 2) {
        paiements.push({ ...p, id: nid('PAY'), numero: 0, date: ajouterJours(p.date.slice(0, 10), 1) + 'T09:30:00', statut: 'valide', annulation: null, jeton: r.token(16) })
      }
    })
    paiements.sort((a, b) => a.date.localeCompare(b.date))
    // renumérotation après insertion des ré-émissions (les annulés gardent leur place)
    paiements.forEach((p, i) => (p.numero = 1001 + i))
  }
  // une annulation en attente de validation (apparaît dans les alertes de la direction)
  {
    const cand = paiements.filter((p) => p.canal === 'guichet' && p.statut === 'valide' && p.date.slice(0, 10) === ajouterJours(jourDemo, -1 - (jourSemaine(jourDemo) === 1 ? 2 : 0)))
    const p = cand[0]
    if (p) {
      p.statut = 'annulation_demandee'
      const d = p.date.slice(0, 10) + 'T16:40:00'
      p.annulation = { motif: 'Le parent a payé deux fois le même mois (doublon avec un paiement Orange Money)', demandeurId: p.caissierId ?? ID.caissier, date: d, valideurId: null, dateValidation: null }
      validations.push({ id: nid('VAL'), type: 'annulation_recu', objetId: p.id, libelle: `Annulation du reçu R-2026-${String(p.numero).padStart(6, "0")}`, motif: p.annulation.motif, demandeurId: p.annulation.demandeurId, date: d, statut: 'en_attente', valideurId: null, dateDecision: null })
    }
  }
  // une remise exceptionnelle en attente
  {
    const f = familles.find((x) => x.profilPaiement === 'retard' && (enfantsParFamille[x.id]?.length ?? 0) >= 2)
    if (f) {
      validations.push({
        id: nid('VAL'), type: 'remise_exceptionnelle', objetId: f.id, libelle: `Remise exceptionnelle de 20 % · famille ${f.nom}`,
        motif: 'Perte d’emploi du père en septembre ; la famille demande un étalement et une remise sur le premier trimestre.',
        demandeurId: ID.comptable, date: ajouterJours(jourDemo, -1) + 'T11:05:00', statut: 'en_attente', valideurId: null, dateDecision: null,
      })
    }
  }

  /* -------------------------------------------------- Clôtures de caisse */
  const clotures: T.ClotureCaisse[] = []
  for (const j of joursEcole) {
    if (j >= jourDemo) continue
    const especes = paiements.filter((p) => p.date.startsWith(j) && p.mode === 'especes' && p.statut !== 'annule').reduce((a, p) => a + p.montant, 0)
    if (!especes) continue
    const ecart = r.chance(0.12) ? -r.pick([500, 1000, 2000, 5000]) : 0
    clotures.push({
      id: nid('CLO'), date: j, heure: `17:${String(r.int(5, 40)).padStart(2, '0')}`, caissierId: ID.caissier,
      attenduEspeces: especes, compte: especes + ecart, ecart,
      justification: ecart ? r.pick(['Erreur de rendu de monnaie', 'Billet abîmé refusé à la banque', 'Pièce manquante, rendu de monnaie']) : '',
      comptage: ventiler(especes + ecart),
    })
  }
  function ventiler(montant: number): Record<string, number> {
    const res: Record<string, number> = {}
    let rest = montant
    for (const c of COUPURES) {
      const n = Math.floor(rest / c)
      res[String(c)] = n
      rest -= n * c
    }
    return res
  }

  /* --------------------------------------------------------------- Dépenses */
  const depenses: T.Depense[] = []
  {
    const moisDep = ['2026-09', ...MOIS_ECHEANCIER].filter((m) => `${m}-01` <= jourDemo)
    const masse = (cycle: T.Cycle | null) => personnel.filter((p) => p.cycle === cycle).reduce((a, p) => a + p.salaire, 0)
    for (const m of moisDep) {
      const fin = `${m}-28`
      if (fin <= jourDemo) {
        for (const c of [...CYCLES, null] as (T.Cycle | null)[]) {
          depenses.push({ id: nid('DEP'), date: fin, categorie: 'Salaires', libelle: `Salaires de ${moisLib(m)} · ${c ? cycleLib(c) : 'administration et services'}`, montant: masse(c), cycle: c, fournisseur: 'Personnel', piece: `etat-salaires-${m}.pdf`, saisiPar: ID.comptable })
        }
      }
      const add = (jour: number, cat: string, lib: string, montant: number, fournisseur: string, cycle: T.Cycle | null = null) => {
        const d = `${m}-${String(jour).padStart(2, '0')}`
        if (d < jourDemo) depenses.push({ id: nid('DEP'), date: d, categorie: cat, libelle: lib, montant, cycle, fournisseur, piece: r.chance(0.9) ? `facture-${r.int(1000, 9999)}.pdf` : null, saisiPar: ID.comptable })
      }
      for (const sem of [3, 10, 17, 24]) add(sem, 'Cantine et vivres', 'Achat de vivres pour la cantine (riz, huile, poisson, légumes)', r.int(170, 230) * 100_000, estSenegal ? 'Marché Castors' : 'Marché de Madina')
      add(6, 'Électricité et carburant groupe', 'Facture d’électricité', r.int(55, 75) * 100_000, estSenegal ? 'Senelec' : 'EDG')
      add(12, 'Électricité et carburant groupe', 'Gasoil du groupe électrogène', r.int(80, 110) * 100_000, estSenegal ? 'Total Énergies' : 'Station Total Kipé')
      add(8, 'Eau', 'Facture d’eau', r.int(12, 18) * 100_000, estSenegal ? 'Sen’Eau' : 'SEG')
      add(14, 'Transport scolaire', 'Carburant des minibus', r.int(90, 120) * 100_000, estSenegal ? 'Total Énergies' : 'Station Shell Hamdallaye')
      add(16, 'Internet et téléphone', 'Abonnement internet et forfaits', r.int(25, 32) * 100_000, estSenegal ? 'Orange Sénégal' : 'Orange Guinée')
      add(19, 'Entretien et réparations', r.pick(['Réparation de la pompe à eau', 'Peinture des salles de la maternelle', 'Remplacement de vitres', 'Entretien des climatiseurs']), r.int(15, 60) * 100_000, 'Établissements Kaba et frères')
      add(21, 'Santé et infirmerie', 'Médicaments et petit matériel de l’infirmerie', r.int(8, 15) * 100_000, 'Pharmacie du Centre')
      if (m === '2026-09') {
        add(9, 'Fournitures pédagogiques', 'Manuels et cahiers du primaire', 420 * 100_000, 'Librairie Universelle', 'primaire')
        add(11, 'Fournitures pédagogiques', 'Matériel de motricité et jeux d’éveil', 185 * 100_000, 'Bébé Confort Conakry', 'creche')
        add(15, 'Fournitures pédagogiques', 'Matériel de laboratoire et manuels du collège', 310 * 100_000, 'Librairie Universelle', 'college')
        add(18, 'Fournitures pédagogiques', 'Peinture, pâte à modeler et albums', 140 * 100_000, 'Papeterie du Port', 'maternelle')
      }
    }
  }

  /* ---------------------------------------------------- Évaluations et notes */
  const evaluations: T.Evaluation[] = []
  const notes: Record<string, T.Note> = {}
  const niveauEleve: Record<string, number> = {}
  for (const e of eleves) niveauEleve[e.id] = Math.min(0.95, Math.max(0.25, r.normal(0.62, 0.13)))
  niveauEleve[ID.ibrahima] = 0.86
  niveauEleve[ID.fatoumata] = 0.66

  const calendrier = {
    primaire: [
      { t: 1 as const, type: 'devoir' as const, titre: 'Devoir n° 1', debut: '2026-10-12' },
      { t: 1 as const, type: 'devoir' as const, titre: 'Devoir n° 2', debut: '2026-11-09' },
      { t: 1 as const, type: 'devoir' as const, titre: 'Devoir n° 3', debut: '2026-11-30' },
      { t: 1 as const, type: 'composition' as const, titre: 'Composition du 1er trimestre', debut: '2026-12-14' },
      { t: 2 as const, type: 'devoir' as const, titre: 'Devoir n° 1', debut: '2027-01-18' },
      { t: 2 as const, type: 'devoir' as const, titre: 'Devoir n° 2', debut: '2027-02-15' },
      { t: 2 as const, type: 'composition' as const, titre: 'Composition du 2e trimestre', debut: '2027-03-22' },
      { t: 3 as const, type: 'devoir' as const, titre: 'Devoir n° 1', debut: '2027-04-19' },
      { t: 3 as const, type: 'devoir' as const, titre: 'Devoir n° 2', debut: '2027-05-10' },
      { t: 3 as const, type: 'composition' as const, titre: 'Composition du 3e trimestre', debut: '2027-06-07' },
    ],
    college: [
      { t: 1 as const, type: 'devoir' as const, titre: 'Devoir n° 1', debut: '2026-10-13' },
      { t: 1 as const, type: 'devoir' as const, titre: 'Devoir n° 2', debut: '2026-11-16' },
      { t: 1 as const, type: 'composition' as const, titre: 'Composition du 1er trimestre', debut: '2026-12-07' },
      { t: 2 as const, type: 'devoir' as const, titre: 'Devoir n° 1', debut: '2027-01-18' },
      { t: 2 as const, type: 'devoir' as const, titre: 'Devoir n° 2', debut: '2027-02-15' },
      { t: 2 as const, type: 'composition' as const, titre: 'Composition du 2e trimestre', debut: '2027-03-15' },
      { t: 3 as const, type: 'devoir' as const, titre: 'Devoir n° 1', debut: '2027-04-19' },
      { t: 3 as const, type: 'devoir' as const, titre: 'Devoir n° 2', debut: '2027-05-10' },
      { t: 3 as const, type: 'composition' as const, titre: 'Composition du 3e trimestre', debut: '2027-06-01' },
    ],
  }
  const elevesParClasse: Record<string, T.Eleve[]> = {}
  for (const e of eleves) (elevesParClasse[e.classeId] ??= []).push(e)
  for (const list of Object.values(elevesParClasse)) list.sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom))

  const arrondir = (v: number, pas: number) => Math.round(v / pas) * pas
  for (const c of classes) {
    if (c.cycle !== 'primaire' && c.cycle !== 'college') continue
    const mats = c.cycle === 'primaire' ? MATIERES_PRIMAIRE : MATIERES_COLLEGE
    const sur = c.cycle === 'primaire' ? 10 : 20
    for (const cal of calendrier[c.cycle]) {
      for (const m of mats) {
        let date = ajouterJours(cal.debut, r.int(0, 4))
        while (jourSemaine(date) > 5) date = ajouterJours(date, 1)
        if (date >= jourDemo) continue
        const ev: T.Evaluation = { id: nid('EV'), classeId: c.id, matiereId: m.id, type: cal.type, titre: cal.titre, date, trimestre: cal.t, sur, publiee: true }
        evaluations.push(ev)
        const difficulte = r.normal(0, 0.06)
        for (const e of elevesParClasse[c.id]) {
          const absent = r.chance(0.025)
          const v = absent ? null : Math.min(sur, Math.max(0, arrondir((niveauEleve[e.id] + difficulte + r.normal(0, 0.1)) * sur, c.cycle === 'primaire' ? 0.5 : 0.25)))
          notes[`${ev.id}|${e.id}`] = { valeur: v, versions: [{ valeur: v, date: date + 'T17:30:00', auteurId: c.titulaireId ?? ID.maitre, motif: null }] }
        }
      }
    }
  }
  // la note corrigée (v1 → v2) de Fatoumata, en physique-chimie
  {
    const ev = evaluations.filter((e) => e.classeId === ID.classeFatoumata && e.matiereId === 'CO-PC').sort((a, b) => a.date.localeCompare(b.date))[0]
    if (ev) {
      const n = notes[`${ev.id}|${ID.fatoumata}`]
      const prof = profsParMatiere['CO-PC'][0]
      const dCorr = ajouterJours(ev.date, 3) + 'T10:20:00'
      notes[`${ev.id}|${ID.fatoumata}`] = {
        valeur: 14,
        versions: [
          { valeur: 12, date: ev.date + 'T17:30:00', auteurId: prof, motif: null },
          { valeur: 14, date: dCorr, auteurId: prof, motif: 'Erreur de report : l’exercice 3 n’avait pas été comptabilisé' },
        ],
      }
      void n
    }
  }
  // une case vide pour Ibrahima et l'évaluation du jour en calcul, à saisir pendant la démo
  {
    evaluations.push({ id: 'EV-DEMO-CALC', classeId: ID.classeIbrahima, matiereId: 'PR-CAL', type: 'devoir', titre: 'Contrôle de calcul mental', date: jourDemo, trimestre: trimestreDe(jourDemo), sur: 10, publiee: false })
    for (const e of elevesParClasse[ID.classeIbrahima]) {
      notes[`EV-DEMO-CALC|${e.id}`] = { valeur: null, versions: [] }
    }
  }

  // maternelle : compétences
  const competences: Record<string, T.NiveauCompetence> = {}
  const tCourant = trimestreDe(jourDemo)
  for (const c of classes.filter((x) => x.cycle === 'maternelle')) {
    for (const e of elevesParClasse[c.id]) {
      for (let t = 1; t <= tCourant; t++) {
        const avance = t < tCourant ? 1 : Math.min(1, Math.max(0.15, ecartJours(jourDemo, DEBUT_ANNEE) / 80))
        for (const comp of COMPETENCES_MATERNELLE) {
          let v: T.NiveauCompetence = 'NE'
          if (r.chance(avance)) {
            const p = niveauEleve[e.id] + c.niveauIndex * 0.08 + (t - 1) * 0.12
            v = r.weighted<T.NiveauCompetence>([['A', p * 60], ['EC', 35], ['PE', (1 - p) * 30]])
          }
          competences[`${e.id}|${comp.id}|${t}`] = v
        }
      }
    }
  }

  // bulletins : brouillon pour le trimestre courant, publiés pour les précédents
  const bulletins: T.Bulletin[] = []
  for (const c of classes.filter((x) => x.cycle !== 'creche')) {
    for (let t = 1 as 1 | 2 | 3; t <= tCourant; t = (t + 1) as 1 | 2 | 3) {
      const publie = t < tCourant
      bulletins.push({
        id: `${c.id}|${t}`, classeId: c.id, trimestre: t, statut: publie ? 'publie' : 'brouillon',
        versions: publie ? [{ numero: 1, date: (t === 1 ? '2026-12-21' : '2027-03-29') + 'T10:00:00', motif: 'Publication après le conseil de classe', auteurId: ID.direction }] : [],
      })
      if (t === 3) break
    }
  }

  /* ---------------------------------------------------- Emploi du temps */
  const creneaux: T.Creneau[] = []
  {
    const classesCo = classes.filter((c) => c.cycle === 'college')
    // affectation des professeurs : chaque professeur prend des classes entières
    const profDe: Record<string, string> = {}
    for (const m of MATIERES_COLLEGE) {
      const profs = profsParMatiere[m.id]
      classesCo.forEach((c, i) => {
        let p = profs[Math.floor((i * profs.length) / classesCo.length)]
        if (m.id === 'CO-MA') p = c.niveauIndex >= 2 ? ID.profMaths : profs[1]
        profDe[`${c.id}|${m.id}`] = p
      })
    }
    const slots: { jour: number; h: number }[] = []
    for (let jour = 1; jour <= 5; jour++)
      HORAIRES_COLLEGE.forEach((_, h) => {
        if (h >= 4 && !JOURS_APRES_MIDI.includes(jour)) return
        slots.push({ jour, h })
      })
    // générateur dédié : l'emploi du temps ne dépend pas du reste des tirages (rapide et stable)
    const rt = new Rng(CONFIG.GRAINE + 5)
    let essais = 0
    for (let essai = 0; essai < 3000; essai++) {
      essais = essai
      const plafond = essai < 1500 ? 0 : 1 // on assouplit la limite d'heures par jour si nécessaire
      const restant: Record<string, number> = {}
      for (const c of classesCo) for (const m of MATIERES_COLLEGE) restant[`${c.id}|${m.id}`] = m.heures
      const occupe = new Set<string>()
      const parJour = new Map<string, number>()
      const res: T.Creneau[] = []
      let ok = true
      for (const s of slots) {
        for (const c of rt.shuffle(classesCo)) {
          const options = MATIERES_COLLEGE.filter((m) => {
            const k = `${c.id}|${m.id}`
            if (restant[k] <= 0) return false
            if (occupe.has(`${profDe[k]}|${s.jour}|${s.h}`)) return false
            if ((parJour.get(`${k}|${s.jour}`) ?? 0) >= (m.heures >= 5 ? 2 : 1) + plafond) return false
            return true
          })
          if (!options.length) { ok = false; break }
          const max = Math.max(...options.map((m) => restant[`${c.id}|${m.id}`]))
          const m = rt.pick(options.filter((x) => restant[`${c.id}|${x.id}`] >= max - 1))
          const k = `${c.id}|${m.id}`
          restant[k]--
          occupe.add(`${profDe[k]}|${s.jour}|${s.h}`)
          parJour.set(`${k}|${s.jour}`, (parJour.get(`${k}|${s.jour}`) ?? 0) + 1)
          res.push({ id: `CR-${c.id}-${s.jour}-${s.h}`, classeId: c.id, jour: s.jour, debut: HORAIRES_COLLEGE[s.h].debut, fin: HORAIRES_COLLEGE[s.h].fin, matiereId: m.id, profId: profDe[k], salle: c.salle })
        }
        if (!ok) break
      }
      if (ok) { creneaux.push(...res); break }
    }
    void essais
  }
  // un conflit volontaire : un professeur de la même matière affecté par erreur à deux classes au même créneau
  {
    let fait = false
    for (const jour of [4, 2, 3, 1, 5]) {
      const tous = creneaux.filter((c) => c.jour === jour)
      for (const a of tous) {
        if (fait) break
        const b = a.profId === ID.profMaths ? undefined : tous.find((x) => x.debut === a.debut && x.classeId !== a.classeId && x.matiereId === a.matiereId && x.profId !== a.profId && x.profId !== ID.profMaths)
        if (b) { b.profId = a.profId; fait = true }
      }
      if (fait) break
    }
    if (!fait) {
      // sinon : un cours de la même matière déplacé par erreur sur un créneau où le professeur est déjà pris
      const a = creneaux.find((c) => c.jour === 4 && c.debut === '10:15' && c.profId !== ID.profMaths)
      const b = a && creneaux.find((c) => c.jour === 4 && c.debut === '10:15' && c.classeId !== a.classeId && c.profId !== ID.profMaths && creneaux.some((x) => x.classeId === c.classeId && x.matiereId === a.matiereId))
      if (a && b) { b.matiereId = a.matiereId; b.profId = a.profId }
    }
  }

  /* ------------------------------------------------------- Présences */
  const presences: Record<string, T.PresenceJour> = {}
  const absences: T.Absence[] = []
  const tauxAbsence: Record<string, number> = {}
  for (const e of eleves) tauxAbsence[e.id] = Math.max(0.005, Math.min(0.3, r.normal(0.068, 0.04)))
  tauxAbsence[ID.ibrahima] = 0.02
  tauxAbsence[ID.fatoumata] = 0.04
  tauxAbsence[ID.mariama] = 0.05
  const joursPasses = joursOuvres(DEBUT_ANNEE, ajouterJours(jourDemo, -1))
  const motifs = ['Maladie (paludisme)', 'Fièvre', 'Rendez-vous médical', 'Événement familial', 'Voyage familial', 'Maux de ventre']
  for (const j of joursPasses) {
    for (const e of eleves) {
      if (r.chance(tauxAbsence[e.id])) {
        const justifiee = r.chance(0.62)
        absences.push({
          id: nid('ABS'), eleveId: e.id, date: j, periode: r.chance(0.85) ? 'journee' : 'matin', creneauId: null, justifiee,
          motif: justifiee ? r.pick(motifs) : null, justificatif: justifiee && r.chance(0.5) ? 'certificat-medical.jpg' : null, source: 'portail',
        })
      }
    }
  }
  // un retard à justifier pour Fatoumata (côté parent)
  {
    const j = joursPasses[joursPasses.length - 3] ?? joursPasses[0]
    absences.push({ id: 'ABS-FIL', eleveId: ID.fatoumata, date: j, periode: 'matin', creneauId: null, justifiee: false, motif: null, justificatif: null, source: 'appel' })
  }

  // aujourd'hui
  const presentsAujourdhui = new Set<string>()
  for (const e of eleves) {
    const c = classeParId[e.classeId]
    const absent = [ID.mariama, ID.ibrahima, ID.fatoumata].includes(e.id as never) ? false : r.chance(c.cycle === 'creche' ? 0.09 : 0.06)
    let arrivee: string | null = null
    if (!absent) {
      const [mn, mx] = c.cycle === 'creche' ? [7 * 60 + 20, 8 * 60 + 50] : c.cycle === 'college' ? [7 * 60 + 5, 7 * 60 + 58] : [7 * 60 + 10, 8 * 60 + 5]
      const retard = r.chance(0.03)
      const m = retard ? r.int(mx, mx + 40) : r.int(mn, mx)
      if (e.id === ID.mariama) arrivee = '07:52'
      else if (e.id === ID.ibrahima) arrivee = '07:48'
      else if (e.id === ID.fatoumata) arrivee = '07:41'
      else arrivee = minutesEnHhmm(m)
      if (hhmmEnMinutes(arrivee) > minutesNow) arrivee = null
    }
    presences[e.id] = { eleveId: e.id, arrivee, depart: null, recupereParId: null }
    if (arrivee) presentsAujourdhui.add(e.id)
    else if (minutesNow > 8 * 60 + 30 && absent) {
      const justifiee = r.chance(0.35)
      absences.push({ id: nid('ABS'), eleveId: e.id, date: jourDemo, periode: 'journee', creneauId: null, justifiee, motif: justifiee ? r.pick(motifs) : null, justificatif: null, source: 'portail' })
    }
  }
  // départs de la mi-journée à la crèche
  if (minutesNow > 12 * 60 + 30) {
    for (const e of eleves.filter((x) => classeParId[x.classeId].cycle === 'creche' && presences[x.id].arrivee && x.id !== ID.mariama)) {
      if (r.chance(0.2)) {
        const f = familles.find((x) => x.id === e.familleId)!
        presences[e.id].depart = minutesEnHhmm(r.int(12 * 60 + 15, Math.min(minutesNow, 13 * 60 + 30)))
        presences[e.id].recupereParId = f.accompagnateurs[0]?.id ?? null
      }
    }
  }

  // adultes présents à la crèche
  const adultesCreche: Record<string, string[]> = {}
  for (const c of classes.filter((x) => x.cycle === 'creche')) {
    adultesCreche[c.id] = personnel.filter((p) => p.role === 'educatrice' && p.cycle === 'creche' && p.fonction.endsWith(c.nom)).map((p) => p.id)
    if (c.id === ID.classeMariama && !adultesCreche[c.id].includes(ID.educatrice)) adultesCreche[c.id].unshift(ID.educatrice)
  }

  /* ---------------------------------------------- Appels du collège */
  const appels: T.Appel[] = []
  const jd = jourSemaine(jourDemo)
  for (const cr of creneaux.filter((c) => c.jour === jd)) {
    if (hhmmEnMinutes(cr.debut) + 10 > minutesNow) continue
    if (cr.profId === ID.profMaths) continue // le cours de la professeure de démonstration reste à faire
    const absentsC = (elevesParClasse[cr.classeId] ?? []).filter((e) => !presences[e.id].arrivee).map((e) => e.id)
    const retards = r.chance(0.3) ? [r.pick(elevesParClasse[cr.classeId]).id].filter((id) => !absentsC.includes(id)) : []
    appels.push({ id: `${cr.id}|${jourDemo}`, creneauId: cr.id, date: jourDemo, absents: absentsC, retards, faitPar: cr.profId, heure: minutesEnHhmm(hhmmEnMinutes(cr.debut) + r.int(2, 8)) })
  }

  /* ----------------------------------------------------------- Incidents */
  const incidents: T.Incident[] = []
  {
    const elevesCo = eleves.filter((e) => classeParId[e.classeId].cycle === 'college' && e.familleId !== ID.famille)
    const types: [string, 1 | 2 | 3 | 4, string, string][] = [
      ['Retards répétés', 1, 'Trois retards dans la semaine.', 'Observation écrite'],
      ['Téléphone en classe', 1, 'Téléphone utilisé pendant le cours de français.', 'Téléphone confisqué, rendu aux parents'],
      ['Bavardages répétés', 1, 'Perturbe le cours malgré plusieurs rappels.', 'Observation écrite'],
      ['Devoir non rendu', 1, 'Deuxième devoir non rendu ce mois-ci.', 'Travail supplémentaire'],
      ['Insolence envers un professeur', 2, 'A répondu de manière irrespectueuse à la professeure d’anglais.', 'Avertissement de conduite'],
      ['Bagarre dans la cour', 3, 'Bagarre pendant la récréation, sans blessure.', 'Exclusion temporaire d’un jour'],
      ['Dégradation de matériel', 2, 'Table de la salle C3A gravée au compas.', 'Réparation et travail d’intérêt général'],
      ['Sortie sans autorisation', 3, 'A quitté l’établissement à 12 h 15 sans autorisation.', 'Convocation des parents'],
    ]
    const joursInc = joursPasses.slice(-15)
    for (let i = 0; i < 12; i++) {
      const [type, gravite, description, sanction] = r.pick(types)
      incidents.push({
        id: nid('INC'), eleveId: r.pick(elevesCo).id, date: r.pick(joursInc), type, gravite, description, sanction,
        auteurId: r.pick([ID.surveillant, ...personnel.filter((p) => p.role === 'professeur').slice(0, 5).map((p) => p.id)]), parentsPrevenus: r.chance(0.8),
      })
    }
    incidents.sort((a, b) => b.date.localeCompare(a.date))
  }

  /* -------------------------------------------------- Journal de la crèche */
  const journal: T.EntreeJournal[] = []
  const jalons: T.Jalon[] = []
  {
    const enfants = eleves.filter((e) => classeParId[e.classeId].cycle === 'creche')
    for (const e of enfants) {
      const p = presences[e.id]
      const c = classeParId[e.classeId]
      const auteur = adultesCreche[c.id][0]
      const f = familles.find((x) => x.id === e.familleId)!
      const add = (heure: string, type: T.TypeJournal, detail: string) => {
        if (hhmmEnMinutes(heure) <= minutesNow) journal.push({ id: nid('J'), eleveId: e.id, date: jourDemo, heure, type, detail, auteurId: auteur })
      }
      const fille = e.sexe === 'F'
      const elle = fille ? 'elle' : 'il'
      if (p.arrivee) {
        const acc = e.id === ID.mariama ? f.accompagnateurs.find((a) => a.id === ID.mere)! : r.pick(f.accompagnateurs)
        add(p.arrivee, 'arrivee', `Arrivée avec ${acc.lien === 'Mère' ? 'sa maman' : acc.lien === 'Père' ? 'son papa' : `${acc.lien.toLowerCase().startsWith('grand') || acc.lien === 'Oncle' || acc.lien === 'Chauffeur de la famille' ? 'son ' : 'sa '}${acc.lien.toLowerCase()}`}${e.id === ID.mariama ? ', de bonne humeur' : ''}`)
        const v = (n: number) => minutesEnHhmm(n + r.int(-5, 5))
        const siesteB = (debut: number, duree: number) =>
          add(minutesEnHhmm(debut), 'sieste', minutesNow < debut + duree ? `Sieste · ${fille ? 'endormie' : 'endormi'} à ${hFr(debut)}` : `Sieste de ${hFr(debut)} à ${hFr(debut + duree)}`)
        if (c.niveauIndex === 0) {
          add(v(9 * 60), 'repas', `Biberon de ${r.pick([150, 180, 210])} ml · tout bu`)
          add(v(9 * 60 + 30), 'change', 'Change · couche mouillée')
          siesteB(10 * 60 + r.int(-5, 5), r.int(50, 80))
          add(v(11 * 60 + 40), 'repas', r.pick(['Purée de patate douce · bien mangé', 'Bouillie de riz au lait · tout mangé', 'Compote de banane · la moitié']))
          add(v(12 * 60 + 20), 'change', 'Change · selles normales')
          siesteB(13 * 60 + r.int(-5, 5), r.int(80, 130))
          add(v(15 * 60 + 30), 'repas', `Biberon de ${r.pick([150, 180, 210])} ml · tout bu`)
        } else {
          const estMariama = e.id === ID.mariama
          add(v(9 * 60 + 15), 'repas', estMariama ? 'Collation : bouillie de mil et banane · a tout mangé' : r.pick(['Collation : bouillie de mil · a tout mangé', 'Collation : pain et lait · a bien mangé', 'Collation : banane et biscuit · la moitié']))
          add(v(9 * 60 + 45), 'activite', estMariama ? `Peinture aux doigts · ${elle} a peint un grand soleil jaune` : r.pick(['Comptines en français et en soussou', 'Jeux d’eau dans la cour', 'Lecture d’un imagier des animaux', 'Parcours de motricité', 'Pâte à modeler']))
          add(v(10 * 60 + 45), 'change', c.niveauIndex === 2 ? r.pick(['Passage au pot · réussi', 'Toilette et lavage des mains', 'Change · couche propre']) : 'Change · couche mouillée')
          add(v(11 * 60 + 45), 'repas', estMariama ? 'Déjeuner : riz au poisson et légumes, sans arachide · a tout mangé' : r.pick(['Déjeuner : riz au poisson · a tout mangé', 'Déjeuner : purée de pommes de terre et poulet · a bien mangé', 'Déjeuner : fonio au lait · a peu mangé']))
          {
            const debut = estMariama ? 12 * 60 + 40 : r.int(12 * 60 + 30, 12 * 60 + 50)
            const fin = estMariama ? 14 * 60 + 30 : debut + r.int(70, 120)
            const endormi = fille ? 'endormie' : 'endormi'
            add(minutesEnHhmm(debut), 'sieste', minutesNow < fin
              ? `Sieste · ${endormi} à ${hFr(debut)}${estMariama ? ' avec son doudou' : ''}`
              : `Sieste de ${hFr(debut)} à ${hFr(fin)}${estMariama ? ' · endormie avec son doudou' : ''}`)
          }
          add(v(15 * 60 + 30), 'repas', 'Goûter : yaourt et mangue')
          add(v(16 * 60), 'activite', r.pick(['Chants et danses', 'Jeux libres dans la cour', 'Histoire racontée']))
        }
        if (e.id !== ID.mariama && r.chance(0.05)) add(v(10 * 60 + 20), 'soin', `Température prise : 37,${r.int(4, 8)}\u00a0°C, parents informés`)
        if (e.id !== ID.mariama && r.chance(0.03)) add(v(10 * 60 + 50), 'incident', `Petite chute dans la cour, bosse au front · glace appliquée, ${elle} a vite repris ses jeux`)
      }
      const mois = ageEnMois(e.naissance)
      for (const jl of JALONS_CRECHE) {
        if (jl.moisMin > mois + 6) continue
        const atteint = jl.moisMin <= mois - 2 ? r.chance(0.92) : jl.moisMin <= mois ? r.chance(0.5) : false
        jalons.push({ id: nid('JAL'), eleveId: e.id, domaine: jl.domaine, libelle: jl.libelle, date: atteint ? ajouterJours(e.naissance, Math.round(jl.moisMin * 30.4 + r.int(-10, 40))) : null })
      }
    }
    journal.sort((a, b) => a.heure.localeCompare(b.heure))
  }

  /* --------------------------------------------------------------- Cartes */
  const cartes: T.Carte[] = []
  const carte = (type: T.Carte['type'], titulaireId: string, emise = '2026-09-28') => {
    const c: T.Carte = { id: nid('CAR'), type, titulaireId, jeton: r.token(16), statut: 'active', emiseLe: emise, remplaceId: null, motifDesactivation: null, imprimee: true }
    cartes.push(c)
    return c
  }
  for (const e of eleves) carte('eleve', e.id)
  for (const f of familles) for (const a of f.accompagnateurs) carte('accompagnateur', `${f.id}:${a.id}`)
  for (const p of personnel) carte('personnel', p.id)
  // quelques cartes perdues, désactivées puis remplacées
  for (const c of r.shuffle(cartes.filter((x) => x.type === 'eleve' && !(Object.values(ID) as string[]).includes(x.titulaireId))).slice(0, 4)) {
    c.statut = 'desactivee'
    c.motifDesactivation = 'Carte perdue, déclarée par les parents'
    const n = carte('eleve', c.titulaireId, ajouterJours(jourDemo, -r.int(2, 12)))
    n.remplaceId = c.id
  }

  /* ---------------------------------------------------------------- Scans */
  const scans: T.Scan[] = []
  {
    const carteEleve: Record<string, T.Carte> = {}
    for (const c of cartes) if (c.type === 'eleve' && c.statut === 'active') carteEleve[c.titulaireId] = c
    for (const e of eleves) {
      const p = presences[e.id]
      if (!p.arrivee) continue
      const c = carteEleve[e.id]
      scans.push({ id: nid('SC'), date: `${jourDemo}T${p.arrivee}:00`, jeton: c.jeton, carteId: c.id, lieu: 'Portail principal', resultat: 'autorise', motif: 'Entrée', eleveId: e.id, sens: 'entree' })
      if (p.depart) scans.push({ id: nid('SC'), date: `${jourDemo}T${p.depart}:00`, jeton: c.jeton, carteId: c.id, lieu: 'Portail principal', resultat: 'autorise', motif: 'Sortie avec un adulte autorisé', eleveId: e.id, sens: 'sortie' })
    }
    // une carte désactivée présentée hier
    const des = cartes.find((c) => c.statut === 'desactivee')
    if (des) scans.push({ id: nid('SC'), date: ajouterJours(jourDemo, -1) + 'T07:44:00', jeton: des.jeton, carteId: des.id, lieu: 'Portail principal', resultat: 'refuse', motif: 'Carte désactivée (déclarée perdue)', eleveId: des.titulaireId, sens: 'entree' })
    scans.sort((a, b) => a.date.localeCompare(b.date))
  }

  /* -------------------------------------------------------- Communication */
  const conversations: T.Conversation[] = []
  const messages: T.Message[] = []
  const maitreNom = personnel.find((p) => p.id === ID.maitre)!
  const educNom = personnel.find((p) => p.id === ID.educatrice)!
  const conv = (familleId: string, sujet: string, interlocuteur: string, fils: [T.Message['auteur'], string, string, string][]) => {
    const id = nid('CONV')
    conversations.push({ id, familleId, sujet, interlocuteur })
    fils.forEach(([auteur, nom, date, texte], i) => messages.push({ id: nid('MSG'), conversationId: id, auteur, auteurNom: nom, date, texte, lu: i < fils.length - 1 || auteur === 'ecole' }))
  }
  const hier = ajouterJours(jourDemo, -1)
  const avantHier = ajouterJours(jourDemo, -2)
  const mereFil = `${FIL.mere.prenom} ${FIL.mere.nom}`
  conv(ID.famille, `Lecture d’Ibrahima`, `${maitreNom.prenom} ${maitreNom.nom} · maître de ${classeParId[ID.classeIbrahima].nom}`, [
    ['ecole', `${maitreNom.prenom} ${maitreNom.nom}`, `${avantHier}T16:05:00`, 'Bonjour Madame. Ibrahima lit très bien à voix haute, mais il faut l’encourager à lire un peu chaque soir pour gagner en vitesse. Merci.'],
    ['parent', mereFil, `${avantHier}T19:22:00`, 'Bonsoir Monsieur, merci pour votre message. Nous lirons ensemble 15 minutes chaque soir.'],
    ['ecole', `${maitreNom.prenom} ${maitreNom.nom}`, `${hier}T12:40:00`, 'Parfait. Je lui ai prêté un livre de la bibliothèque de classe, « Le lion et le lièvre ».'],
  ])
  conv(ID.famille, 'Doudou de Mariama', `${educNom.prenom} ${educNom.nom} · groupe des Grands`, [
    ['parent', mereFil, `${hier}T07:58:00`, 'Bonjour, Mariama a oublié son doudou hier soir à la crèche. Pouvez-vous le garder pour aujourd’hui ?'],
    ['ecole', `${educNom.prenom} ${educNom.nom}`, `${hier}T08:10:00`, 'Bonjour Madame, il est bien rangé dans son casier. Elle l’aura pour la sieste.'],
  ])
  const autresFamilles = r.shuffle(familles.filter((f) => f.id !== ID.famille)).slice(0, 14)
  const sujets: [string, string, string][] = [
    ['Absence de demain', 'Bonjour, notre fils sera absent demain pour un rendez-vous à l’hôpital Donka. Merci de prévenir son maître.', 'Bien reçu, merci de nous transmettre le justificatif à son retour.'],
    ['Reçu de paiement', 'Bonjour, je n’ai pas reçu le reçu de mon paiement Orange Money de ce matin.', 'Bonjour, le reçu est disponible dans votre espace parent, rubrique Paiements. Nous vous l’avons aussi renvoyé par SMS.'],
    ['Transport', 'Le minibus est passé très tôt ce matin, à 6 h 35. Est-ce normal ?', 'Bonjour, il y a eu un changement d’ordre des arrêts cette semaine. Le chauffeur passera à 6 h 50 à partir de demain.'],
    ['Cantine', 'Ma fille ne mange pas de poisson. Est-il possible de prévoir autre chose ?', 'Bonjour, c’est noté sur sa fiche. La cuisine lui proposera une alternative.'],
    ['Rendez-vous', 'Bonjour, je souhaiterais rencontrer la maîtresse au sujet des devoirs.', 'Bonjour, la maîtresse vous propose jeudi à 15 h 30. Cela vous convient-il ?'],
    ['Tenue scolaire', 'Bonjour, la taille 10 ans est-elle de nouveau disponible ?', 'Bonjour, oui, le secrétariat l’a reçue hier.'],
  ]
  autresFamilles.forEach((f, i) => {
    const [sujet, q, rep] = sujets[i % sujets.length]
    const p = f.responsable === 'mere' ? f.mere! : (f.pere ?? f.mere!)
    const j = ajouterJours(jourDemo, -r.int(0, 6))
    const lim = j === jourDemo ? minutesNow - 20 : 18 * 60
    const tq = r.int(7 * 60, Math.min(9 * 60 + 30, lim - 30))
    const fils: [T.Message['auteur'], string, string, string][] = [['parent', `${p.prenom} ${p.nom}`, `${j}T${minutesEnHhmm(tq)}:00`, q]]
    if (i % 3 !== 0) fils.push(['ecole', 'Secrétariat', `${j}T${minutesEnHhmm(Math.min(lim, tq + r.int(25, 150)))}:00`, rep])
    conv(f.id, sujet, 'Secrétariat', fils)
  })

  const annonces: T.Annonce[] = [
    { id: nid('ANN'), date: ajouterJours(jourDemo, -1) + 'T15:30:00', titre: 'Réunion parents-professeurs du collège', texte: 'La réunion parents-professeurs du collège aura lieu samedi à 9 h dans la grande salle. Les bulletins de mi-trimestre y seront commentés.', cible: 'Collège', auteurId: ID.direction, canaux: ['Espace parent', 'WhatsApp'], lectures: 198, destinataires: 245 },
    { id: nid('ANN'), date: ajouterJours(jourDemo, -3) + 'T10:00:00', titre: 'Journée de vaccination à la crèche', texte: 'Une équipe du centre de santé passera jeudi matin pour la vaccination de rappel. Merci d’apporter le carnet de santé.', cible: 'Crèche', auteurId: ID.infirmier, canaux: ['Espace parent', 'SMS'], lectures: 33, destinataires: 36 },
    { id: nid('ANN'), date: ajouterJours(jourDemo, -6) + 'T11:20:00', titre: 'Nouveaux menus de la cantine', texte: 'Les menus du mois sont en ligne. Une option sans arachide est proposée chaque jour.', cible: 'Toute l’école', auteurId: ID.cantine, canaux: ['Espace parent'], lectures: 512, destinataires: 600 },
    { id: nid('ANN'), date: ajouterJours(jourDemo, -9) + 'T09:00:00', titre: 'Photo de classe', texte: 'Le photographe passera la semaine prochaine. Tenue scolaire complète exigée.', cible: 'Toute l’école', auteurId: ID.secretaire, canaux: ['Espace parent', 'WhatsApp'], lectures: 547, destinataires: 600 },
  ]
  const classesPrimaire = classes.filter((c) => c.cycle === 'primaire')
  const autorisations: T.Autorisation[] = [
    { id: 'AUT-SORTIE', titre: estSenegal ? 'Sortie au musée des Civilisations noires' : 'Sortie au Musée national de Sandervalia', description: 'Visite guidée en car, départ 8 h 30, retour 12 h 30. Goûter fourni par l’école.', date: ajouterJours(jourDemo, 8), limite: ajouterJours(jourDemo, 4), classeIds: classesPrimaire.filter((c) => c.niveauIndex === 3).map((c) => c.id), reponses: {} },
    { id: 'AUT-PHOTO', titre: 'Droit à l’image pour le site de l’école', description: 'Autorisez-vous l’école à publier des photos de groupe où votre enfant apparaît ?', date: ajouterJours(jourDemo, 20), limite: ajouterJours(jourDemo, 10), classeIds: classes.map((c) => c.id), reponses: {} },
  ]
  for (const a of autorisations) for (const cid of a.classeIds) for (const e of elevesParClasse[cid] ?? []) if (e.familleId !== ID.famille && r.chance(0.6)) a.reponses[e.id] = r.chance(0.92) ? 'oui' : 'non'

  const liaisons: T.Liaison[] = [
    { id: nid('LIA'), classeId: ID.classeIbrahima, eleveId: null, date: hier + 'T15:00:00', auteurId: ID.maitre, texte: 'Apporter une boîte d’allumettes vide pour l’atelier de calcul de jeudi.', signe: false },
    { id: nid('LIA'), classeId: ID.classeIbrahima, eleveId: ID.ibrahima, date: avantHier + 'T15:10:00', auteurId: ID.maitre, texte: 'Très bon travail en géométrie cette semaine. Bravo Ibrahima !', signe: true },
    { id: nid('LIA'), classeId: ID.classeFatoumata, eleveId: null, date: hier + 'T12:00:00', auteurId: ID.profMaths, texte: 'Devoir de mathématiques à rendre lundi : exercices 4 à 7, page 52.', signe: false },
  ]

  const notifications: T.Notification[] = [
    { id: nid('NOT'), date: `${jourDemo}T07:52:00`, titre: 'Mariama est arrivée à la crèche', texte: 'Arrivée à 7 h 52, déposée par sa maman.', cible: 'parent', niveau: 'succes', lien: '/parent/creche', lu: true },
    { id: nid('NOT'), date: `${hier}T15:00:00`, titre: 'Nouveau mot dans le cahier de liaison', texte: `${maitreNom.prenom} ${maitreNom.nom} : apporter une boîte d’allumettes vide.`, cible: 'parent', niveau: 'info', lien: '/parent/messages', lu: false },
    { id: nid('NOT'), date: `${hier}T09:00:00`, titre: 'Mensualité en retard', texte: `La scolarité de Fatoumata (${moisLib(mensualiteRetardFil())}) reste à régler.`, cible: 'parent', niveau: 'attention', lien: '/parent/paiements', lu: false },
    { id: nid('NOT'), date: `${jourDemo}T08:15:00`, titre: 'Clôture de caisse d’hier validée', texte: 'Écart nul. Comptage signé par le caissier.', cible: 'ecole', niveau: 'succes', lien: '/caisse/cloture', lu: true },
    { id: nid('NOT'), date: `${hier}T16:40:00`, titre: 'Annulation de reçu à valider', texte: 'Une demande d’annulation attend votre décision.', cible: 'ecole', niveau: 'attention', lien: '/validations', lu: false },
  ]

  /* ---------------------------------------------------------------- Audit */
  const audit: T.Audit[] = []
  const nomPers = (id: string) => {
    const p = personnel.find((x) => x.id === id)
    return p ? `${p.prenom} ${p.nom}` : 'Système'
  }
  const rolePers = (id: string) => personnel.find((x) => x.id === id)?.fonction ?? 'Système'
  const auditAdd = (date: string, userId: string, type: string, action: string, objet: string, eleveId: string | null = null, avant: Record<string, unknown> | null = null, apres: Record<string, unknown> | null = null) =>
    audit.push({ id: nid('AUD'), date, userId, userNom: nomPers(userId), role: rolePers(userId), type, action, objet, eleveId, avant, apres })
  for (const p of paiements.filter((x) => x.date >= ajouterJours(jourDemo, -2) + 'T00:00:00')) {
    const f = familles.find((x) => x.id === p.familleId)!
    auditAdd(p.date, p.caissierId ?? 'SYS-MOBILE', 'Paiement', p.canal === 'parent' ? 'Paiement mobile reçu' : p.canal === 'banque' ? 'Virement reçu' : 'Paiement encaissé', `R-2026-${String(p.numero).padStart(6, '0')} · famille ${f.nom}`, null, null, { montant: p.montant, mode: p.mode, recu: `R-2026-${String(p.numero).padStart(6, '0')}` })
    if (!p.caissierId) {
      const a = audit[audit.length - 1]
      a.userNom = p.payeur
      a.role = p.canal === 'banque' ? 'Virement bancaire' : 'Parent · paiement mobile'
    }
  }
  for (const v of validations) {
    auditAdd(v.date, v.demandeurId, 'Validation', 'Demande de validation', v.libelle, null, null, { motif: v.motif })
    if (v.statut === 'approuvee' && v.dateDecision) auditAdd(v.dateDecision, v.valideurId!, 'Validation', 'Annulation approuvée', v.libelle, null, { statut: 'valide' }, { statut: 'annulé' })
  }
  {
    const ev = evaluations.find((e) => e.classeId === ID.classeFatoumata && e.matiereId === 'CO-PC')
    const n = ev && notes[`${ev.id}|${ID.fatoumata}`]
    if (ev && n && n.versions[1]) auditAdd(n.versions[1].date, n.versions[1].auteurId, 'Note', 'Note corrigée', `Physique-chimie · ${ev.titre}`, ID.fatoumata, { note: 12, version: 1 }, { note: 14, version: 2, motif: n.versions[1].motif })
  }
  for (const c of clotures.slice(-5)) auditAdd(`${c.date}T${c.heure}:00`, c.caissierId, 'Caisse', 'Caisse clôturée', `Journée du ${c.date.split('-').reverse().join('/')}`, null, null, { attendu: c.attenduEspeces, compte: c.compte, ecart: c.ecart })
  for (const s of scans.filter((x) => x.resultat !== 'autorise')) auditAdd(s.date, ID.portail, 'Portail', 'Carte refusée au portail', s.motif, s.eleveId)
  for (const inc of incidents.slice(0, 5)) auditAdd(`${inc.date}T11:${String(r.int(10, 59))}:00`, inc.auteurId, 'Discipline', 'Incident enregistré', inc.type, inc.eleveId, null, { gravite: inc.gravite, sanction: inc.sanction })
  const connexions = [ID.direction, ID.caissier, ID.secretaire, ID.comptable, ID.maitre, ID.educatrice, ID.portail, ID.surveillant]
  for (const u of connexions) auditAdd(`${jourDemo}T${minutesEnHhmm(Math.min(minutesNow - 5, r.int(7 * 60 + 10, 7 * 60 + 50)))}:00`, u, 'Connexion', 'Connexion', 'Ouverture de session', null)
  auditAdd(`${jourDemo}T${minutesEnHhmm(Math.min(minutesNow - 3, 8 * 60 + 15))}:00`, ID.comptable, 'Caisse', 'Rapprochement mobile money', `${paiements.filter((p) => p.rapproche && MODES_MOBILE.includes(p.mode)).length} opérations rapprochées`, null)
  audit.sort((a, b) => a.date.localeCompare(b.date))

  /* ------------------------------------------- Demandes d'inscription */
  const demandesInscription: T.DemandeInscription[] = []
  {
    const statuts: T.DemandeInscription['statut'][] = ['nouvelle', 'nouvelle', 'nouvelle', 'entretien', 'entretien', 'acceptee', 'acceptee', 'liste_attente', 'refusee', 'inscrit', 'inscrit', 'nouvelle', 'entretien', 'acceptee']
    statuts.forEach((statut, i) => {
      const cycle = r.weighted<T.Cycle>([['creche', 3], ['maternelle', 4], ['primaire', 4], ['college', 3]])
      const sexe: 'F' | 'M' = r.chance(0.5) ? 'F' : 'M'
      const nom = nomFamille()
      const niv = r.pick(STRUCTURE[cycle].niveaux)
      const ageBase = cycle === 'creche' ? 1 : cycle === 'maternelle' ? 3 + STRUCTURE.maternelle.niveaux.indexOf(niv) : cycle === 'primaire' ? 6 + STRUCTURE.primaire.niveaux.indexOf(niv) : 12 + STRUCTURE.college.niveaux.indexOf(niv)
      demandesInscription.push({
        id: `DI-${String(2026100 + i)}`, date: ((j) => j + `T${minutesEnHhmm(j === jourDemo ? r.int(7 * 60, minutesNow - 5) : r.int(8 * 60, 21 * 60))}:00`)(ajouterJours(jourDemo, -r.int(0, 25))), enfantPrenom: prenom(sexe), enfantNom: nom,
        naissance: `${2026 - ageBase}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`, sexe, niveauSouhaite: niv, cycle,
        parentNom: `${r.pick(NOMS.prenomsF)} ${nomFamille()}`, parentTel: tel(), quartier: r.pick(NOMS.quartiers),
        ecoleActuelle: cycle === 'creche' ? 'Garde à la maison' : r.pick(estSenegal ? ['École Les Pédagogues', 'Cours Sainte-Marie', 'École publique de Mermoz'] : ['École Les Petits Génies', 'Groupe scolaire La Source', 'École primaire de Kipé Centre', 'Complexe scolaire Les Élites']),
        statut, source: r.chance(0.7) ? 'en_ligne' : 'guichet', note: statut === 'entretien' ? `Entretien prévu le ${ajouterJours(jourDemo, r.int(1, 6)).split('-').reverse().join('/')}` : '',
      })
    })
    demandesInscription.sort((a, b) => b.date.localeCompare(a.date))
  }

  /* ----------------------------------------------------- Santé, personnel */
  const visites: T.VisiteInfirmerie[] = []
  {
    const motifsV: [string, string, string][] = [
      ['Maux de tête', 'Repos 20 minutes, eau', 'Retour en classe'],
      ['Fièvre 38,4\u00a0°C', 'Paracétamol selon protocole, parents appelés', 'Récupéré par les parents'],
      ['Égratignure au genou', 'Désinfection et pansement', 'Retour en classe'],
      ['Maux de ventre', 'Repos, tisane', 'Retour en classe'],
      ['Saignement de nez', 'Compression, repos', 'Retour en classe'],
      ['Crise d’asthme légère', 'Ventoline (traitement personnel), surveillance', 'Retour en classe après 30 minutes'],
      ['Piqûre d’insecte', 'Crème apaisante', 'Retour en classe'],
    ]
    for (let i = 0; i < 22; i++) {
      const [motif, soin, suite] = r.pick(motifsV)
      const j = r.pick(joursPasses.slice(-12).concat([jourDemo]))
      const h = j === jourDemo ? minutesEnHhmm(r.int(8 * 60 + 30, Math.max(8 * 60 + 31, minutesNow - 10))) : minutesEnHhmm(r.int(8 * 60 + 30, 15 * 60 + 30))
      visites.push({ id: nid('VIS'), eleveId: r.pick(eleves.filter((e) => classeParId[e.classeId].cycle !== 'creche' && e.familleId !== ID.famille)).id, date: `${j}T${h}:00`, motif, soin, suite, auteurId: ID.infirmier })
    }
    visites.sort((a, b) => b.date.localeCompare(a.date))
  }
  const pointages: T.Pointage[] = personnel.filter((p) => p.role !== 'promoteur').map((p) => {
    const st = r.weighted<T.Pointage['statut']>([['present', 90], ['retard', 5], ['absent', 3], ['conge', 2]])
    const arr = st === 'present' ? minutesEnHhmm(r.int(6 * 60 + 50, 7 * 60 + 40)) : st === 'retard' ? minutesEnHhmm(r.int(7 * 60 + 50, 8 * 60 + 40)) : null
    return { personnelId: p.id, date: jourDemo, arrivee: arr && hhmmEnMinutes(arr) <= minutesNow ? arr : null, depart: null, statut: [ID.educatrice, ID.maitre, ID.profMaths, ID.portail, ID.caissier, ID.direction, ID.secretaire, ID.comptable, ID.surveillant].includes(p.id as never) ? 'present' : st }
  })
  for (const p of pointages) if (p.statut === 'present' && !p.arrivee) p.arrivee = '07:20'
  const remplacements: T.Remplacement[] = []
  {
    const absentProf = pointages.find((p) => p.statut === 'absent' && personnel.find((x) => x.id === p.personnelId)?.role === 'professeur')
    if (absentProf) {
      const crs = creneaux.filter((c) => c.profId === absentProf.personnelId && c.jour === jd).map((c) => c.id)
      remplacements.push({ id: nid('REM'), date: jourDemo, absentId: absentProf.personnelId, remplacantId: null, creneauIds: crs, motif: 'Maladie, certificat transmis' })
    }
  }

  const plats = estSenegal
    ? [['Thiéboudienne', 'Riz au poisson et légumes'], ['Yassa poulet', 'Riz blanc'], ['Mafé', 'Riz blanc'], ['Thiou poisson', 'Riz blanc'], ['Soupe kandia', 'Riz blanc']]
    : [['Riz sauce arachide', 'Option sans arachide : riz au poisson'], ['Fouti', 'Sauce feuilles de manioc'], ['Riz au gras', 'Poulet et légumes'], ['Soupe de poisson', 'Pain et riz blanc'], ['Fonio au poisson', 'Sauce tomate']]
  const desserts = ['Banane', 'Orange', 'Mangue', 'Papaye', 'Yaourt']
  const menus: T.MenuJour[] = []
  {
    const lundi = ajouterJours(jourDemo, -(jourSemaine(jourDemo) - 1))
    for (let i = 0; i < 10; i++) {
      const d = ajouterJours(lundi, i < 5 ? i : i + 2)
      menus.push({ date: d, plat: plats[i % 5][0], accompagnement: plats[i % 5][1], dessert: desserts[(i * 2) % 5] })
    }
  }

  const relances: T.Relance[] = []
  {
    const fam = familles.filter((f) => f.profilPaiement === 'retard').slice(0, 10)
    for (const f of fam) relances.push({ id: nid('REL'), familleId: f.id, date: ajouterJours(jourDemo, -r.int(3, 9)) + 'T10:00:00', canal: r.chance(0.7) ? 'whatsapp' : 'sms', message: 'Rappel automatique de mensualité', auteurId: ID.comptable, montant: 0 })
  }

  return {
    classes, eleves, familles, personnel, evaluations, notes, competences, bulletins, decisions: [], creneaux, appels, absences, incidents,
    journal, jalons, presences, adultesCreche, cartes, scans, echeances, paiements, depenses, clotures, relances, plans: [], validations,
    conversations, messages, annonces, autorisations, liaisons, notifications, audit, demandesInscription, circuits, visites, pointages,
    remplacements, menus,
    parametres: { afficherRang: true, relanceAuto: false, delaiGrace: 15, remiseFratrie: 10, doubleValidation: true, tarifs: { ...tarifs } },
    compteurs: { recu: 1001 + paiements.length, matricule: { ...matriculeCompteur }, id: idSeq },
  }
}

function hFr(m: number) {
  const hh = Math.floor(m / 60)
  const mm = String(Math.floor(m % 60)).padStart(2, '0')
  return `${hh}\u00a0h\u00a0${mm}`
}
function moisLib(m: string) {
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const [a, mo] = m.split('-').map(Number)
  return `${noms[mo - 1]} ${a}`
}
function cycleLib(c: T.Cycle) {
  return { creche: 'crèche', maternelle: 'maternelle', primaire: 'primaire', college: 'collège' }[c]
}
