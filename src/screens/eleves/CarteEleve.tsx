/** Aperçu de la carte élève au format CR80 (85,6 × 54 mm), recto avec vrai QR. */
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../../config'
import type { Carte, Classe, Eleve } from '../../data/types'
import { QR } from '../../ui/qr'
import { COULEUR_CYCLE, Avatar } from '../../ui/base'
import { NOM_CYCLE } from '../../data/referentiel'
import { dateCourte } from '../../lib/temps'

export function CarteEleveRecto({ eleve, classe, carte, lien, echelle = 1 }: { eleve: Eleve; classe: Classe; carte: Carte; lien: string; echelle?: number }) {
  return (
    <div
      className="relative bg-white rounded-[3mm] overflow-hidden border border-ligne shadow-[0_8px_24px_-12px_rgba(1,42,94,0.35)]"
      style={{ width: `${85.6 * echelle}mm`, height: `${54 * echelle}mm`, fontSize: `${echelle * 7.5}pt` }}
    >
      <div className="absolute inset-x-0 top-0 flex items-center gap-[2mm] px-[3mm]" style={{ height: `${12 * echelle}mm`, background: CONFIG.BLEU_MARQUE }}>
        <img src={CONFIG.LOGO_BLANC} alt="" style={{ height: `${8 * echelle}mm` }} />
        <div className="text-white leading-tight min-w-0">
          <div className="font-semibold truncate" style={{ fontSize: `${echelle * 6.5}pt` }}>{CONFIG.ECOLE}</div>
          <div className="opacity-80" style={{ fontSize: `${echelle * 6}pt` }}>Carte d’élève · {CONFIG.ANNEE_SCOLAIRE}</div>
        </div>
      </div>
      <div className="absolute left-0 right-0 flex" style={{ top: `${12 * echelle}mm`, height: `${1.2 * echelle}mm` }}>
        <div className="flex-[3]" style={{ background: COULEUR_CYCLE[classe.cycle] }} />
        <div className="flex-1" style={{ background: CONFIG.VERT_MARQUE }} />
      </div>
      <div className="absolute flex gap-[3mm]" style={{ top: `${16 * echelle}mm`, left: `${3 * echelle}mm`, right: `${3 * echelle}mm` }}>
        <div className="flex flex-col items-center gap-[1.5mm] shrink-0">
          <Avatar prenom={eleve.prenom} nom={eleve.nom} taille={64 * echelle} />
        </div>
        <div className="min-w-0 flex-1 leading-snug">
          <div className="titre font-medium text-encre truncate" style={{ fontSize: `${echelle * 10}pt` }}>{eleve.prenom}</div>
          <div className="titre font-medium text-encre truncate uppercase" style={{ fontSize: `${echelle * 9}pt` }}>{eleve.nom}</div>
          <div className="text-encre-2 mt-[1mm]">{classe.nom} · {NOM_CYCLE[classe.cycle]}</div>
          <div className="text-encre-2">Né{eleve.sexe === 'F' ? 'e' : ''} le {dateCourte(eleve.naissance)}</div>
          <div className="font-semibold text-encre tabulaire mt-[1mm]">{eleve.matricule}</div>
        </div>
        <QR valeur={lien} taille={Math.round(78 * echelle)} />
      </div>
      <div className="absolute bottom-[1.6mm] left-[3mm] right-[3mm] flex justify-between text-encre-3" style={{ fontSize: `${echelle * 5.5}pt` }}>
        <span>Émise le {dateCourte(carte.emiseLe)}</span>
        <span>En cas de perte : {CONFIG.TELEPHONE_ECOLE}</span>
      </div>
    </div>
  )
}

/** Carte qui s'ajuste à la largeur disponible (téléphone), sans dépasser l'échelle demandée. */
export function CarteEleveAjustee(props: { eleve: Eleve; classe: Classe; carte: Carte; lien: string; echelle?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const max = props.echelle ?? 1
  const [echelle, setEchelle] = useState(max)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const calc = () => setEchelle(Math.min(max, el.clientWidth / (85.6 * 3.7795 + 2)))
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [max])
  return (
    <div ref={ref} className="w-full min-w-0">
      <CarteEleveRecto {...props} echelle={echelle} />
    </div>
  )
}
