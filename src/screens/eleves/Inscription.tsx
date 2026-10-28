/** Inscription d'un nouvel élève en 4 étapes : enfant, famille, classe et frais, confirmation. */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Sparkles, Search, Plus, Trash2, IdCard, Wallet, UserRound, Send, FileText } from 'lucide-react'
import { useStore, type InscriptionPayload } from '../../store'
import { elevesParClasse, enfantsParFamille, indexClasses, indexFamilles } from '../../store/selecteurs'
import { profilParId } from '../../store/profils'
import { NOM_CYCLE, LIBELLE_ECHEANCE } from '../../data/referentiel'
import type { Classe, Cycle, Parent } from '../../data/types'
import { Alerte, Avatar, Badge, Bloc, Bouton, Case, Champ, EnTetePage, Liste, PastilleCycle, Saisie, Segments, cx } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { JOUR_DEMO, MOIS_ECHEANCIER, age, ageEnMois, ageLisible, dateCourte, moisAnnee } from '../../lib/temps'
import { money, sansAccents } from '../../lib/format'
import { CONFIG, PAYS_DATA } from '../../config'
import { lienCarte } from '../../lib/verif'
import { CarteEleveAjustee } from './CarteEleve'
import { NOMS } from '../../data/noms'
import { SaisieDate } from './SaisieDate'

interface FormEnfant {
  prenom: string
  nom: string
  sexe: 'F' | 'M'
  naissance: string
  allergies: string[]
  autreAllergie: string
  groupeSanguin: string
  remarques: string
}
interface FormParent {
  prenom: string
  nom: string
  tel: string
  profession: string
}
interface FormFamille {
  mode: 'nouvelle' | 'existante'
  familleId: string | null
  mere: FormParent
  pere: FormParent
  responsable: 'mere' | 'pere'
  quartier: string
  autres: { prenom: string; nom: string; lien: string; tel: string }[]
}
interface FormFrais {
  classeId: string
  cantine: boolean
  circuitId: string
  tenue: boolean
}

