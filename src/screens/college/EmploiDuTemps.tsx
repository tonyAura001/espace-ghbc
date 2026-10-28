/** Emploi du temps de la semaine (par classe ou par professeur), avec détection et résolution des conflits. */
import { useMemo, useState } from 'react'
import { OctagonAlert, ArrowLeftRight, UserRoundCog } from 'lucide-react'
import { useStore } from '../../store'
import { profilParId } from '../../store/profils'
import { conflitsEmploiDuTemps, indexClasses, matiere, nomPersonnel } from '../../store/selecteurs'
import { HORAIRES_COLLEGE, JOURS_APRES_MIDI, MATIERES_COLLEGE } from '../../data/referentiel'
import { ID } from '../../data/generer'
import type { Creneau } from '../../data/types'
import { Alerte, Bouton, EnTetePage, Liste, Modale, Segments, cx, Squelette } from '../../ui/base'
import { useAction, useChargement, useMinutes } from '../../ui/hooks'
import { useLargeurMax } from '../../ui/cadres'
import { heureFr, hhmmEnMinutes, JOUR_DEMO, NOMS_JOURS, jourSemaine } from '../../lib/temps'

const TEINTES: Record<string, string> = {
  'CO-FR': '#2F6FD6', 'CO-MA': '#0249A2', 'CO-AN': '#8A5CC7', 'CO-PC': '#C2410C', 'CO-SV': '#2E9E5B',
  'CO-HG': '#B26A00', 'CO-EC': '#6B7690', 'CO-AR': '#0E7C86', 'CO-IN': '#9F3A68', 'CO-EP': '#E8735A',
}

