/** Santé et infirmerie : passages du jour, fiches santé (consultation journalisée), vaccinations. */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShieldAlert, Lock } from 'lucide-react'
import { useStore } from '../../store'
import { indexEleves, indexClasses, nomPersonnel, elevesActifs } from '../../store/selecteurs'
import { profilParId, peut } from '../../store/profils'
import { Avatar, Badge, Bloc, Bouton, Champ, EnTetePage, Indicateur, Liste, Panneau, PastilleCycle, Saisie, SqueletteTableau, Zone } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { JOUR_DEMO, heureFr, relatif } from '../../lib/temps'
import { nombre, sansAccents } from '../../lib/format'

export default function Sante() {
  const s = useStore()
  const pret = useChargement()
  const role = profilParId(s.session.profilId).role
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)
  const [nouveau, setNouveau] = useState(false)
  const [fiche, setFiche] = useState<string | null>(null)
  const actifs = elevesActifs(s.eleves)
  const duJour = s.visites.filter((v) => v.date.startsWith(JOUR_DEMO))
  const allergiques = actifs.filter((e) => e.sante.allergies.length)
  const traitements = actifs.filter((e) => e.sante.traitements.length)
  const vaccins = actifs.filter((e) => !e.sante.vaccinsAJour)

  return (
    <div>
      <EnTetePage
        titre="Santé et infirmerie"
        sousTitre="Chaque ouverture d’une fiche santé est inscrite au journal d’audit."
        actions={<Bouton icone={<Plus className="size-4" />} onClick={() => setNouveau(true)} className="max-sm:w-full">Enregistrer un passage</Bouton>}
      />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 xl:grid-cols-4 [&>*]:bg-white mb-5">
        <div className="p-4 sm:p-5"><Indicateur libelle="Passages aujourd’hui" valeur={nombre(duJour.length)} detail={`${s.visites.filter((v) => v.suite.startsWith('Récupéré')).length} élèves rendus aux parents ce mois-ci`} /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Élèves allergiques" valeur={nombre(allergiques.length)} detail="Signalés à la cantine et aux éducatrices" ton="ambre" /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Traitements suivis" valeur={nombre(traitements.length)} detail="Asthme, drépanocytose…" /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Vaccinations à compléter" valeur={nombre(vaccins.length)} detail="Rappel envoyé aux familles" ton={vaccins.length ? 'rouge' : undefined} /></div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <Bloc titre="Passages à l’infirmerie" sansMarge>
          {!pret ? <SqueletteTableau lignes={6} /> : (<>
            <ul className="md:hidden">
              {s.visites.slice(0, 18).map((v) => {
                const e = ie[v.eleveId]
                return (
                  <li key={v.id} className="px-4 py-3 border-t border-ligne-2 first:border-t-0">
                    <div className="flex justify-between gap-3">
                      <Link to={`/eleves/${e.id}`} className="font-semibold hover:underline">{e.prenom} {e.nom}</Link>
                      <span className="text-sm text-encre-2 whitespace-nowrap">{v.date.startsWith(JOUR_DEMO) ? heureFr(v.date) : relatif(v.date)}</span>
                    </div>
                    <div className="text-sm text-encre-2">{ic[e.classeId].nom} · {v.motif}</div>
                    <div className="text-sm mt-0.5">{v.soin}</div>
                    <div className="mt-1.5"><Badge ton={v.suite.startsWith('Récupéré') ? 'ambre' : 'vert'}>{v.suite}</Badge></div>
                  </li>
                )
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="tableau">
                <thead><tr><th>Quand</th><th>Élève</th><th>Motif</th><th>Soin</th><th>Suite</th></tr></thead>
                <tbody>
                  {s.visites.slice(0, 18).map((v) => {
                    const e = ie[v.eleveId]
                    return (
                      <tr key={v.id}>
                        <td className="whitespace-nowrap text-encre-2">{v.date.startsWith(JOUR_DEMO) ? `Aujourd’hui, ${heureFr(v.date)}` : relatif(v.date)}</td>
                        <td><Link to={`/eleves/${e.id}`} className="font-semibold hover:underline">{e.prenom} {e.nom}</Link><div className="text-sm text-encre-2">{ic[e.classeId].nom}</div></td>
                        <td>{v.motif}</td>
                        <td className="text-encre-2">{v.soin}</td>
                        <td><Badge ton={v.suite.startsWith('Récupéré') ? 'ambre' : 'vert'}>{v.suite}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>)}
        </Bloc>
        <Bloc titre={<span className="flex items-center gap-2"><ShieldAlert className="size-[1.1rem] text-ambre" />Allergies et traitements</span>} sansMarge>
          <ul>
            {[...allergiques, ...traitements.filter((e) => !e.sante.allergies.length)].slice(0, 16).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 sm:px-5 py-2.5 border-t border-ligne-2 first:border-t-0">
                <Avatar prenom={e.prenom} nom={e.nom} taille={32} />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold">{e.prenom} {e.nom}</span>
                  <span className="text-encre-2 text-sm ml-2 inline-flex"><PastilleCycle cycle={ic[e.classeId].cycle} libelle={ic[e.classeId].nom} /></span>
                </span>
                <Bouton variante="discret" taille="sm" className="min-h-10 max-sm:ml-auto" icone={<Lock className="size-3.5" />} onClick={() => { s.consulterSante(e.id); setFiche(e.id) }} disabled={!peut(role, 'ficheSante')}>Ouvrir la fiche</Bouton>
              </li>
            ))}
          </ul>
        </Bloc>
      </div>

      <NouveauPassage ouvert={nouveau} onFermer={() => setNouveau(false)} />
      <FicheSante eleveId={fiche} onFermer={() => setFiche(null)} />
    </div>
  )
}

function FicheSante({ eleveId, onFermer }: { eleveId: string | null; onFermer: () => void }) {
  const s = useStore()
  const e = eleveId ? indexEleves(s.eleves)[eleveId] : null
  return (
    <Panneau ouvert={!!e} onFermer={onFermer} titre={e ? `Fiche santé · ${e.prenom} ${e.nom}` : ''} sousTitre="Consultation inscrite au journal d’audit">
      {e && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-encre-2 text-sm">Groupe sanguin</div><div className="text-xl chiffre">{e.sante.groupeSanguin}</div></div>
            <div><div className="text-encre-2 text-sm">Vaccinations</div><div>{e.sante.vaccinsAJour ? <Badge ton="vert">À jour</Badge> : <Badge ton="rouge">À compléter</Badge>}</div></div>
          </div>
          <div><div className="text-encre-2 text-sm mb-1">Allergies</div>{e.sante.allergies.length ? e.sante.allergies.map((a) => <Badge key={a} ton="rouge" className="mr-1">{a}</Badge>) : 'Aucune connue'}</div>
          <div><div className="text-encre-2 text-sm mb-1">Traitements</div>{e.sante.traitements.length ? e.sante.traitements.join(' ; ') : 'Aucun'}</div>
          {e.sante.remarques && <div><div className="text-encre-2 text-sm mb-1">Remarques</div>{e.sante.remarques}</div>}
          <div>
            <div className="text-encre-2 text-sm mb-1">Passages à l’infirmerie</div>
            <ul className="space-y-1">
              {s.visites.filter((v) => v.eleveId === e.id).map((v) => <li key={v.id}>{relatif(v.date)} · {v.motif} · {v.suite}</li>)}
              {!s.visites.some((v) => v.eleveId === e.id) && <li className="text-encre-2">Aucun passage cette année</li>}
            </ul>
          </div>
        </div>
      )}
    </Panneau>
  )
}

function NouveauPassage({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const s = useStore()
  const ajouter = useStore((st) => st.ajouterVisite)
  const toast = useStore((st) => st.toast)
  const [executer, enCours] = useAction()
  const [q, setQ] = useState('')
  const [eleveId, setEleveId] = useState('')
  const [motif, setMotif] = useState('Maux de tête')
  const [soin, setSoin] = useState('Repos 20 minutes, eau')
  const [suite, setSuite] = useState('Retour en classe')
  const ic = indexClasses(s.classes)
  const res = useMemo(() => {
    const t = sansAccents(q)
    if (t.length < 2) return []
    return elevesActifs(s.eleves).filter((e) => sansAccents(`${e.prenom} ${e.nom}`).includes(t)).slice(0, 6)
  }, [q, s.eleves])
  const valider = () =>
    executer(() => {
      ajouter({ eleveId, motif, soin, suite })
      toast({ titre: 'Passage enregistré', texte: suite === 'Récupéré par les parents' ? 'Les parents ont été prévenus par SMS.' : undefined, niveau: 'succes' })
      onFermer()
      setEleveId('')
      setQ('')
    })
  return (
    <Panneau ouvert={ouvert} onFermer={onFermer} titre="Enregistrer un passage" pied={<><Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton><Bouton onClick={valider} chargement={enCours} disabled={!eleveId}>Enregistrer le passage</Bouton></>}>
      <div className="space-y-4">
        <Champ libelle="Élève" aide={eleveId ? undefined : 'Tapez au moins deux lettres du prénom ou du nom'}>
          <Saisie value={q} onChange={(e) => { setQ(e.target.value); setEleveId('') }} placeholder="Prénom ou nom" />
        </Champ>
        {!eleveId && res.length > 0 && (
          <ul className="border border-ligne rounded-lg divide-y divide-ligne-2">
            {res.map((e) => <li key={e.id}><button className="w-full text-left px-3 py-2 hover:bg-brume" onClick={() => { setEleveId(e.id); setQ(`${e.prenom} ${e.nom}`) }}>{e.prenom} {e.nom} <span className="text-encre-2">· {ic[e.classeId].nom}</span></button></li>)}
          </ul>
        )}
        <Champ libelle="Motif"><Liste value={motif} onChange={(e) => setMotif(e.target.value)}>{['Maux de tête', 'Fièvre', 'Maux de ventre', 'Égratignure', 'Saignement de nez', 'Crise d’asthme', 'Piqûre d’insecte', 'Chute'].map((m) => <option key={m}>{m}</option>)}</Liste></Champ>
        <Champ libelle="Soin apporté"><Zone value={soin} onChange={(e) => setSoin(e.target.value)} /></Champ>
        <Champ libelle="Suite"><Liste value={suite} onChange={(e) => setSuite(e.target.value)}>{['Retour en classe', 'Repos à l’infirmerie', 'Récupéré par les parents', 'Orienté vers un médecin'].map((m) => <option key={m}>{m}</option>)}</Liste></Champ>
        <p className="text-sm text-encre-2">Saisi par {nomPersonnel(s, profilParId(s.session.profilId).userId)}.</p>
      </div>
    </Panneau>
  )
}

