/** Notes, moyennes et bulletins (avec historique des versions) ; jalons pour la crèche. */
import { useState } from 'react'
import { ChevronDown, FileText, History, Sprout, Check } from 'lucide-react'
import { useStore } from '../../store'
import { Badge, cx } from '../../ui/base'
import { CarteM, TitreM, Puces } from '../mobile'
import { enfants, classeDe, choisirEnfant, allerParent, jourMoisFr } from '../donnees'
import { resultatsClasse, evaluationsParClasse, notesKey, nomPersonnel } from '../../store/selecteurs'
import { MATIERES_COLLEGE, MATIERES_PRIMAIRE } from '../../data/referentiel'
import { TRIMESTRE_COURANT, dateCourte, dateHeure, dateMoyenne } from '../../lib/temps'
import { note, noteFixe } from '../../lib/format'
import type { Eleve } from '../../data/types'

export const libTrimestre = (t: number) => (t === 1 ? '1er trimestre' : `${t}e trimestre`)

export default function NotesParent() {
  const s = useStore()
  const liste = enfants(s)
  const e = liste.find((x) => x.id === s.session.parent.enfantId) ?? liste.find((x) => classeDe(s, x).cycle !== 'creche') ?? liste[0]
  const c = classeDe(s, e)
  return (
    <div>
      <Puces options={liste.map((x) => ({ id: x.id, libelle: x.prenom }))} valeur={e.id} onChange={choisirEnfant} />
      <div className="mt-2 text-encre-2 text-[0.9rem]">{c.cycle === 'creche' ? `Crèche · groupe des ${c.nom}` : `${c.nom} · ${libTrimestre(TRIMESTRE_COURANT)}`}</div>
      {c.cycle === 'creche' ? <Jalons eleve={e} /> : c.cycle === 'maternelle' ? <p className="mt-4 text-encre-2">En maternelle, le livret de compétences est publié à la fin de chaque trimestre.</p> : <Resultats eleve={e} />}
    </div>
  )
}

