/** Studio des cartes : recto / verso CR80, recherche d'un titulaire, remplacement, historique des passages. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Printer, Plus, Check, Ban, History, RefreshCw } from 'lucide-react'
import { useStore } from '../../store'
import type { Carte } from '../../data/types'
import { Badge, Bloc, Bouton, Champ, EnTetePage, Liste, Modale, Saisie, Segments, Vide, cx, Avatar, Ligne, SqueletteTableau, Alerte } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { CarteRecto, CarteVerso, infoCarte, numeroCarte, usePlanche, LIBELLE_TYPE_CARTE } from './CarteCR80'
import { sansAccents, nombre } from '../../lib/format'
import { dateCourte, heureFr, relatif } from '../../lib/temps'

type Filtre = 'tous' | 'eleve' | 'accompagnateur' | 'personnel' | 'a_imprimer'

const MOTIFS = ['Carte perdue', 'Carte volée', 'Carte abîmée', 'Erreur sur la carte']

export default function StudioCartes() {
  const s = useStore()
  const pret = useChargement()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const planche = usePlanche()
  const [modale, setModale] = useState(false)

  const cartes = s.cartes
  const aImprimer = useMemo(() => cartes.filter((c) => c.statut === 'active' && !c.imprimee), [cartes])
  const actives = useMemo(() => cartes.filter((c) => c.statut === 'active').length, [cartes])

  const liste = useMemo(() => {
    const t = sansAccents(q.trim())
    const res: { c: Carte; nom: string; detail: string; prenom: string; nomF: string }[] = []
    // les cartes récentes (non imprimées, remplacements) en premier
    const tri = [...cartes].sort((a, b) => Number(a.imprimee) - Number(b.imprimee) || b.emiseLe.localeCompare(a.emiseLe))
    for (const c of tri) {
      if (filtre === 'a_imprimer' ? !(c.statut === 'active' && !c.imprimee) : filtre !== 'tous' && c.type !== filtre) continue
      const i = infoCarte(s, c)
      const nom = `${i.prenom} ${i.nom}`
      if (t && !sansAccents(`${nom} ${i.ligne1} ${i.ligne2} ${numeroCarte(c)}`).includes(t)) continue
      res.push({ c, nom, detail: i.ligne1, prenom: i.prenom, nomF: i.nom })
      if (res.length >= 60) break
    }
    return res
  }, [cartes, q, filtre, s])

  const idSel = params.get('carte') ?? liste[0]?.c.id
  const carte = cartes.find((c) => c.id === idSel) ?? liste[0]?.c
  const detail = useRef<HTMLDivElement>(null)
  const choisir = (id: string) => {
    setParams({ carte: id }, { replace: true })
    // écran étroit : la carte choisie s'affiche sous la liste, on la fait venir à l'écran
    if (window.innerWidth < 1024) setTimeout(() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  return (
    <div>
      <EnTetePage
        titre="Cartes"
        sousTitre={`${nombre(actives)} cartes actives · ${nombre(aImprimer.length)} en attente d’impression`}
        actions={
          <Link to="/cartes/planche">
            <Bouton icone={<Printer className="size-4" />}>Planche d’impression{planche.ids.length ? ` (${planche.ids.length})` : ''}</Bouton>
          </Link>
        }
      />
      <div className="grid grid-cols-1 min-[64rem]:grid-cols-[minmax(17rem,22rem)_1fr] xl:grid-cols-[minmax(19rem,24rem)_1fr] gap-5 items-start">
        <Bloc sansMarge className="overflow-hidden">
          <div className="p-4 space-y-3 border-b border-ligne">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
              <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, classe, n° de carte…" className="pl-9" aria-label="Rechercher une carte" />
            </div>
            <Segments
              valeur={filtre}
              onChange={setFiltre}
              className="flex-wrap"
              options={[
                { id: 'tous', libelle: 'Toutes' },
                { id: 'eleve', libelle: 'Élèves' },
                { id: 'accompagnateur', libelle: 'Accompagnateurs' },
                { id: 'personnel', libelle: 'Personnel' },
                { id: 'a_imprimer', libelle: `À imprimer (${aImprimer.length})` },
              ]}
            />
          </div>
          {!pret ? (
            <SqueletteTableau lignes={7} />
          ) : (
            <ul className="max-h-[17rem] min-[64rem]:max-h-[calc(100dvh-19rem)] overflow-y-auto defilement">
              {liste.length === 0 && <li><Vide titre="Aucune carte trouvée" texte="Vérifiez l’orthographe ou changez de filtre." /></li>}
              {liste.map(({ c, nom, detail, prenom, nomF }) => (
                <li key={c.id}>
                  <button onClick={() => choisir(c.id)} className={cx('w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-ligne-2 hover:bg-brume', carte?.id === c.id && 'bg-bleu-clair')}>
                    <Avatar prenom={prenom} nom={nomF} taille={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold truncate">{nom}</span>
                      <span className="block text-sm text-encre-2 truncate">{LIBELLE_TYPE_CARTE[c.type]} · {detail}</span>
                    </span>
                    {c.statut !== 'active' ? <Badge ton="rouge">Désactivée</Badge> : !c.imprimee ? <Badge ton="ambre">À imprimer</Badge> : planche.ids.includes(c.id) ? <Badge ton="bleu">Planche</Badge> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Bloc>

        <div ref={detail} className="scroll-mt-4 min-w-0">
          {carte ? <DetailCarte carte={carte} onRemplacer={() => setModale(true)} onChoisir={choisir} /> : <Bloc><Vide titre="Choisissez une carte" /></Bloc>}
        </div>
      </div>
      {carte && <ModaleRemplacement ouvert={modale} carte={carte} onFermer={() => setModale(false)} onRemplacee={(id) => { setModale(false); choisir(id) }} />}
    </div>
  )
}

function DetailCarte({ carte, onRemplacer, onChoisir }: { carte: Carte; onRemplacer: () => void; onChoisir: (id: string) => void }) {
  const s = useStore()
  const planche = usePlanche()
  const info = infoCarte(s, carte)
  const dans = planche.ids.includes(carte.id)
  const scans = useMemo(() => s.scans.filter((x) => x.carteId === carte.id).slice(-12).reverse(), [s.scans, carte.id])
  const ancienne = carte.remplaceId ? s.cartes.find((c) => c.id === carte.remplaceId) : undefined
  const remplacante = s.cartes.find((c) => c.remplaceId === carte.id)
  const [executer, enCours] = useAction()
  // la carte garde ses proportions CR80 et se réduit pour tenir dans la largeur disponible
  const zoneCartes = useRef<HTMLDivElement>(null)
  const [largeur, setLargeur] = useState(900)
  useEffect(() => {
    const el = zoneCartes.current
    if (!el) return
    const ro = new ResizeObserver(() => setLargeur(el.clientWidth))
    ro.observe(el)
    setLargeur(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const echelle = Math.min(1.32, (largeur - 4) / (85.6 * 3.7795))

  const basculer = () =>
    executer(() => {
      if (dans) planche.retirer(carte.id)
      else planche.ajouter(carte.id)
      s.toast({ titre: dans ? 'Carte retirée de la planche' : 'Carte ajoutée à la planche', texte: `${info.prenom} ${info.nom}`, niveau: 'succes' })
    }, [250, 400])

  return (
    <div className="space-y-5 min-w-0">
      <Bloc
        titre={<span className="flex items-center gap-3">{info.prenom} {info.nom} {carte.statut === 'active' ? <Badge ton="vert" point>Active</Badge> : <Badge ton="rouge" point>Désactivée</Badge>}</span>}
        actions={<span className="text-encre-2 text-sm tabulaire">N° {info.numero}</span>}
      >
        {carte.statut !== 'active' && (
          <div className="mb-4">
            <Alerte ton="rouge" icone={<Ban className="size-5" />} titre="Cette carte est désactivée et refusée au portail" action={remplacante && <Bouton taille="sm" variante="secondaire" onClick={() => onChoisir(remplacante.id)}>Voir la nouvelle carte</Bouton>}>
              {carte.motifDesactivation}
            </Alerte>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pb-4 mb-2 border-b border-ligne-2">
          <Bouton onClick={basculer} chargement={enCours} variante={dans ? 'secondaire' : 'principal'} icone={dans ? <Check className="size-4" /> : <Plus className="size-4" />} disabled={carte.statut !== 'active'}>
            {dans ? 'Sur la planche' : 'Ajouter à la planche'}
          </Bouton>
          <Link to={`/cartes/planche?ajout=${carte.id}`}>
            <Bouton variante="secondaire" icone={<Printer className="size-4" />} disabled={carte.statut !== 'active'}>Imprimer maintenant</Bouton>
          </Link>
          <Bouton variante="danger" icone={<RefreshCw className="size-4" />} onClick={onRemplacer} disabled={carte.statut !== 'active'}>Désactiver et remplacer</Bouton>
        </div>
        <div ref={zoneCartes} className="flex flex-wrap gap-6 justify-center xl:justify-start py-2">
          <figure>
            <CarteRecto s={s} carte={carte} echelle={echelle} ombre />
            <figcaption className="text-sm text-encre-2 mt-2 text-center">Recto</figcaption>
          </figure>
          <figure>
            <CarteVerso s={s} carte={carte} echelle={echelle} ombre />
            <figcaption className="text-sm text-encre-2 mt-2 text-center">Verso</figcaption>
          </figure>
        </div>
      </Bloc>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
        <Bloc titre="Informations">
          <Ligne libelle="Type">{LIBELLE_TYPE_CARTE[carte.type]}</Ligne>
          <Ligne libelle={carte.type === 'eleve' ? 'Classe' : carte.type === 'personnel' ? 'Fonction' : 'Lien'}>{info.ligne1}</Ligne>
          {info.ligne2 && <Ligne libelle={carte.type === 'eleve' ? 'Matricule' : 'Téléphone'}><span className="tabulaire">{info.ligne2.replace('Matricule ', '')}</span></Ligne>}
          {info.enfants.length > 0 && <Ligne libelle="Peut récupérer">{info.enfants.join(', ')}</Ligne>}
          <Ligne libelle="Émise le">{dateCourte(carte.emiseLe)}</Ligne>
          <Ligne libelle="Impression">{carte.imprimee ? 'Imprimée' : 'En attente d’impression'}</Ligne>
          {ancienne && (
            <Ligne libelle="Remplace">
              <button className="text-bleu font-semibold hover:underline" onClick={() => onChoisir(ancienne.id)}>N° {numeroCarte(ancienne)}</button>
              <span className="text-encre-2"> · {ancienne.motifDesactivation}</span>
            </Ligne>
          )}
          <p className="text-sm text-encre-2 mt-3">Le QR code ne contient qu’un jeton de vérification : aucune donnée personnelle n’y est lisible en clair.</p>
        </Bloc>
        <Bloc titre={<span className="flex items-center gap-2"><History className="size-[1.1rem] text-encre-3" /> Passages au portail</span>} sansMarge>
          {scans.length === 0 ? (
            <Vide titre="Aucun passage enregistré" texte="Chaque scan de cette carte apparaîtra ici." />
          ) : (
            <table className="tableau">
              <thead>
                <tr><th>Date</th><th>Lieu</th><th>Résultat</th></tr>
              </thead>
              <tbody>
                {scans.map((sc) => (
                  <tr key={sc.id}>
                    <td className="whitespace-nowrap">{relatif(sc.date)}</td>
                    <td>{sc.lieu} · {sc.sens === 'entree' ? 'entrée' : 'sortie'}</td>
                    <td>{sc.resultat === 'autorise' ? <Badge ton="vert">Autorisé</Badge> : <Badge ton="rouge">Refusé</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Bloc>
      </div>
    </div>
  )
}

function ModaleRemplacement({ ouvert, carte, onFermer, onRemplacee }: { ouvert: boolean; carte: Carte; onFermer: () => void; onRemplacee: (id: string) => void }) {
  const s = useStore()
  const [motif, setMotif] = useState('')
  const [precision, setPrecision] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const info = infoCarte(s, carte)
  const valider = () => {
    if (!motif) return setErreur('Choisissez un motif : la désactivation est tracée dans le journal d’audit.')
    executer(() => {
      const nouvelle = s.desactiverCarte(carte.id, precision ? `${motif} · ${precision}` : motif)
      usePlanche.getState().ajouter(nouvelle.id)
      s.toast({ titre: 'Carte désactivée et remplacée', texte: `L’ancienne carte est refusée au portail dès maintenant. La nouvelle (n° ${numeroCarte(nouvelle)}) est sur la planche d’impression.`, niveau: 'succes' })
      setMotif('')
      setPrecision('')
      onRemplacee(nouvelle.id)
    })
  }
  return (
    <Modale
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Désactiver et remplacer la carte"
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton variante="danger" onClick={valider} chargement={enCours} icone={<Ban className="size-4" />} className="bg-rouge! text-white! border-rouge! hover:bg-[#a51f25]!">Désactiver et remplacer</Bouton>
        </>
      }
    >
      <p className="text-encre-2">
        La carte n° {info.numero} de <b className="text-encre">{info.prenom} {info.nom}</b> sera refusée au portail immédiatement. Une nouvelle carte, avec un nouveau jeton, est créée et ajoutée à la planche d’impression.
      </p>
      <div className="mt-4 space-y-3">
        <Champ libelle="Motif" erreur={erreur}>
          <Liste value={motif} onChange={(e) => { setMotif(e.target.value); setErreur(null) }}>
            <option value="">Choisir un motif…</option>
            {MOTIFS.map((m) => <option key={m}>{m}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Précision (facultatif)">
          <Saisie value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder="Ex. déclarée par la mère le matin même" />
        </Champ>
      </div>
      <p className="text-sm text-encre-3 mt-3">Dernier passage : {(() => { const d = s.scans.filter((x) => x.carteId === carte.id).at(-1); return d ? `${relatif(d.date)} (${heureFr(d.date)})` : 'aucun' })()}</p>
    </Modale>
  )
}
