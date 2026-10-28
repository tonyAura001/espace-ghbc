/** Double validation : annulations de reçus, remises exceptionnelles. « Le système alerte, la Direction décide. » */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Check, X, Receipt, Percent, ExternalLink } from 'lucide-react'
import { useStore } from '../../store'
import type { DemandeValidation } from '../../data/types'
import { profilParId, peut } from '../../store/profils'
import { nomPersonnel, indexFamilles, ventilationEncaisse, indexEleves, situationFamille, enfantsParFamille } from '../../store/selecteurs'
import { LIBELLE_MODE } from '../../data/referentiel'
import { Badge, Bloc, Bouton, EnTetePage, Vide, Alerte, SqueletteTableau, Ligne } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { money, numeroRecu } from '../../lib/format'
import { dateHeure, relatif } from '../../lib/temps'
import { NOM_DIRECTION } from '../../config'

const LIB_TYPE: Record<DemandeValidation['type'], string> = {
  annulation_recu: 'Annulation de reçu',
  remise_exceptionnelle: 'Remise exceptionnelle',
  correction_apres_conseil: 'Correction après conseil',
  radiation: 'Radiation',
}

export default function Validations() {
  const s = useStore()
  const pret = useChargement()
  const attente = s.validations.filter((v) => v.statut === 'en_attente').sort((a, b) => b.date.localeCompare(a.date))
  const decidees = s.validations.filter((v) => v.statut !== 'en_attente').sort((a, b) => (b.dateDecision ?? '').localeCompare(a.dateDecision ?? ''))
  return (
    <div>
      <EnTetePage titre="Validations" sousTitre="Le système alerte, la Direction décide. Celui qui encaisse n’annule pas : chaque demande attend une seconde signature." />
      {!pret ? <SqueletteTableau lignes={4} /> : (
        <div className="space-y-6">
          <section>
            <h2 className="text-[1.15rem] mb-3">En attente de décision <span className="text-encre-3 font-normal">{attente.length}</span></h2>
            {attente.length === 0 ? (
              <div className="bg-white rounded-2xl border border-ligne"><Vide icone={<ShieldCheck className="size-8 text-vert-texte" />} titre="Aucune demande en attente" texte="Les nouvelles demandes apparaissent ici et dans les notifications." /></div>
            ) : (
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                {attente.map((v) => <CarteDemande key={v.id} v={v} />)}
              </div>
            )}
          </section>
          <Bloc titre="Décisions prises" sansMarge>
            <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
              {decidees.map((v) => (
                <li key={v.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{v.libelle}</span>
                    {v.statut === 'approuvee' ? <Badge ton="vert">Approuvée</Badge> : <Badge ton="rouge">Refusée</Badge>}
                  </div>
                  <div className="text-sm text-encre-2 mt-0.5">{v.motif}</div>
                  <div className="text-sm text-encre-2 mt-0.5">Demandée par {nomPersonnel(s, v.demandeurId)} · décidée par {nomPersonnel(s, v.valideurId)}{v.dateDecision ? ` le ${dateHeure(v.dateDecision)}` : ''}</div>
                </li>
              ))}
            </ul>
            <table className="tableau hidden md:table">
              <thead><tr><th>Demande</th><th>Demandée par</th><th>Motif</th><th>Décision</th><th>Par</th><th>Le</th></tr></thead>
              <tbody>
                {decidees.map((v) => (
                  <tr key={v.id}>
                    <td><div className="font-semibold">{v.libelle}</div><div className="text-sm text-encre-2">{LIB_TYPE[v.type]}</div></td>
                    <td>{nomPersonnel(s, v.demandeurId)}</td>
                    <td className="text-encre-2 max-w-[24rem]">{v.motif}</td>
                    <td>{v.statut === 'approuvee' ? <Badge ton="vert">Approuvée</Badge> : <Badge ton="rouge">Refusée</Badge>}</td>
                    <td>{nomPersonnel(s, v.valideurId)}</td>
                    <td className="whitespace-nowrap">{v.dateDecision ? dateHeure(v.dateDecision) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Bloc>
        </div>
      )}
    </div>
  )
}

function CarteDemande({ v }: { v: DemandeValidation }) {
  const s = useStore()
  const decider = useStore((st) => st.deciderValidation)
  const role = profilParId(s.session.profilId).role
  const [executer, enCours] = useAction()
  const [choix, setChoix] = useState<'oui' | 'non' | null>(null)
  const droit = v.type === 'annulation_recu' ? peut(role, 'validerAnnulation') : peut(role, 'validerRemise')
  const p = v.type === 'annulation_recu' ? s.paiements.find((x) => x.id === v.objetId) : null
  const famille = indexFamilles(s.familles)[p ? p.familleId : v.objetId]
  const ie = indexEleves(s.eleves)
  const sit = famille ? situationFamille(s, famille.id) : null
  const go = async (oui: boolean) => {
    setChoix(oui ? 'oui' : 'non')
    await executer(() => decider(v.id, oui))
  }
  return (
    <article className="bg-white rounded-2xl border border-ligne border-l-4 border-l-ambre p-4 sm:p-5" data-testid="demande-validation">
      <div className="flex flex-wrap-reverse sm:flex-nowrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-10 shrink-0 rounded-full bg-ambre-clair text-ambre flex items-center justify-center">{p ? <Receipt className="size-5" /> : <Percent className="size-5" />}</span>
          <div>
            <div className="font-semibold text-[1.08rem] titre">{v.libelle}</div>
            <div className="text-encre-2 text-sm">{LIB_TYPE[v.type]} · demandée par {nomPersonnel(s, v.demandeurId)} {relatif(v.date)}</div>
          </div>
        </div>
        <Badge ton="ambre">En attente</Badge>
      </div>
      <blockquote className="mt-4 rounded-lg bg-brume px-4 py-3">« {v.motif} »</blockquote>
      {p && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <Ligne libelle="Reçu"><Link to={`/caisse/recu/${p.id}`} className="text-bleu font-semibold hover:underline inline-flex items-center gap-1">{numeroRecu(p.numero)} <ExternalLink className="size-3.5" /></Link></Ligne>
            <Ligne libelle="Montant"><b>{money(p.montant)}</b></Ligne>
            <Ligne libelle="Mode">{LIBELLE_MODE[p.mode]}</Ligne>
            <Ligne libelle="Encaissé le">{dateHeure(p.date)}</Ligne>
          </div>
          <div>
            <Ligne libelle="Famille">{famille?.nom}</Ligne>
            <Ligne libelle="Échéances">{ventilationEncaisse(s, p).map((l) => `${ie[l.echeance?.eleveId ?? '']?.prenom ?? ''} · ${l.echeance?.libelle}`).join(' ; ')}</Ligne>
            <Ligne libelle="Avant">Reçu valide</Ligne>
            <Ligne libelle="Après">Reçu annulé, écriture inverse, reste dans la série</Ligne>
          </div>
        </div>
      )}
      {!p && famille && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <Ligne libelle="Famille">{famille.nom} · {(enfantsParFamille(s.eleves)[famille.id] ?? []).length} enfants</Ligne>
            <Ligne libelle="En retard">{money(sit?.enRetard ?? 0)}</Ligne>
          </div>
          <div>
            <Ligne libelle="Avant">Scolarité du trimestre au tarif normal</Ligne>
            <Ligne libelle="Après">Remise de 20 % sur les mensualités non payées du trimestre</Ligne>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-5">
        {droit ? (
          <>
            <Bouton variante="succes" taille="lg" className="max-sm:flex-1" icone={<Check className="size-4" />} onClick={() => go(true)} chargement={enCours && choix === 'oui'} disabled={enCours} data-testid="approuver">Approuver</Bouton>
            <Bouton variante="danger" taille="lg" className="max-sm:flex-1" icone={<X className="size-4" />} onClick={() => go(false)} chargement={enCours && choix === 'non'} disabled={enCours}>Refuser</Bouton>
          </>
        ) : (
          <Alerte ton="bleu" titre={`Décision réservée à ${NOM_DIRECTION}`}>Séparation des tâches : la personne qui demande ne peut pas valider sa propre demande.</Alerte>
        )}
      </div>
    </article>
  )
}
