/** Journal d'audit en direct : qui, quand, quoi, avant et après. En ajout seul. */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Search, Download, ChevronRight, Radio } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../store'
import type { Audit as LigneAudit } from '../data/types'
import { indexEleves, nomEleve } from '../store/selecteurs'
import { Avatar, Badge, Bouton, EnTetePage, Liste, Panneau, Saisie, Segments, cx, Vide, SqueletteTableau, Alerte } from '../ui/base'
import { useAction, useChargement } from '../ui/hooks'
import { money, nombre, sansAccents } from '../lib/format'
import { LIBELLE_MODE } from '../data/referentiel'
import { JOUR_DEMO, ajouterJours, dateCourte, dateHeure, heureFr } from '../lib/temps'

type Periode = 'jour' | 'semaine' | 'tout'

const LIB_CLE: Record<string, string> = {
  montant: 'Montant', mode: 'Mode', recu: 'Reçu', resteDu: 'Reste dû', enRetard: 'En retard', statut: 'Statut', motif: 'Motif',
  note: 'Note', version: 'Version', attendu: 'Attendu', compte: 'Compté', ecart: 'Écart', justification: 'Justification',
  matricule: 'Matricule', classe: 'Classe', echeances: 'Échéances créées', total: 'Total', absents: 'Absents', retards: 'Retards',
  noms: 'Élèves', present: 'Présent', recuperePar: 'Récupéré par', resultat: 'Résultat', alerte: 'Alerte', canal: 'Canal',
  familles: 'Familles', niveau: 'Niveau', justifiee: 'Justifiée', justificatif: 'Justificatif', adultes: 'Adultes', distinction: 'Distinction',
  avertissement: 'Avertissement', gravite: 'Gravité', sanction: 'Sanction', ecritureInverse: 'Écriture inverse', decision: 'Décision',
  categorie: 'Catégorie', piece: 'Pièce jointe', destinataires: 'Destinataires', canaux: 'Canaux', reponse: 'Réponse', carte: 'Carte', remplacement: 'Nouvelle carte',
}

const MONTANTS = ['montant', 'resteDu', 'enRetard', 'attendu', 'compte', 'ecart', 'total']
function valeur(v: unknown, cle = ''): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number' && MONTANTS.includes(cle)) return money(v)
  if (cle === 'mode' && typeof v === 'string' && v in LIBELLE_MODE) return LIBELLE_MODE[v as keyof typeof LIBELLE_MODE]
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  if (typeof v === 'number') return v >= 10000 ? `${nombre(v)}` : String(v).replace('.', ',')
  return String(v)
}

