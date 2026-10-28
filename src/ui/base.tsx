/** Composants de base du design system. */
import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { Cycle } from '../data/types'
import { NOM_CYCLE } from '../data/referentiel'
import { initiales } from '../lib/format'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

/* ---------------------------------------------------------------- Bouton */
type Variante = 'principal' | 'secondaire' | 'discret' | 'danger' | 'succes' | 'lien'
const VARIANTES: Record<Variante, string> = {
  principal: 'bg-bleu text-white hover:bg-bleu-fonce shadow-sm',
  secondaire: 'bg-white text-bleu border border-bleu-ligne hover:bg-bleu-clair',
  discret: 'text-encre-2 hover:bg-ligne-2 hover:text-encre',
  danger: 'bg-white text-rouge border border-rouge/40 hover:bg-rouge-clair',
  succes: 'bg-vert-texte text-white hover:bg-[#006322] shadow-sm',
  lien: 'text-bleu underline-offset-2 hover:underline px-0',
}

export function Bouton({
  variante = 'principal', taille = 'md', chargement, icone, children, className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; taille?: 'sm' | 'md' | 'lg'; chargement?: boolean; icone?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || chargement}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-55 disabled:cursor-not-allowed whitespace-nowrap select-none',
        taille === 'sm' && 'text-sm px-3 py-1.5',
        taille === 'md' && 'text-[0.95rem] px-4 py-2.5',
        taille === 'lg' && 'text-base px-5 py-3',
        VARIANTES[variante],
        className,
      )}
    >
      {chargement ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icone}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------- Pastilles */