export default function EmploiDuTemps() {
  const s = useStore()
  const profil = profilParId(s.session.profilId)
  const pret = useChargement(380)
  const m = useMinutes()
  const classesCo = useMemo(() => s.classes.filter((c) => c.cycle === 'college'), [s.classes])
  const profs = useMemo(() => s.personnel.filter((p) => p.role === 'professeur').sort((a, b) => a.nom.localeCompare(b.nom, 'fr')), [s.personnel])
  const [vue, setVue] = useState<'classe' | 'prof'>(profil.role === 'professeur' ? 'prof' : 'classe')
  const [classeId, setClasseId] = useState<string>(ID.classeFatoumata)
  const [profId, setProfId] = useState<string>(profil.role === "professeur" ? profil.userId : ID.profMaths)
  const [resoudre, setResoudre] = useState<Creneau[] | null>(null)
  const conflits = conflitsEmploiDuTemps(s)
  const idsConflit = new Set(conflits.flat().map((c) => c.id))
  const ic = indexClasses(s.classes)
  const jourAuj = jourSemaine(JOUR_DEMO)
  const etroit = useLargeurMax(767)
  const [jourVu, setJourVu] = useState<number>(jourAuj <= 5 ? jourAuj : 1)

  const creneaux = s.creneaux.filter((c) => (vue === 'classe' ? c.classeId === classeId : c.profId === profId))
  const cellule = (jour: number, debut: string) => creneaux.filter((c) => c.jour === jour && c.debut === debut)
  const heures = vue === 'prof' ? creneaux.length : creneaux.length

  return (
    <div>
      <EnTetePage
        titre="Emploi du temps"
        sousTitre={vue === 'classe' ? `${ic[classeId].nom} · ${heures} heures par semaine` : `${nomPersonnel(s, profId)} · ${heures} heures de cours par semaine`}
        actions={
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
            <Segments<'classe' | 'prof'> valeur={vue} onChange={setVue} options={[{ id: 'classe', libelle: 'Par classe' }, { id: 'prof', libelle: 'Par professeur' }]} />
            {vue === 'classe' ? (
              <Liste value={classeId} onChange={(e) => setClasseId(e.target.value)} className="!w-44 max-sm:!w-full">
                {classesCo.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </Liste>
            ) : (
              <Liste value={profId} onChange={(e) => setProfId(e.target.value)} className="!w-72 max-sm:!w-full">
                {profs.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom} · {matiere(p.matiereIds[0])?.abrev}</option>)}
              </Liste>
            )}
          </div>
        }
      />

      {conflits.length > 0 && (
        <div className="mb-4 space-y-2" data-testid="conflits-edt">
          {conflits.map((cs) => {
            const p = nomPersonnel(s, cs[0].profId)
            return (
              <Alerte
                key={cs.map((c) => c.id).join()}
                ton="rouge"
                icone={<OctagonAlert className="size-5" />}
                titre={`Conflit : ${p} est prévu dans ${cs.length} classes au même moment`}
                action={<Bouton variante="danger" taille="sm" onClick={() => setResoudre(cs)}>Résoudre</Bouton>}
              >
                {NOMS_JOURS[cs[0].jour]} {heureFr(cs[0].debut)} : {cs.map((c) => `${ic[c.classeId].nom} (${matiere(c.matiereId).nom.toLowerCase()})`).join(' et ')}. Un professeur ne peut pas être dans deux salles : il faut réaffecter un cours ou l’échanger avec un autre créneau.
              </Alerte>
            )
          })}
        </div>
      )}

      {!pret ? (
        <Squelette className="h-[32rem] rounded-xl" />
      ) : etroit ? (
        <VueJour
          jour={jourVu}
          setJour={setJourVu}
          jourAuj={jourAuj}
          cellule={cellule}
          idsConflit={idsConflit}
          minutes={m}
          libelleCours={(c) => (vue === 'classe' ? nomPersonnel(s, c.profId) : ic[c.classeId].nom)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-ligne overflow-x-auto defilement">
          <table className="w-full min-w-[46rem] border-collapse table-fixed">
            <thead>
              <tr>
                <th className="w-[7.5rem] p-3 text-left text-sm text-encre-2 font-semibold border-b border-ligne">Horaire</th>
                {[1, 2, 3, 4, 5].map((j) => (
                  <th key={j} className={cx('p-3 text-left font-semibold border-b border-ligne', j === jourAuj ? 'text-bleu' : 'text-encre')}>
                    {NOMS_JOURS[j]}{j === jourAuj && <span className="ml-2 text-xs font-semibold rounded-full bg-bleu-clair px-2 py-0.5">Aujourd’hui</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORAIRES_COLLEGE.map((h, i) => (
                <FragmentLigne key={h.debut} pause={i === 2 ? 'Récréation · 10 h – 10 h 15' : i === 4 ? 'Pause déjeuner · 12 h 15 – 14 h' : null}>
                  <tr>
                    <td className="p-3 align-top text-sm tabulaire text-encre-2 border-b border-ligne-2">{heureFr(h.debut)}<br />{heureFr(h.fin)}</td>
                    {[1, 2, 3, 4, 5].map((j) => {
                      const cs = cellule(j, h.debut)
                      const libre = i >= 4 && !JOURS_APRES_MIDI.includes(j)
                      const enCours = j === jourAuj && hhmmEnMinutes(h.debut) <= m && m < hhmmEnMinutes(h.fin)
                      return (
                        <td key={j} className={cx('p-1.5 align-top border-b border-l border-ligne-2', enCours && 'bg-bleu-clair/40')}>
                          {libre ? (
                            <div className="h-full min-h-[3.6rem] rounded-lg flex items-center justify-center text-sm text-encre-3 bg-brume/70">Activités sportives et clubs</div>
                          ) : cs.length === 0 ? (
                            <div className="min-h-[3.6rem] rounded-lg border border-dashed border-ligne flex items-center justify-center text-sm text-encre-3">Libre</div>
                          ) : (
                            cs.map((c) => {
                              const conflit = idsConflit.has(c.id)
                              return (
                                <div
                                  key={c.id}
                                  className={cx('rounded-lg px-2.5 py-2 mb-1 last:mb-0 border bg-white min-h-[3.6rem]', conflit ? 'border-rouge bg-rouge-clair' : enCours ? 'border-bleu ring-2 ring-bleu/25' : 'border-ligne')}
                                  style={{ borderLeft: `4px solid ${conflit ? 'var(--color-rouge)' : TEINTES[c.matiereId]}` }}
                                >
                                  <div className="font-semibold leading-tight truncate">{matiere(c.matiereId).nom}</div>
                                  <div className="text-[0.82rem] text-encre-2 truncate">{vue === 'classe' ? nomPersonnel(s, c.profId) : ic[c.classeId].nom} · {c.salle}</div>
                                  {enCours && <div className="text-xs font-semibold text-bleu mt-0.5">En cours</div>}
                                  {conflit && <div className="text-xs font-semibold text-rouge mt-0.5">Conflit</div>}
                                </div>
                              )
                            })
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </FragmentLigne>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-sm text-encre-2">
        {MATIERES_COLLEGE.map((mt) => (
          <span key={mt.id} className="inline-flex items-center gap-1.5"><span className="h-3 w-1 rounded" style={{ background: TEINTES[mt.id] }} />{mt.nom} · {mt.heures} h</span>
        ))}
      </div>
      <Resolution conflit={resoudre} onFermer={() => setResoudre(null)} />
    </div>
  )
}

/** Téléphone : un jour à la fois, créneaux empilés. */
function VueJour({ jour, setJour, jourAuj, cellule, idsConflit, minutes, libelleCours }: { jour: number; setJour: (j: number) => void; jourAuj: number; cellule: (j: number, d: string) => Creneau[]; idsConflit: Set<string>; minutes: number; libelleCours: (c: Creneau) => string }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1 rounded-lg bg-ligne-2 p-1 mb-3" role="tablist" aria-label="Jour">
        {[1, 2, 3, 4, 5].map((j) => (
          <button key={j} role="tab" aria-selected={jour === j} onClick={() => setJour(j)} className={cx('rounded-md py-2 text-sm font-semibold min-h-10', jour === j ? 'bg-white text-encre shadow-sm' : 'text-encre-2')}>
            {NOMS_JOURS[j].slice(0, 3)}.
            {j === jourAuj && <span className="block mx-auto mt-0.5 size-1.5 rounded-full bg-bleu" aria-label="aujourd’hui" />}
          </button>
        ))}
      </div>
      <ol className="space-y-2">
        {HORAIRES_COLLEGE.map((h, i) => {
          const libre = i >= 4 && !JOURS_APRES_MIDI.includes(jour)
          const cs = cellule(jour, h.debut)
          const enCours = jour === jourAuj && hhmmEnMinutes(h.debut) <= minutes && minutes < hhmmEnMinutes(h.fin)
          return (
            <li key={h.debut}>
              {i === 2 && <div className="text-xs text-encre-3 px-1 pb-2">Récréation · 10 h – 10 h 15</div>}
              {i === 4 && <div className="text-xs text-encre-3 px-1 pb-2">Pause déjeuner · 12 h 15 – 14 h</div>}
              <div className="flex gap-3">
                <div className="w-14 shrink-0 text-sm tabulaire text-encre-2 pt-2 leading-tight">{heureFr(h.debut)}<br />{heureFr(h.fin)}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  {libre ? (
                    <div className="rounded-lg px-3 py-3 text-sm text-encre-3 bg-white/70 border border-ligne-2">Activités sportives et clubs</div>
                  ) : cs.length === 0 ? (
                    <div className="rounded-lg px-3 py-3 text-sm text-encre-3 border border-dashed border-ligne">Libre</div>
                  ) : (
                    cs.map((c) => {
                      const conflit = idsConflit.has(c.id)
                      return (
                        <div key={c.id} className={cx('rounded-lg px-3 py-2 border bg-white', conflit ? 'border-rouge bg-rouge-clair' : enCours ? 'border-bleu ring-2 ring-bleu/25' : 'border-ligne')} style={{ borderLeft: `4px solid ${conflit ? 'var(--color-rouge)' : TEINTES[c.matiereId]}` }}>
                          <div className="font-semibold leading-tight">{matiere(c.matiereId).nom}</div>
                          <div className="text-[0.85rem] text-encre-2">{libelleCours(c)} · {c.salle}</div>
                          {enCours && <div className="text-xs font-semibold text-bleu mt-0.5">En cours</div>}
                          {conflit && <div className="text-xs font-semibold text-rouge mt-0.5">Conflit</div>}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function FragmentLigne({ pause, children }: { pause: string | null; children: React.ReactNode }) {
  return (
    <>
      {pause && (
        <tr>
          <td colSpan={6} className="px-3 py-1.5 text-xs text-encre-3 bg-brume border-b border-ligne-2">{pause}</td>
        </tr>
      )}
      {children}
    </>
  )
}

/** Propositions de résolution : réaffecter à un collègue libre de la même matière, ou échanger deux créneaux de la classe. */
function Resolution({ conflit, onFermer }: { conflit: Creneau[] | null; onFermer: () => void }) {
  const s = useStore()
  const toast = useStore((st) => st.toast)
  const [executer, enCours] = useAction()
  const [choix, setChoix] = useState<string | null>(null)
  if (!conflit) return <Modale ouvert={false} onFermer={onFermer} titre="">{null}</Modale>
  const ic = indexClasses(s.classes)
  const occupe = (profId: string, jour: number, debut: string, sauf?: string) => s.creneaux.some((c) => c.profId === profId && c.jour === jour && c.debut === debut && c.id !== sauf)

  const propositions: { id: string; libelle: string; detail: string; appliquer: () => Creneau[] }[] = []
  for (const c of conflit.slice(1)) {
    const collegues = s.personnel.filter((p) => p.role === 'professeur' && p.matiereIds.includes(c.matiereId) && p.id !== c.profId && !occupe(p.id, c.jour, c.debut))
    for (const p of collegues) {
      propositions.push({
        id: `r-${c.id}-${p.id}`,
        libelle: `Confier le cours de ${ic[c.classeId].nom} à ${p.prenom} ${p.nom}`,
        detail: `${matiere(c.matiereId).nom} · ${p.prenom} ${p.nom} est libre ${NOMS_JOURS[c.jour].toLowerCase()} à ${heureFr(c.debut)}`,
        appliquer: () => s.creneaux.map((x) => (x.id === c.id ? { ...x, profId: p.id } : x)),
      })
    }
    // échange avec un autre créneau de la même classe
    for (const autre of s.creneaux.filter((x) => x.classeId === c.classeId && x.id !== c.id)) {
      if (autre.jour === c.jour && autre.debut === c.debut) continue
      if (occupe(c.profId, autre.jour, autre.debut, c.id) || occupe(autre.profId, c.jour, c.debut, autre.id)) continue
      if (propositions.length > 6) break
      propositions.push({
        id: `e-${c.id}-${autre.id}`,
        libelle: `Échanger avec ${matiere(autre.matiereId).nom.toLowerCase()} du ${NOMS_JOURS[autre.jour].toLowerCase()} à ${heureFr(autre.debut)}`,
        detail: `${ic[c.classeId].nom} : ${matiere(c.matiereId).abrev} passe ${NOMS_JOURS[autre.jour].toLowerCase()} ${heureFr(autre.debut)}, ${matiere(autre.matiereId).abrev} passe ${NOMS_JOURS[c.jour].toLowerCase()} ${heureFr(c.debut)}`,
        appliquer: () =>
          s.creneaux.map((x) =>
            x.id === c.id ? { ...x, jour: autre.jour, debut: autre.debut, fin: autre.fin } : x.id === autre.id ? { ...x, jour: c.jour, debut: c.debut, fin: c.fin } : x,
          ),
      })
    }
  }
  const choisie = propositions.find((p) => p.id === (choix ?? propositions[0]?.id))
  const valider = async () => {
    if (!choisie) return
    await executer(() => {
      useStore.setState({ creneaux: choisie.appliquer() })
      useStore.getState().journaliser('Emploi du temps', 'Conflit d’emploi du temps résolu', choisie.libelle, null, { conflit: `${nomPersonnel(s, conflit[0].profId)} · ${conflit.length} classes` }, { solution: choisie.detail })
    })
    toast({ titre: 'Emploi du temps mis à jour', texte: choisie.libelle, niveau: 'succes' })
    setChoix(null)
    onFermer()
  }
  return (
    <Modale
      ouvert
      onFermer={onFermer}
      titre="Résoudre le conflit"
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton onClick={valider} chargement={enCours} disabled={!choisie}>Appliquer la solution</Bouton>
        </>
      }
    >
      <p className="text-encre-2 mb-3">Solutions vérifiées : aucun professeur ni aucune classe ne se retrouve en double.</p>
      {propositions.length === 0 && <p>Aucune solution automatique. Prévoyez un remplacement depuis l’écran Personnel.</p>}
      <ul className="space-y-2">
        {propositions.map((p) => (
          <li key={p.id}>
            <button onClick={() => setChoix(p.id)} className={cx('w-full text-left rounded-xl border px-4 py-3 flex gap-3', choisie?.id === p.id ? 'border-bleu bg-bleu-clair/50' : 'border-ligne hover:bg-brume')}>
              {p.id.startsWith('r') ? <UserRoundCog className="size-5 text-bleu shrink-0 mt-0.5" /> : <ArrowLeftRight className="size-5 text-bleu shrink-0 mt-0.5" />}
              <span>
                <span className="block font-semibold">{p.libelle}</span>
                <span className="block text-sm text-encre-2">{p.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modale>
  )
}
