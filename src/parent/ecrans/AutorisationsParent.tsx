/** Autorisations parentales : sorties, droit à l'image… Réponse en un geste. */
import { useState } from 'react'
import { Check, X, CalendarDays } from 'lucide-react'
import { useStore } from '../../store'
import { cx } from '../../ui/base'
import { BoutonM, CarteM, TitreM } from '../mobile'
import { enfants, jourMoisFr } from '../donnees'
import { dateLongueMaj } from '../../lib/temps'
import { useAction } from '../../ui/hooks'

export default function AutorisationsParent() {
  const s = useStore()
  const liste = enfants(s)
  const items = s.autorisations.flatMap((a) => liste.filter((e) => a.classeIds.includes(e.classeId)).map((e) => ({ a, e })))
  const enAttente = items.filter((x) => !x.a.reponses[x.e.id])
  const repondues = items.filter((x) => x.a.reponses[x.e.id])
  return (
    <div>
      <TitreM>En attente de votre réponse</TitreM>
      {enAttente.length === 0 && <CarteM className="flex items-center gap-2 text-vert-texte font-semibold"><Check className="size-5" />Vous avez répondu à toutes les demandes.</CarteM>}
      <div className="space-y-2.5">
        {enAttente.map(({ a, e }) => <Demande key={a.id + e.id} autorisationId={a.id} eleveId={e.id} />)}
      </div>
      {repondues.length > 0 && (
        <>
          <TitreM>Déjà répondu</TitreM>
          <div className="space-y-2.5">
            {repondues.map(({ a, e }) => <Demande key={a.id + e.id} autorisationId={a.id} eleveId={e.id} />)}
          </div>
        </>
      )}
    </div>
  )
}

function Demande({ autorisationId, eleveId }: { autorisationId: string; eleveId: string }) {
  const s = useStore()
  const a = s.autorisations.find((x) => x.id === autorisationId)!
  const e = s.eleves.find((x) => x.id === eleveId)!
  const rep = a.reponses[eleveId]
  const [modifier, setModifier] = useState(false)
  const [executer, enCours] = useAction()
  const repondre = (r: 'oui' | 'non') =>
    executer(() => {
      useStore.getState().repondreAutorisation(a.id, e.id, r)
      useStore.getState().toast({ titre: r === 'oui' ? 'Autorisation donnée' : 'Autorisation refusée', texte: `${a.titre} · ${e.prenom}`, niveau: r === 'oui' ? 'succes' : 'info' })
      setModifier(false)
    })
  return (
    <CarteM className={cx(!rep && 'border-bleu-ligne')}>
      <div className="text-encre-2 text-[0.82rem]">Pour {e.prenom}</div>
      <div className="font-semibold leading-snug">{a.titre}</div>
      <p className="text-encre-2 text-[0.9rem] leading-snug mt-0.5">{a.description}</p>
      <div className="flex items-center gap-1.5 text-[0.85rem] text-encre-2 mt-1.5"><CalendarDays className="size-4" />{dateLongueMaj(a.date)} · réponse attendue avant le {jourMoisFr(a.limite)}</div>
      {rep && !modifier ? (
        <div className="mt-2.5 flex items-center justify-between">
          <span className={cx('flex items-center gap-1.5 font-semibold', rep === 'oui' ? 'text-vert-texte' : 'text-rouge')}>{rep === 'oui' ? <Check className="size-4" /> : <X className="size-4" />}{rep === 'oui' ? 'Vous avez autorisé' : 'Vous avez refusé'}</span>
          <button className="text-bleu font-semibold text-[0.9rem]" onClick={() => setModifier(true)}>Modifier</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <BoutonM variante="secondaire" className="!py-2.5" onClick={() => repondre('non')} disabled={enCours}>Je refuse</BoutonM>
          <BoutonM variante="succes" className="!py-2.5" onClick={() => repondre('oui')} chargement={enCours} testId="autoriser">J’autorise</BoutonM>
        </div>
      )}
    </CarteM>
  )
}
