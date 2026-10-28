/**
 * Grille de saisie des notes (primaire sur 10, collège sur 20).
 * Recalcul instantané des moyennes ; une case vide n'est jamais un zéro ;
 * corriger une note publiée demande un motif et crée une nouvelle version.
 */
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Send } from 'lucide-react'
import { useStore } from '../../store'
import { evaluationsParClasse, elevesParClasse, resultatsClasse, indexClasses, matiere, notesKey, nomPersonnel } from '../../store/selecteurs'
import { Avatar, Badge, Bouton, Modale, Panneau, Liste, Zone, Champ, Alerte, cx } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { note, noteFixe } from '../../lib/format'
import { dateCourte, dateHeure, jourMois, JOUR_DEMO } from '../../lib/temps'
import type { Evaluation } from '../../data/types'

const MOTIFS = ['Erreur de saisie', 'Erreur de report : un exercice n’avait pas été comptabilisé', 'Copie retrouvée après absence justifiée', 'Recorrection demandée par la famille, acceptée']

export function parserNote(brut: string, sur: number): { ok: true; valeur: number | null } | { ok: false; erreur: string } {
  const t = brut.trim().replace(/\s/g, '')
  if (t === '' || t === '—' || t === '-') return { ok: true, valeur: null }
  const n = Number(t.replace(',', '.'))
  if (Number.isNaN(n)) return { ok: false, erreur: `« ${brut} » n’est pas une note. Saisissez un nombre, par exemple 7,5, ou laissez la case vide.` }
  if (n < 0 || n > sur) return { ok: false, erreur: `La note doit être comprise entre 0 et ${sur}. Corrigez la valeur, ou laissez la case vide si l’élève était absent.` }
  return { ok: true, valeur: Math.round(n * 100) / 100 }
}

