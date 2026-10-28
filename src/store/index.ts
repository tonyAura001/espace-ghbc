/**
 * Store unique de la démonstration (Zustand).
 * Chaque action modifie l'état ET écrit dans le journal d'audit (ajout seul).
 * `reinitialiser()` régénère toutes les données (même graine) sans recharger la page.
 */
import { create } from 'zustand'
import { genererDonnees, ID, type Donnees } from '../data/generer'
import type * as T from '../data/types'
import { profilParId } from './profils'
import { JOUR_DEMO, heureDemo, maintenant, minutesDemo, minutesEnHhmm, trimestreDe, MOIS_ECHEANCIER } from '../lib/temps'
import { money, numeroRecu } from '../lib/format'
import {
  indexEleves, indexFamilles, nomPersonnel, situationFamille, indexClasses, nomEleve, elevesParClasse, indexEcheances, matiere,
} from './selecteurs'
import { LIBELLE_ECHEANCE, LIBELLE_MODE, MODES_MOBILE } from '../data/referentiel'
import { CONFIG, PAYS_DATA } from '../config'

export interface Toast {
  id: string
  titre: string
  texte?: string
  niveau: 'succes' | 'info' | 'attention' | 'alerte'
}

export type EcranParent = 'accueil' | 'creche' | 'notes' | 'absences' | 'paiements' | 'messages' | 'autorisations' | 'recu' | 'payer' | 'conversation' | 'bulletin'

export interface Session {
  deverrouille: boolean
  connecte: boolean
  profilId: string
  parent: { ecran: EcranParent; enfantId: string; paiementId: string | null; conversationId: string | null; historique: EcranParent[] }
  eleveEcran: 'accueil' | 'edt' | 'devoirs' | 'notes'
}

export interface Ui {
  toasts: Toast[]
  rechercheOuverte: boolean
  badgeDemo: boolean
  presentation: { ouverte: boolean; etape: number; sous: number; minuteur: boolean; debut: number | null; debutEtape: number | null }
  vueDouble: boolean
  fluxActif: boolean
  version: number
  derniereActivite: string[] // ids des dernières lignes d'audit à mettre en valeur
}

export interface Actions {
  deverrouiller: () => void
  connecter: (profilId: string) => void
  changerProfil: (profilId: string) => void
  deconnecter: () => void
  reinitialiser: () => void

  toast: (t: Omit<Toast, 'id'>) => void
  fermerToast: (id: string) => void
  setUi: (p: Partial<Ui>) => void
  setPresentation: (p: Partial<Ui['presentation']>) => void
  allerParent: (ecran: EcranParent, opts?: { enfantId?: string; paiementId?: string; conversationId?: string }) => void
  retourParent: () => void
  setEleveEcran: (e: Session['eleveEcran']) => void

  encaisser: (p: { familleId: string; lignes: T.LignePaiement[]; mode: T.ModePaiement; reference: string | null; payeur: string; canal: T.Paiement['canal'] }) => T.Paiement | null
  demanderAnnulation: (paiementId: string, motif: string) => void
  deciderValidation: (validationId: string, approuver: boolean) => void
  cloturerCaisse: (comptage: Record<string, number>, attendu: number, justification: string) => void
  rapprocher: (ids: string[]) => void
  envoyerRelances: (familleIds: string[], canal: T.Relance['canal'], modele: (f: T.Famille) => string) => void
  creerPlan: (familleId: string, versements: { date: string; montant: number }[]) => void
  ajouterDepense: (d: Omit<T.Depense, 'id' | 'saisiPar'>) => void

  saisirNote: (evaluationId: string, eleveId: string, valeur: number | null, motif?: string) => void
  creerEvaluation: (e: Omit<T.Evaluation, 'id' | 'publiee'>) => string
  publierEvaluation: (evaluationId: string) => void
  changerStatutBulletin: (classeId: string, trimestre: 1 | 2 | 3, statut: T.Bulletin['statut'], motif?: string) => void
  setCompetence: (eleveId: string, competenceId: string, trimestre: number, v: T.NiveauCompetence) => void
  enregistrerDecision: (d: T.DecisionConseil) => void

  ajouterJournal: (eleveIds: string[], type: T.TypeJournal, detail: string) => void
  remettreEnfant: (eleveId: string, accompagnateurId: string) => void
  refuserSortie: (eleveId: string, personne: string, lien: string) => void
  scanner: (jeton: string, sens: 'entree' | 'sortie') => T.Scan
  setAdultesCreche: (classeId: string, ids: string[]) => void

  faireAppel: (creneauId: string, absents: string[], retards: string[]) => void
  justifierAbsence: (absenceId: string, motif: string, justificatif: string | null) => void
  ajouterIncident: (i: Omit<T.Incident, 'id' | 'auteurId' | 'date'>) => void

  inscrire: (p: InscriptionPayload) => { eleve: T.Eleve; carte: T.Carte }
  majDemande: (id: string, statut: T.DemandeInscription['statut'], note?: string) => void
  ajouterDemande: (d: Omit<T.DemandeInscription, 'id' | 'date' | 'statut' | 'source' | 'note'>) => string

  desactiverCarte: (carteId: string, motif: string) => T.Carte
  imprimerCartes: (ids: string[]) => void
  consulterSante: (eleveId: string) => void
  ajouterVisite: (v: Omit<T.VisiteInfirmerie, 'id' | 'auteurId' | 'date'>) => void

  envoyerMessage: (conversationId: string, texte: string, auteur: 'parent' | 'ecole') => void
  publierAnnonce: (a: Omit<T.Annonce, 'id' | 'date' | 'auteurId' | 'lectures'>) => void
  repondreAutorisation: (autorisationId: string, eleveId: string, rep: 'oui' | 'non') => void
  signerLiaison: (id: string) => void
  ajouterLiaison: (l: Omit<T.Liaison, 'id' | 'date' | 'auteurId' | 'signe'>) => void
  lireNotifications: (cible: 'ecole' | 'parent') => void

  affecterRemplacant: (remplacementId: string, profId: string) => void
  majParametres: (p: Partial<Donnees['parametres']>) => void
  exporter: (quoi: string) => void
  journaliser: (type: string, action: string, objet: string, eleveId?: string | null, avant?: Record<string, unknown> | null, apres?: Record<string, unknown> | null) => void

  tickFlux: () => void
}

export interface InscriptionPayload {
  enfant: { prenom: string; nom: string; sexe: 'F' | 'M'; naissance: string; classeId: string; cantine: boolean; circuitId: string | null; allergies: string[]; groupeSanguin: string; remarques: string }
  familleId: string | null
  nouvelleFamille: { pere: T.Parent | null; mere: T.Parent | null; responsable: 'pere' | 'mere'; quartier: string; autres: { prenom: string; nom: string; lien: string; tel: string }[] } | null
  tenue: boolean
  demandeId: string | null
}

