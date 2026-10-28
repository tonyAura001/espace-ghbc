/** Impayés par classe, relances groupées WhatsApp / SMS avec aperçu, plans de paiement. */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, MessageSquareText, CalendarClock, CheckCheck, Wallet, Send, Phone, Video, ChevronLeft } from 'lucide-react'
import { useStore } from '../../store'
import type { Famille, Cycle } from '../../data/types'
import { profilParId, peut } from '../../store/profils'
import {
  recouvrementDetail, situationsFamilles, enfantsParFamille, indexClasses, echeancesParFamille, nomPersonnel, type LigneEcheance,
} from '../../store/selecteurs'
import { CYCLES, NOM_CYCLE } from '../../data/referentiel'
import { Badge, Bloc, Bouton, Case, EnTetePage, Jauge, Panneau, PastilleCycle, Segments, Zone, cx, Modale, Champ, Saisie, Indicateur, SqueletteTableau, Vide, COULEUR_CYCLE } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { money, moneyCompact, nombre, pct } from '../../lib/format'
import { JOUR_DEMO, ecartJours, dateCourte, jourMois, relatif, ajouterJours, heureFr, maintenant } from '../../lib/temps'
import { CONFIG, urlBase } from '../../config'

type Inclure = 'retard' | 'tous'

