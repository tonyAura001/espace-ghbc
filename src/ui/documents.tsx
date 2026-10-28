/** Éléments des documents imprimables : en-tête GHBC, aperçu d'impression A4 / A5 / ticket. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, ZoomIn, ZoomOut } from 'lucide-react'
import { CONFIG } from '../config'
import { Bouton } from './base'
import { useStore } from '../store'

/** En-tête officiel des documents (bulletin, reçu, livret, attestation). */
export function EnTeteDocument({ titre, sousTitre, droite }: { titre?: ReactNode; sousTitre?: ReactNode; droite?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-6 pb-4 border-b-2" style={{ borderColor: CONFIG.BLEU_MARQUE }}>
      <div className="flex items-center gap-4">
        <img src={CONFIG.LOGO_COULEUR} alt="" className="h-[18mm] w-auto" />
        <div className="leading-tight">
          <div className="font-semibold text-[11pt]" style={{ color: CONFIG.BLEU_MARQUE }}>{CONFIG.ECOLE}</div>
          <div className="text-[8.5pt] text-encre-2">Crèche · Maternelle · Primaire · Collège</div>
          <div className="text-[8.5pt] text-encre-2">{CONFIG.ADRESSE}, {CONFIG.VILLE} · {CONFIG.TELEPHONE_ECOLE}</div>
          <div className="text-[8.5pt] text-encre-2">{CONFIG.EMAIL_ECOLE}</div>
        </div>
      </div>
      <div className="text-right">
        {titre && <div className="titre text-[14pt] font-medium text-encre">{titre}</div>}
        {sousTitre && <div className="text-[9pt] text-encre-2 mt-0.5">{sousTitre}</div>}
        {droite}
      </div>
    </header>
  )
}

export function FiletMarque() {
  return (
    <div className="flex h-[3px] w-full" aria-hidden>
      <div className="flex-[3]" style={{ background: CONFIG.BLEU_MARQUE }} />
      <div className="flex-1" style={{ background: CONFIG.VERT_MARQUE }} />
    </div>
  )
}

/**
 * Aperçu d'impression plein écran : la feuille est mise à l'échelle pour tenir à l'écran,
 * et imprimée à taille réelle (Ctrl P ou bouton Imprimer).
 */
export function ApercuImpression({ ouvert, onFermer, titre, children, format = 'A4', actions, onImprimer }: { ouvert: boolean; onFermer: () => void; titre: ReactNode; children: ReactNode; format?: 'A4' | 'A5' | 'ticket' | 'A4-paysage'; actions?: ReactNode; onImprimer?: () => void }) {
  const zone = useRef<HTMLDivElement>(null)
  const [echelle, setEchelle] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [taille, setTaille] = useState({ l: 794, h: 1123 })
  useEffect(() => {
    if (!ouvert || !zone.current) return
    const el = zone.current
    const mesurer = () => setTaille({ l: el.offsetWidth, h: el.offsetHeight })
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ouvert])
  const journaliser = useStore((s) => s.journaliser)

  useEffect(() => {
    if (!ouvert) return
    const largeurMm = { A4: 210, A5: 148, ticket: 80, 'A4-paysage': 297 }[format]
    const hauteurMm = { A4: 297, A5: 210, ticket: 160, 'A4-paysage': 210 }[format]
    const calc = () => {
      const px = 3.7795
      const dispoL = window.innerWidth - (window.innerWidth < 640 ? 16 : 64)
      const dispoH = window.innerHeight - 110
      setEchelle(Math.min(1.25, dispoL / (largeurMm * px), format === 'ticket' ? 1.2 : dispoH / (hauteurMm * px)))
    }
    calc()
    window.addEventListener('resize', calc)
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', echap)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('keydown', echap)
    }
  }, [ouvert, format, onFermer])

  if (!ouvert) return null
  const imprimer = () => {
    onImprimer?.()
    if (!onImprimer) journaliser('Impression', 'Document imprimé', typeof titre === 'string' ? titre : 'Document')
    setTimeout(() => window.print(), 50)
  }
  return createPortal(
    <div className="fixed inset-0 z-[75] bg-[#3a4456] flex flex-col">
      <div className="min-h-14 shrink-0 bg-encre text-white flex flex-wrap items-center gap-x-3 gap-y-1 px-3 sm:px-5 py-2 pas-imprime">
        <span className="font-semibold titre truncate min-w-0 max-sm:basis-[calc(100%-3rem)]">{titre}</span>
        <span className="hidden md:inline text-white/60 text-sm">Aperçu avant impression · {format === 'ticket' ? 'ticket 80 mm' : format === 'A4-paysage' ? 'A4 paysage' : format}</span>
        <div className="flex-1" />
        <button className="hidden sm:block p-2 rounded hover:bg-white/10" onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))} aria-label="Réduire"><ZoomOut className="size-5" /></button>
        <button className="hidden sm:block p-2 rounded hover:bg-white/10" onClick={() => setZoom((z) => Math.min(2, z + 0.15))} aria-label="Agrandir"><ZoomIn className="size-5" /></button>
        {actions}
        <Bouton onClick={imprimer} icone={<Printer className="size-4" />} className="bg-white !text-bleu hover:bg-bleu-clair">Imprimer</Bouton>
        <button className="p-2 rounded hover:bg-white/10 max-sm:order-[-1] max-sm:ml-auto" onClick={onFermer} aria-label="Fermer l’aperçu"><X className="size-5" /></button>
      </div>
      <div className="flex-1 overflow-auto py-3 sm:py-6">
        {/* boîte à la taille réduite : la feuille reste centrée et entièrement accessible au défilement */}
        <div className="mx-auto relative" style={{ width: taille.l * echelle * zoom, height: taille.h * echelle * zoom }}>
          <div className="echelle-apercu absolute left-0 top-0" style={{ transform: `scale(${echelle * zoom})`, transformOrigin: 'top left' }}>
            <div ref={zone} className="zone-impression shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Signature et cachet en pied de document. */
export function Signatures({ gauche, droite }: { gauche: string; droite: string }) {
  return (
    <div className="grid grid-cols-2 gap-10 mt-8 text-[9.5pt]">
      <div>
        <div className="text-encre-2">{gauche}</div>
        <div className="h-14" />
      </div>
      <div className="text-right">
        <div className="text-encre-2">{droite}</div>
        <div className="mt-2 inline-flex items-center justify-center rounded-full border-2 px-4 py-2 text-[8pt] font-semibold rotate-[-6deg]" style={{ borderColor: CONFIG.BLEU_MARQUE, color: CONFIG.BLEU_MARQUE }}>
          {CONFIG.SIGLE} · {CONFIG.VILLE}
        </div>
      </div>
    </div>
  )
}
