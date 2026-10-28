/** Liste des reçus : numérotation continue, annulés visibles, aucune suppression possible. */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Ban, Info, Wallet } from 'lucide-react'
import { useStore } from '../../store'
import type { Paiement } from '../../data/types'
import { profilParId, peut } from '../../store/profils'
import { indexFamilles, nomPersonnel } from '../../store/selecteurs'
import { LIBELLE_MODE } from '../../data/referentiel'
import { Bouton, EnTetePage, Liste, Saisie, Segments, SqueletteTableau, Vide, cx, Alerte } from '../../ui/base'
import { useChargement } from '../../ui/hooks'
import { money, nombre, numeroRecu, sansAccents } from '../../lib/format'
import { JOUR_DEMO, dateCourte, heureFr } from '../../lib/temps'
import { hierOuvre } from '../../store/selecteurs'
import { StatutRecu } from './RecuApercu'
import { ModaleAnnulation } from './ModaleAnnulation'

type Periode = 'jour' | 'hier' | 'semaine' | 'tout'

export default function Recus() {
  const s = useStore()
  const nav = useNavigate()
  const pret = useChargement()
  const role = profilParId(s.session.profilId).role
  const [periode, setPeriode] = useState<Periode>('jour')
  const [mode, setMode] = useState('')
  const [statut, setStatut] = useState('')
  const [q, setQ] = useState('')
  const [annuler, setAnnuler] = useState<Paiement | null>(null)
  const fam = indexFamilles(s.familles)

  const liste = useMemo(() => {
    const t = sansAccents(q.trim())
    const hier = hierOuvre()
    const debutSemaine = (() => {
      const d = new Date(JOUR_DEMO + 'T12:00:00')
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      return d.toISOString().slice(0, 10)
    })()
    return s.paiements
      .filter((p) => {
        const j = p.date.slice(0, 10)
        if (periode === 'jour' && j !== JOUR_DEMO) return false
        if (periode === 'hier' && j !== hier) return false
        if (periode === 'semaine' && j < debutSemaine) return false
        if (mode && p.mode !== mode) return false
        if (statut && p.statut !== statut) return false
        if (t) {
          const txt = sansAccents(`${numeroRecu(p.numero)} ${p.numero} ${fam[p.familleId]?.nom ?? ''} ${p.payeur} ${p.reference ?? ''}`)
          if (!t.split(/\s+/).every((m) => txt.includes(m))) return false
        }
        return true
      })
      .sort((a, b) => b.numero - a.numero)
  }, [s.paiements, periode, mode, statut, q, fam])

  const valides = liste.filter((p) => p.statut !== 'annule')
  const totalValide = valides.reduce((a, p) => a + p.montant, 0)
  const affiches = liste.slice(0, 200)
  const premier = s.paiements.reduce((a, p) => Math.min(a, p.numero), Infinity)
  const dernier = s.paiements.reduce((a, p) => Math.max(a, p.numero), 0)
  const sansSuppression = sansAccents(q).includes('suppr') || sansAccents(q).includes('effac')

  return (
    <div>
      <EnTetePage
        titre="Reçus"
        sousTitre={`Série continue du ${numeroRecu(premier)} au ${numeroRecu(dernier)} · ${nombre(s.paiements.length)} reçus émis, dont ${nombre(s.paiements.filter((p) => p.statut === 'annule').length)} annulés`}
        actions={peut(role, 'encaisser') ? <Bouton icone={<Wallet className="size-4" />} onClick={() => nav('/caisse')}>Encaisser</Bouton> : undefined}
      />
      <div className="bg-white rounded-2xl border border-ligne">
        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-3 p-4 border-b border-ligne">
          <div className="col-span-2 overflow-x-auto -mx-1 px-1 md:mx-0 md:px-0">
            <Segments options={[{ id: 'jour', libelle: 'Aujourd’hui' }, { id: 'hier', libelle: 'Hier' }, { id: 'semaine', libelle: 'Cette semaine' }, { id: 'tout', libelle: 'Toute l’année' }]} valeur={periode} onChange={setPeriode} />
          </div>
          <Liste value={mode} onChange={(e) => setMode(e.target.value)} className="w-full md:w-48">
            <option value="">Tous les modes</option>
            {Object.entries(LIBELLE_MODE).filter(([k]) => s.paiements.some((p) => p.mode === k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Liste>
          <Liste value={statut} onChange={(e) => setStatut(e.target.value)} className="w-full md:w-56">
            <option value="">Tous les statuts</option>
            <option value="valide">Valides</option>
            <option value="annulation_demandee">Annulation demandée</option>
            <option value="annule">Annulés</option>
          </Liste>
          <div className="relative col-span-2 md:flex-1 md:min-w-[14rem]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
            <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="N° de reçu, famille, payeur, référence…" className="pl-9" />
          </div>
        </div>
        {sansSuppression && (
          <div className="p-4 border-b border-ligne">
            <Alerte ton="bleu" icone={<Info className="size-5" />} titre="Un reçu ne se supprime jamais">
              La série est continue et contrôlable. Pour corriger une erreur, demandez l’annulation : le reçu reste dans la série, barré, et la Direction valide.
            </Alerte>
          </div>
        )}
        <div className="flex flex-wrap gap-x-8 gap-y-1 px-4 sm:px-5 py-3 text-encre-2 border-b border-ligne-2">
          <span><b className="text-encre">{nombre(liste.length)}</b> reçus</span>
          <span>Total valide : <b className="text-vert-texte">{money(totalValide)}</b></span>
          {liste.length > affiches.length && <span>Les 200 plus récents sont affichés ; affinez la recherche.</span>}
        </div>
        {!pret ? (
          <SqueletteTableau />
        ) : liste.length === 0 ? (
          <Vide titre="Aucun reçu pour ces critères" texte="Changez la période ou le mode de paiement." />
        ) : (
          <>
          {/* téléphone et petite tablette : cartes */}
          <ul className="md:hidden divide-y divide-ligne-2">
            {affiches.map((p) => {
              const annule = p.statut === 'annule'
              return (
                <li key={p.id} data-testid="carte-recu">
                  <button onClick={() => nav(`/caisse/recu/${p.id}`)} className="w-full text-left px-4 py-3 active:bg-brume min-h-[4.5rem]">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={cx('font-semibold tabulaire', annule && 'line-through text-encre-3')}>{numeroRecu(p.numero)}</span>
                      <span className={cx('chiffre font-semibold whitespace-nowrap', annule ? 'line-through text-encre-3' : 'text-encre')}>{money(p.montant)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <span className={cx('min-w-0 truncate', annule && 'line-through text-encre-3')}>Famille {fam[p.familleId]?.nom} <span className="text-encre-2">· {LIBELLE_MODE[p.mode]}</span></span>
                      <StatutRecu statut={p.statut} />
                    </div>
                    <div className="text-sm text-encre-2 mt-0.5">{dateCourte(p.date.slice(0, 10))} · {heureFr(p.date)} · {p.payeur}</div>
                  </button>
                  {p.statut === 'valide' && peut(role, 'demanderAnnulation') && (
                    <div className="px-4 pb-3 -mt-1">
                      <Bouton variante="discret" taille="sm" className="min-h-10 -ml-3" icone={<Ban className="size-4" />} onClick={() => setAnnuler(p)}>Demander l’annulation</Bouton>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>N° de reçu</th>
                  <th>Date</th>
                  <th>Famille</th>
                  <th className="hidden lg:table-cell">Payé par</th>
                  <th>Mode</th>
                  <th className="hidden xl:table-cell">Encaissé par</th>
                  <th className="text-right">Montant</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {affiches.map((p) => {
                  const annule = p.statut === 'annule'
                  return (
                    <tr key={p.id} className="cliquable" onClick={() => nav(`/caisse/recu/${p.id}`)} data-testid="ligne-recu">
                      <td className={cx('font-semibold tabulaire whitespace-nowrap', annule && 'line-through text-encre-3')}>{numeroRecu(p.numero)}</td>
                      <td className="whitespace-nowrap">{dateCourte(p.date.slice(0, 10))} · {heureFr(p.date)}</td>
                      <td className={cx(annule && 'line-through text-encre-3')}>{fam[p.familleId]?.nom}</td>
                      <td className="text-encre-2 hidden lg:table-cell">{p.payeur}</td>
                      <td className="whitespace-nowrap">{LIBELLE_MODE[p.mode]}</td>
                      <td className="text-encre-2 whitespace-nowrap hidden xl:table-cell">{p.caissierId ? nomPersonnel(s, p.caissierId) : p.canal === 'parent' ? 'Espace parent' : 'Banque'}</td>
                      <td className={cx('text-right tabulaire whitespace-nowrap font-semibold', annule && 'line-through text-encre-3')}>{money(p.montant)}</td>
                      <td><StatutRecu statut={p.statut} /></td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        {p.statut === 'valide' && peut(role, 'demanderAnnulation') && (
                          <Bouton variante="discret" taille="sm" icone={<Ban className="size-4" />} onClick={() => setAnnuler(p)} aria-label="Demander l’annulation" title="Demander l’annulation"><span className="hidden xl:inline">Demander l’annulation</span></Bouton>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      <ModaleAnnulation paiement={annuler} onFermer={() => setAnnuler(null)} />
    </div>
  )
}
