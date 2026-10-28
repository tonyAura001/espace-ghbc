/** Écran de l'agent du portail : scan des cartes, sorties autorisées ou refusées, alertes. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ScanLine, ShieldCheck, ShieldX, OctagonAlert, UserX, CheckCircle2, Phone, Bell, LogIn, LogOut, RotateCcw, Baby } from 'lucide-react'
import { useStore } from '../../store'
import type { Carte, Scan } from '../../data/types'
import { ID } from '../../data/generer'
import { indexEleves, indexClasses, indexFamilles, indexPersonnel, nomPersonnel, carteActive } from '../../store/selecteurs'
import { profilParId } from '../../store/profils'
import { Avatar, Badge, Bloc, Bouton, Champ, EnTetePage, Liste, Modale, Saisie, cx, PastilleCycle, Vide, SqueletteTableau } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { infoCarte, LIBELLE_TYPE_CARTE } from './CarteCR80'
import { JOUR_DEMO, heureFr, heureDemo } from '../../lib/temps'
import { nombre } from '../../lib/format'
import { CONFIG } from '../../config'

interface Presentateur {
  id: string
  nom: string
  prenom: string
  detail: string
  carte: Carte | null
  sens: 'entree' | 'sortie'
  testid?: string
}

type Resultat =
  | { type: 'scan'; scan: Scan; carte: Carte | null; presentateurId: string }
  | { type: 'alerte'; eleveId: string; personne: string; lien: string; heure: string }

export default function Portail() {
  const s = useStore()
  const pret = useChargement()
  const [traites, setTraites] = useState<string[]>([])
  const [resultat, setResultat] = useState<Resultat | null>(null)
  const zoneResultat = useRef<HTMLDivElement>(null)
  // écran étroit : on amène le résultat sous les yeux de l'agent
  useEffect(() => {
    if (!resultat || window.innerWidth >= 1024) return
    // après la transition entre l'attente et le résultat, pour viser le haut du cadre définitif
    const t = setTimeout(() => zoneResultat.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 320)
    return () => clearTimeout(t)
  }, [resultat])
  const [refus, setRefus] = useState(false)
  const [executer, enCours] = useAction()

  const fam = indexFamilles(s.familles)
  const ie = indexEleves(s.eleves)
  const filFamille = fam[ID.famille]
  const oncle = filFamille.accompagnateurs.find((a) => a.id === ID.oncle)!
  const mariama = ie[ID.mariama]

  // personnes qui se présentent au portail (calculées une fois, à l'ouverture de l'écran)
  const presentateurs = useMemo<Presentateur[]>(() => {
    const st = useStore.getState()
    const ief = indexFamilles(st.familles)
    const iel = indexEleves(st.eleves)
    const ic = indexClasses(st.classes)
    const res: Presentateur[] = []
    const carteOncle = carteActive(st, 'accompagnateur', `${ID.famille}:${ID.oncle}`) ?? null
    res.push({ id: 'oncle', prenom: oncle.prenom, nom: oncle.nom, detail: `${oncle.lien} de ${mariama.prenom} · vient la chercher`, carte: carteOncle, sens: 'sortie', testid: 'scan-oncle' })
    // élèves en retard (absents du matin sans justificatif)
    const retards = st.absences.filter((a) => a.date === JOUR_DEMO && a.periode === 'journee' && !a.justifiee && !st.presences[a.eleveId]?.arrivee).slice(0, 2)
    for (const a of retards) {
      const e = iel[a.eleveId]
      const c = carteActive(st, 'eleve', e.id)
      if (c) res.push({ id: 'r-' + e.id, prenom: e.prenom, nom: e.nom, detail: `Élève de ${ic[e.classeId].nom} · arrive en retard`, carte: c, sens: 'entree' })
    }
    // un accompagnateur d'une autre famille (enfant à la maternelle)
    const autre = st.eleves.find((e) => e.familleId !== ID.famille && ic[e.classeId].cycle === 'maternelle' && st.presences[e.id]?.arrivee && !st.presences[e.id]?.depart && (ief[e.familleId]?.accompagnateurs.length ?? 0) > 2)
    if (autre) {
      const f = ief[autre.familleId]
      const a = f.accompagnateurs[2]
      const c = carteActive(st, 'accompagnateur', `${f.id}:${a.id}`)
      if (c) res.push({ id: 'acc-' + a.id, prenom: a.prenom, nom: a.nom, detail: `${a.lien} · famille ${f.nom} · rendez-vous médical de ${autre.prenom}`, carte: c, sens: 'sortie' })
    }
    // une carte déclarée perdue
    const perdue = st.cartes.find((c) => c.statut === 'desactivee' && c.type === 'eleve')
    if (perdue) {
      const e = iel[perdue.titulaireId]
      if (e) res.push({ id: 'perdue', prenom: e.prenom, nom: e.nom, detail: 'Présente une ancienne carte', carte: perdue, sens: 'entree' })
    }
    else res.push({ id: 'inconnue', prenom: 'Carte', nom: 'étrangère', detail: 'Carte d’une autre école présentée par un visiteur', carte: { id: 'EXTERNE', type: 'accompagnateur', titulaireId: '', jeton: 'EXTERNE-NON-EMISE', statut: 'active', emiseLe: JOUR_DEMO, remplaceId: null, motifDesactivation: null, imprimee: true }, sens: 'entree' })
    // un membre du personnel
    const pers = st.personnel.find((p) => p.fonction === 'Cuisinière')
    if (pers) {
      const c = carteActive(st, 'personnel', pers.id)
      if (c) res.push({ id: 'pers', prenom: pers.prenom, nom: pers.nom, detail: `${pers.fonction} · prise de service`, carte: c, sens: 'entree' })
    }
    return res
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ui.version])

  const scansJour = useMemo(() => s.scans.filter((x) => x.date.startsWith(JOUR_DEMO)), [s.scans])
  const entrees = scansJour.filter((x) => x.sens === 'entree' && x.resultat === 'autorise').length
  const sorties = scansJour.filter((x) => x.sens === 'sortie' && x.resultat === 'autorise').length
  const alertes = scansJour.filter((x) => x.resultat !== 'autorise').length

  const scanner = (p: Presentateur) => {
    if (!p.carte) return
    setResultat(null)
    executer(() => {
      const sc = useStore.getState().scanner(p.carte!.jeton, p.sens)
      setTraites((t) => [...t, p.id])
      setResultat({ type: 'scan', scan: sc, carte: p.carte, presentateurId: p.id })
    }, [650, 900])
  }
  const suivant = presentateurs.find((p) => p.carte && !traites.includes(p.id))

  const confirmerRefus = (eleveId: string, personne: string, lien: string) => {
    setRefus(false)
    setResultat(null)
    executer(() => {
      useStore.getState().refuserSortie(eleveId, personne, lien)
      setTraites((t) => [...t, 'inconnu'])
      setResultat({ type: 'alerte', eleveId, personne, lien, heure: heureDemo() })
    }, [500, 750])
  }

  return (
    <div>
      <EnTetePage
        titre="Portail principal"
        sousTitre={`Contrôle des entrées et des sorties · ${nomPersonnel(s, profilParId(s.session.profilId).userId)}`}
        actions={
          <div className="flex gap-4 sm:gap-6 bg-white border border-ligne rounded-xl px-3.5 sm:px-5 py-2 sm:py-2.5">
            <Compteur icone={<LogIn className="size-4" />} libelle="Entrées" valeur={entrees} />
            <Compteur icone={<LogOut className="size-4" />} libelle="Sorties" valeur={sorties} />
            <Compteur icone={<OctagonAlert className="size-4" />} libelle="Alertes" valeur={alertes} ton={alertes ? 'rouge' : undefined} />
          </div>
        }
      />

      <div className="grid grid-cols-1 min-[64rem]:grid-cols-[minmax(18rem,24rem)_1fr] xl:grid-cols-[minmax(20rem,27rem)_1fr] gap-5 items-stretch">
        {/* zone de scan */}
        <Bloc titre="Scanner" className="flex flex-col">
          <Viseur actif={enCours} />
          <Bouton taille="lg" className="w-full mt-4" icone={<ScanLine className="size-5" />} onClick={() => suivant && scanner(suivant)} chargement={enCours} disabled={!suivant} data-testid="scan-suivant">
            Scanner une carte
          </Bouton>
          <div className="text-sm text-encre-2 mt-4 mb-2">Personnes qui se présentent</div>
          {!pret ? (
            <SqueletteTableau lignes={4} />
          ) : (
            <ul className="space-y-1.5">
              {presentateurs.map((p) => {
                const fait = traites.includes(p.id)
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => scanner(p)}
                      disabled={enCours}
                      data-testid={p.testid}
                      className={cx('w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors', fait ? 'border-ligne-2 bg-brume/60 text-encre-2' : 'border-ligne hover:border-bleu-ligne hover:bg-bleu-clair/40', p.id === 'oncle' && !fait && 'border-bleu-ligne')}
                    >
                      <Avatar prenom={p.prenom} nom={p.nom} taille={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold truncate">{p.prenom} {p.nom}</span>
                        <span className="block text-sm text-encre-2 truncate">{p.detail}</span>
                      </span>
                      {fait ? <CheckCircle2 className="size-4 text-encre-3" /> : <ScanLine className="size-4 text-bleu" />}
                    </button>
                  </li>
                )
              })}
              <li>
                <button
                  onClick={() => setRefus(true)}
                  disabled={enCours}
                  data-testid="scan-inconnu"
                  className="w-full flex items-center gap-3 rounded-lg border border-dashed border-rouge/50 px-3 py-2 text-left hover:bg-rouge-clair/50"
                >
                  <span className="size-[34px] rounded-full bg-rouge-clair text-rouge flex items-center justify-center shrink-0"><UserX className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">Une personne sans carte</span>
                    <span className="block text-sm text-encre-2 truncate">Se présente pour récupérer {mariama.prenom}</span>
                  </span>
                </button>
              </li>
            </ul>
          )}
        </Bloc>

        {/* résultat plein cadre */}
        {/* sur téléphone et tablette, le résultat passe au-dessus de la liste et l’attente est masquée */}
        <div ref={zoneResultat} className={cx('scroll-mt-4 min-[64rem]:min-h-[26rem]', enCours || resultat ? 'max-[63.99rem]:order-first' : 'max-[63.99rem]:hidden')}>
          <AnimatePresence mode="wait">
            {enCours ? (
              <motion.div key="attente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full rounded-2xl border border-ligne bg-white flex flex-col items-center justify-center gap-3 text-encre-2">
                <ScanLine className="size-12 text-bleu pouls mt-8 min-[64rem]:mt-0" />
                <div className="text-xl titre text-encre">Vérification de la carte…</div>
                <div className="mb-8 min-[64rem]:mb-0">Jeton, statut de la carte, adultes autorisés</div>
              </motion.div>
            ) : resultat?.type === 'scan' ? (
              <motion.div key={resultat.scan.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full">
                <ResultatScan r={resultat} onNouveau={() => setResultat(null)} />
              </motion.div>
            ) : resultat?.type === 'alerte' ? (
              <motion.div key="alerte" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full">
                <ResultatAlerte r={resultat} onNouveau={() => setResultat(null)} />
              </motion.div>
            ) : (
              <motion.div key="vide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full rounded-2xl border-2 border-dashed border-ligne bg-white/60 flex flex-col items-center justify-center text-center px-8 text-encre-2">
                <ShieldCheck className="size-14 text-encre-3" />
                <div className="text-2xl titre text-encre mt-3">En attente d’un scan</div>
                <p className="mt-2 max-w-md">Présentez la carte devant le lecteur. Le résultat s’affiche ici en grand : vert, l’adulte est autorisé ; rouge, on ne remet pas l’enfant.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Passages scans={scansJour} />

      <ModaleRefus ouvert={refus} onFermer={() => setRefus(false)} onConfirmer={confirmerRefus} />
    </div>
  )
}

function Compteur({ icone, libelle, valeur, ton }: { icone: React.ReactNode; libelle: string; valeur: number; ton?: 'rouge' }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-encre-2">{icone}{libelle}</div>
      <div className={cx('chiffre text-2xl font-medium leading-tight', ton === 'rouge' && 'text-rouge')}>{nombre(valeur)}</div>
    </div>
  )
}

