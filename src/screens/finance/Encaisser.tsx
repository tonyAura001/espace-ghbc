/** Caisse : encaisser (famille → échéances → ventilation → mode → reçu). */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Lock, Wallet, Receipt, Banknote, Smartphone, Landmark, FileCheck2, X, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { useStore } from '../../store'
import type { ModePaiement } from '../../data/types'
import { profilParId, peut } from '../../store/profils'
import {
  echeancesParFamille, enfantsParFamille, indexClasses, indexEleves, situationsFamilles, paiementsDuJour, paiementsComptes,
  especesAttendues, LIBELLE_STATUT_ECHEANCE, type LigneEcheance, type StatutEcheance,
} from '../../store/selecteurs'
import { MODES_MOBILE, LIBELLE_MODE } from '../../data/referentiel'
import { ID } from '../../data/generer'
import { Avatar, Badge, Bouton, Champ, PastilleCycle, Saisie, cx, Alerte, Indicateur, Liste, Vide, type Ton } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { money, nombre, numeroRecu, sansAccents } from '../../lib/format'
import { JOUR_DEMO, dateCourte, heureFr } from '../../lib/temps'

export const TON_STATUT: Record<StatutEcheance, Ton> = { payee: 'vert', partielle: 'ambre', a_venir: 'neutre', due: 'bleu', en_retard: 'rouge' }

