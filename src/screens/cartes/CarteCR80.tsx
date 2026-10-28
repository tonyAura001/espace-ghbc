/**
 * Carte CR80 (85,6 × 54 mm) : recto et verso, pour les trois types de cartes.
 * Dessinée en millimètres réels (impression exacte), mise à l'échelle à l'écran par `echelle`.
 */
import { create } from 'zustand'
import type { Donnees } from '../../data/generer'
import type { Carte, Cycle } from '../../data/types'
import { indexClasses, indexEleves, indexFamilles, indexPersonnel } from '../../store/selecteurs'
import { lienCarte } from '../../lib/verif'
import { CONFIG } from '../../config'
import { COULEUR_CYCLE } from '../../ui/base'
import { QR } from '../../ui/qr'
import { dateCourte } from '../../lib/temps'
import { initiales } from '../../lib/format'

export const LARGEUR_MM = 85.6
export const HAUTEUR_MM = 54
const MM = 3.7795 // pixels CSS par millimètre

export interface InfoCarte {
  prenom: string
  nom: string
  typeLibelle: string
  ligne1: string
  ligne2: string
  cycle: Cycle | null
  enfants: string[]
  numero: string
}

export const LIBELLE_TYPE_CARTE: Record<Carte['type'], string> = {
  eleve: 'Carte élève',
  accompagnateur: 'Carte accompagnateur',
  personnel: 'Carte personnel',
}

export function numeroCarte(c: Carte) {
  return `GHBC-${c.id.split('-').pop()}`
}

export function infoCarte(s: Donnees, c: Carte): InfoCarte {
  const numero = numeroCarte(c)
  if (c.type === 'eleve') {
    const e = indexEleves(s.eleves)[c.titulaireId]
    const cl = e ? indexClasses(s.classes)[e.classeId] : undefined
    return { prenom: e?.prenom ?? '', nom: e?.nom ?? '', typeLibelle: 'Carte élève', ligne1: cl?.nom ?? '', ligne2: e ? `Matricule ${e.matricule}` : '', cycle: cl?.cycle ?? null, enfants: [], numero }
  }
  if (c.type === 'personnel') {
    const p = indexPersonnel(s.personnel)[c.titulaireId]
    return { prenom: p?.prenom ?? '', nom: p?.nom ?? '', typeLibelle: 'Carte personnel', ligne1: p?.fonction ?? '', ligne2: p?.tel ?? '', cycle: p?.cycle ?? null, enfants: [], numero }
  }
  const [fid, aid] = c.titulaireId.split(':')
  const f = indexFamilles(s.familles)[fid]
  const a = f?.accompagnateurs.find((x) => x.id === aid)
  const enfants = s.eleves.filter((e) => e.familleId === fid && e.statut === 'actif').map((e) => e.prenom)
  return { prenom: a?.prenom ?? '', nom: a?.nom ?? '', typeLibelle: 'Carte accompagnateur', ligne1: `${a?.lien ?? ''} · famille ${f?.nom ?? ''}`, ligne2: a?.tel ?? '', cycle: null, enfants, numero }
}

/** Sélection de la planche d'impression, partagée entre le studio et la planche. */
export const usePlanche = create<{ ids: string[]; ajouter: (id: string) => void; retirer: (id: string) => void; vider: () => void; definir: (ids: string[]) => void }>()((set) => ({
  ids: [],
  ajouter: (id) => set((st) => ({ ids: st.ids.includes(id) ? st.ids : [...st.ids, id] })),
  retirer: (id) => set((st) => ({ ids: st.ids.filter((x) => x !== id) })),
  vider: () => set({ ids: [] }),
  definir: (ids) => set({ ids }),
}))

