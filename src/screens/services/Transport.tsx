/** Transport scolaire : circuits, arrêts, élèves transportés, suivi du ramassage. */
import { useState } from 'react'
import { Bus, MapPin, Check, Phone } from 'lucide-react'
import { useStore } from '../../store'
import { elevesActifs, indexClasses, indexPersonnel } from '../../store/selecteurs'
import { Avatar, Badge, Bloc, Bouton, EnTetePage, Indicateur, cx } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { heureFr, hhmmEnMinutes } from '../../lib/temps'
import { nombre } from '../../lib/format'
import { useMinutes } from '../../ui/hooks'

export default function Transport() {
  const s = useStore()
  const m = useMinutes()
  const [circuitId, setCircuitId] = useState(s.circuits[0]?.id ?? '')
  const [retours, setRetours] = useState<Record<string, boolean>>({})
  const [executer] = useAction()
  const ic = indexClasses(s.classes)
  const ip = indexPersonnel(s.personnel)
  const transportes = elevesActifs(s.eleves).filter((e) => e.circuitId)
  const circuit = s.circuits.find((c) => c.id === circuitId)!
  const eleves = transportes.filter((e) => e.circuitId === circuitId)
  const chauffeur = ip[circuit.chauffeurId]
  const boutonRetour = (id: string, nom: string) => (
    <Bouton
      taille="sm"
      className="min-h-10"
      variante={retours[id] ? 'succes' : 'secondaire'}
      disabled={!s.presences[id]?.arrivee || retours[id]}
      onClick={() => executer(() => { setRetours((r) => ({ ...r, [id]: true })); s.journaliser('Transport', 'Montée dans le minibus du retour', `${nom} · ${circuit.nom}`, id) }, [200, 400])}
    >
      {retours[id] ? <><Check className="size-3.5" />À bord</> : 'Pointer le retour'}
    </Bouton>
  )
  const ramassageFini = m > hhmmEnMinutes(circuit.arrets[circuit.arrets.length - 1].heure) + 30

  return (
    <div>
      <EnTetePage titre="Transport scolaire" sousTitre={`${s.circuits.length} circuits · ${nombre(transportes.length)} élèves transportés`} />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-1 md:grid-cols-3 mb-5">
        {s.circuits.map((c) => {
          const n = transportes.filter((e) => e.circuitId === c.id)
          const montes = n.filter((e) => s.presences[e.id]?.arrivee).length
          return (
            <button key={c.id} onClick={() => setCircuitId(c.id)} className={cx('p-4 sm:p-5 text-left', c.id === circuitId ? 'bg-bleu-clair' : 'bg-white hover:bg-brume')}>
              <Indicateur libelle={c.nom} valeur={`${montes} / ${n.length}`} detail={`Élèves arrivés à l’école · ${c.vehicule.split(' · ')[0]}`} />
            </button>
          )
        })}
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-5 items-start">
        <Bloc titre={<span className="flex items-center gap-2"><Bus className="size-[1.1rem]" />{circuit.nom}</span>}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Avatar prenom={chauffeur.prenom} nom={chauffeur.nom} taille={40} />
            <div className="flex-1">
              <div className="font-semibold">{chauffeur.prenom} {chauffeur.nom}</div>
              <div className="text-encre-2 text-sm">Chauffeur · {circuit.vehicule}</div>
            </div>
            <span className="text-encre-2 text-sm inline-flex items-center gap-1"><Phone className="size-3.5" />{chauffeur.tel}</span>
          </div>
          <ol className="relative border-l-2 border-bleu-ligne ml-2 space-y-4">
            {circuit.arrets.map((a, i) => {
              const passe = m > hhmmEnMinutes(a.heure)
              const nb = eleves.filter((_, k) => k % circuit.arrets.length === i).length
              return (
                <li key={a.nom} className="pl-5 relative">
                  <span className={cx('absolute -left-[0.55rem] top-1 size-4 rounded-full border-2 border-white', passe ? 'bg-vert' : 'bg-ligne')} />
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold inline-flex items-center gap-1.5"><MapPin className="size-4 text-encre-3" />{a.nom}</span>
                    <span className="tabulaire text-encre-2">{heureFr(a.heure)}</span>
                  </div>
                  <div className="text-sm text-encre-2">{nb} élève{nb > 1 ? 's' : ''} · {passe ? 'ramassage effectué' : 'à venir'}</div>
                </li>
              )
            })}
            <li className="pl-5 relative">
              <span className={cx('absolute -left-[0.55rem] top-1 size-4 rounded-full border-2 border-white', ramassageFini ? 'bg-vert' : 'bg-ligne')} />
              <div className="font-semibold">Arrivée à l’école</div>
            </li>
          </ol>
        </Bloc>
        <Bloc
          titre={`Élèves du circuit · ${eleves.length}`}
          sansMarge
        >
          <ul className="md:hidden">
            {eleves.map((e, k) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3 border-t border-ligne-2 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{e.prenom} {e.nom}</div>
                  <div className="text-sm text-encre-2">{ic[e.classeId].nom} · {circuit.arrets[k % circuit.arrets.length].nom}</div>
                  <div className="mt-1">{s.presences[e.id]?.arrivee ? <Badge ton="vert">Monté le matin</Badge> : <Badge ton="ambre">Absent</Badge>}</div>
                </div>
                {boutonRetour(e.id, `${e.prenom} ${e.nom}`)}
              </li>
            ))}
          </ul>
          <table className="tableau hidden md:table">
            <thead><tr><th>Élève</th><th>Classe</th><th>Arrêt</th><th>Ramassage du matin</th><th>Retour du soir</th></tr></thead>
            <tbody>
              {eleves.map((e, k) => (
                <tr key={e.id}>
                  <td className="font-semibold">{e.prenom} {e.nom}</td>
                  <td className="text-encre-2">{ic[e.classeId].nom}</td>
                  <td className="text-encre-2">{circuit.arrets[k % circuit.arrets.length].nom}</td>
                  <td>{s.presences[e.id]?.arrivee ? <Badge ton="vert">Monté</Badge> : <Badge ton="ambre">Absent</Badge>}</td>
                  <td>
                    {boutonRetour(e.id, `${e.prenom} ${e.nom}`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bloc>
      </div>
    </div>
  )
}