export type Etat = Donnees & { session: Session; ui: Ui } & Actions

const sessionInitiale = (): Session => ({
  deverrouille: lireDeverrouille(),
  connecte: false,
  profilId: 'direction',
  parent: { ecran: 'accueil', enfantId: ID.mariama, paiementId: null, conversationId: null, historique: [] },
  eleveEcran: 'accueil',
})

function lireDeverrouille(): boolean {
  try {
    return sessionStorage.getItem('ghbc-ok') === '1'
  } catch {
    return false
  }
}

const uiInitiale = (): Ui => ({
  toasts: [],
  rechercheOuverte: false,
  badgeDemo: true,
  presentation: { ouverte: false, etape: 0, sous: 0, minuteur: true, debut: null, debutEtape: null },
  vueDouble: false,
  fluxActif: true,
  version: 0,
  derniereActivite: [],
})

let seq = 0
const uid = (p: string) => `${p}-R${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`
const jetonAleatoire = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 16; i++) s += a[Math.floor(Math.random() * a.length)]
  return s
}

export const useStore = create<Etat>()((set, get) => {
  /** Ajoute une ligne au journal d'audit avec l'utilisateur courant. */
  const audit = (type: string, action: string, objet: string, eleveId: string | null = null, avant: Record<string, unknown> | null = null, apres: Record<string, unknown> | null = null, userIdForce?: string, nomForce?: string, roleForce?: string) => {
    const s = get()
    const prof = profilParId(s.session.profilId)
    const userId = userIdForce ?? prof.userId
    const ligne: T.Audit = {
      id: uid('AUD'), date: maintenant(), userId, userNom: nomForce ?? nomPersonnel(s, userId),
      role: roleForce ?? (userIdForce === 'PARENT-FIL' ? 'Parent' : userIdForce === 'SYS-MOBILE' ? 'Paiement mobile' : userIdForce === 'SYS' ? 'Système' : prof.libelle),
      type, action, objet, eleveId, avant, apres,
    }
    set((st) => ({ audit: [...st.audit, ligne], ui: { ...st.ui, derniereActivite: [ligne.id, ...st.ui.derniereActivite].slice(0, 6) } }))
  }
  const notifier = (n: Omit<T.Notification, 'id' | 'date' | 'lu'>) => {
    set((st) => ({ notifications: [{ ...n, id: uid('NOT'), date: maintenant(), lu: false }, ...st.notifications] }))
  }
  const toast = (t: Omit<Toast, 'id'>) => {
    const id = uid('T')
    set((st) => ({ ui: { ...st.ui, toasts: [...st.ui.toasts, { ...t, id }].slice(-4) } }))
    setTimeout(() => get().fermerToast(id), 4800)
  }
  const estFil = (familleId: string) => familleId === ID.famille

  return {
    ...genererDonnees(),
    session: sessionInitiale(),
    ui: uiInitiale(),

    /* -------------------------------------------------------- Session */
    deverrouiller: () => {
      try { sessionStorage.setItem('ghbc-ok', '1') } catch { /* navigation privée */ }
      set((s) => ({ session: { ...s.session, deverrouille: true } }))
    },
    connecter: (profilId) => {
      set((s) => ({ session: { ...s.session, connecte: true, profilId } }))
      audit('Connexion', 'Connexion', `Ouverture de session · ${profilParId(profilId).libelle}`)
    },
    changerProfil: (profilId) => {
      if (get().session.profilId === profilId) return
      set((s) => ({ session: { ...s.session, profilId, connecte: true } }))
      audit('Connexion', 'Changement de profil', `Session ouverte · ${profilParId(profilId).libelle}`)
    },
    deconnecter: () => set((s) => ({ session: { ...s.session, connecte: false } })),
    reinitialiser: () => {
      const s = get()
      set({
        ...genererDonnees(),
        session: { ...sessionInitiale(), deverrouille: true, connecte: s.session.connecte, profilId: 'direction' },
        ui: { ...uiInitiale(), badgeDemo: s.ui.badgeDemo, presentation: { ...s.ui.presentation, etape: 0, sous: 0, debut: s.ui.presentation.ouverte ? Date.now() : null, debutEtape: Date.now() }, fluxActif: s.ui.fluxActif, version: s.ui.version + 1 },
      })
    },

    toast,
    fermerToast: (id) => set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } })),
    setUi: (p) => set((s) => ({ ui: { ...s.ui, ...p } })),
    setPresentation: (p) => set((s) => ({ ui: { ...s.ui, presentation: { ...s.ui.presentation, ...p } } })),
    allerParent: (ecran, opts = {}) =>
      set((s) => ({
        session: {
          ...s.session,
          parent: {
            ...s.session.parent,
            ecran,
            enfantId: opts.enfantId ?? s.session.parent.enfantId,
            paiementId: opts.paiementId ?? s.session.parent.paiementId,
            conversationId: opts.conversationId ?? s.session.parent.conversationId,
            historique: ecran === 'accueil' ? [] : [...s.session.parent.historique, s.session.parent.ecran].slice(-8),
          },
        },
      })),
    retourParent: () =>
      set((s) => {
        const h = [...s.session.parent.historique]
        const prev = h.pop() ?? 'accueil'
        return { session: { ...s.session, parent: { ...s.session.parent, ecran: prev, historique: h } } }
      }),
    setEleveEcran: (e) => set((s) => ({ session: { ...s.session, eleveEcran: e } })),

    /* -------------------------------------------------------- Finance */
    encaisser: ({ familleId, lignes, mode, reference, payeur, canal }) => {
      const s = get()
      const lignesOk = lignes.filter((l) => l.montant > 0)
      if (!lignesOk.length) return null
      const f = indexFamilles(s.familles)[familleId]
      const avant = situationFamille(s, familleId)
      const prof = profilParId(s.session.profilId)
      const p: T.Paiement = {
        id: uid('PAY'), numero: s.compteurs.recu, familleId, date: maintenant(),
        montant: lignesOk.reduce((a, l) => a + l.montant, 0), mode, reference, canal,
        caissierId: canal === 'guichet' ? prof.userId : null, payeur, lignes: lignesOk, statut: 'valide', jeton: jetonAleatoire(),
        annulation: null, rapproche: !MODES_MOBILE.includes(mode),
      }
      set((st) => ({ paiements: [...st.paiements, p], compteurs: { ...st.compteurs, recu: st.compteurs.recu + 1 } }))
      const apres = situationFamille(get(), familleId)
      audit('Paiement', canal === 'parent' ? 'Paiement mobile reçu' : 'Paiement encaissé', `${numeroRecu(p.numero)} · famille ${f.nom} · ${money(p.montant)}`, null,
        { resteDu: avant?.resteEchu ?? 0, enRetard: avant?.enRetard ?? 0 }, { resteDu: apres?.resteEchu ?? 0, enRetard: apres?.enRetard ?? 0, mode: LIBELLE_MODE[mode], recu: numeroRecu(p.numero) },
        canal === 'parent' ? (estFil(familleId) ? 'PARENT-FIL' : 'SYS-MOBILE') : undefined, canal === 'parent' ? payeur : undefined, canal === 'parent' ? `Parent · ${LIBELLE_MODE[mode]}` : undefined)
      if (estFil(familleId)) {
        notifier({ cible: 'parent', titre: 'Paiement reçu', texte: `${money(p.montant)} · reçu ${numeroRecu(p.numero)} disponible`, niveau: 'succes', lien: '/parent/paiements' })
      }
      if (canal === 'parent') {
        notifier({ cible: 'ecole', titre: `Paiement ${LIBELLE_MODE[mode]} reçu`, texte: `Famille ${f.nom} · ${money(p.montant)}`, niveau: 'succes', lien: '/caisse/recus' })
      }
      return p
    },
    demanderAnnulation: (paiementId, motif) => {
      const s = get()
      const p = s.paiements.find((x) => x.id === paiementId)
      if (!p || p.statut !== 'valide') return
      const prof = profilParId(s.session.profilId)
      const v: T.DemandeValidation = {
        id: uid('VAL'), type: 'annulation_recu', objetId: p.id, libelle: `Annulation du reçu ${numeroRecu(p.numero)}`, motif,
        demandeurId: prof.userId, date: maintenant(), statut: 'en_attente', valideurId: null, dateDecision: null,
      }
      set((st) => ({
        paiements: st.paiements.map((x) => (x.id === p.id ? { ...x, statut: 'annulation_demandee', annulation: { motif, demandeurId: prof.userId, date: v.date, valideurId: null, dateValidation: null } } : x)),
        validations: [...st.validations, v],
      }))
      audit('Validation', 'Annulation demandée', `${numeroRecu(p.numero)} · ${money(p.montant)}`, null, { statut: 'valide' }, { statut: 'annulation demandée', motif })
      notifier({ cible: 'ecole', titre: 'Annulation de reçu à valider', texte: `${numeroRecu(p.numero)} · ${motif}`, niveau: 'attention', lien: '/validations' })
    },
    deciderValidation: (validationId, approuver) => {
      const s = get()
      const v = s.validations.find((x) => x.id === validationId)
      if (!v || v.statut !== 'en_attente') return
      const prof = profilParId(s.session.profilId)
      const d = maintenant()
      set((st) => ({ validations: st.validations.map((x) => (x.id === v.id ? { ...x, statut: approuver ? 'approuvee' : 'refusee', valideurId: prof.userId, dateDecision: d } : x)) }))
      if (v.type === 'annulation_recu') {
        set((st) => ({
          paiements: st.paiements.map((x) =>
            x.id === v.objetId
              ? approuver
                ? { ...x, statut: 'annule', annulation: { ...x.annulation!, valideurId: prof.userId, dateValidation: d } }
                : { ...x, statut: 'valide', annulation: null }
              : x,
          ),
        }))
        audit('Validation', approuver ? 'Annulation approuvée' : 'Annulation refusée', v.libelle, null, { statut: 'annulation demandée' }, { statut: approuver ? 'annulé (reste dans la série)' : 'valide', ecritureInverse: approuver })
      } else if (v.type === 'remise_exceptionnelle') {
        if (approuver) {
          const pm = new Set(s.paiements.flatMap((p) => p.lignes.map((l) => l.echeanceId)))
          const cibles = MOIS_ECHEANCIER.filter((m) => trimestreDe(`${m}-01`) === trimestreDe(JOUR_DEMO))
          set((st) => ({
            echeances: st.echeances.map((e) =>
              e.familleId === v.objetId && e.type === 'scolarite' && e.mois && cibles.includes(e.mois) && !pm.has(e.id)
                ? { ...e, remise: Math.round(e.montantBrut * 0.2), montant: e.montantBrut - Math.round(e.montantBrut * 0.2), motifRemise: 'Remise exceptionnelle 20 % (validée par la Direction)' }
                : e,
            ),
          }))
        }
        audit('Validation', approuver ? 'Remise approuvée' : 'Remise refusée', v.libelle, null, null, { decision: approuver ? 'approuvée' : 'refusée' })
      } else {
        audit('Validation', approuver ? 'Demande approuvée' : 'Demande refusée', v.libelle)
      }
      toast({ titre: approuver ? 'Demande approuvée' : 'Demande refusée', texte: v.libelle, niveau: approuver ? 'succes' : 'info' })
    },
    cloturerCaisse: (comptage, attendu, justification) => {
      const compte = Object.entries(comptage).reduce((a, [c, n]) => a + Number(c) * n, 0)
      const prof = profilParId(get().session.profilId)
      const c: T.ClotureCaisse = { id: uid('CLO'), date: JOUR_DEMO, heure: heureDemo(), caissierId: prof.userId, attenduEspeces: attendu, compte, ecart: compte - attendu, justification, comptage }
      set((st) => ({ clotures: [...st.clotures, c] }))
      audit('Caisse', 'Caisse clôturée', `Journée du ${JOUR_DEMO.split('-').reverse().join('/')}`, null, null, { attendu, compte, ecart: compte - attendu, justification: justification || '—' })
      notifier({ cible: 'ecole', titre: 'Caisse clôturée', texte: `Écart : ${money(compte - attendu)}`, niveau: compte === attendu ? 'succes' : 'attention', lien: '/caisse/cloture' })
    },
    rapprocher: (ids) => {
      set((st) => ({ paiements: st.paiements.map((p) => (ids.includes(p.id) ? { ...p, rapproche: true } : p)) }))
      audit('Caisse', 'Rapprochement mobile money', `${ids.length} opérations rapprochées avec le relevé`)
    },
    envoyerRelances: (familleIds, canal, modele) => {
      const s = get()
      const prof = profilParId(s.session.profilId)
      const ifa = indexFamilles(s.familles)
      const nouvelles: T.Relance[] = familleIds.map((fid) => ({
        id: uid('REL'), familleId: fid, date: maintenant(), canal, message: modele(ifa[fid]), auteurId: prof.userId, montant: situationFamille(s, fid)?.enRetard ?? 0,
      }))
      set((st) => ({ relances: [...st.relances, ...nouvelles] }))
      audit('Relance', `Relance ${canal === 'whatsapp' ? 'WhatsApp' : canal === 'sms' ? 'SMS' : 'téléphonique'} envoyée`, `${familleIds.length} famille${familleIds.length > 1 ? 's' : ''} · ${familleIds.slice(0, 3).map((f) => ifa[f].nom).join(', ')}${familleIds.length > 3 ? '…' : ''}`, null, null, { canal, familles: familleIds.length })
      if (familleIds.some(estFil)) notifier({ cible: 'parent', titre: 'Rappel de paiement', texte: 'Un message de l’école vous attend sur WhatsApp.', niveau: 'attention', lien: '/parent/paiements' })
    },
    creerPlan: (familleId, versements) => {
      const prof = profilParId(get().session.profilId)
      const plan: T.PlanPaiement = { id: uid('PLAN'), familleId, date: maintenant(), montant: versements.reduce((a, v) => a + v.montant, 0), versements, statut: 'actif', auteurId: prof.userId }
      set((st) => ({ plans: [...st.plans, plan] }))
      audit('Finance', 'Plan de paiement accordé', `Famille ${indexFamilles(get().familles)[familleId].nom} · ${versements.length} versements`, null, null, { montant: plan.montant })
    },
    ajouterDepense: (d) => {
      const prof = profilParId(get().session.profilId)
      const dep: T.Depense = { ...d, id: uid('DEP'), saisiPar: prof.userId }
      set((st) => ({ depenses: [...st.depenses, dep] }))
      audit('Finance', 'Dépense enregistrée', `${d.libelle} · ${money(d.montant)}`, null, null, { categorie: d.categorie, piece: d.piece ?? 'aucune' })
    },

    /* ------------------------------------------------------ Pédagogie */
    saisirNote: (evaluationId, eleveId, valeur, motif) => {
      const s = get()
      const k = `${evaluationId}|${eleveId}`
      const ev = s.evaluations.find((e) => e.id === evaluationId)!
      const prec = s.notes[k]
      const prof = profilParId(s.session.profilId)
      if (prec && prec.valeur === valeur) return
      const v: T.VersionNote = { valeur, date: maintenant(), auteurId: prof.userId, motif: motif ?? null }
      const nouvelleVersion = ev.publiee && prec && prec.versions.length > 0
      const versions = nouvelleVersion ? [...prec.versions, v] : [v]
      set((st) => ({ notes: { ...st.notes, [k]: { valeur, versions } } }))
      const e = indexEleves(s.eleves)[eleveId]
      audit('Note', nouvelleVersion ? 'Note corrigée' : 'Note saisie', `${matiere(ev.matiereId).nom} · ${ev.titre} · ${nomEleve(e)}`, eleveId,
        prec ? { note: prec.valeur ?? 'vide', version: prec.versions.length || 1 } : null,
        { note: valeur ?? 'vide', version: versions.length, ...(motif ? { motif } : {}) })
    },
    creerEvaluation: (e) => {
      const id = uid('EV')
      set((st) => ({ evaluations: [...st.evaluations, { ...e, id, publiee: false }] }))
      const eleves = elevesParClasse(get().eleves)[e.classeId] ?? []
      set((st) => {
        const notes = { ...st.notes }
        for (const el of eleves) notes[`${id}|${el.id}`] = { valeur: null, versions: [] }
        return { notes }
      })
      audit('Note', 'Évaluation créée', `${matiere(e.matiereId).nom} · ${e.titre} · ${indexClasses(get().classes)[e.classeId].nom}`)
      return id
    },
    publierEvaluation: (evaluationId) => {
      const s = get()
      const ev = s.evaluations.find((e) => e.id === evaluationId)!
      set((st) => ({ evaluations: st.evaluations.map((e) => (e.id === evaluationId ? { ...e, publiee: true } : e)) }))
      audit('Note', 'Notes publiées aux familles', `${matiere(ev.matiereId).nom} · ${ev.titre} · ${indexClasses(s.classes)[ev.classeId].nom}`)
      if (ev.classeId === ID.classeIbrahima || ev.classeId === ID.classeFatoumata) {
        const enfant = ev.classeId === ID.classeIbrahima ? 'Ibrahima' : 'Fatoumata'
        notifier({ cible: 'parent', titre: `Nouvelle note pour ${enfant}`, texte: `${matiere(ev.matiereId).nom} · ${ev.titre}`, niveau: 'info', lien: '/parent/notes' })
      }
    },
    changerStatutBulletin: (classeId, trimestre, statut, motif) => {
      const s = get()
      const id = `${classeId}|${trimestre}`
      const prof = profilParId(s.session.profilId)
      const b = s.bulletins.find((x) => x.id === id)
      const avant = b?.statut ?? 'brouillon'
      set((st) => ({
        bulletins: st.bulletins.some((x) => x.id === id)
          ? st.bulletins.map((x) =>
              x.id === id
                ? { ...x, statut, versions: statut === 'publie' ? [...x.versions, { numero: x.versions.length + 1, date: maintenant(), motif: motif ?? (x.versions.length ? 'Nouvelle version après correction' : 'Première publication'), auteurId: prof.userId }] : x.versions }
                : x,
            )
          : [...st.bulletins, { id, classeId, trimestre, statut, versions: [] }],
      }))
      audit('Bulletin', statut === 'valide' ? 'Bulletins validés' : statut === 'publie' ? 'Bulletins publiés aux familles' : 'Bulletins rouverts', `${indexClasses(s.classes)[classeId].nom} · trimestre ${trimestre}`, null, { statut: avant }, { statut })
      if (statut === 'publie' && (classeId === ID.classeIbrahima || classeId === ID.classeFatoumata)) {
        notifier({ cible: 'parent', titre: 'Bulletin disponible', texte: `Bulletin du ${trimestre === 1 ? '1er' : trimestre + 'e'} trimestre de ${classeId === ID.classeIbrahima ? 'Ibrahima' : 'Fatoumata'}`, niveau: 'info', lien: '/parent/notes' })
      }
    },
    setCompetence: (eleveId, competenceId, trimestre, v) => {
      const k = `${eleveId}|${competenceId}|${trimestre}`
      const avant = get().competences[k] ?? 'NE'
      set((st) => ({ competences: { ...st.competences, [k]: v } }))
      audit('Compétence', 'Compétence évaluée', `${nomEleve(indexEleves(get().eleves)[eleveId])}`, eleveId, { niveau: avant }, { niveau: v })
    },
    enregistrerDecision: (d) => {
      set((st) => ({ decisions: [...st.decisions.filter((x) => !(x.eleveId === d.eleveId && x.trimestre === d.trimestre)), d] }))
      audit('Conseil', 'Décision du conseil de classe', nomEleve(indexEleves(get().eleves)[d.eleveId]), d.eleveId, null, { distinction: d.distinction || '—', avertissement: d.avertissement || '—' })
    },

    /* --------------------------------------------------------- Crèche */
    ajouterJournal: (eleveIds, type, detail) => {
      const prof = profilParId(get().session.profilId)
      const heure = heureDemo()
      const entrees: T.EntreeJournal[] = eleveIds.map((id) => ({ id: uid('J'), eleveId: id, date: JOUR_DEMO, heure, type, detail, auteurId: prof.userId }))
      set((st) => ({ journal: [...st.journal, ...entrees] }))
      const ie = indexEleves(get().eleves)
      audit('Crèche', 'Journal du jour', `${detail} · ${eleveIds.map((i) => ie[i].prenom).join(', ')}`, eleveIds.length === 1 ? eleveIds[0] : null)
      if (eleveIds.includes(ID.mariama)) {
        notifier({ cible: 'parent', titre: 'Journée de Mariama', texte: detail, niveau: type === 'incident' || type === 'soin' ? 'attention' : 'info', lien: '/parent/creche' })
      }
    },
    remettreEnfant: (eleveId, accompagnateurId) => {
      const s = get()
      const e = indexEleves(s.eleves)[eleveId]
      const f = indexFamilles(s.familles)[e.familleId]
      const a = f.accompagnateurs.find((x) => x.id === accompagnateurId)!
      const heure = heureDemo()
      set((st) => ({ presences: { ...st.presences, [eleveId]: { ...st.presences[eleveId], depart: heure, recupereParId: accompagnateurId } } }))
      get().ajouterJournal([eleveId], 'depart', `Départ avec ${a.prenom} ${a.nom} (${a.lien.toLowerCase()}), carte vérifiée`)
      const carte = s.cartes.find((c) => c.type === 'accompagnateur' && c.titulaireId === `${f.id}:${a.id}` && c.statut === 'active')
      set((st) => ({ scans: [...st.scans, { id: uid('SC'), date: maintenant(), jeton: carte?.jeton ?? '', carteId: carte?.id ?? null, lieu: 'Crèche', resultat: 'autorise', motif: `Remise à ${a.prenom} ${a.nom} (${a.lien.toLowerCase()})`, eleveId, sens: 'sortie' }] }))
      audit('Portail', 'Enfant remis à un adulte autorisé', `${nomEleve(e)} → ${a.prenom} ${a.nom} (${a.lien.toLowerCase()})`, eleveId, { present: true }, { present: false, recuperePar: `${a.prenom} ${a.nom}` })
    },
    refuserSortie: (eleveId, personne, lien) => {
      const s = get()
      const e = indexEleves(s.eleves)[eleveId]
      const sc: T.Scan = { id: uid('SC'), date: maintenant(), jeton: '', carteId: null, lieu: 'Portail principal', resultat: 'alerte', motif: `${personne}${lien ? ` (${lien.toLowerCase()})` : ''} n’est pas autorisé à récupérer l’enfant`, eleveId, sens: 'sortie' }
      set((st) => ({ scans: [...st.scans, sc] }))
      audit('Portail', 'Sortie refusée · adulte non autorisé', `${nomEleve(e)} · ${personne}`, eleveId, null, { resultat: 'refusée', alerte: 'Direction et famille prévenues' })
      const f = indexFamilles(s.familles)[e.familleId]
      const p = f.responsable === 'mere' ? f.mere : f.pere
      notifier({ cible: 'ecole', titre: `Sortie refusée · ${e.prenom} ${e.nom}`, texte: `${personne} s’est présenté sans autorisation. ${p ? `${p.prenom} ${p.nom}` : 'La famille'} a été prévenue.`, niveau: 'alerte', lien: '/portail' })
      if (estFil(e.familleId)) {
        notifier({ cible: 'parent', titre: `Alerte sécurité · ${e.prenom}`, texte: `${personne} s’est présenté pour récupérer ${e.prenom}. Sortie refusée : cette personne n’est pas sur votre liste. ${e.prenom} est en sécurité avec son éducatrice.`, niveau: 'alerte', lien: '/parent/creche' })
      }
    },
    scanner: (jeton, sens) => {
      const s = get()
      const carte = s.cartes.find((c) => c.jeton === jeton)
      let sc: T.Scan
      if (!carte) sc = { id: uid('SC'), date: maintenant(), jeton, carteId: null, lieu: 'Portail principal', resultat: 'refuse', motif: 'Carte inconnue', eleveId: null, sens }
      else if (carte.statut !== 'active') sc = { id: uid('SC'), date: maintenant(), jeton, carteId: carte.id, lieu: 'Portail principal', resultat: 'refuse', motif: `Carte désactivée · ${carte.motifDesactivation ?? ''}`, eleveId: carte.type === 'eleve' ? carte.titulaireId : null, sens }
      else sc = { id: uid('SC'), date: maintenant(), jeton, carteId: carte.id, lieu: 'Portail principal', resultat: 'autorise', motif: sens === 'entree' ? 'Entrée' : 'Sortie', eleveId: carte.type === 'eleve' ? carte.titulaireId : null, sens }
      set((st) => ({ scans: [...st.scans, sc] }))
      if (sc.eleveId && sc.resultat === 'autorise' && sens === 'entree' && !s.presences[sc.eleveId]?.arrivee) {
        set((st) => ({ presences: { ...st.presences, [sc.eleveId!]: { ...st.presences[sc.eleveId!], arrivee: heureDemo() } }, absences: st.absences.filter((a) => !(a.eleveId === sc.eleveId && a.date === JOUR_DEMO && a.periode === 'journee' && !a.justifiee)) }))
      }
      audit('Portail', sc.resultat === 'autorise' ? 'Carte scannée' : 'Carte refusée au portail', `${carte ? (carte.type === 'eleve' ? nomEleve(indexEleves(s.eleves)[carte.titulaireId]) : carte.type === 'personnel' ? nomPersonnel(s, carte.titulaireId) : 'Carte accompagnateur') : 'Carte inconnue'} · ${sc.motif}`, sc.eleveId)
      return sc
    },
    setAdultesCreche: (classeId, ids) => {
      const avant = get().adultesCreche[classeId]?.length ?? 0
      set((st) => ({ adultesCreche: { ...st.adultesCreche, [classeId]: ids } }))
      audit('Crèche', 'Encadrement mis à jour', indexClasses(get().classes)[classeId].nom, null, { adultes: avant }, { adultes: ids.length })
    },

    /* --------------------------------------------------- Vie scolaire */
    faireAppel: (creneauId, absents, retards) => {
      const s = get()
      const prof = profilParId(s.session.profilId)
      const cr = s.creneaux.find((c) => c.id === creneauId)!
      const a: T.Appel = { id: `${creneauId}|${JOUR_DEMO}`, creneauId, date: JOUR_DEMO, absents, retards, faitPar: prof.userId, heure: heureDemo() }
      const nouvelles: T.Absence[] = absents.map((eid) => ({ id: uid('ABS'), eleveId: eid, date: JOUR_DEMO, periode: 'cours', creneauId, justifiee: false, motif: null, justificatif: null, source: 'appel' }))
      set((st) => ({ appels: [...st.appels.filter((x) => x.id !== a.id), a], absences: [...st.absences.filter((x) => !(x.creneauId === creneauId && x.date === JOUR_DEMO)), ...nouvelles] }))
      const ie = indexEleves(s.eleves)
      audit('Appel', 'Appel effectué', `${matiere(cr.matiereId).nom} · ${indexClasses(s.classes)[cr.classeId].nom} · ${cr.debut.replace(':', ' h ')}`, null, null, { absents: absents.length, retards: retards.length, noms: absents.map((x) => nomEleve(ie[x])).join(', ') || '—' })
      if (absents.length) notifier({ cible: 'ecole', titre: `Appel ${indexClasses(s.classes)[cr.classeId].nom} · ${absents.length} absent${absents.length > 1 ? 's' : ''}`, texte: `${matiere(cr.matiereId).nom}, ${absents.map((x) => ie[x].prenom + ' ' + ie[x].nom).join(', ')}. Familles prévenues par SMS.`, niveau: 'attention', lien: '/vie-scolaire' })
      if (absents.includes(ID.fatoumata)) notifier({ cible: 'parent', titre: 'Absence de Fatoumata', texte: `Absente au cours de ${matiere(cr.matiereId).nom.toLowerCase()} (${cr.debut.replace(':', ' h ')}). Merci de justifier.`, niveau: 'alerte', lien: '/parent/absences' })
    },
    justifierAbsence: (absenceId, motif, justificatif) => {
      const a = get().absences.find((x) => x.id === absenceId)
      if (!a) return
      set((st) => ({ absences: st.absences.map((x) => (x.id === absenceId ? { ...x, justifiee: true, motif, justificatif } : x)) }))
      audit('Absence', 'Absence justifiée', `${nomEleve(indexEleves(get().eleves)[a.eleveId])} · ${a.date.split('-').reverse().join('/')}`, a.eleveId, { justifiee: false }, { justifiee: true, motif, justificatif: justificatif ?? 'aucun' }, get().session.profilId === 'parent' ? 'PARENT-FIL' : undefined)
      if (get().session.profilId === 'parent') notifier({ cible: 'ecole', titre: 'Justificatif reçu', texte: `${nomEleve(indexEleves(get().eleves)[a.eleveId])} · ${motif}`, niveau: 'info', lien: '/vie-scolaire' })
    },
    ajouterIncident: (i) => {
      const prof = profilParId(get().session.profilId)
      const inc: T.Incident = { ...i, id: uid('INC'), auteurId: prof.userId, date: JOUR_DEMO }
      set((st) => ({ incidents: [inc, ...st.incidents] }))
      audit('Discipline', 'Incident enregistré', `${i.type} · ${nomEleve(indexEleves(get().eleves)[i.eleveId])}`, i.eleveId, null, { gravite: i.gravite, sanction: i.sanction })
    },

    /* ----------------------------------------------------- Inscriptions */
    inscrire: (p) => {
      const s = get()
      const annee = '2026'
      const n = (s.compteurs.matricule[annee] ?? 100) + 1
      const matricule = `${annee}-${String(n).padStart(5, '0')}`
      let familleId = p.familleId
      let familles = s.familles
      if (!familleId && p.nouvelleFamille) {
        const nf = p.nouvelleFamille
        familleId = uid('F')
        const accompagnateurs: T.Accompagnateur[] = []
        if (nf.mere) accompagnateurs.push({ id: uid('A'), prenom: nf.mere.prenom, nom: nf.mere.nom, lien: 'Mère', tel: nf.mere.tel, autorise: true })
        if (nf.pere) accompagnateurs.push({ id: uid('A'), prenom: nf.pere.prenom, nom: nf.pere.nom, lien: 'Père', tel: nf.pere.tel, autorise: true })
        for (const a of nf.autres) accompagnateurs.push({ id: uid('A'), ...a, autorise: true })
        familles = [...familles, { id: familleId, nom: p.enfant.nom, pere: nf.pere, mere: nf.mere, responsable: nf.responsable, quartier: nf.quartier, accompagnateurs, profilPaiement: 'regulier' }]
      }
      const c = indexClasses(s.classes)[p.enfant.classeId]
      const freres = (s.eleves.filter((e) => e.familleId === familleId && e.statut === 'actif')).length
      const eleve: T.Eleve = {
        id: uid('E'), matricule, prenom: p.enfant.prenom, nom: p.enfant.nom, sexe: p.enfant.sexe, naissance: p.enfant.naissance, classeId: c.id,
        familleId: familleId!, statut: 'actif', nouveau: true, redoublant: false, cantine: p.enfant.cantine, circuitId: p.enfant.circuitId, garderie: false, bourse: 0,
        sante: { groupeSanguin: p.enfant.groupeSanguin, allergies: p.enfant.allergies, traitements: [], vaccinsAJour: true, remarques: p.enfant.remarques },
        dateInscription: JOUR_DEMO,
      }
      const t = s.parametres.tarifs
      const tarifCycle = { creche: t.creche, maternelle: t.maternelle, primaire: t.primaire, college: t.college }[c.cycle]
      const ech: T.Echeance[] = []
      const add = (type: T.TypeEcheance, mois: string | null, date: string, brut: number, remise = 0, motif: string | null = null) =>
        ech.push({ id: uid('ECH'), eleveId: eleve.id, familleId: familleId!, type, libelle: mois ? `${LIBELLE_ECHEANCE[type]} · ${moisNom(mois)}` : LIBELLE_ECHEANCE[type], mois, echeance: date, montantBrut: brut, remise, motifRemise: motif, montant: brut - remise, planId: null })
      add('inscription', null, JOUR_DEMO, t.inscription)
      if (p.tenue) add('tenue', null, JOUR_DEMO, t.tenue)
      const moisRestants = MOIS_ECHEANCIER.filter((m) => `${m}-28` >= JOUR_DEMO)
      for (const m of moisRestants) {
        const remise = freres >= 1 ? Math.round(tarifCycle * 0.1) : 0
        const date = `${m}-05` < JOUR_DEMO ? JOUR_DEMO : `${m}-05`
        add('scolarite', m, date, tarifCycle, remise, remise ? 'Remise fratrie 10 %' : null)
        if (p.enfant.cantine) add('cantine', m, date, t.cantine)
        if (p.enfant.circuitId) add('transport', m, date, t.transport)
      }
      const carte: T.Carte = { id: uid('CAR'), type: 'eleve', titulaireId: eleve.id, jeton: jetonAleatoire(), statut: 'active', emiseLe: JOUR_DEMO, remplaceId: null, motifDesactivation: null, imprimee: false }
      set((st) => ({
        familles,
        eleves: [...st.eleves, eleve],
        echeances: [...st.echeances, ...ech],
        cartes: [...st.cartes, carte],
        presences: { ...st.presences, [eleve.id]: { eleveId: eleve.id, arrivee: null, depart: null, recupereParId: null } },
        compteurs: { ...st.compteurs, matricule: { ...st.compteurs.matricule, [annee]: n } },
        demandesInscription: p.demandeId ? st.demandesInscription.map((d) => (d.id === p.demandeId ? { ...d, statut: 'inscrit' } : d)) : st.demandesInscription,
      }))
      // cartes accompagnateurs pour une nouvelle famille
      if (p.nouvelleFamille) {
        const f = indexFamilles(get().familles)[familleId!]
        set((st) => ({ cartes: [...st.cartes, ...f.accompagnateurs.map((a) => ({ id: uid('CAR'), type: 'accompagnateur' as const, titulaireId: `${f.id}:${a.id}`, jeton: jetonAleatoire(), statut: 'active' as const, emiseLe: JOUR_DEMO, remplaceId: null, motifDesactivation: null, imprimee: false }))] }))
      }
      audit('Inscription', 'Élève inscrit', `${eleve.prenom} ${eleve.nom} · ${c.nom} · matricule ${matricule}`, eleve.id, null, { matricule, classe: c.nom, echeances: ech.length, total: ech.reduce((a, e) => a + e.montant, 0) })
      audit('Carte', 'Carte élève créée', `${eleve.prenom} ${eleve.nom} · en attente d’impression`, eleve.id)
      return { eleve, carte }
    },
    majDemande: (id, statut, note) => {
      const d = get().demandesInscription.find((x) => x.id === id)
      set((st) => ({ demandesInscription: st.demandesInscription.map((x) => (x.id === id ? { ...x, statut, note: note ?? x.note } : x)) }))
      audit('Inscription', 'Demande d’inscription mise à jour', `${d?.enfantPrenom} ${d?.enfantNom}`, null, { statut: d?.statut }, { statut })
    },
    ajouterDemande: (d) => {
      const id = `DI-${Date.now().toString().slice(-7)}`
      set((st) => ({ demandesInscription: [{ ...d, id, date: maintenant(), statut: 'nouvelle', source: 'en_ligne', note: '' }, ...st.demandesInscription] }))
      audit('Inscription', 'Pré-inscription reçue en ligne', `${d.enfantPrenom} ${d.enfantNom} · ${d.niveauSouhaite}`, null, null, null, 'SYS')
      notifier({ cible: 'ecole', titre: 'Nouvelle pré-inscription en ligne', texte: `${d.enfantPrenom} ${d.enfantNom} · ${d.niveauSouhaite}`, niveau: 'info', lien: '/inscriptions' })
      return id
    },

    /* ----------------------------------------------------------- Cartes */
    desactiverCarte: (carteId, motif) => {
      const s = get()
      const c = s.cartes.find((x) => x.id === carteId)!
      const nouvelle: T.Carte = { ...c, id: uid('CAR'), jeton: jetonAleatoire(), statut: 'active', emiseLe: JOUR_DEMO, remplaceId: c.id, motifDesactivation: null, imprimee: false }
      set((st) => ({ cartes: [...st.cartes.map((x) => (x.id === carteId ? { ...x, statut: 'desactivee' as const, motifDesactivation: motif } : x)), nouvelle] }))
      audit('Carte', 'Carte désactivée et remplacée', `${motif}`, c.type === 'eleve' ? c.titulaireId : null, { statut: 'active', carte: c.id }, { statut: 'désactivée', remplacement: nouvelle.id })
      return nouvelle
    },
    imprimerCartes: (ids) => {
      set((st) => ({ cartes: st.cartes.map((c) => (ids.includes(c.id) ? { ...c, imprimee: true } : c)) }))
      audit('Carte', 'Planche de cartes imprimée', `${ids.length} carte${ids.length > 1 ? 's' : ''} au format CR80`)
    },
    consulterSante: (eleveId) => {
      audit('Santé', 'Fiche santé consultée', nomEleve(indexEleves(get().eleves)[eleveId]), eleveId)
    },
    ajouterVisite: (v) => {
      const prof = profilParId(get().session.profilId)
      set((st) => ({ visites: [{ ...v, id: uid('VIS'), auteurId: prof.userId, date: maintenant() }, ...st.visites] }))
      audit('Santé', 'Passage à l’infirmerie', `${nomEleve(indexEleves(get().eleves)[v.eleveId])} · ${v.motif}`, v.eleveId)
    },

    /* ---------------------------------------------------- Communication */
    envoyerMessage: (conversationId, texte, auteur) => {
      const s = get()
      const prof = profilParId(s.session.profilId)
      const nom = auteur === 'parent' ? nomPersonnel(s, 'PARENT-FIL') : nomPersonnel(s, prof.userId)
      set((st) => ({ messages: [...st.messages, { id: uid('MSG'), conversationId, auteur, auteurNom: nom, date: maintenant(), texte, lu: false }] }))
      const conv = s.conversations.find((c) => c.id === conversationId)
      audit('Message', 'Message envoyé', `${conv?.sujet ?? ''}`, null, null, null, auteur === 'parent' ? 'PARENT-FIL' : undefined)
      if (auteur === 'ecole' && conv && estFil(conv.familleId)) notifier({ cible: 'parent', titre: `Message de ${nom}`, texte, niveau: 'info', lien: '/parent/messages' })
      if (auteur === 'parent') notifier({ cible: 'ecole', titre: `Message de ${nom}`, texte, niveau: 'info', lien: '/communication' })
    },
    publierAnnonce: (a) => {
      const prof = profilParId(get().session.profilId)
      set((st) => ({ annonces: [{ ...a, id: uid('ANN'), date: maintenant(), auteurId: prof.userId, lectures: 0 }, ...st.annonces] }))
      audit('Message', 'Annonce publiée', `${a.titre} · ${a.cible}`, null, null, { destinataires: a.destinataires, canaux: a.canaux.join(', ') })
      notifier({ cible: 'parent', titre: a.titre, texte: a.texte, niveau: 'info', lien: '/parent/messages' })
    },
    repondreAutorisation: (autorisationId, eleveId, rep) => {
      set((st) => ({ autorisations: st.autorisations.map((a) => (a.id === autorisationId ? { ...a, reponses: { ...a.reponses, [eleveId]: rep } } : a)) }))
      const a = get().autorisations.find((x) => x.id === autorisationId)!
      audit('Autorisation', rep === 'oui' ? 'Autorisation donnée' : 'Autorisation refusée', `${a.titre} · ${nomEleve(indexEleves(get().eleves)[eleveId])}`, eleveId, null, { reponse: rep }, get().session.profilId === 'parent' ? 'PARENT-FIL' : undefined)
    },
    signerLiaison: (id) => {
      set((st) => ({ liaisons: st.liaisons.map((l) => (l.id === id ? { ...l, signe: true } : l)) }))
      audit('Message', 'Cahier de liaison signé', 'Mot lu et signé par la famille', null, null, null, 'PARENT-FIL')
    },
    ajouterLiaison: (l) => {
      const prof = profilParId(get().session.profilId)
      set((st) => ({ liaisons: [{ ...l, id: uid('LIA'), date: maintenant(), auteurId: prof.userId, signe: false }, ...st.liaisons] }))
      audit('Message', 'Mot dans le cahier de liaison', `${indexClasses(get().classes)[l.classeId].nom}`)
      if (l.classeId === ID.classeIbrahima || l.classeId === ID.classeFatoumata) notifier({ cible: 'parent', titre: 'Nouveau mot dans le cahier de liaison', texte: l.texte, niveau: 'info', lien: '/parent/messages' })
    },
    lireNotifications: (cible) => set((st) => ({ notifications: st.notifications.map((n) => (n.cible === cible ? { ...n, lu: true } : n)) })),

    /* ---------------------------------------------------------- Divers */
    affecterRemplacant: (remplacementId, profId) => {
      set((st) => ({ remplacements: st.remplacements.map((r) => (r.id === remplacementId ? { ...r, remplacantId: profId } : r)) }))
      audit('Personnel', 'Remplaçant affecté', nomPersonnel(get(), profId))
    },
    majParametres: (p) => {
      const avant = get().parametres
      set((st) => ({ parametres: { ...st.parametres, ...p } }))
      audit('Paramètres', 'Paramètre modifié', Object.keys(p).join(', '), null, Object.fromEntries(Object.keys(p).map((k) => [k, (avant as unknown as Record<string, unknown>)[k]])), p as Record<string, unknown>)
    },
    exporter: (quoi) => audit('Export', 'Export généré', quoi),
    journaliser: (type, action, objet, eleveId = null, avant = null, apres = null) => audit(type, action, objet, eleveId, avant, apres),

    /* ------------------------------------------- Flux d'événements simulés */
    tickFlux: () => {
      const s = get()
      if (minutesDemo() > 17 * 60 + 30) return
      const r = Math.random()
      if (r < 0.45) {
        // paiement mobile d'une famille qui régularise
        const candidats = s.familles.filter((f) => f.id !== ID.famille && f.profilPaiement !== 'retard')
        for (let essai = 0; essai < 12; essai++) {
          const f = candidats[Math.floor(Math.random() * candidats.length)]
          const ech = s.echeances.filter((e) => e.familleId === f.id && e.echeance <= addDaysIso(JOUR_DEMO, 20))
          const pm = new Map<string, number>()
          for (const p of s.paiements) if (p.statut !== 'annule') for (const l of p.lignes) pm.set(l.echeanceId, (pm.get(l.echeanceId) ?? 0) + l.montant)
          const lignes = ech.map((e) => ({ echeanceId: e.id, montant: e.montant - (pm.get(e.id) ?? 0) })).filter((l) => l.montant > 0)
          if (!lignes.length) continue
          const p = f.responsable === 'mere' ? f.mere : f.pere
          const mode = Math.random() < 0.7 ? MODES_MOBILE[0] : MODES_MOBILE[1]
          // le paiement mobile est enregistré au nom de la famille
          get().encaisser({ familleId: f.id, lignes, mode, reference: `MP${JOUR_DEMO.slice(2).replace(/-/g, '')}.${minutesEnHhmm(minutesDemo()).replace(':', '')}.${jetonAleatoire().slice(0, 6)}`, payeur: p ? `${p.prenom} ${p.nom}` : f.nom, canal: 'parent' })
          return
        }
      } else if (r < 0.7) {
        // un enfant de la crèche : entrée au journal
        const enfants = s.eleves.filter((e) => e.classeId.startsWith('C-CR') && e.id !== ID.mariama && s.presences[e.id]?.arrivee && !s.presences[e.id]?.depart)
        if (!enfants.length) return
        const e = enfants[Math.floor(Math.random() * enfants.length)]
        const opts: [T.TypeJournal, string][] = [['change', 'Change · couche propre'], ['repas', 'Eau et compote · tout bu'], ['activite', 'Jeux libres dans la cour'], ['change', 'Passage au pot · réussi']]
        const [type, detail] = opts[Math.floor(Math.random() * opts.length)]
        const auteur = s.adultesCreche[e.classeId]?.[0] ?? ID.educatrice
        set((st) => ({ journal: [...st.journal, { id: uid('J'), eleveId: e.id, date: JOUR_DEMO, heure: heureDemo(), type, detail, auteurId: auteur }] }))
      } else if (r < 0.85) {
        // passage au portail : un retardataire ou un visiteur du personnel
        const retard = s.absences.find((a) => a.date === JOUR_DEMO && a.periode === 'journee' && !a.justifiee && !s.presences[a.eleveId]?.arrivee)
        if (retard && Math.random() < 0.5) {
          const carte = s.cartes.find((c) => c.type === 'eleve' && c.titulaireId === retard.eleveId && c.statut === 'active')
          if (carte) {
            const prev = s.session.profilId
            set((st) => ({ session: { ...st.session, profilId: 'portail' } }))
            get().scanner(carte.jeton, 'entree')
            set((st) => ({ session: { ...st.session, profilId: prev } }))
          }
        }
      } else {
        // message d'un parent
        const conv = s.conversations.filter((c) => c.familleId !== ID.famille)
        const c = conv[Math.floor(Math.random() * conv.length)]
        if (!c) return
        const f = indexFamilles(s.familles)[c.familleId]
        const p = f.responsable === 'mere' ? f.mere : f.pere
        const textes = ['Merci pour l’information.', 'Bien reçu, merci beaucoup.', 'Pouvez-vous me rappeler cet après-midi ?', 'Mon enfant a oublié son cahier, je passe le déposer.']
        set((st) => ({ messages: [...st.messages, { id: uid('MSG'), conversationId: c.id, auteur: 'parent', auteurNom: p ? `${p.prenom} ${p.nom}` : f.nom, date: maintenant(), texte: textes[Math.floor(Math.random() * textes.length)], lu: false }] }))
      }
    },
  }
})

function moisNom(m: string) {
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const [a, mo] = m.split('-').map(Number)
  return `${noms[mo - 1]} ${a}`
}
function addDaysIso(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Raccourci pour lire l'état complet dans un composant (re-rendu à chaque changement). */
export const useEtat = () => useStore()

export { indexEcheances, CONFIG, PAYS_DATA }
