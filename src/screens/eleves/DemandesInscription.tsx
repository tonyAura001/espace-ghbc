/** Suivi des demandes d'inscription (en ligne et au guichet). */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Globe, Store, Phone, UserPlus, ExternalLink } from 'lucide-react'
import { useStore } from '../../store'
import type { DemandeInscription } from '../../data/types'
import { NOM_CYCLE } from '../../data/referentiel'
import { Badge, Bloc, Bouton, EnTetePage, Liste, Onglets, PastilleCycle, Panneau, Ligne, SqueletteTableau, Vide, Zone, type Ton } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { ageLisible, dateCourte, relatif as relatifBrut, maintenant } from '../../lib/temps'

/** Une demande ne peut pas être datée après l'instant de la démo. */
const relatif = (iso: string) => relatifBrut(iso > maintenant() ? maintenant() : iso)
import { nombre } from '../../lib/format'

type Statut = DemandeInscription['statut']
const LIBELLE: Record<Statut, string> = {
  nouvelle: 'Nouvelle',
  entretien: 'Entretien prévu',
  acceptee: 'Acceptée',
  liste_attente: 'Liste d’attente',
  refusee: 'Refusée',
  inscrit: 'Inscrit',
}
const TON: Record<Statut, Ton> = { nouvelle: 'bleu', entretien: 'ambre', acceptee: 'vert', liste_attente: 'neutre', refusee: 'rouge', inscrit: 'vert' }

