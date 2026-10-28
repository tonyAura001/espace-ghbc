/** Maternelle : grille des compétences par pastilles (un clic fait tourner le niveau). */
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useStore } from '../../store'
import { elevesParClasse } from '../../store/selecteurs'
import { COMPETENCES_MATERNELLE, LIBELLE_COMPETENCE } from '../../data/referentiel'
import { Avatar, Bloc, EnTetePage, Liste, SqueletteTableau, COULEUR_CYCLE, Segments, cx } from '../../ui/base'
import { useChargement } from '../../ui/hooks'
import { TRIMESTRE_COURANT } from '../../lib/temps'
import { pct } from '../../lib/format'
import { DOMAINES, Legende, Pastille, niveauDe, suivant } from './commun'

export default function Competences() {
  const s = useStore()
  const pret = useChargement()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const classes = s.classes.filter((c) => c.cycle === 'maternelle')
  const classeId = params.get('classe') ?? classes[0].id
  const [trimestre, setTrimestre] = useState<number>(TRIMESTRE_COURANT)
  const [modifie, setModifie] = useState<string | null>(null)
  const eleves = elevesParClasse(s.eleves)[classeId] ?? []
  const classe = classes.find((c) => c.id === classeId)!

  const progression = useMemo(
    () =>
      DOMAINES.map((d) => {
        const comps = COMPETENCES_MATERNELLE.filter((c) => c.domaine === d)
        let a = 0, ec = 0, pe = 0, ne = 0
        for (const e of eleves) for (const c of comps) {
          const v = niveauDe(s.competences, e.id, c.id, trimestre)
          if (v === 'A') a++
          else if (v === 'EC') ec++
          else if (v === 'PE') pe++
          else ne++
        }
        const total = a + ec + pe + ne
        return { domaine: d, a, ec, pe, ne, total, evalue: total ? (total - ne) / total : 0, acquis: a + ec + pe ? a / (a + ec + pe) : 0 }
      }),
    [eleves, s.competences, trimestre],
  )

  const cliquer = (eleveId: string, compId: string) => {
    const v = niveauDe(s.competences, eleveId, compId, trimestre)
    s.setCompetence(eleveId, compId, trimestre, suivant(v))
    const k = `${eleveId}|${compId}`
    setModifie(k)
    setTimeout(() => setModifie((m) => (m === k ? null : m)), 900)
  }

  return (
    <div>
      <EnTetePage
        titre={<span className="flex items-center gap-2.5"><span className="size-3 rounded-full" style={{ background: COULEUR_CYCLE.maternelle }} />Compétences · maternelle</span>}
        sousTitre="Ni note ni rang : chaque compétence est observée et positionnée. Un clic sur une pastille la fait évoluer."
        actions={
          <>
            <div className="w-full sm:w-[13rem]">
              <Liste value={classeId} onChange={(e) => setParams({ classe: e.target.value })} aria-label="Classe">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </Liste>
            </div>
            <Segments
              options={[1, 2, 3].filter((t) => t <= TRIMESTRE_COURANT).map((t) => ({ id: String(t), libelle: `${t === 1 ? '1er' : t + 'e'} trimestre` }))}
              valeur={String(trimestre)}
              onChange={(v) => setTrimestre(Number(v))}
            />
          </>
        }
      />

      <Bloc titre={`Progression par domaine · ${classe.nom}`} className="mb-5" filet={COULEUR_CYCLE.maternelle}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4">
          {progression.map((p) => (
            <div key={p.domaine}>
              <div className="flex justify-between gap-3 mb-1.5">
                <span className="font-semibold">{p.domaine}</span>
                <span className="text-encre-2 text-sm whitespace-nowrap">{pct(p.evalue)} observé · {pct(p.acquis)} acquis</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-ligne-2">
                <div style={{ width: `${(p.a / p.total) * 100}%`, background: '#02A73A' }} />
                <div style={{ width: `${(p.ec / p.total) * 100}%`, background: '#E3A600' }} />
                <div style={{ width: `${(p.pe / p.total) * 100}%`, background: '#E8735A' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-ligne-2"><Legende /></div>
      </Bloc>

      <Bloc titre={`${eleves.length} élèves · salle ${classe.salle}`} sansMarge>
        {!pret ? (
          <SqueletteTableau />
        ) : (
          <div className="overflow-x-auto defilement">
            <table className="tableau min-w-max">
              <thead>
                <tr>
                  <th rowSpan={2} className="align-bottom !sticky left-0 z-[2] bg-white shadow-[1px_0_0_var(--color-ligne-2)]">Élève</th>
                  {DOMAINES.map((d) => (
                    <th key={d} colSpan={COMPETENCES_MATERNELLE.filter((c) => c.domaine === d).length} className="text-center !static !whitespace-normal border-l border-ligne-2 !text-[0.8rem] !py-2">{d}</th>
                  ))}
                  <th rowSpan={2} className="!static" />
                </tr>
                <tr>
                  {COMPETENCES_MATERNELLE.map((c, i) => (
                    <th key={c.id} title={c.libelle} className={cx('!relative !p-0 h-[12.5rem] min-w-[2.6rem]', (i === 0 || COMPETENCES_MATERNELLE[i - 1].domaine !== c.domaine) && 'border-l border-ligne-2')}>
                      <span className="absolute bottom-2 left-[62%] origin-bottom-left -rotate-90 whitespace-nowrap text-[0.8rem] font-normal text-encre-2 max-w-[11.8rem] truncate block">{c.libelle}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eleves.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap sticky left-0 z-[1] bg-white shadow-[1px_0_0_var(--color-ligne-2)] max-sm:!px-2.5">
                      <span className="flex items-center gap-2.5">
                        <span className="hidden sm:block"><Avatar prenom={e.prenom} nom={e.nom} taille={30} /></span>
                        <span className="font-semibold sm:hidden">{e.prenom.split(' ')[0]} {e.nom[0]}.</span>
                        <span className="font-semibold hidden sm:inline">{e.prenom} {e.nom}</span>
                      </span>
                    </td>
                    {COMPETENCES_MATERNELLE.map((c, i) => {
                      const v = niveauDe(s.competences, e.id, c.id, trimestre)
                      return (
                        <td key={c.id} className={cx('!px-1 text-center', (i === 0 || COMPETENCES_MATERNELLE[i - 1].domaine !== c.domaine) && 'border-l border-ligne-2', modifie === `${e.id}|${c.id}` && 'flash')}>
                          <button
                            onClick={() => cliquer(e.id, c.id)}
                            className="p-1.5 rounded-full hover:bg-bleu-clair"
                            title={`${c.libelle} : ${LIBELLE_COMPETENCE[v]} (cliquer pour changer)`}
                            aria-label={`${e.prenom}, ${c.libelle} : ${LIBELLE_COMPETENCE[v]}`}
                          >
                            <Pastille niveau={v} />
                          </button>
                        </td>
                      )
                    })}
                    <td>
                      <button onClick={() => nav(`/maternelle/livret/${e.id}?t=${trimestre}`)} className="inline-flex items-center gap-1.5 text-bleu font-semibold hover:underline whitespace-nowrap">
                        <BookOpen className="size-4" /> Livret
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloc>
    </div>
  )
}
