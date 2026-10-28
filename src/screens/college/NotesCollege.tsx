/** Saisie des notes du collège : notes sur 20, moyenne de matière = (moyenne des devoirs + composition) ÷ 2. */
import { useMemo, useState } from 'react'
import { Plus, Info } from 'lucide-react'
import { useStore } from '../../store'
import { profilParId, peut } from '../../store/profils'
import { elevesParClasse, indexClasses, indexPersonnel, nomPersonnel } from '../../store/selecteurs'
import { MATIERES_COLLEGE } from '../../data/referentiel'
import { ID } from '../../data/generer'
import { Bouton, EnTetePage, Liste, Segments, SqueletteTableau, PastilleCycle } from '../../ui/base'
import { useChargement } from '../../ui/hooks'
import { TRIMESTRE_COURANT } from '../../lib/temps'
import { GrilleNotes } from '../primaire/GrilleNotes'
import { NouvelleEvaluation } from '../primaire/NouvelleEvaluation'

export default function NotesCollege() {
  const s = useStore()
  const profil = profilParId(s.session.profilId)
  const pret = useChargement(380)
  const moi = indexPersonnel(s.personnel)[profil.userId]
  const maMatiere = profil.role === 'professeur' && moi?.matiereIds[0] ? moi.matiereIds[0] : 'CO-MA'
  const classesCo = useMemo(() => s.classes.filter((c) => c.cycle === 'college'), [s.classes])
  const mesClasses = useMemo(
    () => (profil.role === 'professeur' ? classesCo.filter((c) => s.creneaux.some((x) => x.classeId === c.id && x.profId === profil.userId)) : classesCo),
    [classesCo, s.creneaux, profil],
  )
  const [classeId, setClasseId] = useState(mesClasses.find((c) => c.id === ID.classeFatoumata)?.id ?? mesClasses[0]?.id ?? ID.classeFatoumata)
  const [matiereId, setMatiereId] = useState(maMatiere)
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(TRIMESTRE_COURANT)
  const [nouvelle, setNouvelle] = useState(false)
  const classe = indexClasses(s.classes)[classeId]
  const prof = s.creneaux.find((c) => c.classeId === classeId && c.matiereId === matiereId)?.profId
  const peutSaisir = peut(profil.role, 'saisirNotes') && (profil.role !== 'professeur' || prof === profil.userId)
  const mat = MATIERES_COLLEGE.find((m) => m.id === matiereId)!

  return (
    <div>
      <EnTetePage
        titre="Notes du collège"
        sousTitre={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <PastilleCycle cycle="college" libelle={classe.nom} /> · {(elevesParClasse(s.eleves)[classeId] ?? []).length} élèves · {mat.nom}, coefficient {mat.coef} · {prof ? nomPersonnel(s, prof) : 'professeur non affecté'}
          </span>
        }
        actions={peutSaisir ? <Bouton icone={<Plus className="size-4" />} onClick={() => setNouvelle(true)}>Nouvelle évaluation</Bouton> : undefined}
      />
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="flex flex-col gap-1 max-sm:w-full">
          <span className="text-sm font-semibold text-encre-2">Classe</span>
          <Liste value={classeId} onChange={(e) => setClasseId(e.target.value)} className="!w-44 max-sm:!w-full">
            {(profil.role === 'professeur' ? mesClasses : classesCo).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Liste>
        </label>
        <label className="flex flex-col gap-1 max-sm:w-full">
          <span className="text-sm font-semibold text-encre-2">Matière</span>
          <Liste value={matiereId} onChange={(e) => setMatiereId(e.target.value)} className="!w-80 max-sm:!w-full">
            {MATIERES_COLLEGE.map((m) => <option key={m.id} value={m.id}>{m.nom} · coefficient {m.coef}</option>)}
          </Liste>
        </label>
        <Segments<'1' | '2' | '3'>
          valeur={String(trimestre) as '1' | '2' | '3'}
          onChange={(v) => setTrimestre(Number(v) as 1 | 2 | 3)}
          options={[1, 2, 3].filter((t) => t <= TRIMESTRE_COURANT).map((t) => ({ id: String(t) as '1' | '2' | '3', libelle: t === 1 ? '1er trimestre' : `${t}e trimestre` }))}
        />
        <div className="flex-1" />
        {!peutSaisir && (
          <div className="flex items-center gap-2 text-sm text-encre-2 max-w-md"><Info className="size-4 shrink-0" />Lecture seule : seul le professeur de la matière saisit ces notes.</div>
        )}
      </div>
      {pret ? <GrilleNotes classeId={classeId} matiereId={matiereId} trimestre={trimestre} peutSaisir={peutSaisir} /> : <div className="bg-white rounded-xl border border-ligne"><SqueletteTableau lignes={10} /></div>}
      <NouvelleEvaluation ouvert={nouvelle} onFermer={() => setNouvelle(false)} classeId={classeId} matiereId={matiereId} trimestre={trimestre} />
    </div>
  )
}
