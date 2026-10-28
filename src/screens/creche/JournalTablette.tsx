/**
 * Journal du jour de la crèche, sur tablette. Saisie en deux touches :
 * 1. toucher un ou plusieurs enfants ; 2. toucher une action puis un détail préréglé.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import { useStore } from '../../store'
import { crecheGroupes, journalParEleve, indexFamilles, nomPersonnel } from '../../store/selecteurs'
import type { Eleve, TypeJournal } from '../../data/types'
import { ID } from '../../data/generer'
import { CadreTablette } from '../../ui/cadres'
import { Avatar, cx } from '../../ui/base'
import { useMinutes } from '../../ui/hooks'
import { heureFr, minutesEnHhmm, ageLisible, JOUR_DEMO, heureDemo } from '../../lib/temps'
import { ACTIONS, ACTION_PAR_TYPE, details } from './commun'

export default function JournalTablette() {
  const vueDouble = useStore((s) => s.ui.vueDouble)
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
          <Link to="/creche" className="inline-flex items-center gap-1 text-bleu font-semibold hover:underline">
            <ChevronLeft className="size-4" /> Tableau de la crèche
          </Link>
          <span className="text-encre-3 hidden sm:inline">·</span>
          <h1 className="text-[1.35rem]">Journal du jour sur tablette</h1>
        </div>
        <p className="text-encre-2 text-sm hidden md:block">Un enfant, une action, un détail : c’est enregistré et envoyé aux parents.</p>
      </div>
      <div className="mx-auto" style={{ maxWidth: vueDouble ? 'calc((100dvh - 10rem) * 1.25)' : 'calc((100dvh - 10rem) * 1.44)' }}>
        <CadreTablette>
          <Tablette />
        </CadreTablette>
      </div>
    </div>
  )
}

function Tablette() {
  const s = useStore()
  const minutes = useMinutes()
  const groupes = crecheGroupes(s)
  const [groupeId, setGroupeId] = useState<string>(ID.classeMariama)
  const [selection, setSelection] = useState<string[]>([])
  const [action, setAction] = useState<TypeJournal | null>(null)
  const [confirmation, setConfirmation] = useState<{ texte: string; id: number } | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [recents, setRecents] = useState<string[]>([])
  // écran étroit : on bascule entre la grille des enfants et le fil du jour
  const [vueFil, setVueFil] = useState(false)

  const groupe = groupes.find((g) => g.classe.id === groupeId) ?? groupes[0]
  const journal = journalParEleve(s.journal)
  const ie = useMemo(() => Object.fromEntries(groupe.enfants.map((e) => [e.id, e])), [groupe.enfants])
  const selectionnes = selection.map((id) => ie[id]).filter(Boolean) as Eleve[]
  const focus = selectionnes[0] ?? null
  const educatrice = nomPersonnel(s, groupe.adultes[0] ?? ID.educatrice)

  const statut = (e: Eleve): 'present' | 'absent' | 'parti' => {
    const p = s.presences[e.id]
    if (!p?.arrivee) return 'absent'
    if (p.depart) return 'parti'
    return 'present'
  }

  const basculer = (e: Eleve) => {
    setAction(null)
    setSelection((sel) => (sel.includes(e.id) ? sel.filter((x) => x !== e.id) : [...sel, e.id]))
  }

  const actionPossible = (t: TypeJournal) => {
    if (!selectionnes.length) return false
    if (t === 'arrivee') return selectionnes.every((e) => statut(e) === 'absent')
    if (t === 'depart') return selectionnes.length === 1 && statut(selectionnes[0]) === 'present'
    return selectionnes.every((e) => statut(e) === 'present')
  }

  const confirmer = (texte: string) => {
    const id = Date.now()
    setConfirmation({ texte, id })
    setTimeout(() => setConfirmation((c) => (c?.id === id ? null : c)), 2600)
  }

  const valider = async (detail: string) => {
    if (!action || enCours) return
    setEnCours(true)
    await new Promise((r) => setTimeout(r, 280))
    const st = useStore.getState()
    if (action === 'arrivee') {
      const h = heureDemo()
      useStore.setState((x) => {
        const presences = { ...x.presences }
        for (const e of selectionnes) presences[e.id] = { ...presences[e.id], eleveId: e.id, arrivee: h, depart: null, recupereParId: null }
        return { presences }
      })
    }
    // les détails accordés au genre sont enregistrés par groupe de genre
    if (action === 'sieste' || action === 'incident') {
      const parSexe = { F: selectionnes.filter((e) => e.sexe === 'F'), M: selectionnes.filter((e) => e.sexe === 'M') }
      const idx = details(action, 'mixte', minutes).indexOf(detail)
      for (const sexe of ['F', 'M'] as const) {
        if (!parSexe[sexe].length) continue
        const d = idx >= 0 ? details(action, sexe, minutes)[idx] : detail
        st.ajouterJournal(parSexe[sexe].map((e) => e.id), action, d)
      }
    } else {
      st.ajouterJournal(selectionnes.map((e) => e.id), action, detail)
    }
    setRecents(selection)
    setTimeout(() => setRecents([]), 2200)
    confirmer(`${ACTION_PAR_TYPE[action].libelle} enregistré pour ${selectionnes.map((e) => e.prenom).join(', ')} · ${heureFr(minutesEnHhmm(minutes))}${selectionnes.some((e) => e.id === ID.mariama) ? ' · envoyé à la maman' : ''}`)
    setAction(null)
    setSelection([])
    setEnCours(false)
  }

  const remettre = async (eleveId: string, accompagnateurId: string, nomAcc: string) => {
    setEnCours(true)
    await new Promise((r) => setTimeout(r, 300))
    useStore.getState().remettreEnfant(eleveId, accompagnateurId)
    confirmer(`Départ enregistré : ${ie[eleveId].prenom} remis${ie[eleveId].sexe === 'F' ? 'e' : ''} à ${nomAcc}`)
    setAction(null)
    setSelection([])
    setEnCours(false)
  }

  const sexeSel: 'F' | 'M' | 'mixte' = selectionnes.length && selectionnes.every((e) => e.sexe === 'F') ? 'F' : selectionnes.length && selectionnes.every((e) => e.sexe === 'M') ? 'M' : 'mixte'
  const allergiques = selectionnes.filter((e) => e.sante.allergies.length)
  const famille = focus ? indexFamilles(s.familles)[focus.familleId] : null
  const filFocus = focus ? journal[focus.id] ?? [] : []

  return (
    <div className="@container h-full flex flex-col bg-brume text-[15px]">
      {/* barre de la tablette */}
      <div className="bg-white border-b border-ligne px-3 @min-[40rem]:px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="size-2.5 rounded-full bg-creche shrink-0 hidden @min-[40rem]:inline" />
        <span className="font-semibold titre whitespace-nowrap hidden @min-[40rem]:inline">Crèche</span>
        <div className="flex gap-1 rounded-xl bg-ligne-2 p-1 @min-[40rem]:ml-1 max-w-full overflow-x-auto">
          {groupes.map((g) => (
            <button
              key={g.classe.id}
              onClick={() => { setGroupeId(g.classe.id); setSelection([]); setAction(null) }}
              className={cx('px-3 @min-[40rem]:px-3.5 py-1.5 min-h-10 rounded-lg font-semibold whitespace-nowrap', g.classe.id === groupe.classe.id ? 'bg-white shadow-sm text-encre' : 'text-encre-2')}
            >
              {g.classe.nom} <span className="text-encre-3 font-normal">{g.presents.length}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setVueFil((v) => !v)}
          className="@min-[44rem]:hidden rounded-lg border border-ligne px-3 py-1.5 min-h-10 text-sm font-semibold text-bleu"
        >
          {vueFil ? 'Enfants' : 'Fil du jour'}
        </button>
        <span className={cx('rounded-full px-2.5 py-1 text-sm font-semibold whitespace-nowrap', groupe.depasse ? 'bg-rouge-clair text-rouge' : 'bg-vert-clair text-vert-texte')}>
          {groupe.presents.length} enfants · {groupe.adultes.length}<span className="hidden @min-[30rem]:inline"> adultes</span><span className="@min-[30rem]:hidden"> ad.</span>
        </span>
        <span className="text-encre-2 text-sm whitespace-nowrap hidden @min-[50rem]:inline">{educatrice}</span>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* tuiles + actions */}
        <div className={cx('flex-1 min-w-0 flex-col relative', vueFil ? 'hidden @min-[44rem]:flex' : 'flex')}>
          <div className="flex-1 min-h-0 overflow-y-auto defilement p-3">
            <div className="grid gap-2 @min-[40rem]:gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(6.6rem, 18cqw, 7.6rem), 1fr))' }}>
              {groupe.enfants.map((e) => {
                const st = statut(e)
                const der = (journal[e.id] ?? []).at(-1)
                const sel = selection.includes(e.id)
                return (
                  <button
                    key={e.id}
                    data-testid={`tuile-${e.id}`}
                    onClick={() => basculer(e)}
                    className={cx(
                      'relative rounded-2xl border-2 bg-white px-1.5 @min-[40rem]:px-2 pt-3 pb-2 flex flex-col items-center text-center transition-all min-h-[8.4rem]',
                      sel ? 'border-bleu ring-4 ring-bleu/15 -translate-y-0.5' : 'border-transparent shadow-[0_1px_3px_rgba(1,42,94,0.1)]',
                      st !== 'present' && !sel && 'opacity-55',
                      recents.includes(e.id) && 'flash',
                    )}
                  >
                    {sel && <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-bleu text-white flex items-center justify-center"><Check className="size-3.5" /></span>}
                    {e.sante.allergies.length > 0 && <span className="absolute top-2 left-2 size-2.5 rounded-full bg-rouge" title={`Allergie : ${e.sante.allergies.join(', ')}`} />}
                    <Avatar prenom={e.prenom} nom={e.nom} taille={50} />
                    <span className="font-semibold mt-1.5 leading-tight">{e.prenom}</span>
                    <span className="text-[0.78rem] text-encre-3 leading-tight">{ageLisible(e.naissance)}</span>
                    <span className={cx('text-[0.75rem] leading-tight mt-1 line-clamp-2', st === 'present' ? 'text-encre-2' : 'text-encre-3')}>
                      {st === 'absent' ? (minutes > 9 * 60 + 30 ? `Absent${e.sexe === 'F' ? 'e' : ''} aujourd’hui` : `Pas encore arrivé${e.sexe === 'F' ? 'e' : ''}`) : st === 'parti' ? `Parti${e.sexe === 'F' ? 'e' : ''} à ${heureFr(s.presences[e.id].depart!)}` : der ? `${heureFr(der.heure)} · ${der.detail}` : `Arrivé${e.sexe === 'F' ? 'e' : ''} à ${heureFr(s.presences[e.id].arrivee!)}`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* barre d'actions */}
          <div className="bg-white border-t border-ligne px-3 pt-2 pb-3">
            <div className="text-sm text-encre-2 mb-1.5 h-5 truncate">
              {selectionnes.length === 0 ? 'Touchez un ou plusieurs enfants' : `${selectionnes.length} enfant${selectionnes.length > 1 ? 's' : ''} : ${selectionnes.map((e) => e.prenom).join(', ')}`}
            </div>
            <div className="grid grid-cols-4 @min-[40rem]:grid-cols-8 gap-1.5">
              {ACTIONS.map((a) => {
                const ok = actionPossible(a.type)
                return (
                  <button
                    key={a.type}
                    data-testid={`action-${a.type}`}
                    disabled={!ok}
                    onClick={() => setAction(a.type)}
                    className={cx('rounded-xl py-2 min-h-[3.4rem] flex flex-col items-center justify-center gap-1 font-semibold text-[0.85rem] border transition-colors', ok ? 'bg-white border-ligne hover:bg-brume' : 'bg-brume border-transparent text-encre-3 opacity-60', action === a.type && 'ring-2 ring-bleu')}
                    style={ok ? { color: a.couleur } : undefined}
                  >
                    <a.icone className="size-6" />
                    {a.libelle}
                  </button>
                )
              })}
            </div>
          </div>

          {/* feuille des détails */}
          <AnimatePresence>
            {action && (
              <motion.div className="absolute inset-0 z-10 flex flex-col justify-end bg-bleu-nuit/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAction(null)}>
                <motion.div
                  className="bg-white rounded-t-3xl px-4 @min-[40rem]:px-5 pt-4 pb-5 shadow-panneau max-h-[85%] overflow-y-auto"
                  initial={{ y: 40 }}
                  animate={{ y: 0 }}
                  exit={{ y: 40 }}
                  transition={{ duration: 0.18 }}
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {(() => { const A = ACTION_PAR_TYPE[action]; return <A.icone className="size-6" style={{ color: A.couleur }} /> })()}
                      <span className="titre text-lg leading-tight">{ACTION_PAR_TYPE[action].libelle} · {selectionnes.map((e) => e.prenom).join(', ')}</span>
                    </div>
                    <button onClick={() => setAction(null)} className="p-2 rounded-lg hover:bg-ligne-2 text-encre-2" aria-label="Annuler"><X className="size-5" /></button>
                  </div>
                  {action === 'repas' && allergiques.length > 0 && (
                    <div className="mt-3 rounded-xl bg-rouge-clair text-rouge px-4 py-2.5 flex items-center gap-2.5 font-semibold">
                      <TriangleAlert className="size-5 shrink-0" />
                      {allergiques.map((e) => `${e.prenom} : allergie ${e.sante.allergies.join(', ').toLowerCase()}`).join(' · ')}. Repas sans {allergiques[0].sante.allergies[0].toLowerCase()} vérifié ?
                    </div>
                  )}
                  {action === 'depart' && focus && famille ? (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-encre-2 mb-2"><ShieldCheck className="size-4 text-vert-texte" /> Adultes autorisés à récupérer {focus.prenom} : touchez celui qui est présent, carte vérifiée.</div>
                      <div className="grid grid-cols-1 @min-[30rem]:grid-cols-2 @min-[44rem]:grid-cols-3 gap-2">
                        {famille.accompagnateurs.filter((a) => a.autorise).map((a, i) => (
                          <button key={a.id} data-testid={`detail-${i}`} disabled={enCours} onClick={() => remettre(focus.id, a.id, `${a.prenom} ${a.nom}`)} className="rounded-xl border border-ligne bg-white hover:bg-vert-clair px-4 py-3 text-left flex items-center gap-3">
                            <Avatar prenom={a.prenom} nom={a.nom} taille={38} />
                            <span><span className="block font-semibold">{a.prenom} {a.nom}</span><span className="text-sm text-encre-2">{a.lien}</span></span>
                          </button>
                        ))}
                      </div>
                      <Link to="/portail" className="inline-block mt-3 text-sm text-bleu font-semibold hover:underline">Une autre personne se présente : prévenir le portail</Link>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {details(action, sexeSel, minutes).map((d, i) => (
                        <button
                          key={d}
                          data-testid={`detail-${i}`}
                          disabled={enCours}
                          onClick={() => valider(d)}
                          className="rounded-xl border border-ligne bg-white hover:bg-bleu-clair active:scale-[0.98] px-4 py-3.5 text-left font-semibold text-[1.02rem] disabled:opacity-60"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* confirmation */}
          <AnimatePresence>
            {confirmation && (
              <motion.div
                key={confirmation.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-vert-texte text-white font-semibold px-4 py-2 shadow-panneau flex items-center gap-2 max-w-[92%]"
                role="status"
              >
                <Check className="size-4 shrink-0" /> <span className="truncate">{confirmation.texte}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* fil du jour */}
        <aside className={cx('bg-white @min-[44rem]:border-l border-ligne flex-col min-h-0 @min-[44rem]:w-[15.5rem] @min-[44rem]:shrink-0 @min-[44rem]:flex', vueFil ? 'flex flex-1' : 'hidden')}>
          <div className="px-4 pt-3 pb-2 border-b border-ligne-2">
            {focus ? (
              <div className="flex items-center gap-2.5">
                <Avatar prenom={focus.prenom} nom={focus.nom} taille={34} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{focus.prenom} {focus.nom}</div>
                  <div className="text-xs text-encre-2">{ageLisible(focus.naissance)}{focus.sante.allergies.length ? ` · allergie ${focus.sante.allergies.join(', ').toLowerCase()}` : ''}</div>
                </div>
              </div>
            ) : (
              <div className="font-semibold">Fil du groupe</div>
            )}
          </div>
          <ol className="flex-1 overflow-y-auto defilement px-4 py-2">
            {(focus ? [...filFocus].reverse() : groupe.enfants.flatMap((e) => (journal[e.id] ?? []).map((j) => ({ ...j, prenom: e.prenom }))).sort((a, b) => b.heure.localeCompare(a.heure)).slice(0, 18)).map((j) => {
              const A = ACTION_PAR_TYPE[j.type]
              return (
                <li key={j.id} className="flex gap-2.5 py-2 border-b border-ligne-2 last:border-0">
                  <span className="text-xs tabulaire text-encre-3 w-10 shrink-0 pt-0.5">{heureFr(j.heure)}</span>
                  <A.icone className="size-4 shrink-0 mt-0.5" style={{ color: A.couleur }} />
                  <span className="text-[0.85rem] leading-snug">
                    {'prenom' in j && <b>{(j as { prenom: string }).prenom} · </b>}
                    {j.detail}
                  </span>
                </li>
              )
            })}
            {focus && filFocus.length === 0 && <li className="text-encre-2 text-sm py-3">Aucune entrée pour {focus.prenom} aujourd’hui.</li>}
          </ol>
          <div className="px-4 py-2 text-xs text-encre-3 border-t border-ligne-2">{JOUR_DEMO.split('-').reverse().join('/')} · visible par les parents</div>
        </aside>
      </div>
    </div>
  )
}