export default function Impayes() {
  const s = useStore()
  const pret = useChargement()
  const role = profilParId(s.session.profilId).role
  const rec = recouvrementDetail(s)
  const situations = situationsFamilles(s.echeances, s.paiements)
  const enfants = enfantsParFamille(s.eleves)
  const ic = indexClasses(s.classes)
  const [classeId, setClasseId] = useState<string>('toutes')
  const [inclure, setInclure] = useState<Inclure>('retard')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [relance, setRelance] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)

  const familles = useMemo(() => {
    return s.familles
      .filter((f) => {
        const sit = situations[f.id]
        if (!sit) return false
        if (inclure === 'retard' ? sit.statut !== 'en_retard' : sit.resteEchu <= 0) return false
        if (classeId === 'toutes') return true
        return (enfants[f.id] ?? []).some((e) => e.classeId === classeId)
      })
      .sort((a, b) => (situations[b.id].enRetard || situations[b.id].resteEchu) - (situations[a.id].enRetard || situations[a.id].resteEchu))
  }, [s.familles, situations, inclure, classeId, enfants])

  const totalRetard = Object.values(situations).reduce((a, x) => a + x.enRetard, 0)
  const nbRetard = Object.values(situations).filter((x) => x.statut === 'en_retard').length
  const relancesMois = s.relances.filter((r) => r.date.slice(0, 7) === JOUR_DEMO.slice(0, 7)).length
  const tous = familles.length > 0 && familles.every((f) => selection.has(f.id))
  const basculer = (id: string) => {
    const n = new Set(selection)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setSelection(n)
  }

  return (
    <div>
      <EnTetePage
        titre="Impayés et relances"
        sousTitre="Le système alerte, vous décidez. Chaque relance est tracée."
        actions={
          <Bouton icone={<MessageCircle className="size-4" />} disabled={!selection.size || !peut(role, 'relancer')} onClick={() => setRelance(true)} data-testid="relance-whatsapp">
            Relancer {selection.size ? `${selection.size} famille${selection.size > 1 ? 's' : ''}` : 'la sélection'}
          </Bouton>
        }
      />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 lg:grid-cols-4 mb-5 [&>*]:bg-white [&>*]:p-4 sm:[&>*]:p-5 [&_.chiffre]:max-sm:text-[1.5rem]">
        <div><Indicateur libelle="En retard de plus de 15 jours" valeur={<span className="text-rouge">{moneyCompact(totalRetard)}</span>} /></div>
        <div><Indicateur libelle="Familles en retard" valeur={nombre(nbRetard)} detail={`sur ${nombre(s.familles.length)} familles`} /></div>
        <div><Indicateur libelle="Recouvrement à date" valeur={pct(rec.taux, 1)} detail={`${moneyCompact(rec.reste)} restent dus sur l’échu`} /></div>
        <div><Indicateur libelle="Relances ce mois-ci" valeur={nombre(relancesMois)} detail={s.plans.length ? `${nombre(s.plans.length)} plan${s.plans.length > 1 ? 's' : ''} de paiement accordé${s.plans.length > 1 ? 's' : ''} aujourd’hui` : 'Aucun plan de paiement accordé aujourd’hui'} /></div>
      </section>

      {!pret ? <SqueletteTableau /> : (
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] 2xl:grid-cols-[22rem_1fr] gap-5 items-start">
          {/* téléphone et tablette : sélecteur de classe */}
          <div className="lg:hidden bg-white rounded-2xl border border-ligne p-4">
            <label className="block text-sm font-semibold text-encre-2 mb-1.5" htmlFor="classe-impayes">Classe</label>
            <select id="classe-impayes" value={classeId} onChange={(e) => { setClasseId(e.target.value); setSelection(new Set()) }} className="w-full h-12 rounded-lg border border-ligne bg-white px-3 text-[0.95rem]">
              <option value="toutes">Toutes les classes · {pct(rec.taux, 1)}</option>
              {CYCLES.map((c: Cycle) => (
                <optgroup key={c} label={`${NOM_CYCLE[c]} · ${pct(rec.parCycle[c]?.taux ?? 1, 1)}`}>
                  {s.classes.filter((x) => x.cycle === c).map((cl) => <option key={cl.id} value={cl.id}>{cl.nom} · {pct(rec.parClasse[cl.id]?.taux ?? 1, 0)}</option>)}
                </optgroup>
              ))}
            </select>
            {classeId !== 'toutes' && <div className="mt-3"><Jauge valeur={rec.parClasse[classeId]?.taux ?? 1} hauteur={6} /></div>}
          </div>
          <Bloc titre="Recouvrement par classe" sansMarge className="hidden lg:block">
            <button onClick={() => { setClasseId('toutes'); setSelection(new Set()) }} className={cx('w-full flex justify-between px-5 py-2.5 border-t border-ligne-2 text-left', classeId === 'toutes' ? 'bg-bleu-clair text-bleu font-semibold' : 'hover:bg-brume')}>
              <span>Toutes les classes</span><span className="tabulaire">{pct(rec.taux, 1)}</span>
            </button>
            <div className="max-h-[62vh] overflow-y-auto defilement">
              {CYCLES.map((c: Cycle) => (
                <div key={c}>
                  <div className="px-5 pt-3 pb-1 text-sm text-encre-2 flex items-center justify-between">
                    <PastilleCycle cycle={c} libelle={NOM_CYCLE[c]} />
                    <span className="tabulaire">{pct(rec.parCycle[c]?.taux ?? 1, 1)}</span>
                  </div>
                  {s.classes.filter((x) => x.cycle === c).map((cl) => {
                    const r = rec.parClasse[cl.id]
                    const nb = s.familles.filter((f) => situations[f.id]?.statut === 'en_retard' && (enfants[f.id] ?? []).some((e) => e.classeId === cl.id)).length
                    return (
                      <button key={cl.id} onClick={() => { setClasseId(cl.id); setSelection(new Set()) }} className={cx('w-full px-5 py-2 text-left border-t border-ligne-2', classeId === cl.id ? 'bg-bleu-clair' : 'hover:bg-brume')} data-testid={`classe-${cl.id}`}>
                        <div className="flex justify-between gap-2">
                          <span className={cx(classeId === cl.id && 'font-semibold text-bleu')}>{cl.nom}</span>
                          <span className="text-sm text-encre-2">{nb ? <span className="text-rouge font-semibold">{nb} en retard</span> : 'à jour'} · <b className="tabulaire text-encre">{pct(r?.taux ?? 1, 0)}</b></span>
                        </div>
                        <div className="mt-1.5"><Jauge valeur={r?.taux ?? 1} hauteur={5} couleur={(r?.taux ?? 1) < 0.75 ? 'var(--color-ambre)' : COULEUR_CYCLE[c]} /></div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </Bloc>

          <div className="space-y-5 min-w-0">
            <Bloc
              titre={classeId === 'toutes' ? 'Familles concernées' : `Familles concernées · ${ic[classeId]?.nom}`}
              actions={<Segments options={[{ id: 'retard', libelle: 'En retard' }, { id: 'tous', libelle: 'Tout reste dû' }]} valeur={inclure} onChange={(v) => { setInclure(v); setSelection(new Set()) }} />}
              sansMarge
            >
              {familles.length === 0 ? (
                <Vide titre="Aucune famille en retard dans cette classe" texte="Bravo : tout est réglé ou dans le délai de grâce de 15 jours." />
              ) : (
                <>
                <div className="md:hidden">
                  <label className="flex items-center gap-3 px-4 py-3 border-t border-ligne-2 bg-brume/60 min-h-12 cursor-pointer">
                    <input type="checkbox" checked={tous} onChange={() => setSelection(tous ? new Set() : new Set(familles.map((f) => f.id)))} className="size-6 accent-[#0249A2]" />
                    <span className="font-semibold">Tout sélectionner</span>
                    <span className="ml-auto text-encre-2 text-sm">{nombre(familles.length)} famille{familles.length > 1 ? 's' : ''}</span>
                  </label>
                  <ul className="divide-y divide-ligne-2 border-t border-ligne-2">
                    {familles.slice(0, 120).map((f) => {
                      const sit = situations[f.id]
                      const jours = sit.plusAncienRetard ? ecartJours(JOUR_DEMO, sit.plusAncienRetard) : 0
                      const resp = f.responsable === 'mere' ? f.mere : f.pere
                      const planActif = s.plans.find((p) => p.familleId === f.id && p.statut === 'actif')
                      return (
                        <li key={f.id} className={cx('px-4 py-3', selection.has(f.id) && 'bg-bleu-clair/40')}>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={selection.has(f.id)} onChange={() => basculer(f.id)} className="size-6 mt-0.5 accent-[#0249A2] shrink-0" aria-label={`Sélectionner la famille ${f.nom}`} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="font-semibold">Famille {f.nom}</span>
                                <span className="tabulaire font-semibold text-rouge whitespace-nowrap">{sit.enRetard ? money(sit.enRetard) : money(sit.resteEchu)}</span>
                              </span>
                              <span className="block text-sm text-encre-2">{resp?.prenom} {resp?.nom} · <span className="tabulaire">{resp?.tel}</span></span>
                              <span className="flex flex-wrap gap-x-3 text-sm mt-1">{(enfants[f.id] ?? []).map((e) => <span key={e.id} className="whitespace-nowrap"><PastilleCycle cycle={ic[e.classeId].cycle} libelle={false} /> {e.prenom} <span className="text-encre-3">{ic[e.classeId].nom}</span></span>)}</span>
                              <span className="flex flex-wrap items-center gap-2 mt-1.5">
                                {sit.plusAncienRetard ? <Badge ton={jours > 30 ? 'rouge' : 'ambre'}>Retard de {nombre(jours)} jours</Badge> : <Badge ton="ambre">Partiel</Badge>}
                                {planActif && <Badge ton="bleu">Plan de paiement</Badge>}
                              </span>
                            </span>
                          </label>
                          <div className="flex gap-2 mt-2 pl-9">
                            <Bouton variante="secondaire" taille="sm" className="min-h-10" icone={<CalendarClock className="size-4" />} onClick={() => setPlan(f.id)}>Plan</Bouton>
                            {peut(role, 'encaisser') && <Link to={`/caisse?famille=${f.id}`} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-lg border border-bleu-ligne text-bleu font-semibold text-sm"><Wallet className="size-4" /> Encaisser</Link>}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="tableau">
                    <thead>
                      <tr>
                        <th className="w-10"><input type="checkbox" checked={tous} onChange={() => setSelection(tous ? new Set() : new Set(familles.map((f) => f.id)))} className="size-[1.1rem] accent-[#0249A2]" aria-label="Tout sélectionner" /></th>
                        <th>Famille</th>
                        <th>Enfants</th>
                        <th className="text-right">En retard</th>
                        <th className="text-right">Reste dû</th>
                        <th>Retard depuis</th>
                        <th className="hidden lg:table-cell">Dernière relance</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {familles.slice(0, 120).map((f) => {
                        const sit = situations[f.id]
                        const jours = sit.plusAncienRetard ? ecartJours(JOUR_DEMO, sit.plusAncienRetard) : 0
                        const der = [...s.relances].reverse().find((r) => r.familleId === f.id)
                        const planActif = s.plans.find((p) => p.familleId === f.id && p.statut === 'actif')
                        const resp = f.responsable === 'mere' ? f.mere : f.pere
                        return (
                          <tr key={f.id} className={cx(selection.has(f.id) && 'bg-bleu-clair/40')}>
                            <td><input type="checkbox" checked={selection.has(f.id)} onChange={() => basculer(f.id)} className="size-[1.1rem] accent-[#0249A2]" aria-label={`Sélectionner la famille ${f.nom}`} data-testid={`selection-${f.id}`} /></td>
                            <td><div className="font-semibold">{f.nom}</div><div className="text-sm text-encre-2">{resp?.prenom} {resp?.nom}</div><div className="text-sm text-encre-2 whitespace-nowrap tabulaire">{resp?.tel}</div></td>
                            <td className="text-sm">{(enfants[f.id] ?? []).map((e) => <div key={e.id} className="whitespace-nowrap"><PastilleCycle cycle={ic[e.classeId].cycle} libelle={false} /> {e.prenom} <span className="text-encre-3">{ic[e.classeId].nom}</span></div>)}</td>
                            <td className="text-right tabulaire font-semibold text-rouge whitespace-nowrap">{sit.enRetard ? money(sit.enRetard) : '—'}</td>
                            <td className="text-right tabulaire whitespace-nowrap">{money(sit.resteEchu)}</td>
                            <td className="whitespace-nowrap">{sit.plusAncienRetard ? <Badge ton={jours > 30 ? 'rouge' : 'ambre'}>{nombre(jours)} jours</Badge> : <span className="text-encre-3">Partiel</span>}</td>
                            <td className="text-sm whitespace-nowrap hidden lg:table-cell">{der ? <span>{der.canal === 'whatsapp' ? 'WhatsApp' : der.canal === 'sms' ? 'SMS' : 'Appel'} · {relatif(der.date)}</span> : <span className="text-encre-3">Aucune</span>}{planActif && <div><Badge ton="bleu">Plan de paiement</Badge></div>}</td>
                            <td className="text-right whitespace-nowrap">
                              <Bouton variante="discret" taille="sm" icone={<CalendarClock className="size-4" />} onClick={() => setPlan(f.id)}>Plan</Bouton>
                              {peut(role, 'encaisser') && <Link to={`/caisse?famille=${f.id}`} className="inline-flex items-center gap-1 text-bleu font-semibold text-sm ml-2 hover:underline"><Wallet className="size-4" /> Encaisser</Link>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </Bloc>
            <HistoriqueRelances />
          </div>
        </div>
      )}
      {selection.size > 0 && (
        <div className="lg:hidden sticky bottom-0 -mx-[clamp(1rem,2.2vw,2.5rem)] mt-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-ligne flex items-center gap-3 z-10">
          <span className="flex-1 font-semibold">{selection.size} famille{selection.size > 1 ? 's' : ''} sélectionnée{selection.size > 1 ? 's' : ''}</span>
          <Bouton taille="lg" icone={<MessageCircle className="size-4" />} disabled={!peut(role, 'relancer')} onClick={() => setRelance(true)} data-testid="relance-whatsapp-mobile">Relancer</Bouton>
        </div>
      )}
      <PanneauRelance ouvert={relance} onFermer={() => setRelance(false)} familleIds={[...selection]} onEnvoye={() => setSelection(new Set())} />
      <ModalePlan familleId={plan} onFermer={() => setPlan(null)} />
    </div>
  )
}

/* ------------------------------------------------------------ Message */
function lignesRelance(lignes: LigneEcheance[], inclureTout: boolean) {
  return lignes.filter((l) => (inclureTout ? l.echeance <= JOUR_DEMO && l.reste > 0 : l.statut === 'en_retard'))
}

function messagePour(f: Famille, s: ReturnType<typeof useStore.getState>, modele: string) {
  const ie = Object.fromEntries(s.eleves.map((e) => [e.id, e]))
  const ic = indexClasses(s.classes)
  const resp = f.responsable === 'mere' ? f.mere : f.pere
  const lignes = lignesRelance(echeancesParFamille(s.echeances, s.paiements)[f.id] ?? [], true)
  const retard = lignes.filter((l) => l.statut === 'en_retard')
  const cible = retard.length ? retard : lignes
  const details = cible.map((l) => `• ${l.libelle.replace(' · ', ' de ')} pour ${ie[l.eleveId]?.prenom} (${ic[ie[l.eleveId]?.classeId]?.nom}) : ${money(l.reste)}, échue le ${jourMois(l.echeance)}`).join('\n')
  const total = cible.reduce((a, l) => a + l.reste, 0)
  return modele
    .replace('{civilite}', f.responsable === 'mere' ? 'Madame' : 'Monsieur')
    .replace('{parent}', resp ? `${resp.prenom} ${resp.nom}` : `famille ${f.nom}`)
    .replace('{details}', details)
    .replace('{total}', money(total))
    .replace('{lien}', `${urlBase().replace(/^https?:\/\//, '')}#/parent`)
}

const MODELE = `Bonjour {civilite} {parent},

Sauf erreur de notre part, les sommes suivantes restent à régler :
{details}

Total : {total}

Vous pouvez payer par Orange Money ou MTN MoMo depuis votre espace parent : {lien}
Si vous avez déjà payé, merci de ne pas tenir compte de ce message. Pour un étalement, répondez simplement à ce message.

Le service comptable, ${CONFIG.SIGLE}`

function PanneauRelance({ ouvert, onFermer, familleIds, onEnvoye }: { ouvert: boolean; onFermer: () => void; familleIds: string[]; onEnvoye: () => void }) {
  const s = useStore()
  const envoyer = useStore((st) => st.envoyerRelances)
  const toast = useStore((st) => st.toast)
  const [executer, enCours] = useAction()
  const [canal, setCanal] = useState<'whatsapp' | 'sms'>('whatsapp')
  const [modele, setModele] = useState(MODELE)
  const [apercuIdx, setApercuIdx] = useState(0)
  const familles = familleIds.map((id) => s.familles.find((f) => f.id === id)!).filter(Boolean)
  const fa = familles[Math.min(apercuIdx, familles.length - 1)]
  const texte = fa ? messagePour(fa, s, modele) : ''
  const resp = fa ? (fa.responsable === 'mere' ? fa.mere : fa.pere) : null
  const go = async () => {
    await executer(() => envoyer(familleIds, canal, (f) => messagePour(f, useStore.getState(), modele)), [500, 800])
    toast({ titre: `Relance ${canal === 'whatsapp' ? 'WhatsApp' : 'SMS'} envoyée`, texte: `${familleIds.length} famille${familleIds.length > 1 ? 's' : ''} · inscrit au journal d’audit`, niveau: 'succes' })
    onEnvoye()
    onFermer()
  }
  return (
    <Panneau
      ouvert={ouvert}
      onFermer={onFermer}
      largeur="xl"
      titre={`Relancer ${familles.length} famille${familles.length > 1 ? 's' : ''}`}
      sousTitre="Chaque famille reçoit un message personnalisé avec ses propres montants."
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton icone={<Send className="size-4" />} onClick={go} chargement={enCours} data-testid="envoyer-relance">
            Envoyer {familles.length} message{familles.length > 1 ? 's' : ''} {canal === 'whatsapp' ? 'WhatsApp' : 'SMS'}
          </Bouton>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">
        <div className="space-y-4 order-2 lg:order-1">
          <Segments options={[{ id: 'whatsapp', libelle: <span className="inline-flex items-center gap-1.5"><MessageCircle className="size-4" /> WhatsApp</span> }, { id: 'sms', libelle: <span className="inline-flex items-center gap-1.5"><MessageSquareText className="size-4" /> SMS</span> }]} valeur={canal} onChange={setCanal} />
          <Champ libelle="Modèle du message" aide="Les zones entre accolades sont remplacées pour chaque famille : {parent}, {details}, {total}, {lien}.">
            <Zone value={modele} onChange={(e) => setModele(e.target.value)} className="min-h-[18rem] font-[inherit] text-[0.95rem]" />
          </Champ>
          <div>
            <div className="text-sm font-semibold text-encre-2 mb-1.5">Destinataires</div>
            <ul className="max-h-48 overflow-y-auto defilement border border-ligne rounded-lg divide-y divide-ligne-2 [&_button]:min-h-11 [&_button]:flex-wrap">
              {familles.map((f, i) => {
                const r = f.responsable === 'mere' ? f.mere : f.pere
                return (
                  <li key={f.id}>
                    <button onClick={() => setApercuIdx(i)} className={cx('w-full flex justify-between gap-3 px-3 py-2 text-left', i === apercuIdx ? 'bg-bleu-clair' : 'hover:bg-brume')}>
                      <span>Famille {f.nom} · {r?.prenom} {r?.nom}</span>
                      <span className="text-encre-2 tabulaire">{r?.tel}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="text-sm font-semibold text-encre-2 mb-2">Aperçu sur le téléphone de la famille</div>
          {canal === 'whatsapp' ? (
            <div className="rounded-[1.6rem] overflow-hidden border-[6px] border-[#0d1626] shadow-panneau">
              <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center gap-2.5">
                <ChevronLeft className="size-5" />
                <span className="size-9 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0"><img src={CONFIG.LOGO_COULEUR} alt="" className="w-8" /></span>
                <span className="flex-1 min-w-0 leading-tight">
                  <span className="block font-semibold truncate">{CONFIG.SIGLE} · Service comptable</span>
                  <span className="block text-xs text-white/75">Compte professionnel</span>
                </span>
                <Video className="size-5" /><Phone className="size-4" />
              </div>
              <div className="bg-[#ECE5DD] px-3 py-4 min-h-[26rem] max-h-[34rem] overflow-y-auto" data-testid="apercu-whatsapp">
                <div className="mx-auto w-fit rounded-md bg-[#E1F2FB] text-[#4a5a64] text-xs px-2 py-1 mb-3">Aujourd’hui</div>
                <div className="relative ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#DCF8C6] px-3 py-2 shadow-sm text-[0.88rem] leading-snug whitespace-pre-line text-[#111b21]">
                  {texte}
                  <div className="flex justify-end items-center gap-1 text-[0.7rem] text-[#667781] mt-1">{heureFr(maintenant())} <CheckCheck className="size-3.5 text-[#53bdeb]" /></div>
                </div>
              </div>
              <div className="bg-[#F0F0F0] px-3 py-2 text-xs text-encre-2 text-center">À {resp?.prenom} {resp?.nom} · {resp?.tel}</div>
            </div>
          ) : (
            <div className="rounded-[1.6rem] overflow-hidden border-[6px] border-[#0d1626] bg-white shadow-panneau">
              <div className="bg-brume px-3 py-2.5 text-center border-b border-ligne"><div className="font-semibold">{CONFIG.SIGLE}</div><div className="text-xs text-encre-2">SMS</div></div>
              <div className="px-3 py-4 min-h-[26rem]">
                <div className="max-w-[92%] rounded-2xl bg-ligne-2 px-3 py-2 text-[0.88rem] whitespace-pre-line">{texte}</div>
                <div className="text-xs text-encre-3 mt-2">{Math.ceil(texte.length / 153)} SMS · {nombre(texte.length)} caractères</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panneau>
  )
}

function HistoriqueRelances() {
  const s = useStore()
  const fam = Object.fromEntries(s.familles.map((f) => [f.id, f]))
  const liste = [...s.relances].reverse().slice(0, 12)
  return (
    <Bloc titre="Historique des relances" sansMarge>
      {liste.length === 0 ? <Vide titre="Aucune relance envoyée" /> : (
        <>
        <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
          {liste.map((r) => (
            <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-semibold">Famille {fam[r.familleId]?.nom}</span>
                <span className="block text-sm text-encre-2">{r.canal === 'whatsapp' ? 'WhatsApp' : r.canal === 'sms' ? 'SMS' : 'Appel'} · {dateCourte(r.date.slice(0, 10))} · {heureFr(r.date)} · {nomPersonnel(s, r.auteurId)}</span>
              </span>
              <Badge ton="vert"><CheckCheck className="size-3.5" /> {r.date.slice(0, 10) === JOUR_DEMO ? 'Remis' : 'Lu'}</Badge>
            </li>
          ))}
        </ul>
        <table className="tableau hidden md:table">
          <thead><tr><th>Date</th><th>Famille</th><th>Canal</th><th>Envoyée par</th><th>Statut</th></tr></thead>
          <tbody>
            {liste.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{dateCourte(r.date.slice(0, 10))} · {heureFr(r.date)}</td>
                <td>{fam[r.familleId]?.nom}</td>
                <td>{r.canal === 'whatsapp' ? 'WhatsApp' : r.canal === 'sms' ? 'SMS' : 'Appel'}</td>
                <td className="text-encre-2">{nomPersonnel(s, r.auteurId)}</td>
                <td><Badge ton="vert"><CheckCheck className="size-3.5" /> {r.date.slice(0, 10) === JOUR_DEMO ? 'Remis' : 'Lu'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
    </Bloc>
  )
}

/* ---------------------------------------------------- Plan de paiement */
function ModalePlan({ familleId, onFermer }: { familleId: string | null; onFermer: () => void }) {
  const s = useStore()
  const creer = useStore((st) => st.creerPlan)
  const toast = useStore((st) => st.toast)
  const [executer, enCours] = useAction()
  const [n, setN] = useState(3)
  const [premier, setPremier] = useState(ajouterJours(JOUR_DEMO, 7))
  const [prevenir, setPrevenir] = useState(true)
  const f = familleId ? s.familles.find((x) => x.id === familleId) : null
  const sit = f ? situationsFamilles(s.echeances, s.paiements)[f.id] : null
  const montant = sit?.resteEchu ?? 0
  const versements = Array.from({ length: n }, (_, i) => {
    const d = new Date(premier + 'T12:00:00')
    d.setMonth(d.getMonth() + i)
    const base = Math.floor(montant / n / 1000) * 1000
    return { date: d.toISOString().slice(0, 10), montant: i === n - 1 ? montant - base * (n - 1) : base }
  })
  const go = async () => {
    if (!f) return
    await executer(() => {
      creer(f.id, versements)
      if (prevenir) useStore.getState().envoyerRelances([f.id], 'whatsapp', () => `Plan de paiement accordé : ${versements.map((v) => `${dateCourte(v.date)} ${money(v.montant)}`).join(', ')}`)
    })
    toast({ titre: 'Plan de paiement accordé', texte: `Famille ${f.nom} · ${n} versements`, niveau: 'succes' })
    onFermer()
  }
  return (
    <Modale ouvert={!!f} onFermer={onFermer} titre={f ? `Plan de paiement · famille ${f.nom}` : ''} pied={<><Bouton variante="discret" onClick={onFermer}>Annuler</Bouton><Bouton onClick={go} chargement={enCours} disabled={montant <= 0}>Accorder le plan</Bouton></>}>
      {f && (
        <div className="space-y-4">
          <p className="text-encre-2">Reste dû à ce jour : <b className="text-encre">{money(montant)}</b>. Le plan étale ce montant ; les relances automatiques sont suspendues tant que les versements sont respectés.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Champ libelle="Nombre de versements">
              <Segments options={[2, 3, 4].map((x) => ({ id: String(x), libelle: `${x} fois` }))} valeur={String(n)} onChange={(v) => setN(Number(v))} />
            </Champ>
            <Champ libelle="Premier versement le">
              <Saisie type="date" value={premier} min={JOUR_DEMO} onChange={(e) => setPremier(e.target.value)} />
            </Champ>
          </div>
          <table className="tableau">
            <thead><tr><th>Versement</th><th>Date</th><th className="text-right">Montant</th></tr></thead>
            <tbody>{versements.map((v, i) => <tr key={i}><td>{i + 1}</td><td>{dateCourte(v.date)}</td><td className="text-right tabulaire">{money(v.montant)}</td></tr>)}</tbody>
          </table>
          <Case checked={prevenir} onChange={setPrevenir} libelle="Envoyer l’échéancier à la famille par WhatsApp" />
        </div>
      )}
    </Modale>
  )
}