export function GrilleNotes({ classeId, matiereId, trimestre, peutSaisir }: { classeId: string; matiereId: string; trimestre: 1 | 2 | 3; peutSaisir: boolean }) {
  const s = useStore()
  const saisirNote = useStore((st) => st.saisirNote)
  const publierEvaluation = useStore((st) => st.publierEvaluation)
  const toast = useStore((st) => st.toast)
  const classe = indexClasses(s.classes)[classeId]
  const college = classe.cycle === 'college'
  const sur = college ? 20 : 10
  const mat = matiere(matiereId)
  const evs = useMemo(() => (evaluationsParClasse(s.evaluations)[classeId] ?? []).filter((e) => e.matiereId === matiereId && e.trimestre === trimestre), [s.evaluations, classeId, matiereId, trimestre])
  const eleves = elevesParClasse(s.eleves)[classeId] ?? []
  const res = useMemo(() => Object.fromEntries(resultatsClasse(s, classeId, trimestre).map((r) => [r.eleveId, r])), [s, classeId, trimestre])

  const [brouillons, setBrouillons] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState<{ cle: string; texte: string } | null>(null)
  const [dernier, setDernier] = useState<string | null>(null)
  const [motif, setMotif] = useState<{ ev: Evaluation; eleveId: string; valeur: number | null; avant: number | null } | null>(null)
  const [motifChoisi, setMotifChoisi] = useState(MOTIFS[0])
  const [motifLibre, setMotifLibre] = useState('')
  const [histo, setHisto] = useState<{ ev: Evaluation; eleveId: string } | null>(null)
  const [publier, enPublication] = useAction()
  const [publiant, setPubliant] = useState<string | null>(null)
  const refs = useRef<Record<string, HTMLInputElement | null>>({})

  const focus = (r: number, c: number) => {
    const e = eleves[r]
    const ev = evs[c]
    if (!e || !ev) return
    const el = refs.current[notesKey(ev.id, e.id)]
    el?.focus()
  }

  const valider = (ev: Evaluation, eleveId: string): boolean => {
    const k = notesKey(ev.id, eleveId)
    const brut = brouillons[k]
    if (brut === undefined) return true
    const p = parserNote(brut, sur)
    if (!p.ok) {
      const el = eleves.find((x) => x.id === eleveId)
      setErreur({ cle: k, texte: `${el ? `${el.prenom} ${el.nom}, ${ev.titre.toLowerCase()} : ` : ''}${p.erreur}` })
      return false
    }
    setErreur(null)
    const actuelle = s.notes[k]
    if ((actuelle?.valeur ?? null) === p.valeur) {
      setBrouillons((b) => { const n = { ...b }; delete n[k]; return n })
      return true
    }
    if (ev.publiee && actuelle && actuelle.versions.length > 0) {
      setMotif({ ev, eleveId, valeur: p.valeur, avant: actuelle.valeur })
      setMotifChoisi(MOTIFS[0])
      setMotifLibre('')
      return true
    }
    saisirNote(ev.id, eleveId, p.valeur)
    setDernier(eleveId)
    setBrouillons((b) => { const n = { ...b }; delete n[k]; return n })
    return true
  }

  const annulerMotif = () => {
    if (motif) setBrouillons((b) => { const n = { ...b }; delete n[notesKey(motif.ev.id, motif.eleveId)]; return n })
    setMotif(null)
  }
  const confirmerMotif = () => {
    if (!motif) return
    const texte = motifLibre.trim() ? `${motifChoisi} : ${motifLibre.trim()}` : motifChoisi
    saisirNote(motif.ev.id, motif.eleveId, motif.valeur, texte)
    setDernier(motif.eleveId)
    setBrouillons((b) => { const n = { ...b }; delete n[notesKey(motif.ev.id, motif.eleveId)]; return n })
    toast({ titre: 'Note corrigée', texte: `Nouvelle version enregistrée avec son motif. L’ancienne reste visible dans l’historique.`, niveau: 'succes' })
    setMotif(null)
  }

  const statsEval = (ev: Evaluation) => {
    const vals = eleves.map((e) => s.notes[notesKey(ev.id, e.id)]?.valeur ?? null).filter((v): v is number => v !== null)
    return { saisies: vals.length, moyenne: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null }
  }

  const elevesIdx = useMemo(() => Object.fromEntries(eleves.map((e, i) => [e.id, i])), [eleves])
  const histoNote = histo ? s.notes[notesKey(histo.ev.id, histo.eleveId)] : null
  const histoEleve = histo ? eleves[elevesIdx[histo.eleveId]] : null

  return (
    <div>
      {erreur && (
        <div className="mb-3">
          <Alerte ton="rouge" titre="Note non enregistrée">{erreur.texte}</Alerte>
        </div>
      )}
      <div className="bg-white rounded-xl border border-ligne overflow-x-auto defilement">
        <table className="tableau min-w-max lg:min-w-[52rem]">
          <thead>
            <tr>
              <th className="sticky left-0 z-[3] min-w-[8.5rem] sm:min-w-[15rem] shadow-[inset_-1px_0_0_var(--color-ligne)]">Élève</th>
              {evs.map((ev) => {
                const st = statsEval(ev)
                return (
                  <th key={ev.id} className="text-center align-bottom min-w-[6.5rem] sm:min-w-[9rem] !whitespace-normal">
                    <div className="text-encre font-semibold leading-tight">{ev.titre}</div>
                    <div className="text-encre-3 font-normal text-xs mt-0.5">{ev.date === JOUR_DEMO ? 'Aujourd’hui' : jourMois(ev.date)} · sur {ev.sur}{ev.type === 'composition' ? ' · composition' : ''}</div>
                    <div className="mt-1.5 flex items-center justify-center gap-1.5">
                      {ev.publiee ? (
                        <Badge ton="vert">Publiée</Badge>
                      ) : peutSaisir ? (
                        <Bouton
                          taille="sm"
                          variante="secondaire"
                          className="!px-2 !py-0.5 text-xs"
                          icone={<Send className="size-3" />}
                          chargement={enPublication && publiant === ev.id}
                          onClick={async () => {
                            setPubliant(ev.id)
                            await publier(() => publierEvaluation(ev.id))
                            toast({ titre: 'Notes publiées aux familles', texte: `${mat.nom} · ${ev.titre} · ${st.saisies} notes visibles dans l’espace parent`, niveau: 'succes' })
                          }}
                        >
                          Publier
                        </Bouton>
                      ) : (
                        <Badge ton="ambre">Non publiée</Badge>
                      )}
                    </div>
                  </th>
                )
              })}
              <th className="text-center">Moyenne<br />{mat.abrev}</th>
              {!college && <th className="text-center">Moyenne<br />{mat.domaine}</th>}
              <th className="text-center">Moyenne<br />générale</th>
              {s.parametres.afficherRang && <th className="text-center">Rang</th>}
              <th className="text-center">Bulletin</th>
            </tr>
          </thead>
          <tbody>
            {eleves.map((e, r) => {
              const rr = res[e.id]
              const flash = dernier === e.id
              return (
                <tr key={e.id}>
                  <td className="sticky left-0 bg-white z-[1] shadow-[inset_-1px_0_0_var(--color-ligne)] max-sm:!px-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar prenom={e.prenom} nom={e.nom} taille={30} className="max-sm:hidden" />
                      <span className="leading-tight max-sm:text-[0.9rem]">
                        <span className="font-semibold">{e.nom}</span> {e.prenom}
                        {e.redoublant && <span className="text-encre-3 text-xs ml-1.5">redoublant{e.sexe === 'F' ? 'e' : ''}</span>}
                      </span>
                    </div>
                  </td>
                  {evs.map((ev, c) => {
                    const k = notesKey(ev.id, e.id)
                    const n = s.notes[k]
                    const val = brouillons[k] ?? (n?.valeur === null || n?.valeur === undefined ? '' : note(n.valeur))
                    const enErreur = erreur?.cle === k
                    const versions = n?.versions.length ?? 0
                    return (
                      <td key={ev.id} className="text-center !py-1.5">
                        <div className="relative inline-flex items-center">
                          <input
                            ref={(el) => { refs.current[k] = el }}
                            data-testid={`cellule-${ev.id}-${e.id}`}
                            value={val}
                            placeholder="—"
                            disabled={!peutSaisir}
                            inputMode="decimal"
                            aria-label={`${e.prenom} ${e.nom}, ${ev.titre}`}
                            onFocus={(x) => x.target.select()}
                            onChange={(x) => { setBrouillons((b) => ({ ...b, [k]: x.target.value })); if (enErreur) setErreur(null) }}
                            onBlur={() => valider(ev, e.id)}
                            onKeyDown={(x) => {
                              const el = x.currentTarget
                              if (x.key === 'Enter' || x.key === 'ArrowDown') {
                                x.preventDefault()
                                if (valider(ev, e.id)) focus(r + 1, c)
                              } else if (x.key === 'ArrowUp') {
                                x.preventDefault()
                                if (valider(ev, e.id)) focus(r - 1, c)
                              } else if (x.key === 'ArrowRight' && el.selectionStart === el.value.length) {
                                if (valider(ev, e.id)) focus(r, c + 1)
                              } else if (x.key === 'ArrowLeft' && el.selectionStart === 0 && el.selectionEnd === 0) {
                                if (valider(ev, e.id)) focus(r, c - 1)
                              } else if (x.key === 'Escape') {
                                setBrouillons((b) => { const nn = { ...b }; delete nn[k]; return nn })
                                setErreur(null)
                              }
                            }}
                            className={cx(
                              'w-[4.6rem] h-10 sm:h-9 text-center rounded-md border tabulaire text-[1rem] font-semibold focus:outline-none focus:ring-3 focus:ring-bleu/20 disabled:bg-transparent disabled:border-transparent',
                              enErreur ? 'border-rouge bg-rouge-clair text-rouge' : 'border-ligne focus:border-bleu bg-white placeholder:text-encre-3 placeholder:font-normal',
                              ev.date === JOUR_DEMO && !enErreur && 'bg-bleu-clair/40',
                            )}
                          />
                          {versions > 1 && (
                            <button onClick={() => setHisto({ ev, eleveId: e.id })} title="Historique des versions" className="absolute -right-6 top-1/2 -translate-y-1/2 text-[0.7rem] font-bold text-ambre bg-ambre-clair rounded px-1">
                              v{versions}
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                  <td className="text-center">
                    <span key={`m${rr?.matieres[matiereId] ?? 'x'}`} className={cx('inline-block rounded px-2 py-0.5 chiffre font-semibold', flash && 'flash')}>{noteFixe(rr?.matieres[matiereId] ?? null)}</span>
                  </td>
                  {!college && (
                    <td className="text-center">
                      <span key={`d${rr?.domaines[mat.domaine ?? ''] ?? 'x'}`} className={cx('inline-block rounded px-2 py-0.5 chiffre', flash && 'flash')}>{noteFixe(rr?.domaines[mat.domaine ?? ''] ?? null)}</span>
                    </td>
                  )}
                  <td className="text-center">
                    <span key={`g${rr?.generale ?? 'x'}`} className={cx('inline-block rounded px-2 py-0.5 chiffre font-semibold text-bleu', flash && 'flash')}>{noteFixe(rr?.generale ?? null)}</span>
                  </td>
                  {s.parametres.afficherRang && <td className="text-center tabulaire text-encre-2">{rr?.rang ? `${rr.rang}${rr.rang === 1 ? (e.sexe === 'F' ? 're' : 'er') : 'e'}` : '—'}</td>}
                  <td className="text-center">
                    <Link to={`/bulletin/${e.id}?t=${trimestre}`} className="inline-flex items-center gap-1 text-bleu font-semibold text-sm hover:underline" data-testid={`bulletin-${e.id}`}>
                      <FileText className="size-4" /> Bulletin
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky left-0 bg-brume font-semibold text-encre-2 z-[1] shadow-[inset_-1px_0_0_var(--color-ligne)] max-sm:text-sm">Moyenne de la classe</td>
              {evs.map((ev) => {
                const st = statsEval(ev)
                return (
                  <td key={ev.id} className="text-center bg-brume">
                    <div className="chiffre font-semibold">{noteFixe(st.moyenne)}</div>
                    <div className="text-xs text-encre-3">{st.saisies} / {eleves.length} saisies</div>
                  </td>
                )
              })}
              <td className="bg-brume" colSpan={college ? 4 : 5} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-sm text-encre-2 mt-3">
        Une case vide n’est jamais un zéro : elle n’entre pas dans la moyenne. Entrée ou flèches pour passer d’une case à l’autre, virgule acceptée.
        {college ? ' Moyenne de matière = (moyenne des devoirs + composition) ÷ 2.' : ' Moyenne générale pondérée par les coefficients des disciplines notées.'}
      </p>

      <Modale
        ouvert={!!motif}
        onFermer={annulerMotif}
        titre="Corriger une note publiée"
        pied={
          <>
            <Bouton variante="discret" onClick={annulerMotif}>Annuler</Bouton>
            <Bouton onClick={confirmerMotif} data-testid="confirmer-motif">Enregistrer la nouvelle version</Bouton>
          </>
        }
      >
        {motif && (
          <div className="space-y-4">
            <p className="text-encre-2">
              Cette note est déjà visible par la famille. La correction crée une <b className="text-encre">nouvelle version</b> : l’ancienne reste dans l’historique et le journal d’audit.
            </p>
            <div className="flex items-center justify-center gap-6 rounded-xl bg-brume py-4">
              <div className="text-center"><div className="text-sm text-encre-2">Version actuelle</div><div className="chiffre text-3xl text-encre-3 line-through">{note(motif.avant)}</div></div>
              <div className="text-encre-3 text-2xl">›</div>
              <div className="text-center"><div className="text-sm text-encre-2">Nouvelle version</div><div className="chiffre text-3xl text-bleu">{note(motif.valeur)}</div></div>
            </div>
            <Champ libelle="Motif de la correction">
              <Liste value={motifChoisi} onChange={(e) => setMotifChoisi(e.target.value)}>
                {MOTIFS.map((m) => <option key={m}>{m}</option>)}
              </Liste>
            </Champ>
            <Champ libelle="Précision (facultatif)">
              <Zone value={motifLibre} onChange={(e) => setMotifLibre(e.target.value)} className="min-h-16" />
            </Champ>
          </div>
        )}
      </Modale>

      <Panneau ouvert={!!histo} onFermer={() => setHisto(null)} titre="Historique des versions" sousTitre={histo && histoEleve ? `${histoEleve.prenom} ${histoEleve.nom} · ${mat.nom} · ${histo.ev.titre}` : ''}>
        {histoNote && (
          <ol className="space-y-3">
            {[...histoNote.versions].reverse().map((v, i, arr) => (
              <li key={i} className={cx('rounded-xl border px-4 py-3', i === 0 ? 'border-bleu-ligne bg-bleu-clair/40' : 'border-ligne')}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Version {arr.length - i}{i === 0 && <Badge ton="bleu" className="ml-2">En vigueur</Badge>}</span>
                  <span className="chiffre text-2xl">{note(v.valeur)}<span className="text-encre-3 text-base"> / {sur}</span></span>
                </div>
                <div className="text-sm text-encre-2 mt-1">{dateHeure(v.date)} · {nomPersonnel(s, v.auteurId)}</div>
                {v.motif && <div className="mt-1.5 text-[0.95rem]">Motif : {v.motif}</div>}
              </li>
            ))}
          </ol>
        )}
        <p className="text-sm text-encre-3 mt-4">Une version ne s’efface jamais. Saisie initiale le {histoNote?.versions[0] ? dateCourte(histoNote.versions[0].date.slice(0, 10)) : '—'}.</p>
      </Panneau>
    </div>
  )
}