export default function DemandesInscription() {
  const demandes = useStore((s) => s.demandesInscription)
  const majDemande = useStore((s) => s.majDemande)
  const toast = useStore((s) => s.toast)
  const nav = useNavigate()
  const pret = useChargement(380)
  const [filtre, setFiltre] = useState<'actives' | Statut | 'toutes'>('actives')
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [executer, enCours] = useAction()

  const compte = (st: Statut) => demandes.filter((d) => d.statut === st).length
  const liste = useMemo(
    () => demandes.filter((d) => (filtre === 'toutes' ? true : filtre === 'actives' ? ['nouvelle', 'entretien', 'acceptee'].includes(d.statut) : d.statut === filtre)),
    [demandes, filtre],
  )
  const d = demandes.find((x) => x.id === ouverte)
  const [statut, setStatut] = useState<Statut>('entretien')
  const [noteTexte, setNoteTexte] = useState('')

  const ouvrir = (x: DemandeInscription) => {
    setOuverte(x.id)
    setStatut(x.statut === 'nouvelle' ? 'entretien' : x.statut)
    setNoteTexte(x.note)
  }

  return (
    <div>
      <EnTetePage
        titre="Demandes d’inscription"
        sousTitre={`${nombre(compte('nouvelle'))} nouvelle${compte('nouvelle') > 1 ? 's' : ''} demande${compte('nouvelle') > 1 ? 's' : ''} à traiter · formulaire en ligne ouvert aux familles`}
        actions={
          <>
            <Bouton variante="secondaire" icone={<ExternalLink className="size-4" />} onClick={() => window.open(`${window.location.href.split('#')[0]}#/preinscription`, '_blank')}>Voir le formulaire public</Bouton>
            <Bouton icone={<UserPlus className="size-4" />} onClick={() => nav('/inscription')}>Inscrire au guichet</Bouton>
          </>
        }
      />
      <Onglets
        className="mb-4"
        actif={filtre}
        onChange={setFiltre}
        onglets={[
          { id: 'actives', libelle: 'À traiter', compte: compte('nouvelle') + compte('entretien') + compte('acceptee') },
          { id: 'nouvelle', libelle: 'Nouvelles', compte: compte('nouvelle') },
          { id: 'entretien', libelle: 'Entretiens', compte: compte('entretien') },
          { id: 'acceptee', libelle: 'Acceptées', compte: compte('acceptee') },
          { id: 'liste_attente', libelle: 'Liste d’attente', compte: compte('liste_attente') },
          { id: 'inscrit', libelle: 'Inscrits', compte: compte('inscrit') },
          { id: 'toutes', libelle: 'Toutes', compte: demandes.length },
        ]}
      />
      <Bloc sansMarge>
        {!pret ? <SqueletteTableau lignes={6} /> : liste.length === 0 ? (
          <Vide icone={<Inbox className="size-8" />} titre="Aucune demande dans cette liste" texte="Les demandes envoyées depuis le formulaire en ligne arrivent ici, avec une notification." />
        ) : (
          <>
          <ul className="lg:hidden grid sm:grid-cols-2 divide-y sm:divide-y-0 divide-ligne-2 sm:gap-px sm:bg-ligne-2 [&>li]:bg-white">
            {liste.map((x) => (
              <li key={x.id}>
                <button onClick={() => ouvrir(x)} className="w-full text-left px-4 py-3.5 active:bg-brume">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold">{x.enfantPrenom} {x.enfantNom}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-sm text-encre-2 mt-0.5">
                        <PastilleCycle cycle={x.cycle} libelle={x.niveauSouhaite} />
                        <span>· {ageLisible(x.naissance)}</span>
                      </span>
                    </span>
                    <Badge ton={TON[x.statut]}>{LIBELLE[x.statut]}</Badge>
                  </span>
                  <span className="block text-sm text-encre-2 mt-1">{x.parentNom} · <span className="tabulaire">{x.parentTel}</span></span>
                  <span className="flex items-center gap-1.5 text-sm text-encre-3 mt-0.5">
                    {x.source === 'en_ligne' ? <Globe className="size-3.5" /> : <Store className="size-3.5" />}{x.id} · {relatif(x.date)}
                  </span>
                  {x.note && <span className="block text-xs text-encre-2 mt-0.5">{x.note}</span>}
                </button>
                {x.statut === 'acceptee' && (
                  <div className="px-4 pb-3 -mt-1">
                    <Bouton taille="sm" className="w-full" onClick={() => nav(`/inscription?demande=${x.id}`)}>Inscrire</Bouton>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="hidden lg:block overflow-x-auto">
            <table className="tableau">
              <thead><tr><th>Dossier</th><th>Enfant</th><th>Niveau souhaité</th><th>Parent</th><th>Reçue</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {liste.map((x) => (
                  <tr key={x.id} className="cliquable" onClick={() => ouvrir(x)}>
                    <td className="tabulaire text-encre-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">{x.source === 'en_ligne' ? <Globe className="size-4" /> : <Store className="size-4" />}{x.id}</span>
                    </td>
                    <td><span className="font-semibold">{x.enfantPrenom} {x.enfantNom}</span><span className="block text-sm text-encre-2">{ageLisible(x.naissance)}</span></td>
                    <td><PastilleCycle cycle={x.cycle} libelle={x.niveauSouhaite} /></td>
                    <td><span className="block">{x.parentNom}</span><span className="text-sm text-encre-2 tabulaire">{x.parentTel}</span></td>
                    <td className="whitespace-nowrap">{relatif(x.date)}</td>
                    <td><Badge ton={TON[x.statut]}>{LIBELLE[x.statut]}</Badge>{x.note && <span className="block text-xs text-encre-2 mt-0.5">{x.note}</span>}</td>
                    <td className="text-right">
                      {x.statut === 'acceptee' && <Bouton taille="sm" onClick={(e) => { e.stopPropagation(); nav(`/inscription?demande=${x.id}`) }}>Inscrire</Bouton>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Bloc>

      <Panneau
        ouvert={!!d}
        onFermer={() => setOuverte(null)}
        titre={d ? `${d.enfantPrenom} ${d.enfantNom}` : ''}
        sousTitre={d ? `Dossier ${d.id} · ${d.source === 'en_ligne' ? 'demande en ligne' : 'demande au guichet'}` : ''}
        pied={
          d && d.statut !== 'inscrit' ? (
            <>
              {(d.statut === 'acceptee' || statut === 'acceptee') && <Bouton variante="secondaire" onClick={() => nav(`/inscription?demande=${d.id}`)}>Inscrire maintenant</Bouton>}
              <Bouton
                chargement={enCours}
                onClick={() => executer(() => {
                  majDemande(d.id, statut, noteTexte)
                  toast({ titre: 'Demande mise à jour', texte: `${d.enfantPrenom} ${d.enfantNom} · ${LIBELLE[statut]}`, niveau: 'succes' })
                  setOuverte(null)
                })}
              >
                Enregistrer
              </Bouton>
            </>
          ) : undefined
        }
      >
        {d && (
          <div className="space-y-5">
            <div>
              <Ligne libelle="Date de naissance">{dateCourte(d.naissance)} · {ageLisible(d.naissance)}</Ligne>
              <Ligne libelle="Niveau souhaité"><PastilleCycle cycle={d.cycle} libelle={`${d.niveauSouhaite} · ${NOM_CYCLE[d.cycle]}`} /></Ligne>
              <Ligne libelle="École actuelle">{d.ecoleActuelle}</Ligne>
              <Ligne libelle="Parent">{d.parentNom}</Ligne>
              <Ligne libelle="Téléphone"><span className="inline-flex items-center gap-1.5 tabulaire"><Phone className="size-4 text-encre-3" />{d.parentTel}</span></Ligne>
              <Ligne libelle="Quartier">{d.quartier}</Ligne>
              <Ligne libelle="Reçue">{relatif(d.date)}</Ligne>
            </div>
            {d.statut === 'inscrit' ? (
              <Badge ton="vert" point>Enfant inscrit : dossier clos</Badge>
            ) : (
              <>
                <label className="block">
                  <span className="text-sm font-semibold text-encre-2">Statut</span>
                  <Liste value={statut} onChange={(e) => setStatut(e.target.value as Statut)} className="mt-1.5">
                    {(['nouvelle', 'entretien', 'acceptee', 'liste_attente', 'refusee'] as Statut[]).map((x) => <option key={x} value={x}>{LIBELLE[x]}</option>)}
                  </Liste>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-encre-2">Note interne</span>
                  <Zone value={noteTexte} onChange={(e) => setNoteTexte(e.target.value)} className="mt-1.5" placeholder="Ex. entretien jeudi à 15 h avec la maman" />
                </label>
                <p className="text-sm text-encre-2">Chaque changement de statut est inscrit au journal d’audit.</p>
              </>
            )}
          </div>
        )}
      </Panneau>
    </div>
  )
}