function Cadre({ echelle, children, ombre }: { echelle: number; children: React.ReactNode; ombre?: boolean }) {
  return (
    <div style={{ width: LARGEUR_MM * MM * echelle, height: HAUTEUR_MM * MM * echelle }} className="shrink-0">
      <div
        className={ombre ? 'shadow-[0_8px_24px_-8px_rgba(1,42,94,0.35)]' : ''}
        style={{
          width: `${LARGEUR_MM}mm`, height: `${HAUTEUR_MM}mm`, transform: `scale(${echelle})`, transformOrigin: 'top left',
          borderRadius: '3.2mm', overflow: 'hidden', background: '#fff', position: 'relative', border: '0.2mm solid #DCE3EC', boxSizing: 'border-box',
          fontFamily: 'var(--font-texte)', color: '#14213D',
        }}
      >
        {children}
      </div>
    </div>
  )
}

const TEINTES = ['#DCE7F7', '#E3F1E8', '#FBE7DF', '#FBF0D2', '#E9E4F5', '#DDF0F2', '#F4E1EA']
const ENCRES = ['#1D4E9E', '#1F6B3C', '#A4482F', '#8A6200', '#5B3F9A', '#1F6A73', '#8F2F5C']
function teinte(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % TEINTES.length
}

export function CarteRecto({ s, carte, echelle = 1, ombre }: { s: Donnees; carte: Carte; echelle?: number; ombre?: boolean }) {
  const info = infoCarte(s, carte)
  const couleur = info.cycle ? COULEUR_CYCLE[info.cycle] : carte.type === 'accompagnateur' ? CONFIG.VERT_MARQUE : CONFIG.BLEU_MARQUE
  const t = teinte(info.prenom + info.nom)
  const desactivee = carte.statut !== 'active'
  return (
    <Cadre echelle={echelle} ombre={ombre}>
      {/* filet du cycle */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '1.6mm', background: couleur }} />
      {/* en-tête */}
      <div style={{ position: 'absolute', left: '4.5mm', right: '3.5mm', top: '3mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={CONFIG.LOGO_COULEUR} alt="" style={{ height: '8.5mm', width: 'auto' }} />
        <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
          <div style={{ fontFamily: 'var(--font-titre)', fontWeight: 600, fontSize: '7.2pt', color: CONFIG.BLEU_MARQUE }}>{info.typeLibelle}</div>
          <div style={{ fontSize: '6pt', color: '#46526B' }}>Année {CONFIG.ANNEE_SCOLAIRE}</div>
        </div>
      </div>
      {/* identité */}
      <div style={{ position: 'absolute', left: '4.5mm', top: '15.5mm', display: 'flex', gap: '3mm', alignItems: 'flex-start', right: '25mm' }}>
        <div style={{ width: '15mm', height: '15mm', borderRadius: '50%', background: TEINTES[t], color: ENCRES[t], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-titre)', fontWeight: 600, fontSize: '15pt', flexShrink: 0, boxShadow: `0 0 0 0.6mm #fff, 0 0 0 1mm ${couleur}` }}>
          {initiales(info.prenom, info.nom).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, lineHeight: 1.18 }}>
          <div style={{ fontSize: '7pt', color: '#46526B' }}>{info.prenom}</div>
          <div style={{ fontFamily: 'var(--font-titre)', fontWeight: 600, fontSize: '11pt', textTransform: 'uppercase', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.nom}</div>
          <div style={{ fontSize: '7pt', marginTop: '1mm', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '1mm' }}>
            {info.cycle && <span style={{ width: '1.8mm', height: '1.8mm', borderRadius: '50%', background: couleur, display: 'inline-block' }} />}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.ligne1}</span>
          </div>
          <div style={{ fontSize: '6.4pt', color: '#46526B', fontVariantNumeric: 'tabular-nums' }}>{info.ligne2}</div>
        </div>
      </div>
      {info.enfants.length > 0 && (
        <div style={{ position: 'absolute', left: '4.5mm', right: '25mm', top: '35mm', fontSize: '6.2pt', lineHeight: 1.25 }}>
          <span style={{ color: '#46526B' }}>Autorisé à récupérer : </span>
          <b>{info.enfants.join(', ')}</b>
        </div>
      )}
      {/* QR */}
      <div style={{ position: 'absolute', right: '3.5mm', top: '15mm', width: '19mm', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '0.6mm', border: '0.2mm solid #DCE3EC', borderRadius: '1mm' }}>
          <QR valeur={lienCarte(s, carte)} taille={Math.round(17.6 * MM)} />
        </div>
        <div style={{ fontSize: '5.4pt', color: '#46526B', marginTop: '0.8mm', fontVariantNumeric: 'tabular-nums' }}>{info.numero}</div>
      </div>
      {/* bandeau bas */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '6.2mm', background: CONFIG.BLEU_MARQUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3.5mm 0 4.5mm', fontSize: '6.2pt' }}>
        <span style={{ fontWeight: 600 }}>{CONFIG.SIGLE} · {CONFIG.VILLE}</span>
        <span>Émise le {dateCourte(carte.emiseLe)}</span>
      </div>
      <div style={{ position: 'absolute', left: '62%', right: 0, bottom: '6.2mm', height: '0.8mm', background: CONFIG.VERT_MARQUE }} />
      {desactivee && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ border: '0.6mm solid #C0262D', color: '#C0262D', fontFamily: 'var(--font-titre)', fontWeight: 600, fontSize: '12pt', padding: '1mm 3mm', borderRadius: '1.5mm', transform: 'rotate(-8deg)', background: '#fff' }}>DÉSACTIVÉE</span>
        </div>
      )}
    </Cadre>
  )
}

