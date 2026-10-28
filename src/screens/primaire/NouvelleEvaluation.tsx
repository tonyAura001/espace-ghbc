/** Création d'une évaluation (primaire ou collège). */
import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { indexClasses, matiere } from '../../store/selecteurs'
import { Bouton, Champ, Liste, Modale, Saisie, Segments } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { JOUR_DEMO, trimestreDe } from '../../lib/temps'

export function NouvelleEvaluation({ ouvert, onFermer, classeId, matiereId, trimestre }: { ouvert: boolean; onFermer: () => void; classeId: string; matiereId: string; trimestre: 1 | 2 | 3 }) {
  const creer = useStore((s) => s.creerEvaluation)
  const toast = useStore((s) => s.toast)
  const classes = useStore((s) => s.classes)
  const evaluations = useStore((s) => s.evaluations)
  const c = indexClasses(classes)[classeId]
  const sur = c?.cycle === 'college' ? 20 : 10
  const [type, setType] = useState<'devoir' | 'composition'>('devoir')
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState(JOUR_DEMO)
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()

  useEffect(() => {
    if (!ouvert) return
    const n = evaluations.filter((e) => e.classeId === classeId && e.matiereId === matiereId && e.trimestre === trimestre && e.type === 'devoir').length + 1
    setTitre(`Devoir n° ${n}`)
    setType('devoir')
    setDate(JOUR_DEMO)
    setErreur(null)
  }, [ouvert, classeId, matiereId, trimestre, evaluations])

  const valider = async () => {
    if (!titre.trim()) return setErreur('Donnez un titre à l’évaluation, par exemple « Devoir n° 2 ».')
    if (trimestreDe(date) !== trimestre) return setErreur('La date choisie n’appartient pas au trimestre affiché. Choisissez une date du trimestre ou changez de trimestre.')
    await executer(() => creer({ classeId, matiereId, type, titre: titre.trim(), date, trimestre, sur }))
    toast({ titre: 'Évaluation créée', texte: `${matiere(matiereId).nom} · ${titre.trim()} · ${c.nom}. Les cases sont prêtes à la saisie.`, niveau: 'succes' })
    onFermer()
  }

  return (
    <Modale
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Nouvelle évaluation"
      pied={
        <>
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton onClick={valider} chargement={enCours}>Créer l’évaluation</Bouton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-encre-2">{c?.nom} · {matiere(matiereId).nom} · notée sur {sur}</p>
        <Segments<'devoir' | 'composition'> valeur={type} onChange={(v) => { setType(v); if (v === 'composition') setTitre(`Composition du ${trimestre === 1 ? '1er' : trimestre + 'e'} trimestre`) }} options={[{ id: 'devoir', libelle: 'Devoir' }, { id: 'composition', libelle: 'Composition' }]} />
        <Champ libelle="Titre" erreur={erreur}>
          <Saisie value={titre} onChange={(e) => { setTitre(e.target.value); setErreur(null) }} />
        </Champ>
        <Champ libelle="Date">
          <Saisie type="date" value={date} onChange={(e) => { setDate(e.target.value); setErreur(null) }} />
        </Champ>
        <Champ libelle="Barème">
          <Liste value={sur} disabled>
            <option value={sur}>Sur {sur}</option>
          </Liste>
        </Champ>
      </div>
    </Modale>
  )
}