function Resultats({ eleve: e }: { eleve: Eleve }) {
  const s = useStore()
  const c = classeDe(s, e)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const res = resultatsClasse(s, c.id, TRIMESTRE_COURANT)
  const moi = res.find((r) => r.eleveId === e.id)
  const classes = res.filter((r) => r.generale !== null).length
  const sur = c.cycle === 'college' ? 20 : 10
  const mats = c.cycle === 'college' ? MATIERES_COLLEGE : MATIERES_PRIMAIRE
  const evs = (evaluationsParClasse(s.evaluations)[c.id] ?? []).filter((x) => x.publiee && x.trimestre === TRIMESTRE_COURANT)
  const bulletins = s.bulletins.filter((b) => b.classeId === c.id && b.statut === 'publie')

  return (
    <div>
      <CarteM className="mt-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-encre-2 text-[0.9rem]">Moyenne générale provisoire</div>
            <div className="chiffre text-[2.2rem] leading-none mt-1">{noteFixe(moi?.generale ?? null)}<span className="text-encre-3 text-[1.1rem]"> / {sur}</span></div>
          </div>
          {s.parametres.afficherRang && moi?.rang && (
            <div className="text-right">
              <div className="text-encre-2 text-[0.9rem]">Rang</div>
              <div className="chiffre text-[1.5rem] leading-none mt-1">{moi.rang}<span className="text-encre-3 text-[0.95rem]">{moi.rang === 1 ? 're' : 'e'} sur {classes}</span></div>
            </div>
          )}
        </div>
        <p className="text-encre-3 text-[0.8rem] mt-2">Se met à jour à chaque note publiée. Une note manquante n’est jamais comptée zéro.</p>
      </CarteM>

      <TitreM>Par matière</TitreM>
      <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2 overflow-hidden" data-testid="notes-parent">
        {mats.map((m) => {
          const moy = moi?.matieres[m.id] ?? null
          const mesEvs = evs.filter((x) => x.matiereId === m.id)
          const corrigee = mesEvs.some((x) => (s.notes[notesKey(x.id, e.id)]?.versions.length ?? 0) > 1)
          const ouvert = ouverte === m.id
          return (
            <div key={m.id}>
              <button onClick={() => setOuverte(ouvert ? null : m.id)} className="w-full flex items-center gap-2 px-4 py-3 text-left active:bg-brume" aria-expanded={ouvert}>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-tight">{m.nom}</span>
                  <span className="block text-encre-3 text-[0.8rem]">{mesEvs.length} évaluation{mesEvs.length > 1 ? 's' : ''}{c.cycle === 'college' ? ` · coefficient ${m.coef}` : ''}</span>
                </span>
                {corrigee && <Badge ton="bleu">Corrigée</Badge>}
                <span className={cx('chiffre text-[1.1rem] w-14 text-right', moy !== null && moy < sur / 2 && 'text-rouge')}>{note(moy)}</span>
                <ChevronDown className={cx('size-4 text-encre-3 transition-transform', ouvert && 'rotate-180')} />
              </button>
              {ouvert && (
                <div className="px-4 pb-3 space-y-2">
                  {mesEvs.length === 0 && <p className="text-encre-2 text-[0.9rem]">Pas encore d’évaluation publiée ce trimestre.</p>}
                  {mesEvs.map((ev) => {
                    const n = s.notes[notesKey(ev.id, e.id)]
                    return (
                      <div key={ev.id} className="rounded-xl bg-brume px-3 py-2">
                        <div className="flex justify-between gap-2">
                          <span className="text-[0.92rem]">{ev.titre} · {jourMoisFr(ev.date)}</span>
                          <span className="font-semibold tabulaire">{n?.valeur == null ? 'Non noté' : `${note(n.valeur)}/${ev.sur}`}</span>
                        </div>
                        {n?.valeur == null && <div className="text-encre-3 text-[0.8rem]">Absence à l’évaluation : non comptée dans la moyenne</div>}
                        {n && n.versions.length > 1 && (
                          <div className="mt-1.5 border-t border-ligne pt-1.5">
                            <div className="flex items-center gap-1.5 text-bleu text-[0.82rem] font-semibold"><History className="size-3.5" />Historique de la note</div>
                            <ol className="mt-1 space-y-1">
                              {n.versions.map((v, i) => (
                                <li key={i} className="text-[0.82rem] leading-snug">
                                  <span className={cx('font-semibold', i < n.versions.length - 1 && 'line-through text-encre-3')}>Version {i + 1} : {note(v.valeur)}/{ev.sur}</span>
                                  <span className="text-encre-2"> · {dateHeure(v.date)}, {nomPersonnel(s, v.auteurId)}</span>
                                  {v.motif && <span className="block text-encre-2">Motif : {v.motif}</span>}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <TitreM>Bulletins</TitreM>
      <div className="space-y-2">
        {bulletins.map((b) => {
          const v = b.versions[b.versions.length - 1]
          return (
            <CarteM key={b.id} onClick={() => allerParent('bulletin', { enfantId: e.id })} className="flex items-center gap-3">
              <FileText className="size-5 text-bleu shrink-0" />
              <span className="flex-1">
                <span className="block font-semibold">Bulletin du {libTrimestre(b.trimestre)}</span>
                <span className="block text-encre-2 text-[0.85rem]">Version {v?.numero ?? 1} · publiée le {v ? dateCourte(v.date.slice(0, 10)) : '—'}</span>
              </span>
              {(v?.numero ?? 1) > 1 && <Badge ton="bleu">Mis à jour</Badge>}
            </CarteM>
          )
        })}
        {!bulletins.some((b) => b.trimestre === TRIMESTRE_COURANT) && (
          <CarteM onClick={() => allerParent('bulletin', { enfantId: e.id })} className="flex items-center gap-3">
            <FileText className="size-5 text-encre-3 shrink-0" />
            <span className="flex-1">
              <span className="block font-semibold">Relevé provisoire du {libTrimestre(TRIMESTRE_COURANT)}</span>
              <span className="block text-encre-2 text-[0.85rem]">Le bulletin sera publié après le conseil de classe</span>
            </span>
          </CarteM>
        )}
      </div>
    </div>
  )
}

function Jalons({ eleve: e }: { eleve: Eleve }) {
  const s = useStore()
  const jalons = s.jalons.filter((j) => j.eleveId === e.id)
  const domaines = [...new Set(jalons.map((j) => j.domaine))]
  return (
    <div>
      <p className="mt-3 text-encre-2 text-[0.92rem] leading-snug">À la crèche, pas de notes : l’équipe observe les étapes du développement de {e.prenom}, à son rythme.</p>
      {domaines.map((d) => (
        <div key={d}>
          <TitreM>{d}</TitreM>
          <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
            {jalons.filter((j) => j.domaine === d).map((j) => (
              <div key={j.id} className="flex items-center gap-3 px-4 py-2.5">
                {j.date ? <span className="size-7 rounded-full bg-vert-clair text-vert-texte flex items-center justify-center"><Check className="size-4" /></span> : <span className="size-7 rounded-full bg-ligne-2 text-encre-3 flex items-center justify-center"><Sprout className="size-4" /></span>}
                <span className="flex-1">{j.libelle}</span>
                <span className="text-[0.82rem] text-encre-2">{j.date ? dateMoyenne(j.date) : 'En observation'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
