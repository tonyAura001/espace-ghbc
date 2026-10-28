/** Bulletin sur téléphone : moyennes, rang, décisions, et historique des versions publiées. */
import { useState } from 'react'
import { History } from 'lucide-react'
import { useStore } from '../../store'
import { CONFIG } from '../../config'
import { Badge, cx } from '../../ui/base'
import { TitreM, Puces } from '../mobile'
import { enfants, classeDe } from '../donnees'
import { resultatsClasse, nomPersonnel, statsClasse } from '../../store/selecteurs'
import { MATIERES_COLLEGE, MATIERES_PRIMAIRE, DOMAINES_PRIMAIRE } from '../../data/referentiel'
import { TRIMESTRE_COURANT, dateHeure } from '../../lib/temps'
import { note, noteFixe } from '../../lib/format'
import { libTrimestre } from './NotesParent'

export default function BulletinParent() {
  const s = useStore()
  const liste = enfants(s).filter((x) => ['primaire', 'college'].includes(classeDe(s, x).cycle))
  const e = liste.find((x) => x.id === s.session.parent.enfantId) ?? liste[0]
  const c = classeDe(s, e)
  const trimestres = [1, 2, 3].filter((t) => t <= TRIMESTRE_COURANT) as (1 | 2 | 3)[]
  const [t, setT] = useState<1 | 2 | 3>(() => {
    const pub = s.bulletins.filter((b) => b.classeId === c.id && b.statut === 'publie').map((b) => b.trimestre)
    return pub.length ? (Math.max(...pub) as 1 | 2 | 3) : TRIMESTRE_COURANT
  })
  const b = s.bulletins.find((x) => x.classeId === c.id && x.trimestre === t)
  const publie = b?.statut === 'publie'
  const res = resultatsClasse(s, c.id, t)
  const moi = res.find((r) => r.eleveId === e.id)
  const stats = statsClasse(res)
  const mats = c.cycle === 'college' ? MATIERES_COLLEGE : MATIERES_PRIMAIRE
  const sur = c.cycle === 'college' ? 20 : 10
  const decision = s.decisions.find((d) => d.eleveId === e.id && d.trimestre === t)
  const v = b?.versions[b.versions.length - 1]

  return (
    <div>
      {trimestres.length > 1 && <Puces options={trimestres.map((x) => ({ id: String(x), libelle: libTrimestre(x) }))} valeur={String(t)} onChange={(x) => setT(Number(x) as 1 | 2 | 3)} />}
      <div className="mt-2 bg-white rounded-2xl border border-ligne overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b-2" style={{ borderColor: CONFIG.BLEU_MARQUE }}>
          <img src={CONFIG.LOGO_COULEUR} alt="" className="h-9 w-auto" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-semibold">{e.prenom} {e.nom}</div>
            <div className="text-encre-2 text-[0.85rem]">{c.nom} · {libTrimestre(t)} · {CONFIG.ANNEE_SCOLAIRE}</div>
          </div>
          {publie ? <Badge ton="vert">Publié · v{v?.numero}</Badge> : <Badge ton="ambre">Provisoire</Badge>}
        </div>
        <table className="w-full text-[0.9rem]">
          <thead>
            <tr className="text-encre-2 text-[0.8rem]">
              <th className="text-left font-semibold px-4 py-2">Matière</th>
              {c.cycle === 'college' && <th className="font-semibold px-1 py-2">Coef.</th>}
              <th className="text-right font-semibold px-4 py-2">Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {(c.cycle === 'primaire' ? DOMAINES_PRIMAIRE : ['']).map((d) => (
              <FragmentDomaine key={d} titre={d} moyenne={d ? moi?.domaines[d] ?? null : null}>
                {mats.filter((m) => !d || m.domaine === d).map((m) => {
                  const val = moi?.matieres[m.id] ?? null
                  return (
                    <tr key={m.id} className="border-t border-ligne-2">
                      <td className="px-4 py-1.5">{m.nom}</td>
                      {c.cycle === 'college' && <td className="text-center text-encre-2 tabulaire">{m.coef}</td>}
                      <td className={cx('px-4 py-1.5 text-right tabulaire font-semibold', val !== null && val < sur / 2 && 'text-rouge')}>{note(val)}</td>
                    </tr>
                  )
                })}
              </FragmentDomaine>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-3 border-t-2 border-ligne bg-brume/60 text-center">
          <div className="py-3">
            <div className="text-encre-2 text-[0.78rem]">Moyenne</div>
            <div className="chiffre text-[1.35rem]">{noteFixe(moi?.generale ?? null)}</div>
          </div>
          <div className="py-3 border-x border-ligne">
            <div className="text-encre-2 text-[0.78rem]">Rang</div>
            <div className="chiffre text-[1.35rem]">{s.parametres.afficherRang && moi?.rang ? `${moi.rang}${moi.rang === 1 ? 're' : 'e'}` : '—'}</div>
          </div>
          <div className="py-3">
            <div className="text-encre-2 text-[0.78rem]">Moy. de la classe</div>
            <div className="chiffre text-[1.35rem]">{noteFixe(stats.moyenne)}</div>
          </div>
        </div>
        {decision && (decision.distinction || decision.avertissement || decision.appreciation) && (
          <div className="px-4 py-3 border-t border-ligne text-[0.9rem]">
            {decision.distinction && <div className="font-semibold text-vert-texte">{decision.distinction}</div>}
            {decision.avertissement && <div className="font-semibold text-ambre">{decision.avertissement}</div>}
            {decision.appreciation && <p className="text-encre-2 mt-0.5">« {decision.appreciation} »</p>}
          </div>
        )}
      </div>
      {!publie && <p className="text-encre-3 text-[0.82rem] mt-2 leading-snug">Relevé provisoire calculé avec les notes publiées. Le bulletin officiel sera publié par {CONFIG.NOM_DIRECTION || 'la Direction'} après le conseil de classe.</p>}

      {publie && b && b.versions.length > 0 && (
        <>
          <TitreM>Historique des versions</TitreM>
          <ol className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
            {[...b.versions].reverse().map((x) => (
              <li key={x.numero} className="flex gap-3 px-4 py-2.5">
                <History className="size-4 text-bleu mt-1 shrink-0" />
                <span className="text-[0.9rem]">
                  <span className="font-semibold">Version {x.numero}</span> · {dateHeure(x.date)}
                  <span className="block text-encre-2">{x.motif} · {nomPersonnel(s, x.auteurId)}</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

function FragmentDomaine({ titre, moyenne, children }: { titre: string; moyenne: number | null; children: React.ReactNode }) {
  return (
    <>
      {titre && (
        <tr className="bg-bleu-clair/60">
          <td className="px-4 py-1.5 font-semibold text-bleu" colSpan={1}>{titre}</td>
          <td className="px-4 py-1.5 text-right font-semibold text-bleu tabulaire">{note(moyenne)}</td>
        </tr>
      )}
      {children}
    </>
  )
}
