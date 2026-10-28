/** Garderie du soir (16 h 30 – 18 h 30) : enfants inscrits, présence, départ avec un adulte autorisé. */
import { useState } from 'react'
import { Clock, Check } from 'lucide-react'
import { useStore } from '../../store'
import { elevesActifs, indexClasses, indexFamilles } from '../../store/selecteurs'
import { Avatar, Badge, Bloc, Bouton, EnTetePage, Indicateur, Liste, PastilleCycle } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { heureDemo, heureFr } from '../../lib/temps'
import { nombre } from '../../lib/format'

export default function Garderie() {
  const s = useStore()
  const ic = indexClasses(s.classes)
  const ifa = indexFamilles(s.familles)
  const [departs, setDeparts] = useState<Record<string, { heure: string; par: string }>>({})
  const [choix, setChoix] = useState<Record<string, string>>({})
  const [executer] = useAction()
  const inscrits = elevesActifs(s.eleves).filter((e) => e.garderie)
  const presents = inscrits.filter((e) => s.presences[e.id]?.arrivee)
  const autorisesDe = (familleId: string) => ifa[familleId].accompagnateurs.filter((a) => a.autorise)
  const choixAdulte = (eid: string, familleId: string) => {
    const autorises = autorisesDe(familleId)
    const d = departs[eid]
    return d ? <span>{d.par}</span> : (
      <Liste value={choix[eid] ?? autorises[0]?.id} onChange={(ev) => setChoix({ ...choix, [eid]: ev.target.value })} aria-label="Adulte qui récupère l’enfant" className="w-full md:max-w-[18rem] py-1.5 min-h-10">
        {autorises.map((a) => <option key={a.id} value={a.id}>{a.prenom} {a.nom} · {a.lien.toLowerCase()}</option>)}
      </Liste>
    )
  }
  const depart = (eid: string, prenom: string, nom: string, familleId: string) => {
    const autorises = autorisesDe(familleId)
    const d = departs[eid]
    return d ? <Badge ton="vert"><Check className="size-3.5" />Parti à {heureFr(d.heure)}</Badge> : (
      <Bouton taille="sm" variante="secondaire" className="min-h-10" onClick={() => executer(() => {
        const a = autorises.find((x) => x.id === (choix[eid] ?? autorises[0]?.id))!
        const h = heureDemo()
        setDeparts({ ...departs, [eid]: { heure: h, par: `${a.prenom} ${a.nom} (${a.lien.toLowerCase()})` } })
        s.journaliser('Garderie', 'Départ de la garderie', `${prenom} ${nom} · remis à ${a.prenom} ${a.nom}`, eid)
      }, [250, 450])}>Enregistrer le départ</Bouton>
    )
  }
  return (
    <div>
      <EnTetePage titre="Garderie du soir" sousTitre="De 16 h 30 à 18 h 30 · l’enfant ne part qu’avec un adulte autorisé" />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-1 sm:grid-cols-3 [&>*]:bg-white mb-5">
        <div className="p-4 sm:p-5"><Indicateur libelle="Inscrits à la garderie" valeur={nombre(inscrits.length)} /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Attendus ce soir" valeur={nombre(presents.length)} detail="Présents à l’école aujourd’hui" /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Déjà partis" valeur={nombre(Object.keys(departs).length)} ton="vert" /></div>
      </section>
      <Bloc titre={<span className="flex items-center gap-2"><Clock className="size-[1.1rem]" />Liste du soir</span>} sansMarge>
        <ul className="md:hidden">
          {presents.map((e) => (
            <li key={e.id} className="px-4 py-3 border-t border-ligne-2 first:border-t-0 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar prenom={e.prenom} nom={e.nom} taille={32} />
                <div className="min-w-0"><b>{e.prenom} {e.nom}</b><div className="text-sm"><PastilleCycle cycle={ic[e.classeId].cycle} libelle={ic[e.classeId].nom} /></div></div>
              </div>
              {choixAdulte(e.id, e.familleId)}
              <div className="flex justify-end">{depart(e.id, e.prenom, e.nom, e.familleId)}</div>
            </li>
          ))}
        </ul>
        <table className="tableau hidden md:table">
          <thead><tr><th>Enfant</th><th>Classe</th><th>Adulte qui récupère</th><th className="text-right">Départ</th></tr></thead>
          <tbody>
            {presents.map((e) => (
              <tr key={e.id}>
                <td><span className="flex items-center gap-3"><Avatar prenom={e.prenom} nom={e.nom} taille={32} /><b>{e.prenom} {e.nom}</b></span></td>
                <td><PastilleCycle cycle={ic[e.classeId].cycle} libelle={ic[e.classeId].nom} /></td>
                <td>{choixAdulte(e.id, e.familleId)}</td>
                <td className="text-right">{depart(e.id, e.prenom, e.nom, e.familleId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloc>
    </div>
  )
}