export default function Audit() {
  const s = useStore()
  const pret = useChargement(420)
  const [periode, setPeriode] = useState<Periode>('jour')
  const [type, setType] = useState('')
  const [utilisateur, setUtilisateur] = useState('')
  const [q, setQ] = useState('')
  const [eleve, setEleve] = useState('')
  const [detail, setDetail] = useState<LigneAudit | null>(null)
  const [executer, enCours] = useAction()
  const ie = indexEleves(s.eleves)
  const recents = s.ui.derniereActivite
  const session = s.audit.filter((a) => a.id.startsWith('AUD-R')).length

  const types = useMemo(() => [...new Set(s.audit.map((a) => a.type))].sort((a, b) => a.localeCompare(b, 'fr')), [s.audit])
  const utilisateurs = useMemo(() => [...new Set(s.audit.map((a) => a.userNom))].sort((a, b) => a.localeCompare(b, 'fr')), [s.audit])

  const lignes = useMemo(() => {
    const t = sansAccents(q.trim())
    const te = sansAccents(eleve.trim())
    const depuis = periode === 'jour' ? JOUR_DEMO : periode === 'semaine' ? ajouterJours(JOUR_DEMO, -6) : '0000'
    return s.audit
      .filter((a) => {
        if (a.date.slice(0, 10) < depuis) return false
        if (type && a.type !== type) return false
        if (utilisateur && a.userNom !== utilisateur) return false
        if (te) {
          const e = a.eleveId ? ie[a.eleveId] : null
          if (!e || !sansAccents(`${e.prenom} ${e.nom} ${e.matricule}`).includes(te)) return false
        }
        if (t && !t.split(/\s+/).every((m) => sansAccents(`${a.action} ${a.objet} ${a.userNom} ${a.role}`).includes(m))) return false
        return true
      })
      .reverse()
  }, [s.audit, periode, type, utilisateur, q, eleve, ie])

  const exporter = () =>
    executer(() => {
      const entete = ['Date', 'Heure', 'Utilisateur', 'Rôle', 'Type', 'Action', 'Objet', 'Élève', 'Avant', 'Après']
      const csv = [entete, ...lignes.map((a) => [dateCourte(a.date.slice(0, 10)), a.date.slice(11, 16), a.userNom, a.role, a.type, a.action, a.objet, a.eleveId ? nomEleve(ie[a.eleveId]) : '', JSON.stringify(a.avant ?? ''), JSON.stringify(a.apres ?? '')])]
        .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n')
      try {
        const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `journal-audit-GHBC-${JOUR_DEMO}.csv`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      } catch {
        /* téléchargement bloqué par le navigateur : l'export reste tracé */
      }
      s.exporter(`Journal d’audit · ${nombre(lignes.length)} lignes (CSV)`)
      s.toast({ titre: 'Export du journal prêt', texte: `${nombre(lignes.length)} lignes au format CSV`, niveau: 'succes' })
    })

  return (
    <div>
      <EnTetePage
        titre="Journal d’audit"
        sousTitre="Qui, quand, quoi, avant et après : chaque action de la plateforme est inscrite ici à l’instant."
        actions={
          <>
            <span className="inline-flex items-center gap-2 rounded-lg bg-vert-clair text-vert-texte font-semibold px-3 py-2 max-sm:text-sm" data-testid="compteur-session">
              <Radio className="size-4 pouls" /> {nombre(session)} action{session > 1 ? 's' : ''} pendant cette démonstration
            </span>
            <Bouton variante="secondaire" icone={<Download className="size-4" />} onClick={exporter} chargement={enCours}>Exporter</Bouton>
          </>
        }
      />
      <div className="mb-4">
        <Alerte ton="bleu" icone={<Lock className="size-5" />} titre="Journal en ajout seul">
          Aucune ligne ne peut être modifiée ni supprimée, même par un administrateur. Les corrections s’ajoutent comme de nouvelles lignes.
        </Alerte>
      </div>
      <div className="bg-white rounded-2xl border border-ligne">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 p-4 border-b border-ligne">
          <div className="sm:col-span-2 overflow-x-auto -mx-1 px-1 lg:mx-0 lg:px-0">
            <Segments options={[{ id: 'jour', libelle: 'Aujourd’hui' }, { id: 'semaine', libelle: '7 derniers jours' }, { id: 'tout', libelle: 'Depuis la rentrée' }]} valeur={periode} onChange={setPeriode} />
          </div>
          <Liste value={type} onChange={(e) => setType(e.target.value)} className="w-full lg:w-44" aria-label="Type d’action">
            <option value="">Tous les types</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </Liste>
          <Liste value={utilisateur} onChange={(e) => setUtilisateur(e.target.value)} className="w-full lg:w-56" aria-label="Utilisateur">
            <option value="">Tous les utilisateurs</option>
            {utilisateurs.map((u) => <option key={u}>{u}</option>)}
          </Liste>
          <Saisie value={eleve} onChange={(e) => setEleve(e.target.value)} placeholder="Élève ou matricule" className="w-full lg:w-48" />
          <div className="relative lg:flex-1 lg:min-w-[12rem]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
            <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une action, un reçu, une classe…" className="pl-9" />
          </div>
        </div>
        <div className="px-4 sm:px-5 py-2.5 text-encre-2 border-b border-ligne-2"><b className="text-encre">{nombre(lignes.length)}</b> ligne{lignes.length > 1 ? 's' : ''}{lignes.length > 300 && ' · les 300 plus récentes sont affichées'}</div>
        {!pret ? <SqueletteTableau /> : lignes.length === 0 ? (
          <Vide titre="Aucune action pour ces filtres" texte="Élargissez la période ou retirez un filtre." />
        ) : (
          <>
          <ul className="md:hidden divide-y divide-ligne-2">
            {lignes.slice(0, 300).map((a) => {
              const e = a.eleveId ? ie[a.eleveId] : null
              return (
                <li key={a.id} className={cx(recents.includes(a.id) && 'flash')} data-testid="carte-audit">
                  <button onClick={() => setDetail(a)} className="w-full text-left px-4 py-3 active:bg-brume">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{a.action}</span>
                      <span className="text-sm text-encre-2 tabulaire whitespace-nowrap">{a.date.startsWith(JOUR_DEMO) ? heureFr(a.date) : dateCourte(a.date.slice(0, 10))}</span>
                    </div>
                    <div className="text-encre-2 text-[0.92rem] mt-0.5">{a.objet}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm">
                      <span className="text-encre">{a.userNom}</span>
                      <span className="text-encre-3">· {a.role}</span>
                      <Badge ton={a.action.includes('refus') || a.action.includes('Annulation') ? 'ambre' : 'neutre'}>{a.type}</Badge>
                      {e && <span className="text-bleu">{e.prenom} {e.nom}</span>}
                      {(a.avant || a.apres) && <span className="ml-auto inline-flex items-center gap-0.5 text-bleu font-semibold">Avant / après <ChevronRight className="size-4" /></span>}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="tableau">
              <thead><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Objet</th><th>Élève</th><th /></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {lignes.slice(0, 300).map((a) => {
                    const [p, n] = a.userNom.split(' ')
                    const e = a.eleveId ? ie[a.eleveId] : null
                    return (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cx('cliquable', recents.includes(a.id) && 'flash')}
                        onClick={() => setDetail(a)}
                        data-testid="ligne-audit"
                      >
                        <td className="whitespace-nowrap tabulaire">{a.date.startsWith(JOUR_DEMO) ? heureFr(a.date) : dateHeure(a.date)}</td>
                        <td>
                          <span className="flex items-center gap-2.5">
                            <Avatar prenom={p ?? ''} nom={n ?? ''} taille={30} />
                            <span className="leading-tight"><span className="block font-semibold whitespace-nowrap">{a.userNom}</span><span className="block text-sm text-encre-2">{a.role}</span></span>
                          </span>
                        </td>
                        <td><span className="font-semibold">{a.action}</span> <Badge ton={a.action.includes('refus') || a.action.includes('Annulation') ? 'ambre' : 'neutre'} className="ml-1">{a.type}</Badge></td>
                        <td className="text-encre-2 max-w-[26rem]">{a.objet}</td>
                        <td className="whitespace-nowrap">{e ? <Link onClick={(ev) => ev.stopPropagation()} to={`/eleves/${e.id}/historique`} className="text-bleu hover:underline">{e.prenom} {e.nom}</Link> : <span className="text-encre-3">—</span>}</td>
                        <td>{(a.avant || a.apres) && <span className="inline-flex items-center gap-1 text-bleu text-sm font-semibold whitespace-nowrap">Avant / après <ChevronRight className="size-4" /></span>}</td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      <Panneau ouvert={!!detail} onFermer={() => setDetail(null)} titre={detail?.action ?? ''} sousTitre={detail ? `${dateHeure(detail.date)} · ${detail.userNom}, ${detail.role}` : ''}>
        {detail && <DetailAudit a={detail} />}
      </Panneau>
    </div>
  )
}

function DetailAudit({ a }: { a: LigneAudit }) {
  const s = useStore()
  const e = a.eleveId ? indexEleves(s.eleves)[a.eleveId] : null
  const cles = [...new Set([...Object.keys(a.avant ?? {}), ...Object.keys(a.apres ?? {})])]
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-[6rem_1fr] sm:grid-cols-[8rem_1fr] gap-x-3 gap-y-2 [&_dd]:min-w-0 [&_dd]:break-words">
        <dt className="text-encre-2">Quand</dt><dd>{dateHeure(a.date)}</dd>
        <dt className="text-encre-2">Qui</dt><dd>{a.userNom} · {a.role}</dd>
        <dt className="text-encre-2">Type</dt><dd>{a.type}</dd>
        <dt className="text-encre-2">Quoi</dt><dd>{a.objet}</dd>
        {e && <><dt className="text-encre-2">Élève</dt><dd>{e.prenom} {e.nom} · {e.matricule}</dd></>}
        <dt className="text-encre-2">Référence</dt><dd className="tabulaire text-encre-2">{a.id}</dd>
      </dl>
      {cles.length > 0 ? (
        <table className="tableau border border-ligne rounded-lg">
          <thead><tr><th>Donnée</th><th>Avant</th><th>Après</th></tr></thead>
          <tbody>
            {cles.map((k) => {
              const av = a.avant?.[k]
              const ap = a.apres?.[k]
              const change = valeur(av, k) !== valeur(ap, k)
              return (
                <tr key={k}>
                  <td className="text-encre-2">{LIB_CLE[k] ?? k}</td>
                  <td className={cx(change && a.avant && 'text-rouge line-through decoration-rouge/50')}>{a.avant ? valeur(av, k) : '—'}</td>
                  <td className={cx(change && 'text-vert-texte font-semibold')}>{valeur(ap, k)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-encre-2">Action sans changement de données (consultation ou connexion) : elle est tracée pour savoir qui a vu quoi.</p>
      )}
      <p className="text-sm text-encre-3 flex items-center gap-1.5"><Lock className="size-4" /> Ligne scellée : elle ne peut être ni modifiée ni supprimée.</p>
    </div>
  )
}
