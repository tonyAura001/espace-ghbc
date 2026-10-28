/** Saisie des notes du primaire : grille par discipline, recalcul instantané des moyennes. */
import { useMemo, useState } from 'react'
import { Plus, Info } from 'lucide-react'
import { useStore } from '../../store'
import { profilParId, peut } from '../../store/profils'
import { elevesParClasse, evaluationsParClasse, indexClasses, nomPersonnel } from '../../store/selecteurs'
import { DOMAINES_PRIMAIRE, MATIERES_PRIMAIRE } from '../../data/referentiel'
import { ID } from '../../data/generer'
import { Bouton, EnTetePage, Liste, Segments, SqueletteTableau, PastilleCycle } from '../../ui/base'
import { useChargement } from '../../ui/hooks'
import { TRIMESTRE_COURANT } from '../../lib/temps'
import { GrilleNotes } from './GrilleNotes'
import { NouvelleEvaluation } from './NouvelleEvaluation'

export default function SaisieNotes() {
  const s = useStore()
  const profil = profilParId(s.session.profilId)
  const pret = useChargement(380)
  const classes = useMemo(() => s.classes.filter((c) => c.cycle === 'primaire'), [s.classes])
  const maClasse = classes.find((c) => c.titulaireId === profil.userId)?.id ?? ID.classeIbrahima
  const [classeId, setClasseId] = useState(maClasse)
  const [matiereId, setMatiereId] = useState('PR-CAL')
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(TRIMESTRE_COURANT)
  const [nouvelle, setNouvelle] = useState(false)
  const classe = indexClasses(s.classes)[classeId]
  const peutSaisir = peut(profil.role, 'saisirNotes') && (profil.role !== 'enseignant' || classe.titulaireId === profil.userId)
  const effectif = (elevesParClasse(s.eleves)[classeId] ?? []).length
  const nbEvals = (evaluationsParClasse(s.evaluations)[classeId] ?? []).filter((e) => e.trimestre === trimestre).length

  return (
    <div>
      <EnTetePage
        titre="Notes du primaire"
        sousTitre={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <PastilleCycle cycle="primaire" libelle={classe.nom} /> · {effectif} élèves · {classe.titulaireId ? `${nomPersonnel(s, classe.titulaireId)}, titulaire` : ''} · {nbEvals} évaluations ce trimestre
          </span>
        }
        actions={
          peutSaisir ? (
            <Bouton icone={<Plus className="size-4" />} onClick={() => setNouvelle(true)}>Nouvelle évaluation</Bouton>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="flex flex-col gap-1 max-sm:w-full">
          <span className="text-sm font-semibold text-encre-2">Classe</span>
          <Liste value={classeId} onChange={(e) => setClasseId(e.target.value)} className="!w-48 max-sm:!w-full">
            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Liste>
        </label>
        <label className="flex flex-col gap-1 max-sm:w-full">
          <span className="text-sm font-semibold text-encre-2">Discipline</span>
          <Liste value={matiereId} onChange={(e) => setMatiereId(e.target.value)} className="!w-72 max-sm:!w-full" data-testid="choix-discipline">
            {DOMAINES_PRIMAIRE.map((d) => (
              <optgroup key={d} label={d}>
                {MATIERES_PRIMAIRE.filter((m) => m.domaine === d).map((m) => <option key={m.id} value={m.id}>{m.nom} · coefficient {m.coef}</option>)}
              </optgroup>
            ))}
          </Liste>
        </label>
        <Segments<'1' | '2' | '3'>
          valeur={String(trimestre) as '1' | '2' | '3'}
          onChange={(v) => setTrimestre(Number(v) as 1 | 2 | 3)}
          options={[1, 2, 3].filter((t) => t <= TRIMESTRE_COURANT).map((t) => ({ id: String(t) as '1' | '2' | '3', libelle: t === 1 ? '1er trimestre' : `${t}e trimestre` }))}
        />
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm text-encre-2 max-w-md">
          <Info className="size-4 shrink-0" />
          {peut(profil.role, 'publierBulletin')
            ? 'Vous pouvez valider et publier les bulletins depuis l’écran Bulletins.'
            : 'Le maître saisit et publie ses notes ; le bulletin est validé et publié par la Direction.'}
        </div>
      </div>
      {pret ? <GrilleNotes classeId={classeId} matiereId={matiereId} trimestre={trimestre} peutSaisir={peutSaisir} /> : <div className="bg-white rounded-xl border border-ligne"><SqueletteTableau lignes={10} /></div>}
      <NouvelleEvaluation ouvert={nouvelle} onFermer={() => setNouvelle(false)} classeId={classeId} matiereId={matiereId} trimestre={trimestre} />
    </div>
  )
}
