/**
 * Mode présentation : barre discrète en bas de l'écran et raccourcis clavier.
 * P barre · → / Espace avancer · ← reculer · R remise à zéro · T minuteur · D badge Démo · V vue double · L flux simulé
 */
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, RotateCcw, Timer, X, Radio, Columns2 } from 'lucide-react'
import { useStore, type Etat } from '../store'
import { SCENARIO, DUREE_TOTALE, type Etape } from './scenario'
import { presentsParCycle, encaisseJour, familleEnRetard, recouvrementDetail } from '../store/selecteurs'
import { money, nombre, pct } from '../lib/format'
import { ID } from '../data/generer'
import { cx } from '../ui/base'

/** Remplace les valeurs calculées dans les textes « À dire ». */
export function remplirTexte(t: string, s: Etat) {
  const valeurs: Record<string, string> = {
    presentsAujourdhui: nombre(presentsParCycle(s).presents.total),
    encaisseAujourdhui: money(encaisseJour(s)),
    famillesEnRetard: nombre(familleEnRetard(s).length),
    recouvrement: pct(recouvrementDetail(s).taux, 1),
    effectif: nombre(presentsParCycle(s).effectif.total),
    actionsJournal: nombre(s.audit.filter((a) => a.id.startsWith('AUD-R')).length),
  }
  return t.replace(/\{(\w+)\}/g, (_, k) => valeurs[k] ?? `{${k}}`)
}

