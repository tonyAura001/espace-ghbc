/** Absences des enfants : justifier depuis le téléphone, consulter l'historique. */
import { useState } from 'react'
import { Camera, Check, Paperclip } from 'lucide-react'
import { useStore } from '../../store'
import { Badge, Liste, Zone } from '../../ui/base'
import { BoutonM, CarteM, TitreM } from '../mobile'
import { enfants } from '../donnees'
import { dateLongueMaj, dateCourte } from '../../lib/temps'
import { tauxPresenceEleve, matiere } from '../../store/selecteurs'
import { pct } from '../../lib/format'
import { useAction } from '../../ui/hooks'
import type { Absence } from '../../data/types'

const PERIODE: Record<Absence['periode'], string> = { journee: 'Journée entière', matin: 'Matinée', 'apres-midi': 'Après-midi', cours: 'Un cours' }

export default function AbsencesParent() {
  const s = useStore()
  const liste = enfants(s)
  const ids = liste.map((e) => e.id)
  const toutes = s.absences.filter((a) => ids.includes(a.eleveId)).sort((a, b) => b.date.localeCompare(a.date))
  const aJustifier = toutes.filter((a) => !a.justifiee)
  const justifiees = toutes.filter((a) => a.justifiee)
  const prenom = (id: string) => liste.find((e) => e.id === id)?.prenom ?? ''

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {liste.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-ligne px-3 py-2.5 text-center">
            <div className="text-encre-2 text-[0.82rem]">{e.prenom}</div>
            <div className="chiffre text-[1.2rem]">{pct(tauxPresenceEleve(s, e.id).taux)}</div>
            <div className="text-encre-3 text-[0.72rem]">de présence</div>
          </div>
        ))}
      </div>

      <TitreM>À justifier</TitreM>
      {aJustifier.length === 0 ? (
        <CarteM className="flex items-center gap-2 text-vert-texte font-semibold"><Check className="size-5" />Toutes les absences sont justifiées.</CarteM>
      ) : (
        <div className="space-y-2.5">
          {aJustifier.map((a) => <AJustifier key={a.id} absence={a} prenom={prenom(a.eleveId)} />)}
        </div>
      )}

      <TitreM>Historique</TitreM>
      <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
        {justifiees.length === 0 && <p className="px-4 py-3 text-encre-2">Aucune absence cette année.</p>}
        {justifiees.slice(0, 12).map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{prenom(a.eleveId)} · {dateCourte(a.date)}</div>
              <div className="text-encre-2 text-[0.85rem]">{PERIODE[a.periode]} · {a.motif}</div>
            </div>
            {a.justificatif && <Paperclip className="size-4 text-encre-3" aria-label="Justificatif joint" />}
            <Badge ton="vert">Justifiée</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

function AJustifier({ absence: a, prenom }: { absence: Absence; prenom: string }) {
  const s = useStore()
  const [motif, setMotif] = useState('Maladie')
  const [precision, setPrecision] = useState('')
  const [piece, setPiece] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const [photo, enPhoto] = useAction()
  const cr = a.creneauId ? s.creneaux.find((c) => c.id === a.creneauId) : null
  const valider = () => {
    if (motif === 'Autre motif' && !precision.trim()) return setErreur('Précisez le motif en quelques mots.')
    executer(() => {
      useStore.getState().justifierAbsence(a.id, motif === 'Autre motif' ? precision.trim() : precision.trim() ? `${motif} · ${precision.trim()}` : motif, piece)
      useStore.getState().toast({ titre: 'Justificatif envoyé', texte: 'La vie scolaire a reçu votre justification.', niveau: 'succes' })
    })
  }
  return (
    <div className="bg-white rounded-2xl border border-ambre/40 p-4 space-y-2.5" data-testid="absence-a-justifier">
      <div>
        <div className="font-semibold">{prenom} · {dateLongueMaj(a.date)}</div>
        <div className="text-encre-2 text-[0.88rem]">{PERIODE[a.periode]}{cr ? ` · ${matiere(cr.matiereId).nom} à ${cr.debut.replace(':', ' h ')}` : ''}</div>
      </div>
      <Liste value={motif} onChange={(e) => { setMotif(e.target.value); setErreur(null) }} aria-label="Motif">
        {['Maladie', 'Rendez-vous médical', 'Événement familial', 'Retard de transport', 'Autre motif'].map((m) => <option key={m}>{m}</option>)}
      </Liste>
      <Zone className="!min-h-16" placeholder="Précision (facultatif)" value={precision} onChange={(e) => { setPrecision(e.target.value); setErreur(null) }} />
      {piece ? (
        <div className="flex items-center gap-2 text-[0.9rem] text-vert-texte font-semibold"><Paperclip className="size-4" />{piece} joint<button className="ml-auto text-encre-2 font-normal underline" onClick={() => setPiece(null)}>Retirer</button></div>
      ) : (
        <BoutonM variante="secondaire" className="!py-2.5" chargement={enPhoto} onClick={() => photo(() => setPiece(`photo-justificatif-${a.date.slice(5).replace('-', '')}.jpg`), [600, 900])}><Camera className="size-4" />Photographier un justificatif</BoutonM>
      )}
      {erreur && <p className="text-rouge text-[0.88rem]">{erreur}</p>}
      <BoutonM onClick={valider} chargement={enCours} testId="justifier">Justifier l’absence</BoutonM>
    </div>
  )
}
