/** Briques des applications mobiles (parent, élève) : mise à l'échelle dans le cadre, cartes, titres. */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../ui/base'

/** Largeur logique de conception des écrans mobiles. */
const LARGEUR = 380

/**
 * Remplit son conteneur et, si celui-ci est plus étroit qu'un vrai téléphone
 * (cadre réduit sur un petit écran d'ordinateur), met l'application à l'échelle.
 */
export function AdaptateurMobile({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [dim, setDim] = useState({ w: LARGEUR, h: 800 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const maj = () => setDim({ w: el.clientWidth || LARGEUR, h: el.clientHeight || 800 })
    maj()
    const ro = new ResizeObserver(maj)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const k = Math.min(1, dim.w / LARGEUR)
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div className="flex flex-col bg-brume relative" style={{ width: dim.w / k, height: dim.h / k, transform: k < 1 ? `scale(${k})` : undefined, transformOrigin: '0 0' }}>
        {children}
      </div>
    </div>
  )
}

export function CarteM({ children, className, onClick, testId }: { children: ReactNode; className?: string; onClick?: () => void; testId?: string }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} data-testid={testId} className={cx('block w-full text-left bg-white rounded-2xl border border-ligne px-4 py-3.5', onClick && 'active:bg-brume hover:border-bleu-ligne transition-colors', className)}>
      {children}
    </C>
  )
}

export function TitreM({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-5 mb-2 px-0.5">
      <h2 className="text-[1.02rem] text-encre">{children}</h2>
      {action}
    </div>
  )
}

export function BoutonM({ children, onClick, variante = 'principal', className, disabled, chargement, testId }: { children: ReactNode; onClick?: () => void; variante?: 'principal' | 'secondaire' | 'succes' | 'danger'; className?: string; disabled?: boolean; chargement?: boolean; testId?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || chargement}
      data-testid={testId}
      className={cx(
        'w-full rounded-xl py-3.5 font-semibold text-[1rem] transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
        variante === 'principal' && 'bg-bleu text-white active:bg-bleu-fonce',
        variante === 'secondaire' && 'bg-white text-bleu border border-bleu-ligne active:bg-bleu-clair',
        variante === 'succes' && 'bg-vert-texte text-white',
        variante === 'danger' && 'bg-white text-rouge border border-rouge/40',
        className,
      )}
    >
      {chargement && <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

/** Puces de choix d'un enfant ou d'un filtre. */
export function Puces<T extends string>({ options, valeur, onChange }: { options: { id: T; libelle: ReactNode }[]; valeur: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto defilement -mx-1 px-1 pb-1">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={cx('shrink-0 rounded-full px-3.5 py-1.5 font-semibold text-[0.92rem] border transition-colors', valeur === o.id ? 'bg-bleu text-white border-bleu' : 'bg-white text-encre-2 border-ligne')}>
          {o.libelle}
        </button>
      ))}
    </div>
  )
}