function format(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Presentation() {
  const s = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const p = s.ui.presentation
  const [maintenant, setMaintenant] = useState(Date.now())
  const etape = SCENARIO[p.etape]

  useEffect(() => {
    if (!p.ouverte) return
    const t = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(t)
  }, [p.ouverte])

  const appliquer = useCallback(
    (e: Etape, sous: number) => {
      const st = useStore.getState()
      const cible = sous === 1 && e.ensuite ? e.ensuite : e
      st.changerProfil(cible.profil)
      st.setUi({ vueDouble: !!cible.vueDouble, rechercheOuverte: false })
      if (cible.ecranParent) {
        const enfant = cible.ecranParent === 'creche' ? ID.mariama : cible.ecranParent === 'paiements' ? ID.fatoumata : undefined
        st.allerParent(cible.ecranParent, { enfantId: enfant })
      }
      nav(cible.route)
    },
    [nav],
  )

  const aller = useCallback(
    (i: number, sous = 0) => {
      const idx = Math.max(0, Math.min(SCENARIO.length - 1, i))
      useStore.getState().setPresentation({ etape: idx, sous, debutEtape: Date.now(), debut: useStore.getState().ui.presentation.debut ?? Date.now() })
      appliquer(SCENARIO[idx], sous)
    },
    [appliquer],
  )

  const suivant = useCallback(() => {
    const pr = useStore.getState().ui.presentation
    const e = SCENARIO[pr.etape]
    if (e.ensuite && pr.sous === 0) aller(pr.etape, 1)
    else if (pr.etape < SCENARIO.length - 1) aller(pr.etape + 1)
  }, [aller])
  const precedent = useCallback(() => {
    const pr = useStore.getState().ui.presentation
    if (pr.sous === 1) aller(pr.etape, 0)
    else if (pr.etape > 0) aller(pr.etape - 1)
  }, [aller])

  // raccourcis clavier
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      const cible = ev.target as HTMLElement
      const saisie = cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.tagName === 'SELECT' || cible.isContentEditable)
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault()
        useStore.getState().setUi({ rechercheOuverte: !useStore.getState().ui.rechercheOuverte })
        return
      }
      if (saisie || ev.ctrlKey || ev.metaKey || ev.altKey) return
      const st = useStore.getState()
      if (!st.session.deverrouille || !st.session.connecte) return
      if (loc.pathname.startsWith('/verifier') || loc.pathname.startsWith('/preinscription')) return
      const k = ev.key.toLowerCase()
      if (k === 'p') {
        const ouvrir = !st.ui.presentation.ouverte
        st.setPresentation({ ouverte: ouvrir, debut: st.ui.presentation.debut ?? Date.now(), debutEtape: st.ui.presentation.debutEtape ?? Date.now() })
        if (ouvrir && st.ui.presentation.debut === null) aller(0)
      } else if (k === 'r') {
        st.reinitialiser()
        st.toast({ titre: 'Démonstration remise à zéro', texte: 'Toutes les données ont été régénérées.', niveau: 'info' })
        if (st.ui.presentation.ouverte) setTimeout(() => aller(0), 0)
        else nav('/accueil')
      } else if (k === 't') st.setPresentation({ minuteur: !st.ui.presentation.minuteur })
      else if (k === 'd') st.setUi({ badgeDemo: !st.ui.badgeDemo })
      else if (k === 'v') st.setUi({ vueDouble: !st.ui.vueDouble })
      else if (k === 'l') {
        st.setUi({ fluxActif: !st.ui.fluxActif })
        st.toast({ titre: st.ui.fluxActif ? 'Flux d’événements en pause' : 'Flux d’événements relancé', niveau: 'info' })
      } else if (st.ui.presentation.ouverte && (ev.key === 'ArrowRight' || ev.key === ' ')) {
        if (ev.key === ' ' && (cible.tagName === 'BUTTON' || cible.tagName === 'A')) return
        ev.preventDefault()
        suivant()
      } else if (st.ui.presentation.ouverte && ev.key === 'ArrowLeft') {
        ev.preventDefault()
        precedent()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [aller, suivant, precedent, nav, loc.pathname])

  if (!s.session.connecte) return null
  const ecoule = p.debut ? (maintenant - p.debut) / 1000 : 0
  const ecouleEtape = p.debutEtape ? (maintenant - p.debutEtape) / 1000 : 0
  const depasse = ecouleEtape > etape.cible

  return (
    <AnimatePresence>
      {p.ouverte && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[85] w-[min(70rem,calc(100vw-1.5rem))] rounded-2xl bg-bleu-nuit/95 text-white shadow-panneau backdrop-blur"
          data-testid="barre-presentation"
        >
          <div className="flex flex-wrap sm:flex-nowrap items-start gap-x-4 gap-y-2 px-3 sm:px-5 py-3">
            <div className="shrink-0 pt-0.5">
              <div className="chiffre text-2xl leading-none">{p.etape + 1}<span className="text-white/50 text-base">/{SCENARIO.length}</span></div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold titre">{etape.titre}</span>
                {p.sous === 1 && etape.ensuite && <span className="text-white/70 text-sm">puis {etape.ensuite.libelle}</span>}
              </div>
              <p className="text-white/90 mt-1 leading-snug">« {remplirTexte(etape.aDire, s)} »</p>
              <ul className="hidden sm:flex mt-1.5 flex-wrap gap-x-4 gap-y-0.5 text-sm text-white/65">
                {etape.gestes.map((g) => (
                  <li key={g}>· {remplirTexte(g, s)}</li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 flex sm:flex-col max-sm:w-full max-sm:justify-between items-center sm:items-end gap-2">
              {p.minuteur && (
                <div className="flex items-center gap-2 text-sm tabulaire">
                  <Timer className="size-4 text-white/60" />
                  <span className={cx(depasse ? 'text-[#FFC94D]' : 'text-white')}>{format(ecouleEtape)} / {format(etape.cible)}</span>
                  <span className="text-white/50">· total {format(ecoule)} / {format(DUREE_TOTALE)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Icone titre="Étape précédente (←)" onClick={precedent} disabled={p.etape === 0 && p.sous === 0}><ChevronLeft className="size-5" /></Icone>
                <Icone titre="Étape suivante (→)" onClick={suivant} disabled={p.etape === SCENARIO.length - 1 && (!etape.ensuite || p.sous === 1)}><ChevronRight className="size-5" /></Icone>
                <Icone titre="Vue double (V)" onClick={() => s.setUi({ vueDouble: !s.ui.vueDouble })} actif={s.ui.vueDouble}><Columns2 className="size-4" /></Icone>
                <Icone titre="Flux simulé (L)" onClick={() => s.setUi({ fluxActif: !s.ui.fluxActif })} actif={s.ui.fluxActif}><Radio className="size-4" /></Icone>
                <Icone titre="Remettre à zéro (R)" onClick={() => { s.reinitialiser(); setTimeout(() => aller(0), 0) }}><RotateCcw className="size-4" /></Icone>
                <Icone titre="Fermer (P)" onClick={() => s.setPresentation({ ouverte: false })}><X className="size-4" /></Icone>
              </div>
            </div>
          </div>
          <div className="flex gap-1 px-5 pb-2.5">
            {SCENARIO.map((e, i) => (
              <button key={e.titre} onClick={() => aller(i)} title={`${i + 1}. ${e.titre}`} className={cx('h-1.5 flex-1 rounded-full transition-colors', i < p.etape ? 'bg-white/70' : i === p.etape ? 'bg-[#FFC94D]' : 'bg-white/20 hover:bg-white/35')} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Icone({ children, onClick, titre, disabled, actif }: { children: React.ReactNode; onClick: () => void; titre: string; disabled?: boolean; actif?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={titre} aria-label={titre} className={cx('p-2 rounded-lg hover:bg-white/15 disabled:opacity-30', actif && 'bg-white/15')}>
      {children}
    </button>
  )
}
