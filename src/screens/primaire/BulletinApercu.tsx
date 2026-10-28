/** Aperçu A4 du bulletin trimestriel (primaire ou collège), imprimable. */
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../../store'
import type { Donnees } from '../../data/generer'
import { indexEleves, indexClasses, elevesParClasse, evaluationsParClasse, resultatsClasse, statsClasse, nomPersonnel, notesKey, moyennePonderee } from '../../store/selecteurs'
import { DOMAINES_PRIMAIRE, MATIERES_COLLEGE, MATIERES_PRIMAIRE } from '../../data/referentiel'
import { ApercuImpression, EnTeteDocument, FiletMarque } from '../../ui/documents'
import { EnTetePage, Liste } from '../../ui/base'
import { CONFIG, NOM_DIRECTION } from '../../config'
import { dateCourte, dateHeure, trimestreDe, TRIMESTRE_COURANT, JOUR_DEMO, age } from '../../lib/temps'
import { note, noteFixe } from '../../lib/format'
import type { Eleve, Matiere } from '../../data/types'

const libT = (t: number) => (t === 1 ? '1er trimestre' : `${t}e trimestre`)

export function appreciation(m: number | null, sur: number): string {
  if (m === null) return 'Non évalué'
  const r = m / sur
  if (r >= 0.8) return 'Excellent travail'
  if (r >= 0.7) return 'Très bon travail'
  if (r >= 0.6) return 'Bon travail'
  if (r >= 0.5) return 'Travail satisfaisant'
  if (r >= 0.4) return 'Doit fournir plus d’efforts'
  return 'Résultats insuffisants'
}

function appreciationGenerale(prenom: string, m: number | null, sur: number, absences: number): string {
  if (m === null) return `${prenom} n’a pas encore été évalué(e) ce trimestre.`
  const r = m / sur
  const assid = absences > 6 ? ' Les absences sont trop nombreuses et pénalisent les apprentissages.' : ' Assiduité régulière.'
  if (r >= 0.75) return `Excellent trimestre. ${prenom} est un élément moteur de la classe, sérieux et appliqué. Félicitations.${assid}`
  if (r >= 0.6) return `Bon trimestre. ${prenom} travaille avec régularité ; il faut maintenir cet effort et soigner la présentation.${assid}`
  if (r >= 0.5) return `Trimestre correct. ${prenom} a les capacités de mieux faire avec davantage de travail personnel à la maison.${assid}`
  return `Trimestre difficile. ${prenom} doit se ressaisir ; un suivi régulier des leçons à la maison est indispensable.${assid}`
}

const rangTexte = (r: number | null, sexe: 'F' | 'M') => (r ? `${r}${r === 1 ? (sexe === 'F' ? 're' : 'er') : 'e'}` : '—')

export default function BulletinApercu() {
  const { eleveId = '' } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const s = useStore()
  const journaliser = useStore((st) => st.journaliser)
  const [t, setT] = useState<1 | 2 | 3>((Number(sp.get('t')) || TRIMESTRE_COURANT) as 1 | 2 | 3)
  const e = indexEleves(s.eleves)[eleveId]
  const fermer = () => (window.history.length > 2 ? nav(-1) : nav('/bulletins'))
  if (!e) return <EnTetePage titre="Bulletin introuvable" sousTitre="Cet élève n’existe pas ou a été archivé." />
  const c = indexClasses(s.classes)[e.classeId]
  return (
    <ApercuImpression
      ouvert
      onFermer={fermer}
      titre={`Bulletin · ${e.prenom} ${e.nom} · ${libT(t)}`}
      onImprimer={() => journaliser('Bulletin', 'Bulletin imprimé', `${e.prenom} ${e.nom} · ${c.nom} · ${libT(t)}`, e.id)}
      actions={
        <Liste value={t} onChange={(x) => setT(Number(x.target.value) as 1 | 2 | 3)} className="!w-40 !py-1.5 !text-sm">
          {[1, 2, 3].filter((x) => x <= TRIMESTRE_COURANT).map((x) => <option key={x} value={x}>{libT(x)}</option>)}
        </Liste>
      }
    >
      <FeuilleBulletin s={s} eleve={e} trimestre={t} />
    </ApercuImpression>
  )
}

