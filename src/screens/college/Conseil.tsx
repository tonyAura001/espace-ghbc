/** Conseil de classe : résultats, propositions automatiques, décisions et appréciations par élève. */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Wand2, Check } from 'lucide-react'
import { useStore } from '../../store'
import { elevesParClasse, indexClasses, nomPersonnel, resultatsClasse, statsClasse } from '../../store/selecteurs'
import { ID } from '../../data/generer'
import type { DecisionConseil } from '../../data/types'
import { Avatar, Badge, Bloc, Bouton, EnTetePage, Indicateur, Liste, Saisie, Segments, SqueletteTableau, cx } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { TRIMESTRE_COURANT, trimestreDe } from '../../lib/temps'
import { noteFixe, pct } from '../../lib/format'

type Distinction = DecisionConseil['distinction']
type Avertissement = DecisionConseil['avertissement']

function proposer(moy: number | null, incidentsGraves: number): { distinction: Distinction; avertissement: Avertissement } {
  const avertissement: Avertissement = incidentsGraves > 0 ? 'Avertissement conduite' : moy !== null && moy < 8 ? 'Avertissement travail' : ''
  if (avertissement) return { distinction: '', avertissement }
  if (moy === null) return { distinction: '', avertissement: '' }
  if (moy >= 16) return { distinction: 'Félicitations', avertissement: '' }
  if (moy >= 14) return { distinction: 'Tableau d’honneur', avertissement: '' }
  if (moy >= 12) return { distinction: 'Encouragements', avertissement: '' }
  return { distinction: '', avertissement: '' }
}

