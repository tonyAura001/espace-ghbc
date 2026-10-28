/** Rapprochement mobile money : opérations de l'école face au relevé de l'opérateur. */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Link2, Smartphone } from 'lucide-react'
import { useStore } from '../../store'
import { estMobileMoney, indexFamilles } from '../../store/selecteurs'
import { LIBELLE_MODE, MODES_MOBILE } from '../../data/referentiel'
import { Badge, Bloc, Bouton, EnTetePage, Segments, SqueletteTableau, Vide, Indicateur } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { money, nombre, numeroRecu } from '../../lib/format'
import { dateCourte, heureFr } from '../../lib/temps'

export default function Rapprochement() {
  const s = useStore()
  const pret = useChargement()
  const rapprocher = useStore((st) => st.rapprocher)
  const toast = useStore((st) => st.toast)
  const [executer, enCours] = useAction()
  const [op, setOp] = useState<string>(MODES_MOBILE[0])
  const fam = indexFamilles(s.familles)
  const mobiles = useMemo(() => s.paiements.filter((p) => estMobileMoney(p.mode) && p.statut !== 'annule'), [s.paiements])
  const aRapprocher = mobiles.filter((p) => !p.rapproche && p.mode === op).sort((a, b) => a.date.localeCompare(b.date))
  const faits = mobiles.filter((p) => p.rapproche && p.mode === op).slice(-8).reverse()
  const totalAttente = aRapprocher.reduce((a, p) => a + p.montant, 0)
  // le relevé de l'opérateur reprend les mêmes références et montants (frais de retrait opérateur à part)
  const go = () =>
    executer(() => {
      rapprocher(aRapprocher.map((p) => p.id))
      toast({ titre: 'Rapprochement effectué', texte: `${aRapprocher.length} opérations ${LIBELLE_MODE[op as keyof typeof LIBELLE_MODE]} concordent avec le relevé`, niveau: 'succes' })
    }, [700, 1100])

  return (
    <div>
      <EnTetePage titre="Rapprochement mobile money" sousTitre="Chaque paiement mobile reçu est comparé au relevé du compte marchand de l’école." actions={<Segments className="max-sm:w-full [&>button]:max-sm:flex-1" options={MODES_MOBILE.map((m) => ({ id: m, libelle: LIBELLE_MODE[m] }))} valeur={op} onChange={setOp} />} />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 md:grid-cols-3 mb-5 [&>*]:bg-white [&>*]:p-4 sm:[&>*]:p-5 [&_.chiffre]:max-sm:text-[1.5rem]">
        <div><Indicateur libelle="Opérations à rapprocher" valeur={nombre(aRapprocher.length)} /></div>
        <div><Indicateur libelle="Montant en attente" valeur={money(totalAttente)} /></div>
        <div className="max-md:col-span-2"><Indicateur libelle="Rapprochées depuis la rentrée" valeur={<span className="text-vert-texte">{nombre(mobiles.filter((p) => p.rapproche && p.mode === op).length)}</span>} /></div>
      </section>
      {!pret ? <SqueletteTableau /> : (
        <div className="space-y-5">
          <Bloc titre="Opérations en attente" actions={aRapprocher.length > 0 && <Bouton icone={<Link2 className="size-4" />} onClick={go} chargement={enCours}>Rapprocher avec le relevé</Bouton>} sansMarge>
            {aRapprocher.length === 0 ? (
              <Vide icone={<CheckCircle2 className="size-8 text-vert-texte" />} titre="Tout est rapproché" texte="Les prochains paiements mobiles apparaîtront ici." />
            ) : (
              <>
              <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
                {aRapprocher.map((p) => (
                  <li key={p.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link to={`/caisse/recu/${p.id}`} className="text-bleu font-semibold tabulaire">{numeroRecu(p.numero)}</Link>
                      <span className="chiffre font-semibold whitespace-nowrap">{money(p.montant)}</span>
                    </div>
                    <div className="text-sm text-encre-2 mt-0.5">Famille {fam[p.familleId]?.nom} · {dateCourte(p.date.slice(0, 10))} · {heureFr(p.date)}</div>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <span className="text-sm tabulaire text-encre-2 truncate min-w-0">{p.reference}</span>
                      <Badge ton="vert"><CheckCircle2 className="size-3.5" /> Concorde</Badge>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block overflow-x-auto">
                <table className="tableau">
                  <thead><tr><th>Date</th><th>Reçu</th><th>Famille</th><th>Référence opérateur</th><th className="text-right">Montant école</th><th className="text-right">Montant relevé</th><th>Concordance</th></tr></thead>
                  <tbody>
                    {aRapprocher.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap">{dateCourte(p.date.slice(0, 10))} · {heureFr(p.date)}</td>
                        <td><Link to={`/caisse/recu/${p.id}`} className="text-bleu hover:underline tabulaire">{numeroRecu(p.numero)}</Link></td>
                        <td>{fam[p.familleId]?.nom}</td>
                        <td className="tabulaire text-encre-2">{p.reference}</td>
                        <td className="text-right tabulaire">{money(p.montant)}</td>
                        <td className="text-right tabulaire">{money(p.montant)}</td>
                        <td><Badge ton="vert"><CheckCircle2 className="size-3.5" /> Concorde</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </Bloc>
          <Bloc titre={<span className="flex items-center gap-2"><Smartphone className="size-4" /> Derniers rapprochements</span>} sansMarge>
            <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
              {faits.map((p) => (
                <li key={p.id} className="px-4 py-3 flex items-baseline justify-between gap-3">
                  <span className="min-w-0"><span className="block tabulaire font-semibold">{numeroRecu(p.numero)}</span><span className="block text-sm text-encre-2">Famille {fam[p.familleId]?.nom} · {dateCourte(p.date.slice(0, 10))}</span></span>
                  <span className="chiffre whitespace-nowrap">{money(p.montant)}</span>
                </li>
              ))}
            </ul>
            <table className="tableau hidden md:table">
              <thead><tr><th>Date</th><th>Reçu</th><th>Famille</th><th>Référence</th><th className="text-right">Montant</th></tr></thead>
              <tbody>
                {faits.map((p) => (
                  <tr key={p.id}><td>{dateCourte(p.date.slice(0, 10))}</td><td className="tabulaire">{numeroRecu(p.numero)}</td><td>{fam[p.familleId]?.nom}</td><td className="tabulaire text-encre-2">{p.reference}</td><td className="text-right tabulaire">{money(p.montant)}</td></tr>
                ))}
              </tbody>
            </table>
          </Bloc>
        </div>
      )}
    </div>
  )
}
