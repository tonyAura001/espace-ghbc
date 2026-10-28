/** Pastilles de compétences et calculs partagés de la maternelle. */
import type { Eleve, NiveauCompetence } from '../../data/types'
import { COMPETENCES_MATERNELLE, LIBELLE_COMPETENCE } from '../../data/referentiel'
import { cx } from '../../ui/base'

export const ORDRE: NiveauCompetence[] = ['A', 'EC', 'PE', 'NE']
export const suivant = (v: NiveauCompetence): NiveauCompetence => ORDRE[(ORDRE.indexOf(v) + 1) % ORDRE.length]

export const STYLE_NIVEAU: Record<NiveauCompetence, { fond: string; bord: string; texte: string }> = {
  A: { fond: '#02A73A', bord: '#02A73A', texte: '#00782A' },
  EC: { fond: '#E3A600', bord: '#E3A600', texte: '#8A6200' },
  PE: { fond: '#FFFFFF', bord: '#E8735A', texte: '#A4482F' },
  NE: { fond: '#FFFFFF', bord: '#C4CCD8', texte: '#6B7690' },
}

export function Pastille({ niveau, taille = 22, className }: { niveau: NiveauCompetence; taille?: number; className?: string }) {
  const st = STYLE_NIVEAU[niveau]
  return (
    <span
      className={cx('inline-block rounded-full shrink-0', className)}
      style={{ width: taille, height: taille, background: niveau === 'EC' ? `linear-gradient(90deg, ${st.fond} 50%, #fff 50%)` : st.fond, border: `2px ${niveau === 'NE' ? 'dashed' : 'solid'} ${st.bord}` }}
      aria-label={LIBELLE_COMPETENCE[niveau]}
    />
  )
}

export function Legende() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem]">
      {ORDRE.map((n) => (
        <span key={n} className="inline-flex items-center gap-2"><Pastille niveau={n} taille={18} />{LIBELLE_COMPETENCE[n]}</span>
      ))}
    </div>
  )
}

export const DOMAINES = [...new Set(COMPETENCES_MATERNELLE.map((c) => c.domaine))]

export function niveauDe(competences: Record<string, NiveauCompetence>, eleveId: string, compId: string, t: number): NiveauCompetence {
  return competences[`${eleveId}|${compId}|${t}`] ?? 'NE'
}

const EXPRESSION: Record<string, string> = {
  'Langage oral': 'à l’oral',
  'Graphisme et écriture': 'en graphisme',
  'Nombres et formes': 'avec les nombres et les formes',
  Motricité: 'en motricité',
  'Vivre ensemble': 'dans la vie de la classe',
  'Arts et découverte': 'en chant et en découverte du monde',
}

/** Appréciation rédigée à partir des compétences (modifiable par la maîtresse). */
export function appreciationAuto(e: Eleve, competences: Record<string, NiveauCompetence>, t: number): string {
  const n = COMPETENCES_MATERNELLE.map((c) => niveauDe(competences, e.id, c.id, t))
  const evaluees = n.filter((x) => x !== 'NE').length
  const acquis = n.filter((x) => x === 'A').length
  const il = e.sexe === 'F' ? 'Elle' : 'Il'
  const forts = DOMAINES.filter((d) => COMPETENCES_MATERNELLE.filter((c) => c.domaine === d).every((c) => niveauDe(competences, e.id, c.id, t) === 'A'))
  if (!evaluees) return `${e.prenom} découvre la classe et ses camarades. Les observations de ce trimestre sont en cours.`
  const ratio = acquis / evaluees
  const debut = ratio > 0.65 ? `Très bon trimestre pour ${e.prenom}.` : ratio > 0.35 ? `${e.prenom} progresse régulièrement.` : `${e.prenom} a besoin d’encouragements et de temps.`
  const milieu = forts.length ? ` ${il} est particulièrement à l’aise ${EXPRESSION[forts[0]] ?? 'en classe'}.` : ` ${il} participe volontiers aux activités de la classe.`
  const fin = ratio > 0.65 ? ' Continuons ainsi !' : ' Lire des histoires et chanter ensemble à la maison l’aidera beaucoup.'
  return debut + milieu + fin
}