function Viseur({ actif }: { actif: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[17rem] aspect-[4/3] rounded-2xl bg-encre overflow-hidden">
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 50% 40%, #2F6FD6 0, transparent 60%)' }} />
      {/* coins de visée */}
      {['top-4 left-4 border-t-4 border-l-4 rounded-tl-lg', 'top-4 right-4 border-t-4 border-r-4 rounded-tr-lg', 'bottom-4 left-4 border-b-4 border-l-4 rounded-bl-lg', 'bottom-4 right-4 border-b-4 border-r-4 rounded-br-lg'].map((c) => (
        <span key={c} className={cx('absolute size-9 border-white/85', c)} />
      ))}
      <motion.div
        className="absolute inset-x-6 h-0.5 bg-vert shadow-[0_0_12px_2px_rgba(2,167,58,0.7)]"
        animate={actif ? { top: ['18%', '82%', '18%'] } : { top: '50%' }}
        transition={actif ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      />
      <div className="absolute bottom-2 inset-x-0 text-center text-white/70 text-xs">{actif ? 'Lecture en cours…' : 'Lecteur prêt'}</div>
    </div>
  )
}

function ResultatScan({ r, onNouveau }: { r: Extract<Resultat, { type: 'scan' }>; onNouveau: () => void }) {
  const s = useStore()
  const [executer, enCours] = useAction()
  const ok = r.scan.resultat === 'autorise'
  const carte = r.scan.carteId ? r.carte : null
  const info = carte ? infoCarte(s, carte) : null
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)

  // enfants que l'accompagnateur peut récupérer
  let enfants: { id: string }[] = []
  let accompagnateurId: string | null = null
  if (carte?.type === 'accompagnateur') {
    const [fid, aid] = carte.titulaireId.split(':')
    accompagnateurId = aid
    enfants = s.eleves.filter((e) => e.familleId === fid && e.statut === 'actif')
  }
  const eleve = carte?.type === 'eleve' ? ie[carte.titulaireId] : null
  const pers = carte?.type === 'personnel' ? indexPersonnel(s.personnel)[carte.titulaireId] : null

  const remettre = (eleveId: string) =>
    executer(() => {
      s.remettreEnfant(eleveId, accompagnateurId!)
      s.toast({ titre: `${ie[eleveId].prenom} ${ie[eleveId].sexe === 'F' ? 'est remise' : 'est remis'} à ${info?.prenom} ${info?.nom}`, texte: 'Sortie enregistrée et famille informée.', niveau: 'succes' })
    })

  return (
    <div className={cx('h-full rounded-2xl border-2 p-4 sm:p-6 flex flex-col', ok ? 'border-vert bg-vert-clair/60' : 'border-rouge bg-rouge-clair')} data-testid={ok ? 'resultat-autorise' : 'resultat-refuse'}>
      <div className={cx('flex items-center gap-3 rounded-xl px-4 py-3 text-white', ok ? 'bg-vert-texte' : 'bg-rouge')}>
        {ok ? <ShieldCheck className="size-9" /> : <ShieldX className="size-9" />}
        <div>
          <div className="titre text-[1.55rem] sm:text-[1.9rem] leading-none">{ok ? (r.scan.sens === 'entree' ? 'Entrée autorisée' : 'Sortie autorisée') : 'Accès refusé'}</div>
          <div className="text-white/90 mt-1">{ok ? `Carte valide · scannée à ${heureFr(r.scan.date)}` : r.scan.motif}</div>
        </div>
      </div>
      {info && (
        <div className="flex items-center gap-4 sm:gap-5 mt-5 sm:mt-6">
          <span className="sm:hidden"><Avatar prenom={info.prenom} nom={info.nom} taille={64} /></span>
          <span className="hidden sm:block"><Avatar prenom={info.prenom} nom={info.nom} taille={84} /></span>
          <div className="min-w-0">
            <div className="text-encre-2">{carte && LIBELLE_TYPE_CARTE[carte.type]} · n° {info.numero}</div>
            <div className="titre text-[1.6rem] sm:text-[2rem] leading-tight">{info.prenom} {info.nom}</div>
            <div className="text-lg text-encre-2">{info.ligne1}</div>
          </div>
        </div>
      )}
      {ok && eleve && (
        <div className="mt-5 text-lg">
          <PastilleCycle cycle={ic[eleve.classeId].cycle} libelle={`${ic[eleve.classeId].nom} · arrivée enregistrée à ${heureFr(r.scan.date)}`} />
          <p className="text-encre-2 text-base mt-1">Son absence du matin est levée ; ses parents voient l’heure d’arrivée dans leur espace.</p>
        </div>
      )}
      {ok && pers && <p className="mt-5 text-lg">Prise de service enregistrée à {heureFr(r.scan.date)} pour le pointage du personnel.</p>}
      {!ok && <p className="mt-5 text-lg font-semibold text-rouge">Ne laissez pas passer. Gardez la carte et orientez la personne vers le secrétariat.</p>}
      {ok && enfants.length > 0 && (
        <div className="mt-6">
          <div className="text-encre-2 mb-2">Autorisé à récupérer</div>
          <ul className="space-y-2">
            {enfants.map((e) => {
              const el = ie[e.id]
              const c = ic[el.classeId]
              const p = s.presences[el.id]
              const parti = p?.depart
              return (
                <li key={el.id} className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-ligne px-4 py-3">
                  <Avatar prenom={el.prenom} nom={el.nom} taille={40} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-lg">{el.prenom} {el.nom}</div>
                    <div className="text-encre-2 flex flex-wrap gap-x-3"><PastilleCycle cycle={c.cycle} libelle={c.nom} />{parti ? <span>{el.sexe === 'F' ? 'Partie' : 'Parti'} à {heureFr(parti)} avec {nomAccompagnateur(s, el.familleId, p.recupereParId)}</span> : p?.arrivee ? <span>{el.sexe === 'F' ? 'Présente' : 'Présent'} depuis {heureFr(p.arrivee)}</span> : <span>{el.sexe === 'F' ? 'Absente' : 'Absent'} aujourd’hui</span>}</div>
                  </div>
                  {!parti && p?.arrivee && (c.cycle === 'creche' || c.cycle === 'maternelle') && (
                    <Bouton variante="succes" onClick={() => remettre(el.id)} chargement={enCours} data-testid={`remettre-${el.id}`}>Remettre {el.prenom}</Bouton>
                  )}
                  {parti && <Badge ton="vert">Remise faite</Badge>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="mt-auto pt-6 flex justify-end">
        <Bouton variante="secondaire" icone={<RotateCcw className="size-4" />} onClick={onNouveau}>Nouveau scan</Bouton>
      </div>
    </div>
  )
}

function nomAccompagnateur(s: ReturnType<typeof useStore.getState>, familleId: string, id: string | null) {
  const a = indexFamilles(s.familles)[familleId]?.accompagnateurs.find((x) => x.id === id)
  return a ? `${a.prenom} ${a.nom}` : 'un adulte autorisé'
}

function ResultatAlerte({ r, onNouveau }: { r: Extract<Resultat, { type: 'alerte' }>; onNouveau: () => void }) {
  const s = useStore()
  const e = indexEleves(s.eleves)[r.eleveId]
  const f = indexFamilles(s.familles)[e.familleId]
  const resp = f.responsable === 'mere' ? f.mere : f.pere
  const c = indexClasses(s.classes)[e.classeId]
  const referent = c.titulaireId ? nomPersonnel(s, c.titulaireId) : 'son enseignant'
  const notif = s.notifications.find((n) => n.cible === 'parent' && n.titre.startsWith('Alerte sécurité')) ?? s.notifications.find((n) => n.cible === 'ecole' && n.titre.startsWith('Sortie refusée'))
  const agent = nomPersonnel(s, profilParId(s.session.profilId).userId)
  const appeler = () => {
    s.journaliser('Portail', 'Appel à la famille', `${resp?.prenom} ${resp?.nom} · ${resp?.tel}`, e.id)
    s.toast({ titre: `Appel de ${resp?.prenom} ${resp?.nom}`, texte: `Composez le ${resp?.tel} depuis le téléphone du portail. L’appel est noté au journal.`, niveau: 'info' })
  }
  const points = [
    `${e.prenom} reste à l’intérieur avec ${referent}.`,
    'La Direction est prévenue sur son tableau de bord.',
    `${f.responsable === 'mere' ? 'La maman' : 'Le papa'}, ${resp?.prenom} ${resp?.nom}, est prévenu${f.responsable === 'mere' ? 'e' : ''} sur son téléphone (${resp?.tel}).`,
    `Incident journalisé à ${heureFr(r.heure)} par ${agent}.`,
  ]
  const autorises = f.accompagnateurs.filter((a) => a.autorise)
  return (
    <div className="h-full rounded-2xl border-2 border-rouge bg-rouge-clair p-4 sm:p-6 flex flex-col" data-testid="alerte-sortie">
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-white bg-rouge">
        <OctagonAlert className="size-9 shrink-0" />
        <div>
          <div className="titre text-[1.55rem] sm:text-[1.9rem] leading-none">Sortie refusée</div>
          <div className="text-white/90 mt-1">{r.personne} ({r.lien}) n’est pas sur la liste des adultes autorisés pour {e.prenom} {e.nom}.</div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(16rem,20rem)] gap-5 mt-5">
        <div>
          <ul className="space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex gap-2.5 text-[1.05rem]"><CheckCircle2 className="size-5 text-vert-texte shrink-0 mt-0.5" />{p}</li>
            ))}
          </ul>
          <div className="mt-5 text-encre-2">Adultes autorisés pour {e.prenom}</div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {autorises.map((a) => (
              <li key={a.id} className="flex items-center gap-2 bg-white border border-ligne rounded-full pl-1 pr-3 py-1">
                <Avatar prenom={a.prenom} nom={a.nom} taille={26} />
                <span className="font-semibold">{a.prenom} {a.nom}</span>
                <span className="text-encre-2 text-sm">{a.lien.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </div>
        {notif && (
          <div>
            <div className="text-encre-2 text-sm mb-2 flex items-center gap-1.5"><Bell className="size-4" /> Ce que reçoit {resp?.prenom ?? 'la famille'} sur son téléphone</div>
            <div className="rounded-2xl bg-[#1b2433] p-3 shadow-panneau">
              <div className="rounded-xl bg-white/95 p-3">
                <div className="flex items-center gap-2 text-xs text-encre-2">
                  <img src={CONFIG.LOGO_COULEUR} alt="" className="h-4 w-auto" />
                  <span className="font-semibold">{CONFIG.NOM_PLATEFORME}</span>
                  <span className="ml-auto">maintenant</span>
                </div>
                <div className="font-semibold mt-1.5">{notif.titre}</div>
                <div className="text-sm text-encre-2 mt-0.5 leading-snug">{notif.texte}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-auto pt-6 flex flex-wrap justify-end gap-2">
        <Bouton variante="secondaire" icone={<Phone className="size-4" />} onClick={appeler}>Appeler {resp?.prenom}</Bouton>
        <Bouton variante="secondaire" icone={<RotateCcw className="size-4" />} onClick={onNouveau}>Nouveau scan</Bouton>
      </div>
    </div>
  )
}

function ModaleRefus({ ouvert, onFermer, onConfirmer }: { ouvert: boolean; onFermer: () => void; onConfirmer: (eleveId: string, personne: string, lien: string) => void }) {
  const s = useStore()
  const ic = indexClasses(s.classes)
  const enfants = useMemo(
    () => s.eleves.filter((e) => e.statut === 'actif' && ['creche', 'maternelle'].includes(ic[e.classeId].cycle) && s.presences[e.id]?.arrivee && !s.presences[e.id]?.depart).sort((a, b) => (a.id === ID.mariama ? -1 : b.id === ID.mariama ? 1 : a.prenom.localeCompare(b.prenom, 'fr'))),
    [s.eleves, s.presences, ic],
  )
  const [eleveId, setEleveId] = useState<string>(ID.mariama)
  const [personne, setPersonne] = useState(CONFIG.PAYS === 'Sénégal' ? 'Ousmane Sarr' : 'Ousmane Barry')
  const [lien, setLien] = useState('se dit cousin')
  const [erreur, setErreur] = useState<string | null>(null)
  const e = indexEleves(s.eleves)[eleveId]
  const autorises = e ? indexFamilles(s.familles)[e.familleId].accompagnateurs.filter((a) => a.autorise) : []
  const valider = () => {
    if (!personne.trim()) return setErreur('Indiquez le nom donné par la personne, même approximatif.')
    onConfirmer(eleveId, personne.trim(), lien.trim() || 'lien non précisé')
  }
  return (
    <Modale
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Personne sans carte"
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton onClick={valider} icone={<OctagonAlert className="size-4" />} className="bg-rouge! hover:bg-[#a51f25]!" data-testid="confirmer-refus">Refuser la sortie et alerter</Bouton>
        </>
      }
    >
      <div className="space-y-3">
        <Champ libelle="Enfant demandé">
          <Liste value={eleveId} onChange={(ev) => setEleveId(ev.target.value)}>
            {enfants.slice(0, 80).map((x) => (
              <option key={x.id} value={x.id}>{x.prenom} {x.nom} · {ic[x.classeId].nom}</option>
            ))}
          </Liste>
        </Champ>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Champ libelle="Nom donné par la personne" erreur={erreur}>
            <Saisie value={personne} onChange={(ev) => { setPersonne(ev.target.value); setErreur(null) }} />
          </Champ>
          <Champ libelle="Lien déclaré">
            <Saisie value={lien} onChange={(ev) => setLien(ev.target.value)} />
          </Champ>
        </div>
        <div className="rounded-xl bg-brume px-4 py-3">
          <div className="text-sm text-encre-2 mb-1.5 flex items-center gap-1.5"><Baby className="size-4" /> Adultes autorisés par la famille</div>
          {autorises.length ? (
            <ul className="space-y-1">
              {autorises.map((a) => (
                <li key={a.id} className="flex justify-between gap-3"><span className="font-semibold">{a.prenom} {a.nom}</span><span className="text-encre-2">{a.lien}</span></li>
              ))}
            </ul>
          ) : <Vide titre="Aucun adulte autorisé" />}
        </div>
        <p className="text-sm text-encre-2">« {personne || 'Cette personne'} » n’apparaît pas dans cette liste. En confirmant, l’enfant reste à l’intérieur, la Direction et la famille sont prévenues et l’incident est inscrit au journal.</p>
      </div>
    </Modale>
  )
}

function Passages({ scans }: { scans: Scan[] }) {
  const s = useStore()
  const ie = indexEleves(s.eleves)
  const derniers = scans.slice(-10).reverse()
  const qui = (sc: Scan) => {
    if (sc.carteId) {
      const c = s.cartes.find((x) => x.id === sc.carteId)
      if (c && c.type !== 'eleve') {
        const i = infoCarte(s, c)
        return { nom: `${i.prenom} ${i.nom}`, detail: LIBELLE_TYPE_CARTE[c.type] }
      }
    }
    const e = sc.eleveId ? ie[sc.eleveId] : null
    return e ? { nom: `${e.prenom} ${e.nom}`, detail: sc.resultat === 'alerte' ? 'enfant demandé' : 'Élève' } : { nom: 'Carte inconnue', detail: '' }
  }
  return (
    <Bloc titre={<span>Derniers passages <span className="text-encre-3 font-normal text-base">aujourd’hui</span></span>} sansMarge className="mt-5">
      <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
        {derniers.map((sc) => {
          const q = qui(sc)
          return (
            <li key={sc.id} className={cx('flex items-center gap-3 px-4 py-2.5', sc.resultat !== 'autorise' && 'bg-rouge-clair/40')}>
              <span className="tabulaire text-sm text-encre-2 w-12 shrink-0">{heureFr(sc.date)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold truncate">{q.nom}</span>
                <span className="block text-sm text-encre-2 truncate">{sc.sens === 'entree' ? 'Entrée' : 'Sortie'}{sc.motif !== 'Entrée' && sc.motif !== 'Sortie' ? ` · ${sc.motif}` : ''}</span>
              </span>
              {sc.resultat === 'autorise' ? <Badge ton="vert">Autorisé</Badge> : sc.resultat === 'alerte' ? <Badge ton="rouge">Alerte</Badge> : <Badge ton="rouge">Refusé</Badge>}
            </li>
          )
        })}
      </ul>
      <div className="hidden md:block overflow-x-auto">
        <table className="tableau">
          <thead>
            <tr><th>Heure</th><th>Personne</th><th>Lieu</th><th>Passage</th><th>Résultat</th></tr>
          </thead>
          <tbody>
            {derniers.map((sc) => {
              const q = qui(sc)
              return (
                <tr key={sc.id} className={sc.resultat !== 'autorise' ? 'bg-rouge-clair/40' : undefined}>
                  <td className="tabulaire whitespace-nowrap">{heureFr(sc.date)}</td>
                  <td><span className="font-semibold">{q.nom}</span> <span className="text-encre-2 text-sm">{q.detail}</span></td>
                  <td className="whitespace-nowrap">{sc.lieu}</td>
                  <td className="text-encre-2">{sc.sens === 'entree' ? 'Entrée' : 'Sortie'}{sc.motif !== 'Entrée' && sc.motif !== 'Sortie' ? ` · ${sc.motif}` : ''}</td>
                  <td>{sc.resultat === 'autorise' ? <Badge ton="vert">Autorisé</Badge> : sc.resultat === 'alerte' ? <Badge ton="rouge">Alerte</Badge> : <Badge ton="rouge">Refusé</Badge>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Bloc>
  )
}