export type Ton = 'neutre' | 'bleu' | 'vert' | 'ambre' | 'rouge'
const TONS: Record<Ton, string> = {
  neutre: 'bg-ligne-2 text-encre-2',
  bleu: 'bg-bleu-clair text-bleu',
  vert: 'bg-vert-clair text-vert-texte',
  ambre: 'bg-ambre-clair text-ambre',
  rouge: 'bg-rouge-clair text-rouge',
}
export function Badge({ ton = 'neutre', children, className, point }: { ton?: Ton; children: ReactNode; className?: string; point?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold whitespace-nowrap', TONS[ton], className)}>
      {point && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

export const COULEUR_CYCLE: Record<Cycle, string> = {
  creche: '#E8735A',
  maternelle: '#E3A600',
  primaire: '#2F6FD6',
  college: '#2E9E5B',
}

export function PastilleCycle({ cycle, libelle, className }: { cycle: Cycle; libelle?: string | false; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <span className="size-2.5 rounded-full shrink-0" style={{ background: COULEUR_CYCLE[cycle] }} aria-hidden />
      {libelle !== false && <span>{libelle ?? NOM_CYCLE[cycle]}</span>}
    </span>
  )
}

/* ---------------------------------------------------------------- Avatar */
const TEINTES = ['#DCE7F7', '#E3F1E8', '#FBE7DF', '#FBF0D2', '#E9E4F5', '#DDF0F2', '#F4E1EA']
const ENCRES = ['#1D4E9E', '#1F6B3C', '#A4482F', '#8A6200', '#5B3F9A', '#1F6A73', '#8F2F5C']
function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
export function Avatar({ prenom, nom, taille = 36, className }: { prenom: string; nom: string; taille?: number; className?: string }) {
  const i = hash(prenom + nom) % TEINTES.length
  return (
    <span
      className={cx(/(^|\s)hidden(\s|$)/.test(className ?? '') ? '' : 'inline-flex', 'items-center justify-center rounded-full font-semibold shrink-0 select-none titre', className)}
      style={{ width: taille, height: taille, background: TEINTES[i], color: ENCRES[i], fontSize: taille * 0.38 }}
      aria-hidden
    >
      {initiales(prenom, nom).toUpperCase()}
    </span>
  )
}

/* ---------------------------------------------------------------- Champs */
export function Champ({ libelle, aide, erreur, children, className }: { libelle: string; aide?: ReactNode; erreur?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-semibold text-encre-2">{libelle}</span>
      {children}
      {erreur ? <span className="text-sm text-rouge">{erreur}</span> : aide ? <span className="text-sm text-encre-3">{aide}</span> : null}
    </label>
  )
}
const champBase = 'rounded-lg border border-ligne bg-white px-3 py-2.5 text-[0.95rem] text-encre placeholder:text-encre-3 focus:border-bleu focus:outline-none focus:ring-3 focus:ring-bleu/15 disabled:bg-brume'
/** Largeur pleine par défaut, sauf si la classe passée fixe déjà une largeur. */
const largeur = (c?: string) => (c && /(^|\s)!?w-/.test(c) ? '' : 'w-full')
export function Saisie(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(champBase, largeur(p.className), p.className)} />
}
export function Liste(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(champBase, largeur(p.className), 'pr-8 cursor-pointer', p.className)} />
}
export function Zone(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(champBase, largeur(p.className), 'min-h-24 resize-y', p.className)} />
}
export function Case({ checked, onChange, libelle, className }: { checked: boolean; onChange: (v: boolean) => void; libelle: ReactNode; className?: string }) {
  return (
    <label className={cx('inline-flex items-center gap-2.5 cursor-pointer select-none', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-[1.1rem] accent-[#0249A2] cursor-pointer" />
      <span>{libelle}</span>
    </label>
  )
}
export function Interrupteur({ actif, onChange, libelle }: { actif: boolean; onChange: (v: boolean) => void; libelle: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={actif} onClick={() => onChange(!actif)} className="inline-flex items-center gap-3 text-left">
      <span className={cx('relative h-6 w-11 rounded-full transition-colors shrink-0', actif ? 'bg-vert-texte' : 'bg-ligne')}>
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', actif ? 'left-[1.4rem]' : 'left-0.5')} />
      </span>
      <span>{libelle}</span>
    </button>
  )
}

/* ---------------------------------------------------------------- Onglets */
export function Onglets<T extends string>({ onglets, actif, onChange, className }: { onglets: { id: T; libelle: ReactNode; compte?: number }[]; actif: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div className={cx('flex gap-1 border-b border-ligne overflow-x-auto defilement max-sm:pr-10 max-sm:[mask-image:linear-gradient(to_right,black_82%,transparent)]', className)} role="tablist">
      {onglets.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={actif === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'relative px-3.5 py-2.5 text-[0.95rem] font-semibold whitespace-nowrap transition-colors',
            actif === o.id ? 'text-bleu' : 'text-encre-2 hover:text-encre',
          )}
        >
          {o.libelle}
          {o.compte !== undefined && <span className="ml-1.5 text-encre-3 font-normal">{o.compte}</span>}
          {actif === o.id && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-bleu" />}
        </button>
      ))}
    </div>
  )
}

export function Segments<T extends string>({ options, valeur, onChange, className }: { options: { id: T; libelle: ReactNode }[]; valeur: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx('inline-flex rounded-lg bg-ligne-2 p-1 gap-1', className)}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={cx('px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap', valeur === o.id ? 'bg-white text-encre shadow-sm' : 'text-encre-2 hover:text-encre')}>
          {o.libelle}
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- Mise en page */
export function EnTetePage({ titre, sousTitre, actions, retour }: { titre: ReactNode; sousTitre?: ReactNode; actions?: ReactNode; retour?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-5">
      <div className="min-w-0">
        {retour}
        <h1 className="text-[1.45rem] sm:text-[1.7rem] text-encre">{titre}</h1>
        {sousTitre && <p className="text-encre-2 mt-1">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Bloc({ titre, actions, children, className, sansMarge, filet }: { titre?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; sansMarge?: boolean; filet?: string }) {
  return (
    <section className={cx('bg-white rounded-xl border border-ligne', className)} style={filet ? { borderTop: `3px solid ${filet}` } : undefined}>
      {(titre || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 pt-4 pb-3">
          {titre && <h2 className="text-[1.08rem] text-encre">{titre}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('min-w-0', sansMarge ? '' : 'px-4 sm:px-5 pb-5')}>{children}</div>
    </section>
  )
}

export function Vide({ icone, titre, texte, action }: { icone?: ReactNode; titre: string; texte?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6 text-encre-2">
      {icone && <div className="mb-3 text-encre-3">{icone}</div>}
      <p className="font-semibold text-encre">{titre}</p>
      {texte && <p className="mt-1 max-w-md">{texte}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Squelette({ className }: { className?: string }) {
  return <div className={cx('squelette', className)} />
}

export function SqueletteTableau({ lignes = 8 }: { lignes?: number }) {
  return (
    <div className="space-y-3 p-5" aria-busy>
      <Squelette className="h-5 w-1/3" />
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Squelette className="h-9 w-9 rounded-full" />
          <Squelette className="h-9 flex-1" />
          <Squelette className="h-9 w-32" />
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- Chiffres */
export function CompteurAnime({ valeur, format, duree = 900 }: { valeur: number; format: (n: number) => string; duree?: number }) {
  const [affiche, setAffiche] = useState(valeur)
  const precedent = useRef(valeur)
  useEffect(() => {
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const de = precedent.current
    precedent.current = valeur
    if (reduit || de === valeur) {
      setAffiche(valeur)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / duree)
      const e = 1 - Math.pow(1 - k, 3)
      setAffiche(de + (valeur - de) * e)
      if (k < 1) raf = requestAnimationFrame(pas)
    }
    raf = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(raf)
  }, [valeur, duree])
  return <>{format(affiche)}</>
}

export function Indicateur({ libelle, valeur, detail, ton, grand }: { libelle: ReactNode; valeur: ReactNode; detail?: ReactNode; ton?: 'vert' | 'ambre' | 'rouge'; grand?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-encre-2 text-[0.95rem]">{libelle}</div>
      <div className={cx('chiffre font-medium mt-1 leading-none', grand ? 'text-[2.6rem]' : 'text-[1.9rem]', ton === 'vert' && 'text-vert-texte', ton === 'ambre' && 'text-ambre', ton === 'rouge' && 'text-rouge')}>{valeur}</div>
      {detail && <div className="text-sm text-encre-2 mt-1.5">{detail}</div>}
    </div>
  )
}

export function Jauge({ valeur, couleur = 'var(--color-vert)', hauteur = 6, fond = 'var(--color-ligne-2)' }: { valeur: number; couleur?: string; hauteur?: number; fond?: string }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: hauteur, background: fond }}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, valeur)) * 100}%`, background: couleur }} />
    </div>
  )
}

/* ------------------------------------------------------ Panneaux, modales */
export function Panneau({ ouvert, onFermer, titre, sousTitre, children, pied, largeur = 'md' }: { ouvert: boolean; onFermer: () => void; titre: ReactNode; sousTitre?: ReactNode; children: ReactNode; pied?: ReactNode; largeur?: 'md' | 'lg' | 'xl' }) {
  useEchap(ouvert, onFermer)
  return (
    <AnimatePresence>
      {ouvert && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div className="absolute inset-0 bg-bleu-nuit/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer} />
          <motion.aside
            role="dialog"
            aria-modal
            className={cx('relative h-full bg-white shadow-panneau flex flex-col w-full', largeur === 'md' && 'max-w-[34rem]', largeur === 'lg' && 'max-w-[46rem]', largeur === 'xl' && 'max-w-[62rem]')}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-ligne">
              <div className="min-w-0">
                <h2 className="text-xl">{titre}</h2>
                {sousTitre && <p className="text-encre-2 mt-0.5">{sousTitre}</p>}
              </div>
              <button onClick={onFermer} className="p-2 -m-1 rounded-lg hover:bg-ligne-2 text-encre-2" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto defilement px-6 py-5">{children}</div>
            {pied && <footer className="px-6 py-4 border-t border-ligne flex flex-wrap justify-end gap-2 bg-brume/60">{pied}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Modale({ ouvert, onFermer, titre, children, pied, large }: { ouvert: boolean; onFermer: () => void; titre: ReactNode; children: ReactNode; pied?: ReactNode; large?: boolean }) {
  useEchap(ouvert, onFermer)
  return (
    <AnimatePresence>
      {ouvert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-bleu-nuit/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer} />
          <motion.div
            role="dialog"
            aria-modal
            className={cx('relative bg-white rounded-2xl shadow-panneau w-full max-h-[92dvh] flex flex-col', large ? 'max-w-[56rem]' : 'max-w-[32rem]')}
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
              <h2 className="text-xl">{titre}</h2>
              <button onClick={onFermer} className="p-2 -m-1 rounded-lg hover:bg-ligne-2 text-encre-2" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </header>
            <div className="px-6 pb-5 overflow-y-auto defilement">{children}</div>
            {pied && <footer className="px-6 py-4 border-t border-ligne flex flex-wrap justify-end gap-2">{pied}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function useEchap(actif: boolean, f: () => void) {
  useEffect(() => {
    if (!actif) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        f()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [actif, f])
}

/** Ligne libellé / valeur dans une fiche. */
export function Ligne({ libelle, children, className }: { libelle: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex justify-between gap-4 py-2 border-b border-ligne-2 last:border-0', className)}>
      <span className="text-encre-2 shrink-0">{libelle}</span>
      <span className="text-right min-w-0">{children}</span>
    </div>
  )
}

export function Alerte({ ton = 'ambre', titre, children, icone, action }: { ton?: 'ambre' | 'rouge' | 'bleu' | 'vert'; titre: ReactNode; children?: ReactNode; icone?: ReactNode; action?: ReactNode }) {
  const c = { ambre: 'bg-ambre-clair border-ambre/30 text-ambre', rouge: 'bg-rouge-clair border-rouge/30 text-rouge', bleu: 'bg-bleu-clair border-bleu/20 text-bleu', vert: 'bg-vert-clair border-vert/30 text-vert-texte' }[ton]
  return (
    <div className={cx('flex flex-wrap sm:flex-nowrap gap-3 items-start rounded-xl border px-4 py-3', c)}>
      {icone && <span className="mt-0.5 shrink-0">{icone}</span>}
      <div className="min-w-0 flex-1 basis-[calc(100%-2.5rem)] sm:basis-auto">
        <div className="font-semibold">{titre}</div>
        {children && <div className="text-encre mt-0.5">{children}</div>}
      </div>
      {action && <div className="max-sm:w-full max-sm:pl-8">{action}</div>}
    </div>
  )
}