export function FeuilleBulletin({ s, eleve: e, trimestre: t }: { s: Donnees; eleve: Eleve; trimestre: 1 | 2 | 3 }) {
  const c = indexClasses(s.classes)[e.classeId]
  const college = c.cycle === 'college'
  const sur = college ? 20 : 10
  const mats: Matiere[] = college ? MATIERES_COLLEGE : MATIERES_PRIMAIRE
  const res = resultatsClasse(s, c.id, t)
  const r = res.find((x) => x.eleveId === e.id)!
  const st = statsClasse(res)
  const effectif = (elevesParClasse(s.eleves)[c.id] ?? []).length
  const bulletin = s.bulletins.find((b) => b.id === `${c.id}|${t}`)
  const decision = s.decisions.find((d) => d.eleveId === e.id && d.trimestre === t)
  const evs = useMemo(() => (evaluationsParClasse(s.evaluations)[c.id] ?? []).filter((x) => x.trimestre === t), [s.evaluations, c.id, t])
  const absences = s.absences.filter((a) => a.eleveId === e.id && trimestreDe(a.date) === t)
  const demi = absences.reduce((a, x) => a + (x.periode === 'journee' ? 2 : x.periode === 'cours' ? 0 : 1), 0)
  const demiJ = absences.filter((x) => x.justifiee).reduce((a, x) => a + (x.periode === 'journee' ? 2 : x.periode === 'cours' ? 0 : 1), 0)
  const coursManques = absences.filter((x) => x.periode === 'cours').length
  const titulaire = nomPersonnel(s, c.titulaireId)
  const version = bulletin?.versions.length ?? 0
  const derniere = bulletin?.versions[version - 1]
  const provisoire = bulletin?.statut !== 'publie'
  const valeurs = (matId: string, type?: 'devoir' | 'composition') =>
    evs.filter((x) => x.matiereId === matId && (!type || x.type === type)).map((x) => s.notes[notesKey(x.id, e.id)]?.valeur ?? null)
  const moy = (v: (number | null)[]) => {
    const n = v.filter((x): x is number => x !== null)
    return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null
  }
  const profDe = (matId: string) => {
    const cr = s.creneaux.find((x) => x.classeId === c.id && x.matiereId === matId)
    return cr ? nomPersonnel(s, cr.profId) : '—'
  }
  const sommeCoef = mats.filter((m) => r.matieres[m.id] !== null).reduce((a, m) => a + m.coef, 0)
  const sommePoints = mats.reduce((a, m) => a + (r.matieres[m.id] ?? 0) * (r.matieres[m.id] === null ? 0 : m.coef), 0)
  const generale = r.generale
  const moyClasse = (f: (x: (typeof res)[number]) => number | null) => {
    const v = res.map(f).filter((x): x is number => x !== null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const direction = CONFIG.NOM_DIRECTION || NOM_DIRECTION.charAt(0).toUpperCase() + NOM_DIRECTION.slice(1)
  const th = 'px-2 py-1.5 text-left font-semibold text-[8.5pt] text-white'
  const td = 'px-2 py-[0.28rem] border-b border-[#e3e8ef] text-[9pt]'

  return (
    <div className="feuille-a4 relative flex flex-col text-[9.5pt] leading-snug" data-testid="bulletin-a4">
      {provisoire && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden>
          <span className="rotate-[-30deg] text-[44pt] font-semibold text-[#0249A2]/[0.06] whitespace-nowrap titre">Document provisoire</span>
        </div>
      )}
      <EnTeteDocument titre="Bulletin de notes" sousTitre={`${libT(t)} · année ${CONFIG.ANNEE_SCOLAIRE}`} />

      <section className="grid grid-cols-[1.4fr_1fr] gap-6 mt-4">
        <div>
          <div className="text-[8.5pt] text-encre-2">Élève</div>
          <div className="titre text-[15pt] font-medium leading-tight">{e.prenom} {e.nom.toUpperCase()}</div>
          <div className="text-[9pt] text-encre-2 mt-0.5">
            Matricule {e.matricule} · né{e.sexe === 'F' ? 'e' : ''} le {dateCourte(e.naissance)} ({age(e.naissance)} ans){e.redoublant ? ` · redoublant${e.sexe === 'F' ? 'e' : ''}` : ''}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9pt] self-end">
          <span className="text-encre-2">Classe</span><span className="font-semibold text-right">{c.nom}</span>
          <span className="text-encre-2">Effectif</span><span className="font-semibold text-right">{effectif} élèves</span>
          <span className="text-encre-2">{college ? 'Professeur principal' : 'Titulaire'}</span><span className="font-semibold text-right">{titulaire}</span>
        </div>
      </section>

      <table className="w-full mt-4 border-collapse">
        <thead>
          <tr style={{ background: CONFIG.BLEU_MARQUE }}>
            {college ? (
              <>
                <th className={th}>Matière</th>
                <th className={th + ' text-center'}>Coef.</th>
                <th className={th + ' text-center'}>Devoirs</th>
                <th className={th + ' text-center'}>Compo.</th>
                <th className={th + ' text-center'}>Moy. /20</th>
                <th className={th + ' text-center'}>Moy. × coef.</th>
                <th className={th}>Professeur</th>
                <th className={th}>Appréciation</th>
              </>
            ) : (
              <>
                <th className={th}>Domaine</th>
                <th className={th}>Discipline</th>
                <th className={th + ' text-center'}>Coef.</th>
                <th className={th + ' text-center'}>Notes obtenues /10</th>
                <th className={th + ' text-center'}>Moy. /10</th>
                <th className={th + ' text-center'}>Moy. domaine</th>
                <th className={th}>Appréciation</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {college
            ? mats.map((m, i) => {
                const md = moy(valeurs(m.id, 'devoir'))
                const mc = moy(valeurs(m.id, 'composition'))
                const mm = r.matieres[m.id]
                return (
                  <tr key={m.id} className={i % 2 ? 'bg-[#f6f8fb]' : ''}>
                    <td className={td + ' font-semibold'}>{m.nom}</td>
                    <td className={td + ' text-center tabulaire'}>{m.coef}</td>
                    <td className={td + ' text-center tabulaire'}>{noteFixe(md)}</td>
                    <td className={td + ' text-center tabulaire'}>{mc === null ? <span className="text-encre-3">à venir</span> : noteFixe(mc)}</td>
                    <td className={td + ' text-center tabulaire font-semibold'}>{noteFixe(mm)}</td>
                    <td className={td + ' text-center tabulaire'}>{mm === null ? '—' : noteFixe(mm * m.coef)}</td>
                    <td className={td + ' text-[8.5pt] text-encre-2'}>{profDe(m.id)}</td>
                    <td className={td + ' text-[8.5pt]'}>{appreciation(mm, 20)}</td>
                  </tr>
                )
              })
            : DOMAINES_PRIMAIRE.flatMap((d) => {
                const ms = mats.filter((m) => m.domaine === d)
                return ms.map((m, i) => {
                  const mm = r.matieres[m.id]
                  const v = valeurs(m.id)
                  return (
                    <tr key={m.id} className={i === 0 ? 'border-t-2 border-[#c4d4ee]' : ''}>
                      {i === 0 && <td rowSpan={ms.length} className={td + ' font-semibold align-top titre text-[9.5pt]'} style={{ color: CONFIG.BLEU_MARQUE }}>{d}</td>}
                      <td className={td}>{m.nom}</td>
                      <td className={td + ' text-center tabulaire'}>{m.coef}</td>
                      <td className={td + ' text-center tabulaire text-encre-2'}>{v.some((x) => x !== null) ? v.filter((x): x is number => x !== null).map((x) => note(x)).join('   ') : '—'}</td>
                      <td className={td + ' text-center tabulaire font-semibold'}>{noteFixe(mm)}</td>
                      {i === 0 && <td rowSpan={ms.length} className={td + ' text-center tabulaire font-semibold text-[10.5pt] align-middle bg-[#f3f6fb]'}>{noteFixe(r.domaines[d] ?? moyennePonderee(ms, r.matieres))}</td>}
                      <td className={td + ' text-[8.5pt]'}>{appreciation(mm, 10)}</td>
                    </tr>
                  )
                })
              })}
        </tbody>
        {college && (
          <tfoot>
            <tr className="bg-[#eef3fb]">
              <td className={td + ' font-semibold'}>Totaux</td>
              <td className={td + ' text-center tabulaire font-semibold'}>{sommeCoef}</td>
              <td className={td} colSpan={3} />
              <td className={td + ' text-center tabulaire font-semibold'}>{noteFixe(sommePoints)}</td>
              <td className={td} colSpan={2} />
            </tr>
          </tfoot>
        )}
      </table>

      <section className="grid grid-cols-4 mt-4 rounded-lg overflow-hidden border border-[#c4d4ee]">
        <div className="px-3 py-2.5 text-white" style={{ background: CONFIG.BLEU_MARQUE }}>
          <div className="text-[8pt] opacity-80">Moyenne générale</div>
          <div className="titre text-[18pt] font-medium leading-none mt-1 tabulaire">{noteFixe(generale)}<span className="text-[10pt] opacity-80"> / {sur}</span></div>
        </div>
        <div className="px-3 py-2.5 border-l border-[#c4d4ee]">
          <div className="text-[8pt] text-encre-2">Rang</div>
          <div className="titre text-[15pt] leading-none mt-1">{s.parametres.afficherRang ? <>{rangTexte(r.rang, e.sexe)}<span className="text-[9pt] text-encre-2"> sur {effectif}</span></> : <span className="text-[10pt] text-encre-2">Non affiché</span>}</div>
        </div>
        <div className="px-3 py-2.5 border-l border-[#c4d4ee]">
          <div className="text-[8pt] text-encre-2">Moyenne de la classe</div>
          <div className="titre text-[15pt] leading-none mt-1 tabulaire">{noteFixe(st.moyenne)}</div>
          <div className="text-[8pt] text-encre-2 mt-1">plus forte {noteFixe(st.max)} · plus faible {noteFixe(st.min)}</div>
        </div>
        <div className="px-3 py-2.5 border-l border-[#c4d4ee]">
          <div className="text-[8pt] text-encre-2">Assiduité</div>
          <div className="titre text-[15pt] leading-none mt-1 tabulaire">{demi}<span className="text-[9pt] text-encre-2"> demi-journée{demi > 1 ? 's' : ''}</span></div>
          <div className="text-[8pt] text-encre-2 mt-1">dont {demiJ} justifiée{demiJ > 1 ? 's' : ''}{coursManques ? ` · ${coursManques} cours manqué${coursManques > 1 ? 's' : ''}` : ''}</div>
        </div>
      </section>

      <section className="grid grid-cols-[1fr_1.6fr] gap-4 mt-4">
        <div className="rounded-lg border border-[#dce3ec] px-3 py-2.5">
          <div className="text-[8.5pt] text-encre-2 font-semibold">{college ? 'Décision du conseil de classe' : 'Distinction'}</div>
          <div className="mt-1 text-[10pt] font-semibold" style={{ color: decision?.avertissement ? '#B26A00' : decision?.distinction || (generale !== null && generale / sur >= 0.7) ? '#00782A' : '#46526b' }}>
            {decision ? decision.distinction || decision.avertissement || 'Aucune distinction' : generale !== null && generale / sur >= 0.7 ? (provisoire ? 'Proposition : tableau d’honneur' : 'Tableau d’honneur') : provisoire ? 'Décidée en conseil de classe' : 'Aucune distinction'}
          </div>
          {decision?.avertissement && decision.distinction && <div className="text-[9pt] text-[#B26A00]">{decision.avertissement}</div>}
        </div>
        <div className="rounded-lg border border-[#dce3ec] px-3 py-2.5">
          <div className="text-[8.5pt] text-encre-2 font-semibold">Appréciation générale</div>
          <div className="mt-1 text-[9.5pt] italic">{decision?.appreciation || appreciationGenerale(e.prenom, generale, sur, demi)}</div>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-[#dce3ec] px-3 py-2.5">
        <div className="flex justify-between text-[8.5pt]">
          <span className="text-encre-2 font-semibold">Position par rapport à la classe</span>
          <span className="flex items-center gap-3 text-encre-2">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: CONFIG.BLEU_MARQUE }} />{e.prenom}</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-0.5 bg-encre" />Moyenne de la classe</span>
          </span>
        </div>
        <div className={college ? 'grid grid-cols-2 gap-x-6 gap-y-1 mt-2' : 'grid grid-cols-1 gap-y-1.5 mt-2'}>
          {(college ? mats.map((m) => ({ id: m.id, l: m.nom, v: r.matieres[m.id], c: moyClasse((x) => x.matieres[m.id]) })) : DOMAINES_PRIMAIRE.map((d) => ({ id: d, l: d, v: r.domaines[d], c: moyClasse((x) => x.domaines[d]) }))).map((x) => (
            <div key={x.id} className="grid grid-cols-[8.5rem_1fr_2.6rem] items-center gap-2 text-[8.5pt]">
              <span className="truncate">{x.l}</span>
              <span className="relative h-2.5 rounded-full bg-[#eef2f7]">
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${((x.v ?? 0) / sur) * 100}%`, background: CONFIG.BLEU_MARQUE }} />
                {x.c !== null && <span className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-encre" style={{ left: `${(x.c / sur) * 100}%` }} />}
              </span>
              <span className="text-right tabulaire font-semibold">{noteFixe(x.v)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-6 mt-auto pt-6 text-[9pt]">
        <div>
          <div className="text-encre-2">{college ? 'Le professeur principal' : 'Le maître'}</div>
          <div className="font-semibold mt-0.5">{titulaire}</div>
          <div className="h-10" />
        </div>
        <div>
          <div className="text-encre-2">Les parents</div>
          <div className="text-[8pt] text-encre-3 mt-0.5">Lu et pris connaissance</div>
          <div className="h-10" />
        </div>
        <div className="text-right">
          <div className="text-encre-2">{direction}</div>
          <div className="mt-1.5 inline-flex items-center justify-center rounded-full border-2 px-3 py-1.5 text-[8pt] font-semibold rotate-[-5deg]" style={{ borderColor: CONFIG.BLEU_MARQUE, color: CONFIG.BLEU_MARQUE }}>
            {CONFIG.SIGLE} · {CONFIG.VILLE}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <FiletMarque />
        <div className="flex justify-between text-[7.5pt] text-encre-3 mt-1.5">
          <span>{CONFIG.NOM_PLATEFORME} · édité le {dateCourte(JOUR_DEMO)}</span>
          <span>{provisoire ? 'Version provisoire, non publiée' : `Version ${version}${derniere ? ` du ${dateHeure(derniere.date)}` : ''}${derniere && version > 1 ? ` · ${derniere.motif}` : ''}`}</span>
          <span>Une case vide n’est jamais comptée comme un zéro.</span>
        </div>
      </div>
    </div>
  )
}
