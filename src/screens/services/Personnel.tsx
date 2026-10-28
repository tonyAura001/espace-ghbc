/** Personnel : dossiers, pointage du jour, remplacements. */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserCog, Search } from 'lucide-react'
import { useStore } from '../../store'
import { indexPersonnel, indexClasses, nomPersonnel, matiere } from '../../store/selecteurs'
import { LIBELLE_ROLE, NOM_CYCLE } from '../../data/referentiel'
import { Alerte, Avatar, Badge, Bloc, Bouton, EnTetePage, Indicateur, Ligne, Liste, Onglets, Panneau, PastilleCycle, Saisie, SqueletteTableau } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { JOUR_DEMO, NOMS_JOURS, dateMoyenne, heureFr, jourSemaine } from '../../lib/temps'
import { money, nombre, sansAccents } from '../../lib/format'
import type { Pointage } from '../../data/types'

const STATUT: Record<Pointage['statut'], { l: string; t: 'vert' | 'ambre' | 'rouge' | 'neutre' }> = {
  present: { l: 'Présent', t: 'vert' },
  retard: { l: 'En retard', t: 'ambre' },
  absent: { l: 'Absent', t: 'rouge' },
  conge: { l: 'En congé', t: 'neutre' },
}

export default function Personnel() {
  const s = useStore()
  const pret = useChargement()
  const [params, setParams] = useSearchParams()
  const [onglet, setOnglet] = useState<'equipe' | 'pointage' | 'remplacements'>('equipe')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const ouvert = params.get('id')
  const pointage = useMemo(() => Object.fromEntries(s.pointages.map((p) => [p.personnelId, p])), [s.pointages])
  const liste = useMemo(() => {
    const t = sansAccents(q)
    return s.personnel.filter((p) => (!role || p.role === role) && (!t || sansAccents(`${p.prenom} ${p.nom} ${p.fonction}`).includes(t)))
  }, [s.personnel, q, role])
  const presents = s.pointages.filter((p) => p.statut === 'present' || p.statut === 'retard').length
  const absents = s.pointages.filter((p) => p.statut === 'absent').length
  const masse = s.personnel.reduce((a, p) => a + p.salaire, 0)
  const aRemplacer = s.remplacements.filter((r) => !r.remplacantId)

  return (
    <div>
      <EnTetePage titre="Personnel" sousTitre={`${s.personnel.length} membres du personnel`} />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 xl:grid-cols-4 [&>*]:bg-white mb-5">
        <div className="p-4 sm:p-5"><Indicateur libelle="Présents aujourd’hui" valeur={`${presents} / ${s.pointages.length}`} /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Absents" valeur={nombre(absents)} ton={absents ? 'ambre' : undefined} /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Remplacements à organiser" valeur={nombre(aRemplacer.length)} ton={aRemplacer.length ? 'rouge' : 'vert'} /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Masse salariale mensuelle" valeur={<span className="text-[1.15rem] sm:text-[1.5rem]">{money(masse)}</span>} /></div>
      </section>
      <Onglets
        className="mb-4"
        actif={onglet}
        onChange={setOnglet}
        onglets={[{ id: 'equipe', libelle: 'Équipe' }, { id: 'pointage', libelle: 'Pointage du jour' }, { id: 'remplacements', libelle: 'Remplacements', compte: aRemplacer.length }]}
      />
      {onglet === 'equipe' && (
        <Bloc sansMarge>
          <div className="flex flex-wrap gap-3 p-4">
            <div className="relative flex-1 min-w-[min(16rem,100%)]">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
              <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, fonction…" className="pl-9" />
            </div>
            <Liste value={role} onChange={(e) => setRole(e.target.value)} className="w-full sm:w-auto">
              <option value="">Tous les rôles</option>
              {[...new Set(s.personnel.map((p) => p.role))].map((r) => <option key={r} value={r}>{LIBELLE_ROLE[r]}</option>)}
            </Liste>
          </div>
          {!pret ? <SqueletteTableau /> : (<>
            <ul className="md:hidden border-t border-ligne-2">
              {liste.map((p) => {
                const pt = pointage[p.id]
                return (
                  <li key={p.id}>
                    <button onClick={() => setParams({ id: p.id })} className="w-full text-left flex items-center gap-3 px-4 py-3 border-b border-ligne-2 hover:bg-brume">
                      <Avatar prenom={p.prenom} nom={p.nom} taille={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold truncate">{nomPersonnel(s, p.id)}</span>
                        <span className="block text-sm text-encre-2 truncate">{p.fonction}</span>
                        <span className="block text-sm text-encre-3 tabulaire">{p.tel}</span>
                      </span>
                      {pt && <Badge ton={STATUT[pt.statut].t}>{STATUT[pt.statut].l}</Badge>}
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="tableau">
                <thead><tr><th>Nom</th><th>Fonction</th><th>Cycle</th><th>Contrat</th><th>Téléphone</th><th>Aujourd’hui</th></tr></thead>
                <tbody>
                  {liste.map((p) => {
                    const pt = pointage[p.id]
                    return (
                      <tr key={p.id} className="cliquable" onClick={() => setParams({ id: p.id })}>
                        <td><span className="flex items-center gap-3"><Avatar prenom={p.prenom} nom={p.nom} taille={32} /><b>{nomPersonnel(s, p.id)}</b></span></td>
                        <td>{p.fonction}</td>
                        <td>{p.cycle ? <PastilleCycle cycle={p.cycle} /> : <span className="text-encre-3">Toute l’école</span>}</td>
                        <td className="text-encre-2">{p.contrat}</td>
                        <td className="tabulaire text-encre-2 whitespace-nowrap">{p.tel}</td>
                        <td>{pt ? <Badge ton={STATUT[pt.statut].t}>{STATUT[pt.statut].l}</Badge> : <span className="text-encre-3">—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>)}
        </Bloc>
      )}
      {onglet === 'pointage' && (
        <Bloc sansMarge>
          <ul className="md:hidden">
            {[...s.pointages].sort((a, b) => (a.arrivee ?? '99').localeCompare(b.arrivee ?? '99')).map((pt) => {
              const p = indexPersonnel(s.personnel)[pt.personnelId]
              return (
                <li key={pt.personnelId} className="flex items-center gap-3 px-4 py-2.5 border-t border-ligne-2 first:border-t-0">
                  <span className="min-w-0 flex-1"><span className="block font-semibold truncate">{nomPersonnel(s, p.id)}</span><span className="block text-sm text-encre-2 truncate">{p.fonction}</span></span>
                  <span className="text-right shrink-0"><span className="block tabulaire text-sm">{pt.arrivee ? heureFr(pt.arrivee) : '—'}</span><Badge ton={STATUT[pt.statut].t}>{STATUT[pt.statut].l}</Badge></span>
                </li>
              )
            })}
          </ul>
          <table className="tableau hidden md:table">
            <thead><tr><th>Nom</th><th>Fonction</th><th>Arrivée</th><th>Statut</th></tr></thead>
            <tbody>
              {[...s.pointages].sort((a, b) => (a.arrivee ?? '99').localeCompare(b.arrivee ?? '99')).map((pt) => {
                const p = indexPersonnel(s.personnel)[pt.personnelId]
                return (
                  <tr key={pt.personnelId}>
                    <td className="font-semibold">{nomPersonnel(s, p.id)}</td>
                    <td className="text-encre-2">{p.fonction}</td>
                    <td className="tabulaire">{pt.arrivee ? heureFr(pt.arrivee) : '—'}</td>
                    <td><Badge ton={STATUT[pt.statut].t}>{STATUT[pt.statut].l}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Bloc>
      )}
      {onglet === 'remplacements' && <Remplacements />}
      <Dossier id={ouvert} onFermer={() => setParams({})} />
    </div>
  )
}

function Remplacements() {
  const s = useStore()
  const affecter = useStore((st) => st.affecterRemplacant)
  const toast = useStore((st) => st.toast)
  const [executer, enCours] = useAction()
  const [choix, setChoix] = useState<Record<string, string>>({})
  const ic = indexClasses(s.classes)
  if (!s.remplacements.length) return <Alerte ton="vert" titre="Aucun remplacement à organiser aujourd’hui">Tous les professeurs attendus sont présents.</Alerte>
  return (
    <div className="space-y-4">
      {s.remplacements.map((r) => {
        const absent = indexPersonnel(s.personnel)[r.absentId]
        const crs = s.creneaux.filter((c) => r.creneauIds.includes(c.id))
        const libres = s.personnel.filter((p) => p.role === 'professeur' && p.id !== r.absentId && crs.every((c) => !s.creneaux.some((x) => x.profId === p.id && x.jour === c.jour && x.debut === c.debut)))
        return (
          <Bloc key={r.id} titre={`${nomPersonnel(s, absent.id)} · ${absent.fonction}`} actions={r.remplacantId ? <Badge ton="vert">Remplacé par {nomPersonnel(s, r.remplacantId)}</Badge> : <Badge ton="rouge">À remplacer</Badge>}>
            <p className="text-encre-2 mb-3">{r.motif} · {NOMS_JOURS[jourSemaine(JOUR_DEMO)]} {dateMoyenne(JOUR_DEMO)}</p>
            <ul className="mb-4 space-y-1">
              {crs.map((c) => <li key={c.id}>{heureFr(c.debut)} – {heureFr(c.fin)} · {matiere(c.matiereId).nom} · {ic[c.classeId].nom} · salle {c.salle}</li>)}
              {!crs.length && <li className="text-encre-2">Aucun cours aujourd’hui.</li>}
            </ul>
            {!r.remplacantId && (
              <div className="flex flex-wrap gap-2 items-center">
                <Liste value={choix[r.id] ?? libres[0]?.id ?? ''} onChange={(e) => setChoix({ ...choix, [r.id]: e.target.value })} className="w-full sm:w-auto min-w-0">
                  {libres.map((p) => <option key={p.id} value={p.id}>{nomPersonnel(s, p.id)} · {p.fonction}, libre sur ces créneaux</option>)}
                </Liste>
                <Bouton chargement={enCours} disabled={!libres.length} className="max-sm:w-full" onClick={() => executer(() => { const id = choix[r.id] ?? libres[0].id; affecter(r.id, id); toast({ titre: 'Remplaçant affecté', texte: `${nomPersonnel(s, id)} est prévenu par SMS.`, niveau: 'succes' }) })}>Affecter le remplaçant</Bouton>
              </div>
            )}
          </Bloc>
        )
      })}
    </div>
  )
}

function Dossier({ id, onFermer }: { id: string | null; onFermer: () => void }) {
  const s = useStore()
  const p = id ? indexPersonnel(s.personnel)[id] : null
  const ic = indexClasses(s.classes)
  const cours = p ? s.creneaux.filter((c) => c.profId === p.id) : []
  const titulaire = p ? s.classes.filter((c) => c.titulaireId === p.id) : []
  return (
    <Panneau ouvert={!!p} onFermer={onFermer} titre={p ? nomPersonnel(s, p.id) : ''} sousTitre={p?.fonction}>
      {p && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Avatar prenom={p.prenom} nom={p.nom} taille={56} />
            <div>
              <div className="text-encre-2">{LIBELLE_ROLE[p.role]}</div>
              {p.cycle && <PastilleCycle cycle={p.cycle} libelle={NOM_CYCLE[p.cycle]} />}
            </div>
            <UserCog className="size-5 text-encre-3 ml-auto" />
          </div>
          <Ligne libelle="Téléphone">{p.tel}</Ligne>
          <Ligne libelle="Contrat">{p.contrat}</Ligne>
          <Ligne libelle="Date d’embauche">{dateMoyenne(p.embauche)}</Ligne>
          <Ligne libelle="Salaire mensuel">{money(p.salaire)}</Ligne>
          {titulaire.length > 0 && <Ligne libelle="Titulaire de">{titulaire.map((c) => c.nom).join(', ')}</Ligne>}
          {p.matiereIds.length > 0 && <Ligne libelle="Matière">{p.matiereIds.map((m) => matiere(m).nom).join(', ')}</Ligne>}
          {cours.length > 0 && <Ligne libelle="Heures de cours par semaine">{cours.length} h · {[...new Set(cours.map((c) => ic[c.classeId].nom))].join(', ')}</Ligne>}
        </div>
      )}
    </Panneau>
  )
}