export default function Encaisser() {
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const familleId = params.get('famille')
  const profil = profilParId(s.session.profilId)
  const cloturee = s.clotures.some((c) => c.date === JOUR_DEMO)
  const pj = paiementsDuJour(s).filter(paiementsComptes)
  const guichet = pj.filter((p) => p.canal === 'guichet')
  const miens = guichet.filter((p) => p.caissierId === profil.userId)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[1.45rem] sm:text-[1.7rem]">Encaisser</h1>
          <p className="text-encre-2 mt-1">Guichet principal · {profil.libelle}</p>
        </div>
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 sm:gap-x-10 gap-y-3 bg-white rounded-xl border border-ligne px-4 sm:px-6 py-3.5 [&_.chiffre]:max-sm:text-[1.45rem]">
          <div className="col-span-2 sm:col-span-1"><Indicateur libelle="Encaissé au guichet aujourd’hui" valeur={<span className="text-vert-texte">{money(guichet.reduce((a, p) => a + p.montant, 0))}</span>} /></div>
          <Indicateur libelle="Mes reçus du jour" valeur={nombre(miens.length)} detail={`${nombre(guichet.length)} au guichet`} />
          <Indicateur libelle="Espèces en caisse" valeur={money(especesAttendues(s))} detail={<Link to="/caisse/cloture" className="text-bleu font-semibold hover:underline">Clôture de caisse</Link>} />
        </div>
      </div>

      {cloturee && (
        <div className="mb-5">
          <Alerte ton="ambre" icone={<Lock className="size-5" />} titre="La caisse du jour est clôturée">
            Le comptage a été signé : plus aucun encaissement au guichet aujourd’hui. Les paiements mobiles des parents restent acceptés et seront rattachés à la journée de demain.
          </Alerte>
        </div>
      )}

      {!familleId ? (
        <ChoixFamille onChoisir={(id) => setParams({ famille: id })} />
      ) : (
        <Ventilation key={familleId} familleId={familleId} onChanger={() => setParams({})} verrouille={cloturee || !peut(profil.role, 'encaisser')} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Étape 1 */
function ChoixFamille({ onChoisir }: { onChoisir: (id: string) => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const enfants = enfantsParFamille(s.eleves)
  const situations = situationsFamilles(s.echeances, s.paiements)
  const ic = indexClasses(s.classes)
  const resultats = useMemo(() => {
    const t = sansAccents(q.trim())
    if (!t) {
      // suggestions : la famille de démonstration puis des familles en retard
      const retard = Object.values(situations).filter((x) => x.statut === 'en_retard').sort((a, b) => b.enRetard - a.enRetard).map((x) => x.familleId)
      return [ID.famille, ...retard.filter((x) => x !== ID.famille)].slice(0, 7)
    }
    const chiffres = t.replace(/\D/g, '')
    return s.familles
      .filter((f) => {
        const txt = sansAccents(`${f.nom} ${f.mere?.prenom ?? ''} ${f.mere?.nom ?? ''} ${f.pere?.prenom ?? ''} ${(enfants[f.id] ?? []).map((e) => `${e.prenom} ${e.matricule}`).join(' ')}`)
        const tels = `${f.mere?.tel ?? ''}${f.pere?.tel ?? ''}`.replace(/\D/g, '')
        return t.split(/\s+/).every((m) => txt.includes(m)) || (chiffres.length >= 4 && tels.includes(chiffres))
      })
      .slice(0, 12)
      .map((f) => f.id)
  }, [q, s.familles, enfants, situations])
  const famIdx = Object.fromEntries(s.familles.map((f) => [f.id, f]))

  return (
    <section className="bg-white rounded-2xl border border-ligne">
      <div className="p-4 sm:p-5 border-b border-ligne">
        <h2 className="text-[1.1rem]">1. Quelle famille paie ?</h2>
        <div className="relative mt-3 max-w-2xl">
          <Search className="size-5 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
          <Saisie autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de famille, prénom d’un parent ou d’un enfant, téléphone, matricule…" className="pl-10 text-lg" data-testid="recherche-famille" />
        </div>
        {!q && <p className="text-encre-2 mt-2 text-sm">Suggestions : la famille de démonstration et les familles qui ont le plus de retard.</p>}
      </div>
      {resultats.length === 0 ? (
        <Vide titre={`Aucune famille ne correspond à « ${q} »`} texte="Essayez le prénom de la maman, le nom d’un enfant ou les 4 derniers chiffres du téléphone." />
      ) : (
        <ul>
          {resultats.map((fid) => {
            const f = famIdx[fid]
            const sit = situations[fid]
            const resp = f.responsable === 'mere' ? f.mere : f.pere
            return (
              <li key={fid} className="border-t border-ligne-2 first:border-t-0">
                <button onClick={() => onChoisir(fid)} className="w-full text-left flex flex-wrap items-center gap-x-6 gap-y-2 px-4 sm:px-5 py-3.5 hover:bg-brume" data-testid={`famille-${fid}`}>
                  <span className="sm:min-w-[14rem] flex-1 min-w-0">
                    <span className="block font-semibold text-[1.05rem]">Famille {f.nom}</span>
                    <span className="block text-encre-2">{resp ? `${resp.prenom} ${resp.nom} · ${resp.tel}` : ''}</span>
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 flex-[2] max-sm:basis-full">
                    {(enfants[fid] ?? []).map((e) => (
                      <span key={e.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <PastilleCycle cycle={ic[e.classeId].cycle} libelle={false} />
                        <span>{e.prenom}</span>
                        <span className="text-encre-3">{ic[e.classeId].nom}</span>
                      </span>
                    ))}
                  </span>
                  <span className="sm:text-right sm:min-w-[11rem]">
                    {sit?.statut === 'en_retard' ? <Badge ton="rouge">{money(sit.enRetard)} en retard</Badge> : sit?.resteEchu ? <Badge ton="ambre">{money(sit.resteEchu)} dû</Badge> : <Badge ton="vert">À jour</Badge>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------- Étapes 2 à 4 */
const MODES: { id: ModePaiement; icone: typeof Banknote }[] = [
  { id: 'especes', icone: Banknote },
  { id: MODES_MOBILE[0], icone: Smartphone },
  { id: MODES_MOBILE[1], icone: Smartphone },
  { id: 'virement', icone: Landmark },
  { id: 'cheque', icone: FileCheck2 },
]

function Ventilation({ familleId, onChanger, verrouille }: { familleId: string; onChanger: () => void; verrouille: boolean }) {
  const s = useStore()
  const encaisser = useStore((st) => st.encaisser)
  const toast = useStore((st) => st.toast)
  const nav = useNavigate()
  const [executer, enCours] = useAction()
  const f = s.familles.find((x) => x.id === familleId)
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)
  const toutes = useMemo(() => (echeancesParFamille(s.echeances, s.paiements)[familleId] ?? []).filter((e) => e.reste > 0), [s.echeances, s.paiements, familleId])
  const ordre: Record<StatutEcheance, number> = { en_retard: 0, partielle: 1, due: 2, a_venir: 3, payee: 4 }
  const triees = useMemo(() => [...toutes].sort((a, b) => ordre[a.statut] - ordre[b.statut] || a.echeance.localeCompare(b.echeance) || a.eleveId.localeCompare(b.eleveId)), [toutes]) // eslint-disable-line react-hooks/exhaustive-deps
  const echues = triees.filter((e) => e.statut !== 'a_venir')
  const aVenir = triees.filter((e) => e.statut === 'a_venir')
  const [voirAVenir, setVoirAVenir] = useState(echues.length === 0)
  const [coches, setCoches] = useState<Set<string>>(() => new Set(echues.map((e) => e.id)))
  const [montants, setMontants] = useState<Record<string, number>>(() => Object.fromEntries(echues.map((e) => [e.id, e.reste])))
  const [montantSaisi, setMontantSaisi] = useState<string>('')
  const [mode, setMode] = useState<ModePaiement>('especes')
  const [reference, setReference] = useState('')
  const [remis, setRemis] = useState('')
  const resp = f ? (f.responsable === 'mere' ? f.mere : f.pere) : null
  const payeurs = f ? [...f.accompagnateurs.map((a) => `${a.prenom} ${a.nom}`)] : []
  const [payeur, setPayeur] = useState(resp ? `${resp.prenom} ${resp.nom}` : payeurs[0] ?? '')
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => setErreur(null), [mode, reference, coches])

  if (!f) return <Vide titre="Famille introuvable" action={<Bouton onClick={onChanger}>Choisir une famille</Bouton>} />

  const liste = voirAVenir ? [...echues, ...aVenir.slice(0, 12)] : echues
  const total = [...coches].reduce((a, id) => a + (montants[id] ?? 0), 0)
  const situation = situationsFamilles(s.echeances, s.paiements)[familleId]

  /** Ventile un montant sur les échéances cochées, les plus anciennes d'abord. */
  const ventiler = (valeur: number) => {
    let reste = valeur
    const res: Record<string, number> = { ...montants }
    for (const e of [...triees].filter((x) => coches.has(x.id)).sort((a, b) => a.echeance.localeCompare(b.echeance))) {
      const m = Math.min(e.reste, Math.max(0, reste))
      res[e.id] = m
      reste -= m
    }
    setMontants(res)
  }
  const basculer = (e: LigneEcheance) => {
    const n = new Set(coches)
    if (n.has(e.id)) n.delete(e.id)
    else {
      n.add(e.id)
      setMontants((m) => ({ ...m, [e.id]: m[e.id] || e.reste }))
    }
    setCoches(n)
    setMontantSaisi('')
  }

  const mobile = MODES_MOBILE.includes(mode)
  const refRequise = mode !== 'especes'
  const monnaie = mode === 'especes' && remis ? Number(remis.replace(/\D/g, '')) - total : null

  const valider = async () => {
    if (verrouille) return
    if (total <= 0) return setErreur('Cochez au moins une échéance et indiquez un montant supérieur à zéro.')
    if (refRequise && reference.trim().length < 4) return setErreur(mobile ? 'Saisissez la référence de la transaction indiquée dans le SMS de l’opérateur.' : mode === 'cheque' ? 'Saisissez le numéro du chèque.' : 'Saisissez la référence du virement.')
    if (monnaie !== null && monnaie < 0) return setErreur('Le montant remis est inférieur au total : corrigez le montant remis ou le montant à encaisser.')
    const lignes = [...coches].map((id) => ({ echeanceId: id, montant: montants[id] ?? 0 })).filter((l) => l.montant > 0)
    const p = await executer(() =>
      encaisser({ familleId, lignes, mode, reference: refRequise ? (mode === 'cheque' && !/^chèque/i.test(reference) ? `Chèque n° ${reference.trim()}` : reference.trim()) : null, payeur, canal: 'guichet' }),
    )
    if (p) {
      toast({ titre: 'Paiement encaissé', texte: `${numeroRecu(p.numero)} · ${money(p.montant)} · famille ${f.nom}`, niveau: 'succes' })
      nav(`/caisse/recu/${p.id}`)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] 2xl:grid-cols-[1fr_24rem] gap-5 items-start">
      <div className="space-y-5 min-w-0">
        <section className="bg-white rounded-2xl border border-ligne p-4 sm:p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-3 sm:min-w-[16rem] flex-1 min-w-0 max-sm:basis-full">
            <Avatar prenom={resp?.prenom ?? f.nom} nom={f.nom} taille={44} />
            <div className="min-w-0">
              <div className="font-semibold text-lg titre">Famille {f.nom}</div>
              <div className="text-encre-2">{resp ? `${resp.prenom} ${resp.nom} · ${resp.tel}` : ''} · {f.quartier}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-8 max-sm:w-full">
            <div><div className="text-encre-2 text-sm">Reste dû à ce jour</div><div className="chiffre text-xl">{money(situation?.resteEchu ?? 0)}</div></div>
            <div><div className="text-encre-2 text-sm">Dont en retard</div><div className={cx('chiffre text-xl', situation?.enRetard ? 'text-rouge' : 'text-vert-texte')}>{money(situation?.enRetard ?? 0)}</div></div>
          </div>
          <Bouton variante="secondaire" icone={<X className="size-4" />} onClick={onChanger} className="max-sm:w-full">Changer de famille</Bouton>
        </section>

        <section className="bg-white rounded-2xl border border-ligne">
          <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
            <h2 className="text-[1.1rem]">2. Échéances à régler</h2>
            <div className="flex items-center gap-3 max-sm:w-full">
              <label className="text-encre-2 text-sm whitespace-nowrap" htmlFor="montant-recu">Montant reçu</label>
              <Saisie
                id="montant-recu"
                inputMode="numeric"
                value={montantSaisi}
                placeholder={nombre(total)}
                onChange={(e) => {
                  const brut = e.target.value.replace(/\D/g, '')
                  setMontantSaisi(brut ? nombre(Number(brut)) : '')
                  ventiler(Number(brut || 0))
                }}
                className="w-44 max-sm:flex-1 text-right tabulaire font-semibold"
                data-testid="montant-recu"
              />
            </div>
          </header>
          {toutes.length === 0 ? (
            <Vide icone={<CheckCircle2 className="size-8 text-vert-texte" />} titre="Cette famille est à jour pour toute l’année" texte="Aucune échéance ne reste à payer." />
          ) : (
            <>
            <ul className="md:hidden lg:block xl:hidden divide-y divide-ligne-2 border-t border-ligne-2">
              {liste.map((e) => {
                const el = ie[e.eleveId]
                const c = el ? ic[el.classeId] : null
                const coche = coches.has(e.id)
                return (
                  <li key={e.id} className={cx('px-4 py-3', !coche && 'opacity-75')}>
                    <label className="flex items-start gap-3 cursor-pointer min-h-11">
                      <input type="checkbox" checked={coche} onChange={() => basculer(e)} className="size-6 mt-0.5 accent-[#0249A2] shrink-0" aria-label={`Inclure ${e.libelle}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold">{c && <PastilleCycle cycle={c.cycle} libelle={false} className="mr-1.5" />}{el?.prenom} · {e.libelle.split(' · ')[0]}</span>
                          <span className="tabulaire whitespace-nowrap">{money(e.reste)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-sm text-encre-2">{e.mois ? e.libelle.split(' · ')[1] + ' · ' : ''}avant le {dateCourte(e.echeance)}</span>
                          <Badge ton={TON_STATUT[e.statut]}>{LIBELLE_STATUT_ECHEANCE[e.statut]}</Badge>
                        </span>
                      </span>
                    </label>
                    {coche && (
                      <div className="flex items-center justify-between gap-3 mt-2 pl-9">
                        <span className="text-sm text-encre-2">À imputer</span>
                        <input
                          inputMode="numeric"
                          value={nombre(montants[e.id] ?? 0)}
                          onChange={(ev) => {
                            const v = Math.min(e.reste, Number(ev.target.value.replace(/\D/g, '') || 0))
                            setMontants((m) => ({ ...m, [e.id]: v }))
                            setMontantSaisi('')
                          }}
                          className="w-40 h-11 text-right tabulaire rounded-lg border border-ligne px-3"
                          aria-label={`Montant imputé sur ${e.libelle}`}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="hidden md:block lg:hidden xl:block overflow-x-auto">
              <table className="tableau">
                <thead>
                  <tr>
                    <th className="w-10" />
                    <th>Élève</th>
                    <th>Échéance</th>
                    <th>Date limite</th>
                    <th>Statut</th>
                    <th className="text-right">Reste</th>
                    <th className="text-right">À imputer</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((e) => {
                    const el = ie[e.eleveId]
                    const c = el ? ic[el.classeId] : null
                    const coche = coches.has(e.id)
                    return (
                      <tr key={e.id} className={cx(!coche && 'opacity-70')}>
                        <td><input type="checkbox" checked={coche} onChange={() => basculer(e)} className="size-[1.1rem] accent-[#0249A2] cursor-pointer" aria-label={`Inclure ${e.libelle}`} /></td>
                        <td className="whitespace-nowrap">{c && <PastilleCycle cycle={c.cycle} libelle={false} className="mr-2" />}{el?.prenom}</td>
                        <td>{e.libelle}{e.remise > 0 && <span className="text-encre-3 text-sm"> · {e.motifRemise}</span>}</td>
                        <td className="whitespace-nowrap">{dateCourte(e.echeance)}</td>
                        <td><Badge ton={TON_STATUT[e.statut]}>{LIBELLE_STATUT_ECHEANCE[e.statut]}</Badge></td>
                        <td className="text-right whitespace-nowrap tabulaire">{money(e.reste)}</td>
                        <td className="text-right">
                          <input
                            inputMode="numeric"
                            disabled={!coche}
                            value={coche ? nombre(montants[e.id] ?? 0) : ''}
                            onChange={(ev) => {
                              const v = Math.min(e.reste, Number(ev.target.value.replace(/\D/g, '') || 0))
                              setMontants((m) => ({ ...m, [e.id]: v }))
                              setMontantSaisi('')
                            }}
                            className="w-32 text-right tabulaire rounded-md border border-ligne px-2 py-1.5 disabled:bg-brume disabled:border-transparent"
                            aria-label={`Montant imputé sur ${e.libelle}`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
          {aVenir.length > 0 && (
            <button onClick={() => setVoirAVenir(!voirAVenir)} className="w-full flex items-center justify-center gap-1.5 py-3 text-bleu font-semibold border-t border-ligne-2 hover:bg-brume">
              {voirAVenir ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {voirAVenir ? 'Masquer les échéances à venir' : `Payer en avance : ${aVenir.length} échéances à venir`}
            </button>
          )}
        </section>
      </div>

      <aside className="bg-white rounded-2xl border border-ligne p-4 sm:p-5 space-y-5 lg:sticky lg:top-2">
        <div>
          <h2 className="text-[1.1rem]">3. Mode de paiement</h2>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setReference('') }}
                className={cx('flex items-center gap-2 rounded-lg border px-3 py-2.5 min-h-12 text-left font-semibold', mode === m.id ? 'border-bleu bg-bleu-clair text-bleu' : 'border-ligne hover:border-bleu-ligne', m.id === 'cheque' && 'col-span-2')}
                data-testid={`mode-${m.id}`}
              >
                <m.icone className="size-4 shrink-0" /> {LIBELLE_MODE[m.id]}
              </button>
            ))}
          </div>
          {refRequise && (
            <Champ className="mt-3" libelle={mobile ? 'Référence de la transaction' : mode === 'cheque' ? 'Numéro du chèque' : 'Référence du virement'} aide={mobile ? `Indiquée dans le SMS ${LIBELLE_MODE[mode]} reçu par le parent.` : undefined}>
              <Saisie value={reference} onChange={(e) => setReference(e.target.value)} placeholder={mobile ? 'Ex. : MP261022.1042.A47812' : mode === 'cheque' ? 'Ex. : 4521877' : 'Ex. : VIR Ecobank 7Q2K4M'} data-testid="reference" />
            </Champ>
          )}
          {mode === 'especes' && (
            <Champ className="mt-3" libelle="Montant remis par le parent" aide={monnaie !== null ? (monnaie >= 0 ? `Monnaie à rendre : ${money(monnaie)}` : `Il manque ${money(-monnaie)}`) : 'Facultatif : calcule la monnaie à rendre.'}>
              <Saisie inputMode="numeric" value={remis} onChange={(e) => { const b = e.target.value.replace(/\D/g, ''); setRemis(b ? nombre(Number(b)) : '') }} className="tabulaire" />
            </Champ>
          )}
          <Champ className="mt-3" libelle="Payé par">
            <Liste value={payeur} onChange={(e) => setPayeur(e.target.value)}>
              {payeurs.map((p) => <option key={p}>{p}</option>)}
            </Liste>
          </Champ>
        </div>
        <div className="border-t border-ligne pt-4">
          <h2 className="text-[1.1rem]">4. Récapitulatif</h2>
          <div className="mt-2 space-y-1 text-[0.95rem]">
            <div className="flex justify-between"><span className="text-encre-2">Échéances</span><span>{nombre([...coches].filter((id) => (montants[id] ?? 0) > 0).length)}</span></div>
            <div className="flex justify-between"><span className="text-encre-2">Mode</span><span>{LIBELLE_MODE[mode]}</span></div>
            <div className="flex justify-between"><span className="text-encre-2">Reste dû après paiement</span><span className="tabulaire">{money(Math.max(0, (situation?.resteEchu ?? 0) - [...coches].filter((id) => echues.some((e) => e.id === id)).reduce((a, id) => a + (montants[id] ?? 0), 0)))}</span></div>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-semibold">Total à encaisser</span>
            <span className="chiffre text-[1.9rem] text-vert-texte" data-testid="total-encaisser">{money(total)}</span>
          </div>
          {erreur && <p className="text-rouge text-sm mt-2">{erreur}</p>}
          <Bouton taille="lg" className="w-full mt-3" variante="succes" icone={verrouille ? <Lock className="size-4" /> : <Wallet className="size-4" />} onClick={valider} chargement={enCours} disabled={verrouille || total <= 0} data-testid="encaisser">
            {verrouille ? 'Caisse clôturée' : `Encaisser ${money(total)}`}
          </Bouton>
          <p className="text-sm text-encre-2 mt-2 flex items-start gap-1.5"><Receipt className="size-4 shrink-0 mt-0.5" /> Le reçu numéroté s’ouvre aussitôt, prêt à imprimer en A5 ou en ticket.</p>
        </div>
        <DerniersRecus />
      </aside>
      {/* téléphone et tablette : total toujours visible en bas de l'écran */}
      <div className="lg:hidden sticky bottom-0 -mx-[clamp(1rem,2.2vw,2.5rem)] px-4 py-3 bg-white/95 backdrop-blur border-t border-ligne flex items-center gap-3 z-10">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-encre-2">Total · {LIBELLE_MODE[mode]}</div>
          <div className="chiffre text-[1.35rem] text-vert-texte leading-tight">{money(total)}</div>
          {erreur && <div className="text-rouge text-xs mt-0.5">{erreur}</div>}
        </div>
        <Bouton taille="lg" variante="succes" icone={verrouille ? <Lock className="size-4" /> : <Wallet className="size-4" />} onClick={valider} chargement={enCours} disabled={verrouille || total <= 0} data-testid="encaisser-mobile">
          {verrouille ? 'Clôturée' : 'Encaisser'}
        </Bouton>
      </div>
    </div>
  )
}

function DerniersRecus() {
  const s = useStore()
  const derniers = paiementsDuJour(s).slice(-3).reverse()
  if (!derniers.length) return null
  const fam = Object.fromEntries(s.familles.map((f) => [f.id, f.nom]))
  return (
    <div className="border-t border-ligne pt-4">
      <div className="text-encre-2 text-sm mb-1.5">Derniers reçus du jour</div>
      <ul className="space-y-1">
        {derniers.map((p) => (
          <li key={p.id}>
            <Link to={`/caisse/recu/${p.id}`} className="flex justify-between gap-2 hover:underline">
              <span className="truncate">{numeroRecu(p.numero)} · {fam[p.familleId]}</span>
              <span className="text-encre-2 whitespace-nowrap">{heureFr(p.date)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