export default function Conseil() {
  const s = useStore()
  const enregistrer = useStore((st) => st.enregistrerDecision)
  const toast = useStore((st) => st.toast)
  const pret = useChargement(400)
  const classesCo = useMemo(() => s.classes.filter((c) => c.cycle === 'college'), [s.classes])
  const [classeId, setClasseId] = useState<string>(ID.classeFatoumata)
  const [t, setT] = useState<1 | 2 | 3>(TRIMESTRE_COURANT)
  const [brouillons, setBrouillons] = useState<Record<string, string>>({})
  const [executer, enCours] = useAction()
  const classe = indexClasses(s.classes)[classeId]
  const eleves = elevesParClasse(s.eleves)[classeId] ?? []
  const res = resultatsClasse(s, classeId, t)
  const st = statsClasse(res)
  const lignes = res
    .map((r) => {
      const e = eleves.find((x) => x.id === r.eleveId)!
      const abs = s.absences.filter((a) => a.eleveId === r.eleveId && trimestreDe(a.date) === t)
      const demi = abs.reduce((a, x) => a + (x.periode === 'journee' ? 2 : x.periode === 'cours' ? 0 : 1), 0)
      const inc = s.incidents.filter((i) => i.eleveId === r.eleveId && trimestreDe(i.date) === t)
      const decision = s.decisions.find((d) => d.eleveId === r.eleveId && d.trimestre === t)
      return { r, e, demi, inc, decision, prop: proposer(r.generale, inc.filter((i) => i.gravite >= 2).length) }
    })
    .sort((a, b) => (a.r.rang ?? 999) - (b.r.rang ?? 999))
  const notees = res.filter((r) => r.generale !== null)
  const reussite = notees.length ? notees.filter((r) => r.generale! >= 10).length / notees.length : 0
  const compte = (d: string) => lignes.filter((l) => (l.decision?.distinction || l.prop.distinction) === d).length

  const appliquerTout = async () => {
    await executer(() => {
      for (const l of lignes) {
        if (l.decision) continue
        enregistrer({ eleveId: l.e.id, trimestre: t, distinction: l.prop.distinction, avertissement: l.prop.avertissement, appreciation: brouillons[l.e.id] ?? '' })
      }
    }, [500, 800])
    toast({ titre: 'Décisions du conseil enregistrées', texte: `${classe.nom} · ${lignes.filter((l) => !l.decision).length} élèves. Elles apparaîtront sur les bulletins.`, niveau: 'succes' })
  }

  const majDecision = (eleveId: string, champ: 'distinction' | 'avertissement' | 'appreciation', valeur: string) => {
    const l = lignes.find((x) => x.e.id === eleveId)!
    const base: DecisionConseil = l.decision ?? { eleveId, trimestre: t, distinction: l.prop.distinction, avertissement: l.prop.avertissement, appreciation: '' }
    enregistrer({ ...base, [champ]: valeur } as DecisionConseil)
  }

  return (
    <div>
      <EnTetePage
        titre="Conseil de classe"
        sousTitre={`${classe.nom} · ${t === 1 ? '1er' : t + 'e'} trimestre · professeur principal : ${nomPersonnel(s, classe.titulaireId)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
            <Liste value={classeId} onChange={(e) => setClasseId(e.target.value)} className="!w-40 max-sm:!w-full">
              {classesCo.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Liste>
            <Segments<'1' | '2' | '3'> valeur={String(t) as '1'} onChange={(v) => setT(Number(v) as 1 | 2 | 3)} options={[1, 2, 3].filter((x) => x <= TRIMESTRE_COURANT).map((x) => ({ id: String(x) as '1', libelle: x === 1 ? '1er trimestre' : `${x}e trimestre` }))} />
            <Bouton icone={<Wand2 className="size-4" />} onClick={appliquerTout} chargement={enCours}>Appliquer les propositions</Bouton>
          </div>
        }
      />
      <section className="rounded-xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 md:grid-cols-3 lg:grid-cols-5 [&>*]:bg-white mb-5">
        <div className="p-5"><Indicateur libelle="Moyenne de la classe" valeur={noteFixe(st.moyenne)} detail={`sur 20 · ${notees.length} élèves notés`} /></div>
        <div className="p-5"><Indicateur libelle="Plus forte · plus faible" valeur={<span className="text-[1.6rem]">{noteFixe(st.max)} · {noteFixe(st.min)}</span>} /></div>
        <div className="p-5"><Indicateur libelle="Élèves à 10 et plus" valeur={pct(reussite)} ton={reussite >= 0.7 ? 'vert' : 'ambre'} /></div>
        <div className="p-5"><Indicateur libelle="Distinctions" valeur={compte('Félicitations') + compte('Tableau d’honneur') + compte('Encouragements')} detail={`${compte('Félicitations')} félicitations · ${compte('Tableau d’honneur')} tableau d’honneur · ${compte('Encouragements')} encouragements`} /></div>
        <div className="p-5 max-md:col-span-2"><Indicateur libelle="Avertissements" valeur={lignes.filter((l) => l.decision?.avertissement || (!l.decision && l.prop.avertissement)).length} ton="ambre" detail="travail ou conduite" /></div>
      </section>

      <Bloc titre="Décisions par élève" actions={<span className="text-sm text-encre-2">Propositions : félicitations dès 16, tableau d’honneur dès 14, encouragements dès 12, avertissement de travail sous 8.</span>} sansMarge>
        {!pret ? (
          <SqueletteTableau lignes={10} />
        ) : (
          <div className="overflow-x-auto defilement">
            <table className="tableau min-w-[72rem]">
              <thead>
                <tr>
                  <th className="w-14 text-center max-sm:hidden">Rang</th>
                  <th className="sticky left-0 z-[3] shadow-[inset_-1px_0_0_var(--color-ligne)]">Élève</th>
                  <th className="text-center">Moyenne</th>
                  <th className="text-center">Absences</th>
                  <th className="text-center">Incidents</th>
                  <th>Distinction</th>
                  <th>Avertissement</th>
                  <th className="min-w-[13rem]">Appréciation du conseil</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lignes.map(({ r, e, demi, inc, decision, prop }) => {
                  const dist = decision?.distinction ?? prop.distinction
                  const av = decision?.avertissement ?? prop.avertissement
                  return (
                    <tr key={e.id} className={cx(e.id === ID.fatoumata && 'bg-bleu-clair/30')}>
                      <td className="text-center tabulaire text-encre-2 max-sm:hidden">{r.rang ?? '—'}</td>
                      <td className={cx('sticky left-0 z-[1] shadow-[inset_-1px_0_0_var(--color-ligne)]', e.id === ID.fatoumata ? 'bg-[#f3f7fd]' : 'bg-white')}>
                        <div className="flex items-center gap-2.5">
                          <Avatar prenom={e.prenom} nom={e.nom} taille={30} className="max-sm:hidden" />
                          <span className="whitespace-nowrap"><span className="sm:hidden text-encre-3 tabulaire mr-1">{r.rang ?? '—'}.</span><span className="font-semibold">{e.nom}</span> {e.prenom}</span>
                        </div>
                      </td>
                      <td className={cx('text-center chiffre font-semibold', r.generale !== null && r.generale < 10 && 'text-rouge')}>{noteFixe(r.generale)}</td>
                      <td className="text-center tabulaire whitespace-nowrap">{demi ? `${demi} demi-j.` : '—'}</td>
                      <td className="text-center">{inc.length ? <Badge ton={inc.some((i) => i.gravite >= 2) ? 'rouge' : 'ambre'}>{inc.length}</Badge> : <span className="text-encre-3">—</span>}</td>
                      <td>
                        <Liste value={dist} onChange={(x) => majDecision(e.id, 'distinction', x.target.value)} className={cx('!py-1.5 !w-48 shrink-0', !decision && dist && 'border-dashed')}>
                          <option value="">Aucune</option>
                          <option>Encouragements</option>
                          <option>Tableau d’honneur</option>
                          <option>Félicitations</option>
                        </Liste>
                      </td>
                      <td>
                        <Liste value={av} onChange={(x) => majDecision(e.id, 'avertissement', x.target.value)} className={cx('!py-1.5 !w-44 shrink-0', av && 'text-ambre')}>
                          <option value="">Aucun</option>
                          <option>Avertissement travail</option>
                          <option>Avertissement conduite</option>
                        </Liste>
                      </td>
                      <td>
                        <Saisie
                          className="!py-1.5"
                          placeholder="Appréciation, puis Entrée"
                          value={brouillons[e.id] ?? decision?.appreciation ?? ''}
                          onChange={(x) => setBrouillons((b) => ({ ...b, [e.id]: x.target.value }))}
                          onBlur={() => { if (brouillons[e.id] !== undefined && brouillons[e.id] !== (decision?.appreciation ?? '')) majDecision(e.id, 'appreciation', brouillons[e.id]) }}
                          onKeyDown={(x) => { if (x.key === 'Enter') (x.target as HTMLInputElement).blur() }}
                        />
                      </td>
                      <td className="whitespace-nowrap">
                        {decision ? <Check className="size-4 text-vert-texte inline mr-2" aria-label="Décision enregistrée" /> : <span className="text-xs text-encre-3 mr-2">proposé</span>}
                        <Link to={`/bulletin/${e.id}?t=${t}`} className="inline-flex items-center gap-1 text-bleu font-semibold text-sm hover:underline"><FileText className="size-4" />Bulletin</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Bloc>
    </div>
  )
}
