/** Dépenses : liste, ajout avec pièce jointe (simulée), totaux par catégorie. */
import { useMemo, useRef, useState } from 'react'
import { Plus, Paperclip, FileText, Search } from 'lucide-react'
import { useStore } from '../../store'
import { profilParId, peut } from '../../store/profils'
import { nomPersonnel } from '../../store/selecteurs'
import { CATEGORIES_DEPENSES, CYCLES, NOM_CYCLE } from '../../data/referentiel'
import type { Cycle } from '../../data/types'
import { Badge, Bouton, Champ, EnTetePage, Liste, Panneau, Saisie, SqueletteTableau, Vide, PastilleCycle, Indicateur } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { money, moneyCompact, nombre, sansAccents } from '../../lib/format'
import { JOUR_DEMO, dateCourte } from '../../lib/temps'

export default function Depenses() {
  const s = useStore()
  const pret = useChargement()
  const role = profilParId(s.session.profilId).role
  const [cat, setCat] = useState('')
  const [mois, setMois] = useState('')
  const [q, setQ] = useState('')
  const [ajout, setAjout] = useState(false)
  const moisDispo = useMemo(() => [...new Set(s.depenses.map((d) => d.date.slice(0, 7)))].sort().reverse(), [s.depenses])
  const liste = useMemo(() => {
    const t = sansAccents(q)
    return [...s.depenses]
      .filter((d) => (!cat || d.categorie === cat) && (!mois || d.date.startsWith(mois)) && (!t || sansAccents(`${d.libelle} ${d.fournisseur}`).includes(t)))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [s.depenses, cat, mois, q])
  const total = liste.reduce((a, d) => a + d.montant, 0)
  const sansPiece = s.depenses.filter((d) => !d.piece).length
  const moisCourant = s.depenses.filter((d) => d.date.startsWith(JOUR_DEMO.slice(0, 7))).reduce((a, d) => a + d.montant, 0)

  return (
    <div>
      <EnTetePage titre="Dépenses" sousTitre="Chaque dépense porte sa pièce justificative et le nom de la personne qui l’a saisie." actions={peut(role, 'depenses') ? <Bouton icone={<Plus className="size-4" />} onClick={() => setAjout(true)}>Enregistrer une dépense</Bouton> : undefined} />
      <section className="rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 md:grid-cols-3 mb-5 [&>*]:bg-white [&>*]:p-4 sm:[&>*]:p-5 [&_.chiffre]:max-sm:text-[1.5rem]">
        <div><Indicateur libelle="Ce mois-ci" valeur={moneyCompact(moisCourant)} /></div>
        <div><Indicateur libelle="Sélection affichée" valeur={moneyCompact(total)} detail={`${nombre(liste.length)} dépenses`} /></div>
        <div className="max-md:col-span-2"><Indicateur libelle="Sans pièce justificative" valeur={<span className={sansPiece ? 'text-ambre' : 'text-vert-texte'}>{nombre(sansPiece)}</span>} detail="À régulariser auprès du comptable" /></div>
      </section>
      <div className="bg-white rounded-2xl border border-ligne">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 p-4 border-b border-ligne">
          <Liste value={cat} onChange={(e) => setCat(e.target.value)} className="w-full lg:w-64"><option value="">Toutes les catégories</option>{CATEGORIES_DEPENSES.map((c) => <option key={c}>{c}</option>)}</Liste>
          <Liste value={mois} onChange={(e) => setMois(e.target.value)} className="w-full lg:w-48"><option value="">Tous les mois</option>{moisDispo.map((m) => <option key={m} value={m}>{new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</option>)}</Liste>
          <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[12rem]"><Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" /><Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Libellé ou fournisseur" className="pl-9" /></div>
        </div>
        {!pret ? <SqueletteTableau /> : liste.length === 0 ? <Vide titre="Aucune dépense pour ces critères" /> : (
          <>
          <ul className="md:hidden divide-y divide-ligne-2">
            {liste.slice(0, 200).map((d) => (
              <li key={d.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold min-w-0">{d.libelle}</span>
                  <span className="chiffre font-semibold whitespace-nowrap">{money(d.montant)}</span>
                </div>
                <div className="text-sm text-encre-2 mt-0.5">{dateCourte(d.date)} · {d.categorie} · {d.fournisseur}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
                  {d.cycle ? <PastilleCycle cycle={d.cycle} /> : <span className="text-encre-3">Commun</span>}
                  {d.piece ? <span className="inline-flex items-center gap-1 text-bleu min-w-0"><FileText className="size-4 shrink-0" /><span className="truncate">{d.piece}</span></span> : <Badge ton="ambre">Pièce manquante</Badge>}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="tableau">
              <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th className="hidden xl:table-cell">Cycle</th><th className="hidden lg:table-cell">Fournisseur</th><th>Pièce</th><th className="hidden xl:table-cell">Saisie par</th><th className="text-right">Montant</th></tr></thead>
              <tbody>
                {liste.slice(0, 200).map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap">{dateCourte(d.date)}</td>
                    <td>{d.libelle}</td>
                    <td className="text-encre-2">{d.categorie}</td>
                    <td className="hidden xl:table-cell">{d.cycle ? <PastilleCycle cycle={d.cycle} /> : <span className="text-encre-3">Commun</span>}</td>
                    <td className="text-encre-2 hidden lg:table-cell">{d.fournisseur}</td>
                    <td>{d.piece ? <span className="inline-flex items-center gap-1 text-bleu text-sm"><FileText className="size-4" />{d.piece}</span> : <Badge ton="ambre">Manquante</Badge>}</td>
                    <td className="text-encre-2 whitespace-nowrap hidden xl:table-cell">{nomPersonnel(s, d.saisiPar)}</td>
                    <td className="text-right tabulaire font-semibold whitespace-nowrap">{money(d.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      <PanneauAjout ouvert={ajout} onFermer={() => setAjout(false)} />
    </div>
  )
}

function PanneauAjout({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const ajouter = useStore((s) => s.ajouterDepense)
  const toast = useStore((s) => s.toast)
  const [executer, enCours] = useAction()
  const [libelle, setLibelle] = useState('')
  const [montant, setMontant] = useState('')
  const [categorie, setCategorie] = useState<string>(CATEGORIES_DEPENSES[1])
  const [cycle, setCycle] = useState<string>('')
  const [fournisseur, setFournisseur] = useState('')
  const [date, setDate] = useState(JOUR_DEMO)
  const [piece, setPiece] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const fichier = useRef<HTMLInputElement>(null)
  const go = async () => {
    const m = Number(montant.replace(/\D/g, ''))
    if (libelle.trim().length < 3) return setErreur('Décrivez la dépense en quelques mots.')
    if (!m) return setErreur('Indiquez le montant payé.')
    if (!fournisseur.trim()) return setErreur('Indiquez le fournisseur ou le bénéficiaire.')
    await executer(() => ajouter({ date, categorie, libelle: libelle.trim(), montant: m, cycle: (cycle || null) as Cycle | null, fournisseur: fournisseur.trim(), piece }))
    toast({ titre: 'Dépense enregistrée', texte: `${libelle.trim()} · ${money(m)}`, niveau: 'succes' })
    setLibelle(''); setMontant(''); setFournisseur(''); setPiece(null); setErreur(null)
    onFermer()
  }
  return (
    <Panneau ouvert={ouvert} onFermer={onFermer} titre="Enregistrer une dépense" pied={<><Bouton variante="discret" onClick={onFermer}>Annuler</Bouton><Bouton onClick={go} chargement={enCours}>Enregistrer la dépense</Bouton></>}>
      <div className="space-y-4">
        <Champ libelle="Libellé"><Saisie value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex. : achat de craies et de cahiers" autoFocus /></Champ>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Champ libelle="Montant"><Saisie inputMode="numeric" value={montant} onChange={(e) => { const b = e.target.value.replace(/\D/g, ''); setMontant(b ? nombre(Number(b)) : '') }} className="tabulaire" /></Champ>
          <Champ libelle="Date"><Saisie type="date" value={date} max={JOUR_DEMO} onChange={(e) => setDate(e.target.value)} /></Champ>
        </div>
        <Champ libelle="Catégorie"><Liste value={categorie} onChange={(e) => setCategorie(e.target.value)}>{CATEGORIES_DEPENSES.map((c) => <option key={c}>{c}</option>)}</Liste></Champ>
        <Champ libelle="Cycle concerné" aide="Laissez « Commun à toute l’école » pour une charge partagée."><Liste value={cycle} onChange={(e) => setCycle(e.target.value)}><option value="">Commun à toute l’école</option>{CYCLES.map((c) => <option key={c} value={c}>{NOM_CYCLE[c]}</option>)}</Liste></Champ>
        <Champ libelle="Fournisseur ou bénéficiaire"><Saisie value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} placeholder="Ex. : Librairie Universelle" /></Champ>
        <div>
          <span className="text-sm font-semibold text-encre-2">Pièce justificative</span>
          <input ref={fichier} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setPiece(e.target.files?.[0]?.name ?? null)} />
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <Bouton variante="secondaire" icone={<Paperclip className="size-4" />} onClick={() => fichier.current?.click()}>Joindre la facture</Bouton>
            {!piece && <Bouton variante="discret" onClick={() => setPiece(`facture-${Math.floor(1000 + Math.random() * 9000)}.jpg`)}>Prendre en photo</Bouton>}
            {piece && <span className="inline-flex items-center gap-1.5 text-bleu"><FileText className="size-4" /> {piece}</span>}
          </div>
        </div>
        {erreur && <p className="text-rouge text-sm">{erreur}</p>}
      </div>
    </Panneau>
  )
}
