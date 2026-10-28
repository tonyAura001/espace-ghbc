/** Remise de l'enfant à la crèche : uniquement à un adulte autorisé, carte accompagnateur vérifiée. */
import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ScanLine, ShieldCheck, OctagonAlert, UserX, CheckCircle2, Search } from 'lucide-react'
import { useStore } from '../../store'
import { ID } from '../../data/generer'
import { indexEleves, indexFamilles, crecheGroupes, carteActive, nomPersonnel } from '../../store/selecteurs'
import { Avatar, Badge, Bloc, Bouton, Champ, EnTetePage, Modale, Saisie, Segments, Vide, cx, Alerte, SqueletteTableau } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { heureFr } from '../../lib/temps'
import { sansAccents } from '../../lib/format'
import { numeroCarte } from '../cartes/CarteCR80'
import { CONFIG } from '../../config'

export default function Remise() {
  const s = useStore()
  const pret = useChargement()
  const [params, setParams] = useSearchParams()
  const groupes = crecheGroupes(s)
  const [groupe, setGroupe] = useState<string>('tous')
  const [q, setQ] = useState('')
  const [verifie, setVerifie] = useState<string | null>(null) // accompagnateurId dont la carte est vérifiée
  const [signalement, setSignalement] = useState(false)
  const [executer, enCours] = useAction()
  const [scanEnCours, setScanEnCours] = useState<string | null>(null)

  const enfants = useMemo(() => {
    const t = sansAccents(q.trim())
    return groupes
      .filter((g) => groupe === 'tous' || g.classe.id === groupe)
      .flatMap((g) => g.enfants.map((e) => ({ e, g: g.classe })))
      .filter(({ e }) => !t || sansAccents(`${e.prenom} ${e.nom}`).includes(t))
      .sort((a, b) => (a.e.id === ID.mariama ? -1 : b.e.id === ID.mariama ? 1 : a.e.prenom.localeCompare(b.e.prenom, 'fr')))
  }, [groupes, groupe, q])

  const eleveId = params.get('enfant') ?? ID.mariama
  const e = indexEleves(s.eleves)[eleveId]
  const f = e ? indexFamilles(s.familles)[e.familleId] : undefined
  const p = e ? s.presences[e.id] : undefined
  const detail = useRef<HTMLDivElement>(null)
  const choisir = (id: string) => {
    setParams({ enfant: id }, { replace: true })
    setVerifie(null)
    // écran étroit : la fiche de remise est sous la liste, on l'amène à l'écran
    if (window.innerWidth < 1024) setTimeout(() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const scanner = (accId: string) => {
    if (!f) return
    const carte = carteActive(s, 'accompagnateur', `${f.id}:${accId}`)
    setScanEnCours(accId)
    executer(() => {
      setScanEnCours(null)
      if (!carte) {
        s.journaliser('Portail', 'Carte accompagnateur absente', `${e!.prenom} ${e!.nom} · remise impossible sans carte`, e!.id)
        s.toast({ titre: 'Aucune carte active pour cet adulte', texte: 'Demandez au secrétariat d’éditer sa carte avant toute remise.', niveau: 'attention' })
        return
      }
      const sc = s.scanner(carte.jeton, 'sortie')
      if (sc.resultat === 'autorise') setVerifie(accId)
      else s.toast({ titre: 'Carte refusée', texte: sc.motif, niveau: 'alerte' })
    }, [600, 850])
  }

  const remettre = () => {
    if (!e || !verifie) return
    const a = f!.accompagnateurs.find((x) => x.id === verifie)!
    executer(() => {
      s.remettreEnfant(e.id, verifie)
      setVerifie(null)
      s.toast({ titre: `${e.prenom} ${e.sexe === 'F' ? 'est partie' : 'est parti'} avec ${a.prenom} ${a.nom}`, texte: 'Départ inscrit au journal du jour et envoyé à la famille.', niveau: 'succes' })
    })
  }

  const presents = groupes.reduce((n, g) => n + g.presents.length, 0)
  const partis = groupes.reduce((n, g) => n + g.enfants.filter((x) => s.presences[x.id]?.depart).length, 0)

  return (
    <div>
      <EnTetePage
        retour={<Link to="/creche" className="inline-flex items-center gap-1.5 text-bleu font-semibold mb-2 hover:underline"><ArrowLeft className="size-4" /> Tableau de la crèche</Link>}
        titre="Remise de l’enfant"
        sousTitre={`Un enfant n’est remis qu’à un adulte autorisé par sa famille, carte vérifiée · ${presents} enfants présents, ${partis} déjà partis`}
      />
      <div className="grid grid-cols-1 min-[64rem]:grid-cols-[minmax(17rem,22rem)_1fr] xl:grid-cols-[minmax(18rem,24rem)_1fr] gap-5 items-start">
        <Bloc sansMarge>
          <div className="p-4 space-y-3 border-b border-ligne">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
              <Saisie value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Prénom de l’enfant" className="pl-9" aria-label="Rechercher un enfant" />
            </div>
            <Segments valeur={groupe} onChange={setGroupe} options={[{ id: 'tous', libelle: 'Tous' }, ...groupes.map((g) => ({ id: g.classe.id, libelle: g.classe.nom }))]} />
          </div>
          {!pret ? <SqueletteTableau lignes={6} /> : (
            <ul className="max-h-[17rem] min-[64rem]:max-h-[calc(100dvh-18rem)] overflow-y-auto defilement">
              {enfants.map(({ e: x, g }) => {
                const pr = s.presences[x.id]
                return (
                  <li key={x.id}>
                    <button onClick={() => choisir(x.id)} className={cx('w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-ligne-2 hover:bg-brume', x.id === eleveId && 'bg-bleu-clair')}>
                      <Avatar prenom={x.prenom} nom={x.nom} taille={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold truncate">{x.prenom} {x.nom}</span>
                        <span className="block text-sm text-encre-2">{g.nom}</span>
                      </span>
                      {pr?.depart ? <Badge>Parti{x.sexe === 'F' ? 'e' : ''} {heureFr(pr.depart)}</Badge> : pr?.arrivee ? <Badge ton="vert">Présent{x.sexe === 'F' ? 'e' : ''}</Badge> : <Badge ton="ambre">Absent{x.sexe === 'F' ? 'e' : ''}</Badge>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Bloc>

        <div ref={detail} className="scroll-mt-4 min-w-0">
        {!e || !f ? (
          <Bloc><Vide titre="Choisissez un enfant" /></Bloc>
        ) : (
          <div className="space-y-5 min-w-0">
            <Bloc>
              <div className="flex flex-wrap items-center gap-5 pt-1">
                <Avatar prenom={e.prenom} nom={e.nom} taille={72} />
                <div className="min-w-0 flex-1">
                  <div className="titre text-[1.4rem] sm:text-[1.7rem]">{e.prenom} {e.nom}</div>
                  <div className="text-encre-2">
                    {p?.depart ? `${e.sexe === 'F' ? 'Partie' : 'Parti'} à ${heureFr(p.depart)} avec ${f.accompagnateurs.find((a) => a.id === p.recupereParId)?.prenom ?? ''} ${f.accompagnateurs.find((a) => a.id === p.recupereParId)?.nom ?? ''}` : p?.arrivee ? `Arrivé${e.sexe === 'F' ? 'e' : ''} à ${heureFr(p.arrivee)}` : `Absent${e.sexe === 'F' ? 'e' : ''} aujourd’hui`}
                  </div>
                  {e.sante.allergies.length > 0 && <div className="mt-1"><Badge ton="rouge">Allergie : {e.sante.allergies.join(', ').toLowerCase()}</Badge></div>}
                </div>
                <Bouton variante="danger" icone={<UserX className="size-4" />} onClick={() => setSignalement(true)} disabled={!p?.arrivee || !!p?.depart}>Adulte non autorisé</Bouton>
              </div>
            </Bloc>

            {p?.depart ? (
              <Alerte ton="vert" icone={<CheckCircle2 className="size-5" />} titre="Remise déjà effectuée">Le départ est inscrit au journal du jour et la famille l’a reçu sur son téléphone.</Alerte>
            ) : !p?.arrivee ? (
              <Alerte ton="ambre" titre="Enfant absent aujourd’hui">Aucune remise possible : l’enfant n’est pas passé au portail ce matin.</Alerte>
            ) : null}

            <Bloc titre="Adultes autorisés par la famille" sansMarge>
              <ul>
                {f.accompagnateurs.filter((a) => a.autorise).map((a) => {
                  const carte = carteActive(s, 'accompagnateur', `${f.id}:${a.id}`)
                  const ok = verifie === a.id
                  return (
                    <li key={a.id} className={cx('flex flex-wrap items-center gap-4 px-5 py-3.5 border-t border-ligne-2', ok && 'bg-vert-clair/70')}>
                      <Avatar prenom={a.prenom} nom={a.nom} taille={44} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-lg">{a.prenom} {a.nom}</div>
                        <div className="text-encre-2">{a.lien} · <span className="tabulaire">{a.tel}</span> · {carte ? `carte n° ${numeroCarte(carte)}` : 'pas de carte active'}</div>
                      </div>
                      {ok ? (
                        <>
                          <Badge ton="vert" point>Carte vérifiée</Badge>
                          <Bouton variante="succes" taille="lg" icone={<ShieldCheck className="size-5" />} onClick={remettre} chargement={enCours} data-testid="valider-remise">Remettre {e.prenom}</Bouton>
                        </>
                      ) : (
                        <Bouton variante="secondaire" icone={<ScanLine className="size-4" />} onClick={() => scanner(a.id)} chargement={scanEnCours === a.id} disabled={!p?.arrivee || !!p?.depart || enCours}>Scanner sa carte</Bouton>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Bloc>

            <Historique familleNom={f.nom} eleveId={e.id} />
          </div>
        )}
        </div>
      </div>
      {e && <ModaleSignalement ouvert={signalement} onFermer={() => setSignalement(false)} eleveId={e.id} />}
    </div>
  )
}

function Historique({ eleveId, familleNom }: { eleveId: string; familleNom: string }) {
  const s = useStore()
  const scans = s.scans.filter((x) => x.eleveId === eleveId).slice(-6).reverse()
  return (
    <Bloc titre={`Passages du jour · famille ${familleNom}`} sansMarge>
      {scans.length === 0 ? <Vide titre="Aucun passage aujourd’hui" /> : (
        <table className="tableau">
          <thead><tr><th>Heure</th><th>Lieu</th><th>Détail</th><th>Résultat</th></tr></thead>
          <tbody>
            {scans.map((sc) => (
              <tr key={sc.id}>
                <td className="tabulaire">{heureFr(sc.date)}</td>
                <td>{sc.lieu}</td>
                <td className="text-encre-2">{sc.motif}</td>
                <td>{sc.resultat === 'autorise' ? <Badge ton="vert">Autorisé</Badge> : <Badge ton="rouge">{sc.resultat === 'alerte' ? 'Alerte' : 'Refusé'}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Bloc>
  )
}

function ModaleSignalement({ ouvert, onFermer, eleveId }: { ouvert: boolean; onFermer: () => void; eleveId: string }) {
  const s = useStore()
  const e = indexEleves(s.eleves)[eleveId]
  const [personne, setPersonne] = useState(CONFIG.PAYS === 'Sénégal' ? 'Ousmane Sarr' : 'Ousmane Barry')
  const [lien, setLien] = useState('se dit cousin')
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const valider = () => {
    if (!personne.trim()) return setErreur('Indiquez le nom donné par la personne.')
    executer(() => {
      s.refuserSortie(eleveId, personne.trim(), lien.trim() || 'lien non précisé')
      s.toast({ titre: `Sortie refusée · ${e.prenom} reste à la crèche`, texte: 'La Direction et la famille sont prévenues ; l’incident est au journal.', niveau: 'alerte' })
      onFermer()
    })
  }
  return (
    <Modale
      ouvert={ouvert}
      onFermer={onFermer}
      titre={`Adulte non autorisé pour ${e?.prenom ?? ''}`}
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton onClick={valider} chargement={enCours} icone={<OctagonAlert className="size-4" />} className="bg-rouge! hover:bg-[#a51f25]!">Refuser la sortie et alerter</Bouton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="Nom donné" erreur={erreur}><Saisie value={personne} onChange={(ev) => { setPersonne(ev.target.value); setErreur(null) }} /></Champ>
        <Champ libelle="Lien déclaré"><Saisie value={lien} onChange={(ev) => setLien(ev.target.value)} /></Champ>
      </div>
      <p className="text-encre-2 mt-3">L’enfant reste avec {nomPersonnel(s, s.adultesCreche[e?.classeId ?? '']?.[0])}. La famille reçoit une alerte immédiate sur son téléphone.</p>
    </Modale>
  )
}
