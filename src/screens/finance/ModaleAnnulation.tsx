/** Demande d'annulation d'un reçu : motif obligatoire, la décision revient à la Direction. */
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useStore } from '../../store'
import type { Paiement } from '../../data/types'
import { Bouton, Champ, Modale, Zone, Alerte, Liste } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { money, numeroRecu } from '../../lib/format'
import { NOM_DIRECTION } from '../../config'

const MOTIFS = [
  'Erreur de famille à la saisie',
  'Montant saisi en double',
  'Erreur sur le mode de paiement',
  'Chèque rejeté par la banque',
  'Le parent a payé deux fois le même mois',
]

export function ModaleAnnulation({ paiement, onFermer }: { paiement: Paiement | null; onFermer: () => void }) {
  const demander = useStore((s) => s.demanderAnnulation)
  const toast = useStore((s) => s.toast)
  const [type, setType] = useState(MOTIFS[0])
  const [detail, setDetail] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const envoyer = async () => {
    if (!paiement) return
    if (detail.trim().length < 8) return setErreur('Précisez le motif en une phrase (au moins 8 caractères) : la Direction doit comprendre la demande.')
    await executer(() => demander(paiement.id, `${type} : ${detail.trim()}`))
    toast({ titre: 'Annulation demandée', texte: `${numeroRecu(paiement.numero)} attend la décision de ${NOM_DIRECTION}.`, niveau: 'info' })
    setDetail('')
    onFermer()
  }
  return (
    <Modale
      ouvert={!!paiement}
      onFermer={onFermer}
      titre={paiement ? `Demander l’annulation du reçu ${numeroRecu(paiement.numero)}` : ''}
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>Garder le reçu</Bouton>
          <Bouton variante="danger" onClick={envoyer} chargement={enCours} data-testid="envoyer-annulation">Envoyer la demande</Bouton>
        </>
      }
    >
      {paiement && (
        <div className="space-y-4">
          <Alerte ton="bleu" icone={<ShieldCheck className="size-5" />} titre="Double validation">
            Le reçu de {money(paiement.montant)} ne sera pas supprimé. Il reste dans la série, et l’annulation ne prend effet qu’après validation par {NOM_DIRECTION}.
          </Alerte>
          <Champ libelle="Motif">
            <Liste value={type} onChange={(e) => setType(e.target.value)}>
              {MOTIFS.map((m) => <option key={m}>{m}</option>)}
            </Liste>
          </Champ>
          <Champ libelle="Précisions" erreur={erreur} aide="Visible par la Direction et inscrit au journal d’audit.">
            <Zone value={detail} onChange={(e) => { setDetail(e.target.value); setErreur(null) }} placeholder="Ex. : le père a déjà réglé octobre par Orange Money ce matin." autoFocus />
          </Champ>
        </div>
      )}
    </Modale>
  )
}
