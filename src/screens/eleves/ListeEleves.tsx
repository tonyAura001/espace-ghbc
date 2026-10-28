/** Liste des élèves : recherche, filtres (cycle, classe, statut, impayés), situation financière et présence du jour. */
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, UserPlus, Users } from 'lucide-react'
import { useStore } from '../../store'
import { indexClasses, situationsFamilles } from '../../store/selecteurs'
import { CYCLES, NOM_CYCLE } from '../../data/referentiel'
import type { Cycle } from '../../data/types'
import { Avatar, Badge, Bouton, EnTetePage, Liste, PastilleCycle, Saisie, SqueletteTableau, Vide, cx } from '../../ui/base'
import { useChargement } from '../../ui/hooks'
import { ageLisible, heureFr } from '../../lib/temps'
import { nombre, sansAccents, money } from '../../lib/format'
import { profilParId } from '../../store/profils'

const PAR_PAGE = 60

export default function ListeEleves() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const eleves = useStore((s) => s.eleves)
  const classes = useStore((s) => s.classes)
  const echeances = useStore((s) => s.echeances)
  const paiements = useStore((s) => s.paiements)
  const presences = useStore((s) => s.presences)
  const role = useStore((s) => profilParId(s.session.profilId).role)
  const pret = useChargement(420)

  const [q, setQ] = useState('')
  const [cycle, setCycle] = useState<Cycle | ''>(() => {
    const c = params.get('classe')
    return c ? (indexClasses(classes)[c]?.cycle ?? '') : ''
  })
  const classeId = params.get('classe') ?? ''
  const [statut, setStatut] = useState<'actif' | 'radie' | 'tous'>('actif')
  const [finance, setFinance] = useState<'' | 'en_retard' | 'partiel' | 'a_jour'>('')
  const [page, setPage] = useState(1)

  const ic = indexClasses(classes)
  const situations = situationsFamilles(echeances, paiements)

  const filtres = useMemo(() => {
    const mots = sansAccents(q.trim()).split(/\s+/).filter(Boolean)
    return eleves
      .filter((e) => (statut === 'tous' ? true : e.statut === statut))
      .filter((e) => !cycle || ic[e.classeId].cycle === cycle)
      .filter((e) => !classeId || e.classeId === classeId)
      .filter((e) => !finance || situations[e.familleId]?.statut === finance)
      .filter((e) => {
        if (!mots.length) return true
        const t = sansAccents(`${e.prenom} ${e.nom} ${e.matricule} ${ic[e.classeId].nom}`)
        return mots.every((m) => t.includes(m))
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'))
  }, [eleves, q, cycle, classeId, statut, finance, ic, situations])

  const classesFiltre = classes.filter((c) => !cycle || c.cycle === cycle)
  const visibles = filtres.slice(0, page * PAR_PAGE)
  const voitFinance = ['promoteur', 'direction', 'comptable', 'caissier', 'secretariat'].includes(role)

  const choisirClasse = (id: string) => {
    const p = new URLSearchParams(params)
    if (id) p.set('classe', id)
    else p.delete('classe')
    setParams(p, { replace: true })
    setPage(1)
  }

  return (
    <div>
      <EnTetePage
        titre="Élèves"
        sousTitre={`${nombre(eleves.filter((e) => e.statut === 'actif').length)} élèves inscrits pour l’année 2026-2027`}
        actions={
          ['promoteur', 'direction', 'secretariat'].includes(role) && (
            <Bouton onClick={() => nav('/inscription')} icone={<UserPlus className="size-4" />} className="max-sm:w-full">Inscrire un élève</Bouton>
          )
        }
      />

      <div className="bg-white rounded-xl border border-ligne">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap md:items-end gap-3 p-4 border-b border-ligne">
          <div className="relative sm:col-span-2 md:flex-1 md:min-w-[16rem]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
            <Saisie value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Nom, prénom, matricule ou classe" className="pl-9" aria-label="Rechercher un élève" />
          </div>
          <Liste value={cycle} onChange={(e) => { setCycle(e.target.value as Cycle | ''); choisirClasse('') }} className="w-full md:!w-auto md:min-w-[11rem]" aria-label="Cycle">
            <option value="">Tous les cycles</option>
            {CYCLES.map((c) => <option key={c} value={c}>{NOM_CYCLE[c]}</option>)}
          </Liste>
          <Liste value={classeId} onChange={(e) => choisirClasse(e.target.value)} className="w-full md:!w-auto md:min-w-[11rem]" aria-label="Classe">
            <option value="">Toutes les classes</option>
            {classesFiltre.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Liste>
          <Liste value={statut} onChange={(e) => { setStatut(e.target.value as typeof statut); setPage(1) }} className="w-full md:!w-auto md:min-w-[11rem]" aria-label="Statut">
            <option value="actif">Inscrits</option>
            <option value="radie">Radiés</option>
            <option value="tous">Tous les statuts</option>
          </Liste>
          {voitFinance && (
            <Liste value={finance} onChange={(e) => { setFinance(e.target.value as typeof finance); setPage(1) }} className="w-full md:!w-auto md:min-w-[11rem]" aria-label="Situation financière">
              <option value="">Toutes les situations</option>
              <option value="en_retard">Impayés en retard</option>
              <option value="partiel">Paiement partiel</option>
              <option value="a_jour">À jour</option>
            </Liste>
          )}
        </div>

        {!pret ? (
          <SqueletteTableau lignes={9} />
        ) : filtres.length === 0 ? (
          <Vide icone={<Users className="size-8" />} titre="Aucun élève ne correspond" texte="Élargissez les filtres ou vérifiez l’orthographe du nom." action={<Bouton variante="secondaire" onClick={() => { setQ(''); setCycle(''); choisirClasse(''); setFinance(''); setStatut('actif') }}>Effacer les filtres</Bouton>} />
        ) : (
          <>
            <div className="px-4 py-2.5 text-encre-2 text-sm border-b border-ligne-2">
              {nombre(filtres.length)} élève{filtres.length > 1 ? 's' : ''}
              {classeId && <> · {ic[classeId]?.nom}</>}
            </div>
            <ul className="lg:hidden grid sm:grid-cols-2 divide-y sm:divide-y-0 divide-ligne-2 sm:gap-px sm:bg-ligne-2 [&>li]:bg-white">
              {visibles.map((e) => {
                const c = ic[e.classeId]
                const sit = situations[e.familleId]
                const pr = presences[e.id]
                return (
                  <li key={e.id}>
                    <button onClick={() => nav(`/eleves/${e.id}`)} className="w-full text-left flex gap-3 px-4 py-3.5 active:bg-brume">
                      <Avatar prenom={e.prenom} nom={e.nom} taille={40} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold leading-snug">{e.prenom} {e.nom}</span>
                          <span className="text-sm whitespace-nowrap">
                            {pr?.depart ? <span className="text-encre-2">Parti</span> : pr?.arrivee ? <span className="text-vert-texte font-semibold">Présent</span> : <span className="text-ambre font-semibold">Absent</span>}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-encre-2 mt-0.5">
                          <PastilleCycle cycle={c.cycle} libelle={c.nom} />
                          <span>· {ageLisible(e.naissance)}</span>
                          <span className="tabulaire">· {e.matricule}</span>
                        </span>
                        <span className="flex flex-wrap gap-1.5 mt-1.5">
                          {e.nouveau && <Badge ton="bleu">Nouveau</Badge>}
                          {e.redoublant && <Badge>Redoublant</Badge>}
                          {e.statut === 'radie' && <Badge ton="rouge">Radié</Badge>}
                          {voitFinance && (sit?.statut === 'en_retard' ? <Badge ton="rouge" point>En retard · {money(sit.enRetard)}</Badge> : sit?.statut === 'partiel' ? <Badge ton="ambre" point>Partiel</Badge> : <Badge ton="vert" point>À jour</Badge>)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="hidden lg:block overflow-x-auto">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Élève</th>
                    <th>Classe</th>
                    <th>Matricule</th>
                    <th>Âge</th>
                    {voitFinance && <th>Situation financière</th>}
                    <th>Aujourd’hui</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((e) => {
                    const c = ic[e.classeId]
                    const sit = situations[e.familleId]
                    const pr = presences[e.id]
                    return (
                      <tr key={e.id} className="cliquable" onClick={() => nav(`/eleves/${e.id}`)}>
                        <td>
                          <span className="flex items-center gap-3">
                            <Avatar prenom={e.prenom} nom={e.nom} taille={34} />
                            <span className="min-w-0">
                              <span className="block font-semibold">{e.prenom} {e.nom}</span>
                              <span className="flex gap-1.5 mt-0.5">
                                {e.nouveau && <Badge ton="bleu">Nouveau</Badge>}
                                {e.redoublant && <Badge>Redoublant</Badge>}
                                {e.statut === 'radie' && <Badge ton="rouge">Radié</Badge>}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td><PastilleCycle cycle={c.cycle} libelle={c.nom} /></td>
                        <td className="tabulaire text-encre-2 whitespace-nowrap">{e.matricule}</td>
                        <td className="whitespace-nowrap">{ageLisible(e.naissance)}</td>
                        {voitFinance && (
                          <td>
                            {sit?.statut === 'en_retard' ? <Badge ton="rouge" point>En retard · {money(sit.enRetard)}</Badge> : sit?.statut === 'partiel' ? <Badge ton="ambre" point>Partiel</Badge> : <Badge ton="vert" point>À jour</Badge>}
                          </td>
                        )}
                        <td className="whitespace-nowrap">
                          {pr?.depart ? <span className="text-encre-2">Parti à {heureFr(pr.depart)}</span> : pr?.arrivee ? <span className="text-vert-texte font-semibold">Présent · {heureFr(pr.arrivee)}</span> : <span className="text-ambre font-semibold">Absent</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {visibles.length < filtres.length && (
              <div className="p-4 flex justify-center border-t border-ligne-2">
                <Bouton variante="secondaire" className="max-sm:w-full" onClick={() => setPage(page + 1)}>
                  Afficher {nombre(Math.min(PAR_PAGE, filtres.length - visibles.length))} élèves de plus
                </Bouton>
              </div>
            )}
          </>
        )}
      </div>
      <p className={cx('text-sm text-encre-3 mt-3')}>La situation financière est celle de la famille : elle regroupe tous les enfants inscrits.</p>
    </div>
  )
}
