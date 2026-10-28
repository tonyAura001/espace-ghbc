/** Tableau de bord financier : encaissements, recouvrement, échéances à venir, dépenses, résultat par cycle. */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { useStore } from '../../store'
import {
  encaissementsParJour, recouvrementDetail, echeancesDetail, indexEleves, indexClasses, indexEcheances, paiementsComptes, effectifsParCycle,
} from '../../store/selecteurs'
import { CYCLES, NOM_CYCLE, CATEGORIES_DEPENSES } from '../../data/referentiel'
import type { Cycle } from '../../data/types'
import { Bloc, EnTetePage, Indicateur, Jauge, PastilleCycle, COULEUR_CYCLE, SqueletteTableau, cx } from '../../ui/base'
import { useChargement } from '../../ui/hooks'
import { money, moneyCompact, pct, nombre } from '../../lib/format'
import { JOUR_DEMO, joursOuvres, ajouterJours, dateCourte, DEBUT_ANNEE } from '../../lib/temps'

export default function TableauFinancier() {
  const s = useStore()
  const pret = useChargement(450)
  const rec = recouvrementDetail(s)
  const parJour = encaissementsParJour(s.paiements)
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)

  const donneesJours = useMemo(() => {
    const jours = joursOuvres(ajouterJours(JOUR_DEMO, -44), JOUR_DEMO).slice(-30)
    return jours.map((j) => ({ jour: j, libelle: `${j.slice(8)}/${j.slice(5, 7)}`, montant: parJour[j] ?? 0 }))
  }, [parJour])

  const encaisseAnnee = s.paiements.filter(paiementsComptes).reduce((a, p) => a + p.montant, 0)
  const depensesTotal = s.depenses.reduce((a, d) => a + d.montant, 0)

  const parCycle = useMemo(() => {
    const iech = indexEcheances(s.echeances)
    const enc: Record<string, number> = {}
    for (const p of s.paiements) {
      if (!paiementsComptes(p)) continue
      for (const l of p.lignes) {
        const e = iech[l.echeanceId]
        const el = e ? ie[e.eleveId] : null
        if (!el) continue
        const c = ic[el.classeId].cycle
        enc[c] = (enc[c] ?? 0) + l.montant
      }
    }
    const eff = effectifsParCycle(s)
    const communes = s.depenses.filter((d) => !d.cycle).reduce((a, d) => a + d.montant, 0)
    return CYCLES.map((c) => {
      const directes = s.depenses.filter((d) => d.cycle === c).reduce((a, d) => a + d.montant, 0)
      const reparties = eff.total ? (communes * eff[c]) / eff.total : 0
      const charges = directes + reparties
      return { cycle: c, encaisse: enc[c] ?? 0, directes, reparties, resultat: (enc[c] ?? 0) - charges }
    })
  }, [s, ie, ic])

  const parCategorie = useMemo(() => {
    const r: Record<string, number> = {}
    for (const d of s.depenses) r[d.categorie] = (r[d.categorie] ?? 0) + d.montant
    return CATEGORIES_DEPENSES.map((c) => ({ categorie: c, montant: r[c] ?? 0 })).filter((x) => x.montant > 0).sort((a, b) => b.montant - a.montant)
  }, [s.depenses])
  const maxCat = Math.max(1, ...parCategorie.map((x) => x.montant))

  const aVenir = useMemo(() => {
    const fin = ajouterJours(JOUR_DEMO, 45)
    const r: Record<string, { n: number; m: number }> = {}
    for (const e of echeancesDetail(s.echeances, s.paiements)) {
      if (e.echeance <= JOUR_DEMO || e.echeance > fin || e.reste <= 0) continue
      r[e.echeance] ??= { n: 0, m: 0 }
      r[e.echeance].n++
      r[e.echeance].m += e.reste
    }
    return Object.entries(r).sort(([a], [b]) => a.localeCompare(b))
  }, [s.echeances, s.paiements])

  const classesFaibles = Object.entries(rec.parClasse).sort(([, a], [, b]) => a.taux - b.taux).slice(0, 8)

  if (!pret) return <SqueletteTableau />

  return (
    <div className="space-y-5">
      <EnTetePage titre="Tableau financier" sousTitre={`Année 2026-2027 · depuis le ${dateCourte('2026-09-01')} · chiffres en direct`} />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 lg:grid-cols-4 [&>*]:bg-white [&>*]:p-4 sm:[&>*]:p-5 [&_.chiffre]:max-sm:text-[1.5rem]">
        <div><Indicateur libelle="Encaissé depuis la rentrée" valeur={<span className="text-vert-texte">{moneyCompact(encaisseAnnee)}</span>} detail={`dont ${moneyCompact(parJour[JOUR_DEMO] ?? 0)} aujourd’hui`} /></div>
        <div><Indicateur libelle="Recouvrement à date" valeur={pct(rec.taux, 1)} detail={`${moneyCompact(rec.reste)} restent dus sur l’échu`} /></div>
        <div><Indicateur libelle="Dépenses depuis la rentrée" valeur={moneyCompact(depensesTotal)} detail={<Link to="/depenses" className="text-bleu font-semibold hover:underline">Voir les dépenses</Link>} /></div>
        <div><Indicateur libelle="Résultat de trésorerie" valeur={<span className={encaisseAnnee - depensesTotal >= 0 ? 'text-vert-texte' : 'text-rouge'}>{moneyCompact(encaisseAnnee - depensesTotal)}</span>} detail="Encaissé moins dépenses payées" /></div>
      </section>

      <Bloc titre="Encaissements par jour · 30 derniers jours d’école">
        <div className="h-52 sm:h-64" role="img" aria-label="Encaissements par jour">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={donneesJours} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="#EAEEF4" />
              <XAxis dataKey="libelle" tickLine={false} axisLine={{ stroke: '#DCE3EC' }} tick={{ fontSize: 12, fill: '#6B7690' }} interval="preserveStartEnd" minTickGap={14} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7690' }} tickFormatter={(v: number) => `${nombre(v / 1_000_000)} M`} width={40} />
              <Tooltip cursor={{ fill: 'rgba(2,73,162,0.06)' }} content={({ active, payload }) => active && payload?.[0] ? (
                <div className="rounded-lg bg-white border border-ligne shadow-panneau px-3 py-2 text-sm">
                  <div className="font-semibold">{dateCourte((payload[0].payload as { jour: string }).jour)}</div>
                  <div className="tabulaire">{money(payload[0].value as number)}</div>
                </div>
              ) : null} />
              <Bar dataKey="montant" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {donneesJours.map((d) => <Cell key={d.jour} fill={d.jour === JOUR_DEMO ? '#02A73A' : '#0249A2'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-encre-2 mt-2">Les pics du début de mois correspondent aux échéances du 5. La barre verte est la journée en cours.</p>
      </Bloc>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Bloc titre="Recouvrement par cycle">
          <ul className="space-y-4">
            {CYCLES.map((c: Cycle) => {
              const r = rec.parCycle[c]
              return (
                <li key={c}>
                  <div className="flex flex-wrap justify-between gap-x-3 mb-1.5"><PastilleCycle cycle={c} /><span className="tabulaire"><b>{pct(r?.taux ?? 1, 1)}</b> <span className="text-encre-2 text-sm sm:text-base">· {moneyCompact(r?.paye ?? 0)} sur {moneyCompact(r?.du ?? 0)}</span></span></div>
                  <Jauge valeur={r?.taux ?? 1} couleur={COULEUR_CYCLE[c]} hauteur={8} />
                </li>
              )
            })}
          </ul>
          <div className="mt-5 text-sm font-semibold text-encre-2">Classes à surveiller</div>
          <table className="tableau mt-1">
            <tbody>
              {classesFaibles.map(([cid, r]) => (
                <tr key={cid}>
                  <td><PastilleCycle cycle={ic[cid].cycle} libelle={ic[cid].nom} /></td>
                  <td className="w-1/3 max-sm:hidden"><Jauge valeur={r.taux} couleur={r.taux < 0.75 ? 'var(--color-ambre)' : 'var(--color-vert)'} /></td>
                  <td className="text-right tabulaire font-semibold">{pct(r.taux, 1)}</td>
                  <td className="text-right"><Link to="/impayes" className="text-bleu text-sm font-semibold hover:underline">Impayés</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bloc>

        <Bloc titre="Dépenses par catégorie">
          <ul className="space-y-3">
            {parCategorie.map((c) => (
              <li key={c.categorie}>
                <div className="flex justify-between gap-3 mb-1"><span>{c.categorie}</span><span className="tabulaire font-semibold">{money(c.montant)}</span></div>
                <div className="h-2 rounded-full bg-ligne-2"><div className="h-2 rounded-full bg-bleu" style={{ width: `${(c.montant / maxCat) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Bloc>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <Bloc titre="Résultat par cycle" sansMarge>
          <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
            {parCycle.map((r) => (
              <li key={r.cycle} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <PastilleCycle cycle={r.cycle} libelle={NOM_CYCLE[r.cycle]} className="font-semibold" />
                  <span className={cx('chiffre font-semibold', r.resultat >= 0 ? 'text-vert-texte' : 'text-rouge')}>{moneyCompact(r.resultat)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1.5 text-sm">
                  <div><div className="text-encre-2">Encaissé</div><div className="tabulaire">{moneyCompact(r.encaisse)}</div></div>
                  <div><div className="text-encre-2">Directes</div><div className="tabulaire">{moneyCompact(r.directes)}</div></div>
                  <div><div className="text-encre-2">Communes</div><div className="tabulaire">{moneyCompact(r.reparties)}</div></div>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="tableau">
              <thead><tr><th>Cycle</th><th className="text-right">Encaissé</th><th className="text-right">Charges directes</th><th className="text-right">Charges communes réparties</th><th className="text-right">Résultat</th></tr></thead>
              <tbody>
                {parCycle.map((r) => (
                  <tr key={r.cycle}>
                    <td><PastilleCycle cycle={r.cycle} libelle={NOM_CYCLE[r.cycle]} /></td>
                    <td className="text-right tabulaire">{money(r.encaisse)}</td>
                    <td className="text-right tabulaire">{money(r.directes)}</td>
                    <td className="text-right tabulaire">{money(r.reparties)}</td>
                    <td className={cx('text-right tabulaire font-semibold', r.resultat >= 0 ? 'text-vert-texte' : 'text-rouge')}>{money(r.resultat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 sm:px-5 py-3 text-sm text-encre-2">Les charges communes (administration, électricité, eau, internet…) sont réparties au prorata des effectifs.</p>
        </Bloc>
        <Bloc titre="Échéances à venir · 45 prochains jours" sansMarge>
          <table className="tableau">
            <thead><tr><th>Date limite</th><th className="text-right">Échéances</th><th className="text-right">Montant attendu</th></tr></thead>
            <tbody>
              {aVenir.map(([d, v]) => (
                <tr key={d}><td>{dateCourte(d)}</td><td className="text-right tabulaire">{nombre(v.n)}</td><td className="text-right tabulaire font-semibold">{money(v.m)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 sm:px-5 py-3 text-sm text-encre-2">Depuis le {dateCourte(DEBUT_ANNEE)}, chaque mensualité tombe le 5 du mois ; les familles qui ont payé d’avance n’apparaissent plus.</p>
        </Bloc>
      </div>
    </div>
  )
}
