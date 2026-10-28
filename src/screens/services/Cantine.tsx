/** Cantine : menus de la semaine, repas à préparer aujourd'hui, allergies, recouvrement de la cantine. */
import { useState } from 'react'
import { Utensils, ShieldAlert, Check } from 'lucide-react'
import { useStore } from '../../store'
import { elevesActifs, indexClasses, echeancesDetail } from '../../store/selecteurs'
import { CYCLES, NOM_CYCLE } from '../../data/referentiel'
import { Badge, Bloc, Bouton, COULEUR_CYCLE, EnTetePage, Indicateur, Jauge, cx } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { JOUR_DEMO, dateLongueMaj, jourSemaine } from '../../lib/temps'
import { money, nombre, pct } from '../../lib/format'

export default function Cantine() {
  const s = useStore()
  const [executer, enCours] = useAction()
  const [commande, setCommande] = useState(false)
  const ic = indexClasses(s.classes)
  const inscrits = elevesActifs(s.eleves).filter((e) => e.cantine)
  const presents = inscrits.filter((e) => s.presences[e.id]?.arrivee && !s.presences[e.id]?.depart)
  const allergiques = presents.filter((e) => e.sante.allergies.length)
  const parCycle = CYCLES.filter((c) => c !== 'creche').map((c) => ({ c, inscrits: inscrits.filter((e) => ic[e.classeId].cycle === c).length, presents: presents.filter((e) => ic[e.classeId].cycle === c).length }))
  const ech = echeancesDetail(s.echeances, s.paiements).filter((e) => e.type === 'cantine' && e.echeance <= JOUR_DEMO)
  const du = ech.reduce((a, e) => a + e.montant, 0)
  const paye = ech.reduce((a, e) => a + Math.min(e.paye, e.montant), 0)
  const semaine = s.menus.slice(0, 5)

  return (
    <div>
      <EnTetePage
        titre="Cantine"
        sousTitre={`${dateLongueMaj(JOUR_DEMO)} · menu et effectifs du jour`}
        actions={
          <Bouton
            className="max-sm:w-full max-sm:whitespace-normal"
            icone={commande ? <Check className="size-4" /> : <Utensils className="size-4" />}
            variante={commande ? 'succes' : 'principal'}
            chargement={enCours}
            disabled={commande}
            onClick={() => executer(() => { setCommande(true); s.journaliser('Cantine', 'Effectif transmis à la cuisine', `${presents.length} repas · ${allergiques.length} repas adaptés`) })}
          >
            {commande ? 'Effectif transmis à la cuisine' : 'Transmettre l’effectif à la cuisine'}
          </Bouton>
        }
      />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 xl:grid-cols-4 [&>*]:bg-white mb-5">
        <div className="p-4 sm:p-5"><Indicateur libelle="Repas à préparer" valeur={nombre(presents.length)} detail={`${nombre(inscrits.length)} inscrits, ${nombre(inscrits.length - presents.length)} absents aujourd’hui`} /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Repas adaptés" valeur={nombre(allergiques.length)} detail="Sans arachide, sans lactose…" ton="ambre" /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Recouvrement cantine" valeur={pct(du ? paye / du : 1, 1)} detail={`${money(du - paye)} restant dû`} /></div>
        <div className="p-4 sm:p-5"><Indicateur libelle="Menu du jour" valeur={<span className="text-[1.1rem] sm:text-[1.3rem]">{s.menus.find((m) => m.date === JOUR_DEMO)?.plat ?? semaine[0]?.plat}</span>} detail={s.menus.find((m) => m.date === JOUR_DEMO)?.accompagnement} /></div>
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-5 items-start">
        <Bloc titre="Menus de la semaine" sansMarge>
          <ul className="md:hidden">
            {semaine.map((m) => (
              <li key={m.date} className={cx('px-4 py-3 border-t border-ligne-2 first:border-t-0', m.date === JOUR_DEMO && 'bg-bleu-clair/50')}>
                <div className="flex items-center gap-2 font-semibold">{['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][jourSemaine(m.date)]}{m.date === JOUR_DEMO && <Badge ton="bleu">Aujourd’hui</Badge>}</div>
                <div>{m.plat}</div>
                <div className="text-sm text-encre-2">{m.accompagnement} · {m.dessert}</div>
              </li>
            ))}
          </ul>
          <table className="tableau hidden md:table">
            <thead><tr><th>Jour</th><th>Plat</th><th>Accompagnement</th><th>Dessert</th></tr></thead>
            <tbody>
              {semaine.map((m) => (
                <tr key={m.date} className={cx(m.date === JOUR_DEMO && 'bg-bleu-clair/50')}>
                  <td className="font-semibold whitespace-nowrap">{['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][jourSemaine(m.date)]}{m.date === JOUR_DEMO && <Badge ton="bleu" className="ml-2">Aujourd’hui</Badge>}</td>
                  <td>{m.plat}</td>
                  <td className="text-encre-2">{m.accompagnement}</td>
                  <td className="text-encre-2">{m.dessert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bloc>
        <div className="space-y-5">
          <Bloc titre="Effectifs par cycle">
            <ul className="space-y-3">
              {parCycle.map((p) => (
                <li key={p.c} className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3">
                  <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: COULEUR_CYCLE[p.c] }} />{NOM_CYCLE[p.c]}</span>
                  <Jauge valeur={p.inscrits ? p.presents / p.inscrits : 0} couleur={COULEUR_CYCLE[p.c]} />
                  <span className="text-right tabulaire"><b>{p.presents}</b> / {p.inscrits}</span>
                </li>
              ))}
            </ul>
          </Bloc>
          <Bloc titre={<span className="flex items-center gap-2"><ShieldAlert className="size-[1.1rem] text-ambre" />Repas adaptés aujourd’hui</span>} sansMarge>
            <ul>
              {allergiques.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 px-4 sm:px-5 py-2.5 border-t border-ligne-2 first:border-t-0">
                  <span><b>{e.prenom} {e.nom}</b> <span className="text-encre-2">· {ic[e.classeId].nom}</span></span>
                  <span>{e.sante.allergies.map((a) => <Badge key={a} ton="rouge" className="ml-1">Sans {a.toLowerCase()}</Badge>)}</span>
                </li>
              ))}
              {!allergiques.length && <li className="px-5 pb-5 text-encre-2">Aucun repas adapté aujourd’hui.</li>}
            </ul>
          </Bloc>
        </div>
      </div>
    </div>
  )
}