export function CarteVerso({ s, carte, echelle = 1, ombre }: { s: Donnees; carte: Carte; echelle?: number; ombre?: boolean }) {
  const info = infoCarte(s, carte)
  const consignes =
    carte.type === 'eleve'
      ? ['Présenter la carte au portail à chaque entrée.', 'L’enfant ne sort qu’avec un adulte autorisé par sa famille.', 'En cas de perte, prévenir aussitôt le secrétariat.']
      : carte.type === 'accompagnateur'
        ? ['Présenter la carte au portail pour récupérer un enfant.', 'Sans cette carte, aucun enfant n’est remis.', 'En cas de perte, prévenir aussitôt le secrétariat.']
        : ['Porter la carte de façon visible dans l’établissement.', 'Badger au portail à l’arrivée et au départ.', 'En cas de perte, prévenir aussitôt le secrétariat.']
  return (
    <Cadre echelle={echelle} ombre={ombre}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '2mm', display: 'flex' }}>
        <div style={{ flex: 3, background: CONFIG.BLEU_MARQUE }} />
        <div style={{ flex: 1, background: CONFIG.VERT_MARQUE }} />
      </div>
      <div style={{ position: 'absolute', left: '4.5mm', right: '4.5mm', top: '5mm', lineHeight: 1.3 }}>
        <div style={{ fontFamily: 'var(--font-titre)', fontWeight: 600, fontSize: '8pt', color: CONFIG.BLEU_MARQUE }}>Carte personnelle, à présenter au portail</div>
        <ul style={{ margin: '1.6mm 0 0', padding: 0, listStyle: 'none', fontSize: '6.6pt' }}>
          {consignes.map((c) => (
            <li key={c} style={{ display: 'flex', gap: '1.4mm', marginTop: '0.8mm' }}>
              <span style={{ width: '1.2mm', height: '1.2mm', borderRadius: '50%', background: CONFIG.VERT_MARQUE, marginTop: '1.1mm', flexShrink: 0 }} />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ position: 'absolute', left: '4.5mm', right: '4.5mm', bottom: '4mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '6.2pt', color: '#46526B', lineHeight: 1.3 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#14213D' }}>{CONFIG.ECOLE}</div>
          <div>{CONFIG.ADRESSE}, {CONFIG.VILLE}</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>Secrétariat : {CONFIG.TELEPHONE_ECOLE}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>N° {info.numero}</div>
          <div>Valable jusqu’au 30/06/2027</div>
        </div>
      </div>
    </Cadre>
  )
}
