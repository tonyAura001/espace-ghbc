/** Cadres de présentation : téléphone et tablette (CSS pur, même arbre React, pas d'iframe). */
import { useEffect, useState, type ReactNode } from 'react'
import { Wifi, BatteryMedium, Signal } from 'lucide-react'
import { cx } from './base'
import { useMinutes } from './hooks'
import { minutesEnHhmm } from '../lib/temps'

function BarreEtat({ sombre }: { sombre?: boolean }) {
  const m = useMinutes()
  return (
    <div className={cx('flex items-center justify-between px-6 pt-2.5 pb-1 text-[13px] font-semibold', sombre ? 'text-white' : 'text-encre')}>
      <span className="tabulaire">{minutesEnHhmm(m)}</span>
      <span className="flex items-center gap-1.5">
        <Signal className="size-3.5" />
        <Wifi className="size-3.5" />
        <BatteryMedium className="size-4" />
      </span>
    </div>
  )
}

/**
 * Cadre de téléphone (390 × 844 points, mis à l'échelle de la hauteur disponible).
 * Sur un vrai téléphone (largeur < 520 px), le contenu s'affiche en plein écran sans cadre.
 */
export function CadreTelephone({ children, className, hauteur = 'min(844px, calc(100dvh - 7rem))', sombre }: { children: ReactNode; className?: string; hauteur?: string; sombre?: boolean }) {
  const petit = usePetitEcran()
  if (petit) return <div className="fixed inset-0 bg-brume flex flex-col">{children}</div>
  return (
    <>
      <div className={cx('relative shrink-0', className)} style={{ height: hauteur, aspectRatio: '390 / 844' }}>
        <div className="absolute inset-0 rounded-[3.2rem] bg-[#0d1626] p-[0.65rem] shadow-[0_30px_60px_-20px_rgba(1,42,94,0.45)]">
          <div className="relative h-full w-full rounded-[2.65rem] overflow-hidden bg-brume flex flex-col">
            <div className="absolute left-1/2 top-2 -translate-x-1/2 h-[1.6rem] w-[6.5rem] rounded-full bg-[#0d1626] z-20" aria-hidden />
            <div className={cx('relative z-10', sombre ? 'bg-bleu' : 'bg-white')}>
              <BarreEtat sombre={sombre} />
            </div>
            <div className="flex-1 min-h-0 relative">{children}</div>
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-28 rounded-full bg-encre/70 z-20" aria-hidden />
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Cadre de tablette (format paysage). Sur un écran étroit (téléphone, tablette en portrait),
 * le contenu s'affiche directement, sans cadre, sur toute la largeur.
 */
export function CadreTablette({ children, className }: { children: ReactNode; className?: string }) {
  const etroit = useLargeurMax(900)
  if (etroit) return <div className={cx('w-full rounded-2xl border border-ligne overflow-hidden bg-brume flex flex-col h-[calc(100dvh-9.5rem)] min-h-[34rem]', className)}>{children}</div>
  return (
    <div className={cx('relative w-full max-w-[72rem] mx-auto', className)} style={{ aspectRatio: '1180 / 820', maxHeight: 'calc(100dvh - 9rem)' }}>
      <div className="absolute inset-0 rounded-[2.2rem] bg-[#1b2433] p-[0.9rem] shadow-[0_30px_60px_-20px_rgba(1,42,94,0.4)]">
        <div className="h-full w-full rounded-[1.4rem] overflow-hidden bg-brume flex flex-col">
          <div className="bg-white">
            <BarreEtat />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  )
}

/** Vrai si la fenêtre est plus étroite que `px`. */
export function useLargeurMax(px: number): boolean {
  const q = `(max-width: ${px}px)`
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const h = () => setV(m.matches)
    h()
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [q])
  return v
}

/** Vrai téléphone : largeur inférieure à 520 px. */
export function usePetitEcran(): boolean {
  const q = '(max-width: 520px)'
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const h = () => setV(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return v
}