const parentVide = (): FormParent => ({ prenom: '', nom: '', tel: '', profession: '' })
const ETAPES = ['Enfant', 'Famille', 'Classe et frais', 'Confirmation']
const GROUPES = ['O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'Inconnu']

const DEMO = CONFIG.PAYS === 'Sénégal'
  ? {
      enfant: { prenom: 'Aminata', nom: 'Ndiaye', sexe: 'F' as const, naissance: '2022-03-17', allergies: ['Arachide'], autreAllergie: '', groupeSanguin: 'O+', remarques: 'Fait encore la sieste en début d’après-midi' },
      mere: { prenom: 'Khady', nom: 'Sarr', tel: '+221 77 547 19 83', profession: 'Commerçante' },
      pere: { prenom: 'Moussa', nom: 'Ndiaye', tel: '+221 78 291 05 36', profession: 'Transitaire' },
      quartier: 'Ouakam',
      autre: { prenom: 'Pape', nom: 'Ndiaye', lien: 'Oncle', tel: '+221 76 438 72 10' },
    }
  : {
      enfant: { prenom: 'Aminata', nom: 'Kouyaté', sexe: 'F' as const, naissance: '2022-03-17', allergies: ['Arachide'], autreAllergie: '', groupeSanguin: 'O+', remarques: 'Fait encore la sieste en début d’après-midi' },
      mere: { prenom: 'Saran', nom: 'Kourouma', tel: '+224 625 47 19 83', profession: 'Commerçante' },
      pere: { prenom: 'Sékou', nom: 'Kouyaté', tel: '+224 622 91 05 36', profession: 'Transitaire' },
      quartier: 'Lambanyi',
      autre: { prenom: 'Fodé', nom: 'Kouyaté', lien: 'Oncle', tel: '+224 664 38 72 10' },
    }

/** Niveau conseillé selon l'âge au jour de l'inscription. */
function niveauConseille(naissance: string, classes: Classe[]): { cycle: Cycle; niveauIndex: number } | null {
  if (!naissance) return null
  const mois = ageEnMois(naissance)
  if (mois < 3) return null
  if (mois < 36) return { cycle: 'creche', niveauIndex: mois < 12 ? 0 : mois < 24 ? 1 : 2 }
  const a = age(naissance)
  if (a <= 5) return { cycle: 'maternelle', niveauIndex: Math.max(0, a - 3) }
  if (a <= 11) return { cycle: 'primaire', niveauIndex: Math.min(5, a - 6) }
  if (classes.length && a <= 16) return { cycle: 'college', niveauIndex: Math.min(3, a - 12) }
  return null
}

export default function Inscription() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const s = useStore()
  const inscrire = useStore((st) => st.inscrire)
  const toast = useStore((st) => st.toast)
  const role = profilParId(s.session.profilId).role
  const demande = s.demandesInscription.find((d) => d.id === params.get('demande'))

  const [etape, setEtape] = useState(0)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [enfant, setEnfant] = useState<FormEnfant>(() => ({
    prenom: demande?.enfantPrenom ?? '', nom: demande?.enfantNom ?? '', sexe: demande?.sexe ?? 'F', naissance: demande?.naissance ?? '',
    allergies: [], autreAllergie: '', groupeSanguin: 'Inconnu', remarques: '',
  }))
  const [famille, setFamille] = useState<FormFamille>(() => {
    const [p, ...n] = (demande?.parentNom ?? '').split(' ')
    return {
      mode: 'nouvelle', familleId: null,
      mere: { ...parentVide(), prenom: p ?? '', nom: n.join(' '), tel: demande?.parentTel ?? '' },
      pere: { ...parentVide(), nom: demande?.enfantNom ?? '' },
      responsable: 'mere', quartier: demande?.quartier ?? '', autres: [],
    }
  })
  const [frais, setFrais] = useState<FormFrais>({ classeId: '', cantine: true, circuitId: '', tenue: true })
  const [resultat, setResultat] = useState<{ eleveId: string; carteId: string } | null>(null)
  const [executer, enCours] = useAction()
  useEffect(() => { document.getElementById('contenu')?.scrollTo({ top: 0, behavior: 'smooth' }) }, [etape, resultat])

  const ic = indexClasses(s.classes)
  const parClasse = elevesParClasse(s.eleves)
  const conseil = niveauConseille(enfant.naissance, s.classes)
  const classesProposees = s.classes.filter((c) => !conseil || (c.cycle === conseil.cycle && c.niveauIndex === conseil.niveauIndex))
  const classe = frais.classeId ? ic[frais.classeId] : null
  const freres = famille.mode === 'existante' && famille.familleId ? (enfantsParFamille(s.eleves)[famille.familleId] ?? []).length : 0

  const remplirDemo = () => {
    setEnfant({ ...DEMO.enfant })
    setFamille({ mode: 'nouvelle', familleId: null, mere: { ...DEMO.mere }, pere: { ...DEMO.pere }, responsable: 'mere', quartier: DEMO.quartier, autres: [{ ...DEMO.autre }] })
    const cible = niveauConseille(DEMO.enfant.naissance, s.classes)
    const candidates = s.classes.filter((c) => cible && c.cycle === cible.cycle && c.niveauIndex === cible.niveauIndex)
    const meilleure = [...candidates].sort((a, b) => (parClasse[a.id]?.length ?? 0) - (parClasse[b.id]?.length ?? 0))[0]
    setFrais({ classeId: meilleure?.id ?? '', cantine: true, circuitId: s.circuits[0]?.id ?? '', tenue: true })
    setErreurs({})
    toast({ titre: 'Formulaire pré-rempli', texte: 'Famille de démonstration, à modifier librement.', niveau: 'info' })
  }

  /* --------------------------------------------------- Échéancier prévu */
  const echeancier = useMemo(() => {
    if (!classe) return []
    const t = s.parametres.tarifs
    const tarif = { creche: t.creche, maternelle: t.maternelle, primaire: t.primaire, college: t.college }[classe.cycle]
    const lignes: { libelle: string; date: string; montant: number; remise: number; detail: string }[] = []
    lignes.push({ libelle: LIBELLE_ECHEANCE.inscription, date: JOUR_DEMO, montant: t.inscription, remise: 0, detail: '' })
    if (frais.tenue && classe.cycle !== 'creche') lignes.push({ libelle: LIBELLE_ECHEANCE.tenue, date: JOUR_DEMO, montant: t.tenue, remise: 0, detail: '' })
    for (const m of MOIS_ECHEANCIER.filter((x) => `${x}-28` >= JOUR_DEMO)) {
      const date = `${m}-05` < JOUR_DEMO ? JOUR_DEMO : `${m}-05`
      const remise = freres >= 1 ? Math.round((tarif * s.parametres.remiseFratrie) / 100) : 0
      let montant = tarif - remise
      const parts = ['scolarité']
      if (frais.cantine && classe.cycle !== 'creche') { montant += t.cantine; parts.push('cantine') }
      if (frais.circuitId && classe.cycle !== 'creche') { montant += t.transport; parts.push('transport') }
      lignes.push({ libelle: `Mensualité · ${moisAnnee(m)}`, date, montant, remise, detail: parts.join(', ') })
    }
    return lignes
  }, [classe, frais, freres, s.parametres])
  const total = echeancier.reduce((a, l) => a + l.montant, 0)
  const aRegler = echeancier.filter((l) => l.date <= JOUR_DEMO).reduce((a, l) => a + l.montant, 0)

  /* ------------------------------------------------------- Validation */
  const valider = (i: number): Record<string, string> => {
    const e: Record<string, string> = {}
    const telOk = (t: string) => t.replace(/\D/g, '').length >= 12
    if (i === 0) {
      if (!enfant.prenom.trim()) e.prenom = 'Saisissez le prénom de l’enfant.'
      if (!enfant.nom.trim()) e.nom = 'Saisissez le nom de famille.'
      if (!enfant.naissance) e.naissance = 'Indiquez la date de naissance au format JJ/MM/AAAA.'
      else if (!niveauConseille(enfant.naissance, s.classes)) e.naissance = 'L’âge ne correspond à aucun niveau : de 3 mois (crèche) à 16 ans (collège).'
    }
    if (i === 1) {
      if (famille.mode === 'existante' && !famille.familleId) e.famille = 'Choisissez la famille dans la liste, ou passez à « Nouvelle famille ».'
      if (famille.mode === 'nouvelle') {
        const resp = famille.responsable === 'mere' ? famille.mere : famille.pere
        if (!resp.prenom.trim() || !resp.nom.trim()) e.resp = `Le parent responsable (${famille.responsable === 'mere' ? 'la mère' : 'le père'}) doit avoir un prénom et un nom.`
        if (!telOk(resp.tel)) e.tel = `Saisissez un numéro complet, au format ${PAYS_DATA.indicatif} ${CONFIG.PAYS === 'Sénégal' ? '7X XXX XX XX' : '6XX XX XX XX'}.`
        if (!famille.quartier.trim()) e.quartier = 'Indiquez le quartier de résidence.'
      }
    }
    if (i === 2) {
      if (!frais.classeId) e.classe = 'Choisissez une classe parmi celles proposées.'
      else if ((parClasse[frais.classeId]?.length ?? 0) >= ic[frais.classeId].capacite) e.classe = 'Cette classe est complète. Choisissez l’autre section.'
    }
    return e
  }
  const suivant = () => {
    const e = valider(etape)
    setErreurs(e)
    if (Object.keys(e).length) return
    if (etape === 1 && !frais.classeId && conseil) {
      const meilleure = [...classesProposees].sort((a, b) => (parClasse[a.id]?.length ?? 0) - (parClasse[b.id]?.length ?? 0))[0]
      if (meilleure) setFrais((f) => ({ ...f, classeId: meilleure.id, tenue: meilleure.cycle !== 'creche', cantine: meilleure.cycle !== 'creche' }))
    }
    setEtape(etape + 1)
  }

  const confirmer = () =>
    executer(() => {
      const p = (x: FormParent): Parent | null => (x.prenom.trim() ? { prenom: x.prenom.trim(), nom: x.nom.trim(), tel: x.tel.trim(), profession: x.profession.trim() || '—' } : null)
      const allergies = [...enfant.allergies, ...(enfant.autreAllergie.trim() ? [enfant.autreAllergie.trim()] : [])]
      const payload: InscriptionPayload = {
        enfant: {
          prenom: enfant.prenom.trim(), nom: enfant.nom.trim(), sexe: enfant.sexe, naissance: enfant.naissance, classeId: frais.classeId,
          cantine: frais.cantine && classe?.cycle !== 'creche', circuitId: classe?.cycle !== 'creche' && frais.circuitId ? frais.circuitId : null, allergies,
          groupeSanguin: enfant.groupeSanguin === 'Inconnu' ? 'À compléter' : enfant.groupeSanguin, remarques: enfant.remarques,
        },
        familleId: famille.mode === 'existante' ? famille.familleId : null,
        nouvelleFamille: famille.mode === 'nouvelle' ? { mere: p(famille.mere), pere: p(famille.pere), responsable: famille.responsable, quartier: famille.quartier.trim(), autres: famille.autres.filter((a) => a.prenom.trim()) } : null,
        tenue: frais.tenue && classe?.cycle !== 'creche',
        demandeId: demande?.id ?? null,
      }
      const { eleve, carte } = inscrire(payload)
      setResultat({ eleveId: eleve.id, carteId: carte.id })
      toast({ titre: 'Élève inscrit', texte: `${eleve.prenom} ${eleve.nom} · matricule ${eleve.matricule}`, niveau: 'succes' })
    }, [600, 900])

  if (resultat) return <Resultat eleveId={resultat.eleveId} carteId={resultat.carteId} role={role} onNouvelle={() => { setResultat(null); setEtape(0); setEnfant({ prenom: '', nom: '', sexe: 'F', naissance: '', allergies: [], autreAllergie: '', groupeSanguin: 'Inconnu', remarques: '' }); setFamille({ mode: 'nouvelle', familleId: null, mere: parentVide(), pere: parentVide(), responsable: 'mere', quartier: '', autres: [] }); setFrais({ classeId: '', cantine: true, circuitId: '', tenue: true }); nav('/inscription') }} />

  return (
    <div className="max-w-[78rem]">
      <EnTetePage
        titre="Inscrire un élève"
        sousTitre={demande ? `À partir de la demande ${demande.id} reçue le ${dateCourte(demande.date.slice(0, 10))}` : 'Quatre étapes : l’échéancier et la carte sont créés automatiquement.'}
        actions={<Bouton variante="secondaire" icone={<Sparkles className="size-4" />} onClick={remplirDemo} data-testid="remplir-demo">Remplir avec une famille de démonstration</Bouton>}
      />

      {/* Fil des étapes : compact sur téléphone */}
      <div className="sm:hidden mb-4 bg-white rounded-xl border border-ligne px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="size-8 rounded-full bg-bleu text-white flex items-center justify-center font-bold shrink-0">{etape + 1}</span>
          <span className="min-w-0">
            <span className="block text-sm text-encre-2">Étape {etape + 1} sur {ETAPES.length}</span>
            <span className="block font-semibold">{ETAPES[etape]}</span>
          </span>
        </div>
        <div className="flex gap-1.5 mt-3">
          {ETAPES.map((t, i) => <span key={t} className={cx('h-1.5 flex-1 rounded-full', i < etape ? 'bg-vert-texte' : i === etape ? 'bg-bleu' : 'bg-ligne')} />)}
        </div>
      </div>
      <ol className="hidden sm:flex flex-wrap gap-2 mb-5">
        {ETAPES.map((t, i) => (
          <li key={t} className="flex-1 min-w-[10rem]">
            <button
              onClick={() => { if (i < etape) setEtape(i) }}
              disabled={i > etape}
              className={cx('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors', i === etape ? 'border-bleu bg-white ring-2 ring-bleu/15' : i < etape ? 'border-ligne bg-white hover:border-bleu-ligne' : 'border-ligne bg-brume text-encre-3')}
            >
              <span className={cx('size-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0', i < etape ? 'bg-vert-texte text-white' : i === etape ? 'bg-bleu text-white' : 'bg-ligne text-encre-2')}>
                {i < etape ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="font-semibold">{t}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] 2xl:grid-cols-[1fr_24rem] gap-5 items-start">
        <div className="bg-white rounded-xl border border-ligne p-4 sm:p-6 animate-entree min-w-0" key={etape}>
          {etape === 0 && (
            <div className="space-y-5">
              <h2 className="text-xl">L’enfant</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Champ libelle="Prénom" erreur={erreurs.prenom}><Saisie value={enfant.prenom} onChange={(e) => setEnfant({ ...enfant, prenom: e.target.value })} autoFocus /></Champ>
                <Champ libelle="Nom de famille" erreur={erreurs.nom}><Saisie value={enfant.nom} onChange={(e) => setEnfant({ ...enfant, nom: e.target.value })} /></Champ>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-encre-2">Sexe</span>
                  <Segments className="self-start" options={[{ id: 'F', libelle: 'Fille' }, { id: 'M', libelle: 'Garçon' }]} valeur={enfant.sexe} onChange={(v) => setEnfant({ ...enfant, sexe: v as 'F' | 'M' })} />
                </div>
                <Champ libelle="Date de naissance" erreur={erreurs.naissance} aide={enfant.naissance && conseil ? `${ageLisible(enfant.naissance)} · niveau conseillé : ${NOM_CYCLE[conseil.cycle].toLowerCase()}, ${s.classes.find((c) => c.cycle === conseil.cycle && c.niveauIndex === conseil.niveauIndex)?.niveau ?? ''}` : undefined}>
                  <SaisieDate valeur={enfant.naissance} max={JOUR_DEMO} onChange={(v) => setEnfant({ ...enfant, naissance: v })} />
                </Champ>
              </div>
              <div>
                <div className="text-sm font-semibold text-encre-2 mb-2">Santé (visible seulement par l’infirmerie et les éducateurs)</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Champ libelle="Groupe sanguin">
                    <Liste value={enfant.groupeSanguin} onChange={(e) => setEnfant({ ...enfant, groupeSanguin: e.target.value })}>{GROUPES.map((g) => <option key={g}>{g}</option>)}</Liste>
                  </Champ>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-encre-2">Allergies connues</span>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 py-2">
                      {['Arachide', 'Lactose', 'Pénicilline'].map((a) => (
                        <Case key={a} libelle={a} checked={enfant.allergies.includes(a)} onChange={(v) => setEnfant({ ...enfant, allergies: v ? [...enfant.allergies, a] : enfant.allergies.filter((x) => x !== a) })} />
                      ))}
                    </div>
                  </div>
                  <Champ libelle="Autre allergie"><Saisie value={enfant.autreAllergie} onChange={(e) => setEnfant({ ...enfant, autreAllergie: e.target.value })} placeholder="Ex. œuf, piqûres d’abeille" /></Champ>
                  <Champ libelle="Remarques"><Saisie value={enfant.remarques} onChange={(e) => setEnfant({ ...enfant, remarques: e.target.value })} placeholder="Ex. porte des lunettes" /></Champ>
                </div>
              </div>
            </div>
          )}

          {etape === 1 && <EtapeFamille famille={famille} setFamille={setFamille} erreurs={erreurs} nomEnfant={enfant.nom} />}

          {etape === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl">Classe et frais</h2>
              {conseil && <p className="text-encre-2">Classes de {s.classes.find((c) => c.cycle === conseil.cycle && c.niveauIndex === conseil.niveauIndex)?.niveau.toLowerCase()} ({ageLisible(enfant.naissance)}).</p>}
              {erreurs.classe && <p className="text-rouge text-sm">{erreurs.classe}</p>}
              <div className="grid md:grid-cols-2 gap-3">
                {classesProposees.map((c) => {
                  const eff = parClasse[c.id]?.length ?? 0
                  const places = c.capacite - eff
                  return (
                    <button
                      key={c.id}
                      disabled={places <= 0}
                      onClick={() => setFrais({ ...frais, classeId: c.id, tenue: c.cycle !== 'creche' && frais.tenue, cantine: c.cycle !== 'creche' && frais.cantine })}
                      className={cx('rounded-xl border p-4 text-left transition-colors disabled:opacity-50', frais.classeId === c.id ? 'border-bleu ring-2 ring-bleu/15 bg-bleu-clair/40' : 'border-ligne hover:border-bleu-ligne')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <PastilleCycle cycle={c.cycle} libelle={c.nom} className="font-semibold" />
                        {places <= 0 ? <Badge ton="rouge">Complète</Badge> : places <= 3 ? <Badge ton="ambre">{places} place{places > 1 ? 's' : ''}</Badge> : <Badge ton="vert">{places} places</Badge>}
                      </div>
                      <div className="text-sm text-encre-2 mt-1.5">{eff} élèves · salle {c.salle}</div>
                    </button>
                  )
                })}
              </div>
              {classe && classe.cycle !== 'creche' && (
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col gap-3">
                    <Case libelle={<>Cantine · {money(s.parametres.tarifs.cantine)} par mois</>} checked={frais.cantine} onChange={(v) => setFrais({ ...frais, cantine: v })} />
                    <Case libelle={<>Tenue scolaire · {money(s.parametres.tarifs.tenue)}</>} checked={frais.tenue} onChange={(v) => setFrais({ ...frais, tenue: v })} />
                  </div>
                  <Champ libelle={`Transport · ${money(s.parametres.tarifs.transport)} par mois`}>
                    <Liste value={frais.circuitId} onChange={(e) => setFrais({ ...frais, circuitId: e.target.value })}>
                      <option value="">Pas de transport</option>
                      {s.circuits.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </Liste>
                  </Champ>
                </div>
              )}
              {classe?.cycle === 'creche' && <Alerte ton="bleu" titre="Repas compris">À la crèche, les repas et les couches sont inclus dans la mensualité.</Alerte>}
            </div>
          )}

          {etape === 3 && classe && (
            <div className="space-y-5">
              <h2 className="text-xl">Vérifiez avant de confirmer</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Recap titre="Enfant">
                  <div className="font-semibold">{enfant.prenom} {enfant.nom}</div>
                  <div className="text-encre-2">{enfant.sexe === 'F' ? 'Fille' : 'Garçon'} · {ageLisible(enfant.naissance)} · {enfant.sexe === 'F' ? 'née' : 'né'} le {dateCourte(enfant.naissance)}</div>
                  {(enfant.allergies.length > 0 || enfant.autreAllergie) && <div className="text-rouge text-sm mt-1">Allergie : {[...enfant.allergies, enfant.autreAllergie].filter(Boolean).join(', ')}</div>}
                </Recap>
                <Recap titre="Famille">
                  {famille.mode === 'existante' && famille.familleId ? (
                    <>
                      <div className="font-semibold">Famille {indexFamilles(s.familles)[famille.familleId].nom}</div>
                      <div className="text-encre-2">Déjà {freres} enfant{freres > 1 ? 's' : ''} à GHBC · remise fratrie</div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold">{(famille.responsable === 'mere' ? famille.mere : famille.pere).prenom} {(famille.responsable === 'mere' ? famille.mere : famille.pere).nom}</div>
                      <div className="text-encre-2 tabulaire">{(famille.responsable === 'mere' ? famille.mere : famille.pere).tel} · {famille.quartier}</div>
                      <div className="text-encre-2 text-sm">{[famille.mere.prenom && 'Mère', famille.pere.prenom && 'Père', ...famille.autres.filter((a) => a.prenom).map((a) => a.lien)].filter(Boolean).join(', ')} : cartes accompagnateur créées</div>
                    </>
                  )}
                </Recap>
                <Recap titre="Classe">
                  <PastilleCycle cycle={classe.cycle} libelle={classe.nom} />
                  <div className="text-encre-2 text-sm mt-1">{[frais.cantine && classe.cycle !== 'creche' && 'Cantine', frais.circuitId && classe.cycle !== 'creche' && s.circuits.find((c) => c.id === frais.circuitId)?.nom, frais.tenue && classe.cycle !== 'creche' && 'Tenue'].filter(Boolean).join(' · ') || 'Sans option'}</div>
                </Recap>
                <Recap titre="Contrat">
                  <div className="font-semibold">{money(total)} sur l’année</div>
                  <div className="text-encre-2">{echeancier.length} échéances · {money(aRegler)} à régler aujourd’hui</div>
                </Recap>
              </div>
              <Alerte ton="bleu" titre="Ce qui sera créé">Le matricule (conservé à vie), le contrat financier et son échéancier, la carte d’élève et les cartes accompagnateur. L’opération est inscrite au journal d’audit.</Alerte>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-between gap-2 mt-8 pt-5 border-t border-ligne [&>button]:max-sm:w-full">
            <Bouton variante="discret" onClick={() => (etape === 0 ? nav('/eleves') : setEtape(etape - 1))}>{etape === 0 ? 'Abandonner' : 'Étape précédente'}</Bouton>
            {etape < 3 ? (
              <Bouton onClick={suivant} data-testid="etape-suivante">Continuer</Bouton>
            ) : (
              <Bouton variante="succes" chargement={enCours} onClick={confirmer} icone={<Check className="size-4" />} data-testid="confirmer-inscription">Confirmer l’inscription</Bouton>
            )}
          </div>
        </div>

        {/* Aperçu de l'échéancier */}
        <aside className="bg-white rounded-xl border border-ligne p-4 sm:p-5 lg:sticky lg:top-0">
          <h2 className="text-[1.08rem]">Échéancier prévu</h2>
          {!classe ? (
            <p className="text-encre-2 mt-2">Il s’affichera dès que la classe sera choisie.</p>
          ) : (
            <>
              <p className="text-encre-2 text-sm mt-1">{classe.nom} · tarifs 2026-2027{freres >= 1 ? ` · remise fratrie ${s.parametres.remiseFratrie} %` : ''}</p>
              <ul className="mt-3 divide-y divide-ligne-2 text-[0.92rem]">
                {echeancier.map((l) => (
                  <li key={l.libelle} className="flex justify-between gap-3 py-1.5">
                    <span className="min-w-0">
                      <span className="block truncate">{l.libelle}</span>
                      <span className="text-encre-3 text-xs">{l.detail && `${l.detail} · `}{l.date <= JOUR_DEMO ? 'à régler à l’inscription' : `avant le ${dateCourte(l.date)}`}{l.remise ? ` · remise ${money(l.remise)}` : ''}</span>
                    </span>
                    <span className="tabulaire whitespace-nowrap font-semibold">{money(l.montant)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between mt-3 pt-3 border-t-2 border-encre font-semibold">
                <span>Total de l’année</span><span className="tabulaire">{money(total)}</span>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function Recap({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ligne p-4">
      <div className="text-sm text-encre-2 mb-1">{titre}</div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------- Étape famille */
function EtapeFamille({ famille, setFamille, erreurs, nomEnfant }: { famille: FormFamille; setFamille: (f: FormFamille) => void; erreurs: Record<string, string>; nomEnfant: string }) {
  const s = useStore()
  const [q, setQ] = useState(nomEnfant)
  const enfants = enfantsParFamille(s.eleves)
  const ic = indexClasses(s.classes)
  const resultats = useMemo(() => {
    const t = sansAccents(q.trim())
    if (t.length < 2) return []
    const chiffres = t.replace(/\D/g, '')
    return s.familles
      .filter((f) => {
        const txt = sansAccents(`${f.nom} ${f.mere?.prenom ?? ''} ${f.mere?.nom ?? ''} ${f.pere?.prenom ?? ''}`)
        const tels = `${f.mere?.tel ?? ''}${f.pere?.tel ?? ''}`.replace(/\D/g, '')
        return txt.includes(t) || (chiffres.length >= 4 && tels.includes(chiffres))
      })
      .slice(0, 8)
  }, [q, s.familles])
  const majParent = (k: 'mere' | 'pere', champ: keyof FormParent, v: string) => setFamille({ ...famille, [k]: { ...famille[k], [champ]: v } })
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">La famille</h2>
        <Segments options={[{ id: 'nouvelle', libelle: 'Nouvelle famille' }, { id: 'existante', libelle: 'Famille déjà à GHBC' }]} valeur={famille.mode} onChange={(v) => setFamille({ ...famille, mode: v as FormFamille['mode'] })} />
      </div>
      {famille.mode === 'existante' ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
            <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de famille, prénom d’un parent ou téléphone" className="pl-9" autoFocus />
          </div>
          {erreurs.famille && <p className="text-rouge text-sm">{erreurs.famille}</p>}
          <ul className="space-y-2">
            {resultats.map((f) => (
              <li key={f.id}>
                <button onClick={() => setFamille({ ...famille, familleId: f.id })} className={cx('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left', famille.familleId === f.id ? 'border-bleu ring-2 ring-bleu/15' : 'border-ligne hover:border-bleu-ligne')}>
                  <UserRound className="size-5 text-encre-3" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold">Famille {f.nom}</span>
                    <span className="block text-sm text-encre-2">{[f.mere && `${f.mere.prenom} ${f.mere.nom}`, f.pere && `${f.pere.prenom} ${f.pere.nom}`].filter(Boolean).join(' et ')} · {f.quartier}</span>
                    <span className="block text-sm text-encre-2">{(enfants[f.id] ?? []).map((e) => `${e.prenom} (${ic[e.classeId].nom})`).join(', ')}</span>
                  </span>
                  {famille.familleId === f.id && <Check className="size-5 text-bleu" />}
                </button>
              </li>
            ))}
            {q.trim().length >= 2 && resultats.length === 0 && <li className="text-encre-2">Aucune famille trouvée. Vérifiez l’orthographe ou passez à « Nouvelle famille ».</li>}
          </ul>
        </div>
      ) : (
        <div className="space-y-5">
          {(['mere', 'pere'] as const).map((k) => (
            <div key={k}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{k === 'mere' ? 'Mère' : 'Père'}</span>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="responsable" checked={famille.responsable === k} onChange={() => setFamille({ ...famille, responsable: k })} className="accent-[#0249A2]" />
                  Responsable du compte
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <Saisie aria-label="Prénom" placeholder="Prénom" value={famille[k].prenom} onChange={(e) => majParent(k, 'prenom', e.target.value)} />
                <Saisie aria-label="Nom" placeholder="Nom" value={famille[k].nom} onChange={(e) => majParent(k, 'nom', e.target.value)} />
                <Saisie aria-label="Téléphone" placeholder={`${PAYS_DATA.indicatif} …`} value={famille[k].tel} onChange={(e) => majParent(k, 'tel', e.target.value)} inputMode="tel" className="tabulaire" />
                <Saisie aria-label="Profession" placeholder="Profession" value={famille[k].profession} onChange={(e) => majParent(k, 'profession', e.target.value)} />
              </div>
            </div>
          ))}
          {(erreurs.resp || erreurs.tel) && <p className="text-rouge text-sm">{erreurs.resp ?? erreurs.tel}</p>}
          <Champ libelle="Quartier" erreur={erreurs.quartier}>
            <Saisie value={famille.quartier} onChange={(e) => setFamille({ ...famille, quartier: e.target.value })} list="quartiers" placeholder={`Ex. ${NOMS.quartiers[0]}`} />
            <datalist id="quartiers">{NOMS.quartiers.map((q) => <option key={q} value={q} />)}</datalist>
          </Champ>
          <div>
            <div className="font-semibold mb-1">Autres adultes autorisés à récupérer l’enfant</div>
            <p className="text-encre-2 text-sm mb-3">Chacun recevra une carte accompagnateur. Personne d’autre ne pourra repartir avec l’enfant.</p>
            <div className="space-y-2">
              {famille.autres.map((a, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-[1fr_1fr_10rem_1fr_auto] gap-2 max-md:pb-3 max-md:border-b max-md:border-ligne-2">
                  {(['prenom', 'nom', 'lien', 'tel'] as const).map((c) => (
                    <Saisie key={c} aria-label={c} placeholder={{ prenom: 'Prénom', nom: 'Nom', lien: 'Lien (oncle, tante…)', tel: 'Téléphone' }[c]} value={a[c]} onChange={(e) => setFamille({ ...famille, autres: famille.autres.map((x, j) => (j === i ? { ...x, [c]: e.target.value } : x)) })} />
                  ))}
                  <Bouton variante="discret" className="max-md:col-span-2 max-md:justify-start" onClick={() => setFamille({ ...famille, autres: famille.autres.filter((_, j) => j !== i) })} aria-label="Retirer"><Trash2 className="size-4" /><span className="md:hidden">Retirer cet adulte</span></Bouton>
                </div>
              ))}
              <Bouton variante="secondaire" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFamille({ ...famille, autres: [...famille.autres, { prenom: '', nom: '', lien: 'Oncle', tel: '' }] })}>Ajouter un adulte autorisé</Bouton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- Résultat */
function Resultat({ eleveId, carteId, role, onNouvelle }: { eleveId: string; carteId: string; role: string; onNouvelle: () => void }) {
  const s = useStore()
  const nav = useNavigate()
  const journaliser = useStore((st) => st.journaliser)
  const toast = useStore((st) => st.toast)
  const [executer, enCours] = useAction()
  const [transmis, setTransmis] = useState(false)
  const e = s.eleves.find((x) => x.id === eleveId)!
  const c = indexClasses(s.classes)[e.classeId]
  const carte = s.cartes.find((x) => x.id === carteId)!
  const ech = s.echeances.filter((x) => x.eleveId === eleveId).sort((a, b) => a.echeance.localeCompare(b.echeance))
  const total = ech.reduce((a, x) => a + x.montant, 0)
  const aRegler = ech.filter((x) => x.echeance <= JOUR_DEMO).reduce((a, x) => a + x.montant, 0)
  const peutEncaisser = ['caissier', 'comptable', 'direction', 'promoteur'].includes(role)
  const groupes: { cle: string; libelle: string; detail: string; date: string; montant: number }[] = []
  for (const x of ech) {
    if (!x.mois) groupes.push({ cle: x.id, libelle: x.libelle, detail: '', date: x.echeance, montant: x.montant })
    else {
      const g = groupes.find((y) => y.cle === x.mois)
      const part = LIBELLE_ECHEANCE[x.type].toLowerCase()
      if (g) { g.montant += x.montant; g.detail += `, ${part}` }
      else groupes.push({ cle: x.mois, libelle: `Mensualité · ${moisAnnee(x.mois)}`, detail: part + (x.motifRemise ? ` (${x.motifRemise.toLowerCase()})` : ''), date: x.echeance, montant: x.montant })
    }
  }
  return (
    <div className="max-w-[78rem] animate-entree">
      <div className="flex items-center gap-4 mb-6">
        <span className="size-14 rounded-full bg-vert-clair text-vert-texte flex items-center justify-center"><Check className="size-8" /></span>
        <div>
          <h1 className="text-[1.7rem]">{e.prenom} {e.nom} est inscrit{e.sexe === 'F' ? 'e' : ''}</h1>
          <p className="text-encre-2">{c.nom} · année 2026-2027 · dossier créé à l’instant et inscrit au journal d’audit</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <Bloc>
            <div className="flex flex-wrap items-center gap-6 pt-5">
              <Avatar prenom={e.prenom} nom={e.nom} taille={64} />
              <div>
                <div className="text-encre-2">Matricule, conservé à vie</div>
                <div className="chiffre text-[2.4rem] font-medium leading-none mt-1" data-testid="matricule">{e.matricule}</div>
              </div>
            </div>
          </Bloc>
          <Bloc titre="Frais à régler aujourd’hui">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="chiffre text-[1.9rem] font-medium">{money(aRegler)}</div>
              {peutEncaisser ? (
                <Bouton variante="succes" icone={<Wallet className="size-4" />} onClick={() => nav(`/caisse?famille=${e.familleId}`)}>Encaisser les frais d’inscription</Bouton>
              ) : transmis ? (
                <Badge ton="vert" point>Dossier transmis à la caisse</Badge>
              ) : (
                <Bouton
                  variante="succes"
                  icone={<Send className="size-4" />}
                  chargement={enCours}
                  onClick={() => executer(() => {
                    journaliser('Inscription', 'Dossier transmis à la caisse', `${e.prenom} ${e.nom} · ${money(aRegler)} à encaisser`, e.id)
                    toast({ titre: 'Dossier transmis à la caisse', texte: 'Le caissier voit la famille en tête de sa liste.', niveau: 'succes' })
                    setTransmis(true)
                  })}
                >
                  Transmettre à la caisse
                </Bouton>
              )}
            </div>
            <p className="text-sm text-encre-2 mt-2">Celui qui inscrit n’encaisse pas : le paiement se fait au guichet, avec un reçu numéroté.</p>
          </Bloc>
          <Bloc titre="Carte d’élève prête à imprimer">
            <div className="flex justify-center py-2"><div className="w-full max-w-[26rem] flex justify-center"><CarteEleveAjustee eleve={e} classe={c} carte={carte} lien={lienCarte(s, carte)} echelle={1.1} /></div></div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Bouton icone={<IdCard className="size-4" />} onClick={() => nav(`/cartes?carte=${carte.id}`)}>Imprimer la carte</Bouton>
              <Bouton variante="secondaire" icone={<FileText className="size-4" />} onClick={() => nav(`/eleves/${e.id}`)}>Ouvrir la fiche</Bouton>
            </div>
          </Bloc>
        </div>
        <div className="space-y-5">
          <Bloc titre="Contrat et échéancier" actions={<Badge ton="bleu">{groupes.length} échéances</Badge>} sansMarge>
            <table className="tableau">
              <thead><tr><th>Échéance</th><th>Date limite</th><th className="!text-right">Montant</th></tr></thead>
              <tbody>
                {groupes.map((g) => (
                  <tr key={g.cle}>
                    <td>{g.libelle}{g.detail && <span className="block text-xs text-encre-2">{g.detail}</span>}</td>
                    <td className="tabulaire whitespace-nowrap">{g.date <= JOUR_DEMO ? 'Aujourd’hui' : dateCourte(g.date)}</td>
                    <td className="text-right tabulaire whitespace-nowrap">{money(g.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2} className="px-3 py-3 font-semibold">Total de l’année</td><td className="px-3 py-3 text-right font-semibold tabulaire">{money(total)}</td></tr>
              </tfoot>
            </table>
          </Bloc>
          <div className="flex gap-2">
            <Bouton variante="secondaire" onClick={onNouvelle}>Inscrire un autre élève</Bouton>
            <Link to="/eleves" className="inline-flex items-center px-4 py-2.5 font-semibold text-bleu hover:underline">Revenir à la liste</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

