/** Coquille de l'application : barre latérale, en-tête, notifications, profils, vue double. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, Search, ChevronDown, LogOut, Menu, CheckCircle2, Info, AlertTriangle, OctagonAlert, Smartphone, X } from 'lucide-react'
import { useStore } from '../store'
import { PROFILS, profilParId } from '../store/profils'
import { nomPersonnel } from '../store/selecteurs'
import { navigationPour, routeAutorisee } from './navigation'
import { Avatar, cx } from '../ui/base'
import { CONFIG } from '../config'
import { JOUR_DEMO, dateLongueMaj, minutesEnHhmm, relatif } from '../lib/temps'
import { useMinutes } from '../ui/hooks'
import { Recherche } from './Recherche'
import { CadreTelephone } from '../ui/cadres'
import { ParentApp } from '../parent/ParentApp'

export function Coquille() {
  const profilId = useStore((s) => s.session.profilId)
  const vueDouble = useStore((s) => s.ui.vueDouble)
  const barre = useStore((s) => s.ui.presentation.ouverte)
  const profil = profilParId(profilId)
  const loc = useLocation()
  const autorise = routeAutorisee(profil.role, loc.pathname)
  const [menu, setMenu] = useState(false)
  useEffect(() => setMenu(false), [loc.pathname, profilId])

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* ordinateur : barre latérale fixe ; tablette et téléphone : menu coulissant */}
      <div className="hidden min-[64rem]:flex">
        <BarreLaterale />
      </div>
      <AnimatePresence>
        {menu && (
          <div className="fixed inset-0 z-[65] flex min-[64rem]:hidden">
            <motion.div className="absolute inset-0 bg-bleu-nuit/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
            <motion.div className="relative h-full flex shadow-panneau" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <BarreLaterale onFermer={() => setMenu(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex-1 min-w-0 flex flex-col">
        <EnTete onMenu={() => setMenu(true)} />
        <div className="flex-1 min-h-0 flex">
          <main className="flex-1 min-w-0 overflow-y-auto defilement" id="contenu">
            <AnimatePresence mode="wait">
              <motion.div
                key={profilId + (vueDouble ? 'd' : '')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.26, ease: 'easeOut' }}
                className={cx('px-[clamp(1rem,2.2vw,2.5rem)] pt-5 sm:pt-6 max-w-[120rem] mx-auto', barre ? 'pb-48' : 'pb-8')}
              >
                {autorise ? <Outlet /> : <AccesRefuse />}
              </motion.div>
            </AnimatePresence>
          </main>
          {vueDouble && <div className="hidden min-[64rem]:flex"><PanneauTelephone /></div>}
        </div>
      </div>
      <Recherche />
      <TransitionProfil />
    </div>
  )
}

function AccesRefuse() {
  const profil = profilParId(useStore((s) => s.session.profilId))
  const nav = useNavigate()
  return (
    <div className="max-w-xl mx-auto mt-16 bg-white border border-ligne rounded-2xl p-8 text-center">
      <h1 className="text-2xl">Cet écran n’est pas ouvert au profil {profil.libelle.toLowerCase()}</h1>
      <p className="text-encre-2 mt-2">Chaque rôle ne voit que ce dont il a besoin. Changez de profil en haut à droite, ou revenez à votre accueil.</p>
      <button onClick={() => nav(profil.accueil)} className="mt-5 rounded-lg bg-bleu text-white font-semibold px-4 py-2.5">Revenir à mon accueil</button>
    </div>
  )
}

/* ----------------------------------------------------------- Vue double */
function PanneauTelephone() {
  const setUi = useStore((s) => s.setUi)
  return (
    <aside className="shrink-0 border-l border-ligne bg-[#e9eef5] flex flex-col items-center justify-center px-6 py-4 gap-3">
      <div className="flex items-center gap-2 text-encre-2 text-sm">
        <Smartphone className="size-4" /> Téléphone de la maman
        <button onClick={() => setUi({ vueDouble: false })} className="ml-2 p-1 rounded hover:bg-white" aria-label="Fermer la vue double">
          <X className="size-4" />
        </button>
      </div>
      <CadreTelephone hauteur="min(780px, calc(100dvh - 9rem))">
        <ParentApp />
      </CadreTelephone>
    </aside>
  )
}

/* ------------------------------------------------------- Barre latérale */
function BarreLaterale({ onFermer }: { onFermer?: () => void }) {
  const role = profilParId(useStore((s) => s.session.profilId)).role
  const groupes = useMemo(() => navigationPour(role), [role])
  const nbValidations = useStore((s) => s.validations.filter((v) => v.statut === 'en_attente').length)
  return (
    <nav className="w-[15.5rem] 2xl:w-[17rem] max-w-[85vw] h-full shrink-0 bg-bleu text-white flex flex-col" aria-label="Navigation principale">
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-2">
        <div>
          <img src={CONFIG.LOGO_BLANC} alt={CONFIG.SIGLE} className="h-12 w-auto" />
          <div className="mt-2 text-[0.82rem] text-white/75 leading-snug">{CONFIG.NOM_PLATEFORME}</div>
        </div>
        {onFermer && (
          <button onClick={onFermer} className="p-2 -mr-2 rounded-lg hover:bg-white/10" aria-label="Fermer le menu">
            <X className="size-5" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto defilement px-3 pb-4 [scrollbar-color:rgba(255,255,255,.25)_transparent]">
        {groupes.map((g) => (
          <div key={g.titre} className="mt-3 first:mt-0">
            <div className="px-3 pb-1 text-[0.8rem] text-white/60">{g.titre}</div>
            {g.elements.map((e) => (
              <NavLink
                key={e.route}
                to={e.route}
                end={e.route === '/caisse'}
                className={({ isActive }) =>
                  cx('flex items-center gap-3 rounded-lg px-3 py-[0.45rem] text-[0.95rem] transition-colors', isActive ? 'bg-white text-bleu font-semibold' : 'text-white/90 hover:bg-white/10')
                }
              >
                <e.icone className="size-[1.05rem] shrink-0" aria-hidden />
                <span className="truncate flex-1">{e.libelle}</span>
                {e.route === '/validations' && nbValidations > 0 && <span className="rounded-full bg-[#FFC94D] text-bleu-nuit text-xs font-bold px-1.5 min-w-5 text-center">{nbValidations}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="px-5 py-3 text-[0.78rem] text-white/60 border-t border-white/10">
        {CONFIG.SIGLE} · {CONFIG.VILLE} · Année {CONFIG.ANNEE_SCOLAIRE}
      </div>
    </nav>
  )
}

/* -------------------------------------------------------------- En-tête */
function EnTete({ onMenu }: { onMenu: () => void }) {
  const setUi = useStore((s) => s.setUi)
  const badge = useStore((s) => s.ui.badgeDemo)
  const m = useMinutes()
  return (
    <header className="h-[4.1rem] shrink-0 bg-white border-b border-ligne flex items-center gap-2 sm:gap-4 px-[clamp(0.75rem,2vw,2rem)]">
      <button onClick={onMenu} className="min-[64rem]:hidden p-2 -ml-1 rounded-lg hover:bg-ligne-2" aria-label="Ouvrir le menu">
        <Menu className="size-6 text-encre" />
      </button>
      <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.SIGLE} className="h-8 w-auto sm:hidden" />
      <button
        onClick={() => setUi({ rechercheOuverte: true })}
        className="sm:hidden p-2.5 rounded-lg hover:bg-ligne-2 ml-auto"
        aria-label="Rechercher"
      >
        <Search className="size-[1.3rem] text-encre-2" />
      </button>
      <button
        onClick={() => setUi({ rechercheOuverte: true })}
        className="hidden sm:flex items-center gap-3 rounded-lg border border-ligne bg-brume px-3.5 py-2 text-encre-3 hover:border-bleu-ligne w-[clamp(14rem,30vw,28rem)] min-w-0 text-left"
      >
        <Search className="size-[1.1rem]" />
        <span className="flex-1 truncate">Rechercher un élève, une famille, un reçu…</span>
        <kbd className="hidden xl:inline text-xs border border-ligne rounded px-1.5 py-0.5 bg-white">Ctrl K</kbd>
      </button>
      <div className="hidden sm:block flex-1" />
      <div className="hidden lg:flex flex-col items-end leading-tight">
        <span className="font-semibold">{dateLongueMaj(JOUR_DEMO)}</span>
        <span className="text-sm text-encre-2">Année {CONFIG.ANNEE_SCOLAIRE} · {minutesEnHhmm(m).replace(':', ' h ')}</span>
      </div>
      {badge && <span className="hidden sm:inline rounded-md border border-dashed border-ambre/60 bg-ambre-clair px-2 py-0.5 text-[0.78rem] font-semibold text-ambre" title="Données fictives · touche D pour masquer">Démo</span>}
      <Notifications />
      <SelecteurProfil />
    </header>
  )
}

const ICONE_NIVEAU = { succes: CheckCircle2, info: Info, attention: AlertTriangle, alerte: OctagonAlert }
const COULEUR_NIVEAU = { succes: 'text-vert-texte', info: 'text-bleu', attention: 'text-ambre', alerte: 'text-rouge' }

function Notifications() {
  const [ouvert, setOuvert] = useState(false)
  const toutes = useStore((s) => s.notifications)
  const notifs = useMemo(() => toutes.filter((n) => n.cible === 'ecole'), [toutes])
  const lire = useStore((s) => s.lireNotifications)
  const nonLues = notifs.filter((n) => !n.lu).length
  const nav = useNavigate()
  const ref = useClicExterieur(() => setOuvert(false))
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOuvert(!ouvert); if (!ouvert) setTimeout(() => lire('ecole'), 1500) }} className="relative p-2.5 rounded-lg hover:bg-ligne-2" aria-label={`Notifications, ${nonLues} non lues`}>
        <Bell className="size-[1.3rem] text-encre-2" />
        {nonLues > 0 && <span className="absolute top-1 right-1 min-w-[1.15rem] h-[1.15rem] rounded-full bg-rouge text-white text-[0.7rem] font-bold flex items-center justify-center px-1">{nonLues}</span>}
      </button>
      <AnimatePresence>
        {ouvert && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(25rem,calc(100vw-1.5rem))] max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[4.4rem] max-sm:w-auto bg-white rounded-xl shadow-panneau border border-ligne z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-ligne font-semibold flex justify-between">
              Notifications <span className="text-encre-2 font-normal">{nonLues} non lue{nonLues > 1 ? 's' : ''}</span>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto defilement">
              {notifs.slice(0, 14).map((n) => {
                const I = ICONE_NIVEAU[n.niveau]
                return (
                  <li key={n.id}>
                    <button onClick={() => { if (n.lien) nav(n.lien); setOuvert(false) }} className={cx('w-full text-left flex gap-3 px-4 py-3 border-b border-ligne-2 hover:bg-brume', !n.lu && 'bg-bleu-clair/40')}>
                      <I className={cx('size-5 shrink-0 mt-0.5', COULEUR_NIVEAU[n.niveau])} />
                      <span className="min-w-0">
                        <span className="block font-semibold">{n.titre}</span>
                        <span className="block text-encre-2 text-sm">{n.texte}</span>
                        <span className="block text-encre-3 text-xs mt-1">{relatif(n.date)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SelecteurProfil() {
  const [ouvert, setOuvert] = useState(false)
  const profilId = useStore((s) => s.session.profilId)
  const changer = useStore((s) => s.changerProfil)
  const deconnecter = useStore((s) => s.deconnecter)
  const etat = useStore()
  const profil = profilParId(profilId)
  const nav = useNavigate()
  const ref = useClicExterieur(() => setOuvert(false))
  const nom = nomPersonnel(etat, profil.userId)
  const [p, n] = nom.split(' ')
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOuvert(!ouvert)} className="flex items-center gap-2.5 rounded-lg pl-1.5 pr-1.5 sm:pr-2.5 py-1.5 hover:bg-ligne-2" aria-haspopup="menu">
        <Avatar prenom={p ?? ''} nom={n ?? ''} taille={36} />
        <span className="hidden lg:flex flex-col items-start leading-tight">
          <span className="font-semibold max-w-[11rem] truncate">{nom}</span>
          <span className="text-sm text-encre-2">{profil.libelle}</span>
        </span>
        <ChevronDown className="hidden sm:block size-4 text-encre-3" />
      </button>
      <AnimatePresence>
        {ouvert && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(22rem,calc(100vw-1.5rem))] max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[4.4rem] max-sm:w-auto bg-white rounded-xl shadow-panneau border border-ligne z-50 overflow-hidden" role="menu">
            <div className="px-4 py-3 border-b border-ligne text-sm text-encre-2">Profils de démonstration</div>
            <ul className="max-h-[62vh] overflow-y-auto defilement py-1">
              {PROFILS.map((pr) => {
                const nm = nomPersonnel(etat, pr.userId)
                const [a, b] = nm.split(' ')
                return (
                  <li key={pr.id}>
                    <button
                      onClick={() => { setOuvert(false); changer(pr.id); nav(pr.accueil) }}
                      className={cx('w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-brume', pr.id === profilId && 'bg-bleu-clair')}
                    >
                      <Avatar prenom={a ?? ''} nom={b ?? ''} taille={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold truncate">{nm}</span>
                        <span className="block text-sm text-encre-2">{pr.libelle}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button onClick={() => { deconnecter(); nav('/connexion') }} className="w-full flex items-center gap-2 px-4 py-3 border-t border-ligne text-encre-2 hover:bg-brume">
              <LogOut className="size-4" /> Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Carte « Bonjour … » au changement de profil. */
function TransitionProfil() {
  const profilId = useStore((s) => s.session.profilId)
  const etat = useStore()
  const [visible, setVisible] = useState<string | null>(null)
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current) { premier.current = false; return }
    setVisible(profilId)
    const t = setTimeout(() => setVisible(null), 1100)
    return () => clearTimeout(t)
  }, [profilId])
  const pr = visible ? profilParId(visible) : null
  const nom = pr ? nomPersonnel(etat, pr.userId) : ''
  const [a, b] = nom.split(' ')
  return (
    <AnimatePresence>
      {pr && (
        <motion.div
          className="fixed top-20 left-1/2 z-[80] -translate-x-1/2 w-max max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-panneau border border-ligne px-5 py-3.5 flex items-center gap-3.5"
          initial={{ opacity: 0, y: -14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <Avatar prenom={a ?? ''} nom={b ?? ''} taille={42} />
          <div>
            <div className="text-encre-2 text-sm">Session ouverte</div>
            <div className="font-semibold text-lg titre">{pr.id === 'direction' && !CONFIG.NOM_DIRECTION ? 'La Direction' : nom} · {pr.libelle}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function useClicExterieur(f: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) f()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [f])
  return ref
}

/* ---------------------------------------------------------------- Toasts */
export function Toasts() {
  const toasts = useStore((s) => s.ui.toasts)
  const fermer = useStore((s) => s.fermerToast)
  return (
    <div className="fixed z-[90] flex flex-col gap-2 w-[24rem] max-w-[calc(100vw-1.5rem)] bottom-5 right-5 max-[520px]:bottom-auto max-[520px]:top-3 max-[520px]:right-3 pointer-events-none [&>*]:pointer-events-auto" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => {
          const I = ICONE_NIVEAU[t.niveau]
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="bg-white rounded-xl shadow-panneau border border-ligne px-3 py-2 sm:px-4 sm:py-3 flex gap-3">
              <I className={cx('size-5 shrink-0 mt-0.5', COULEUR_NIVEAU[t.niveau])} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{t.titre}</div>
                {t.texte && <div className="hidden sm:block text-encre-2 text-sm">{t.texte}</div>}
              </div>
              <button onClick={() => fermer(t.id)} className="text-encre-3 hover:text-encre self-start" aria-label="Fermer"><X className="size-4" /></button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
