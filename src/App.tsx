/** Routage (HashRouter : fonctionne en ligne et en fichier local) et barrières d'accès. */
import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store'
import { profilParId } from './store/profils'
import { Coquille, Toasts } from './shell/Coquille'
import Verrou from './screens/Verrou'
import Connexion from './screens/Connexion'
import { ROUTES_ECOLE, ROUTES_PUBLIQUES, ROUTES_FAMILLES } from './routes'
import { Presentation } from './presentation/Presentation'

function Protege() {
  const deverrouille = useStore((s) => s.session.deverrouille)
  const connecte = useStore((s) => s.session.connecte)
  const profilId = useStore((s) => s.session.profilId)
  const loc = useLocation()
  if (!deverrouille) return <Verrou />
  if (!connecte) return loc.pathname === '/connexion' ? <Connexion /> : <Navigate to="/connexion" replace />
  const profil = profilParId(profilId)
  return (
    <Routes>
      <Route path="/connexion" element={<Navigate to={profil.accueil} replace />} />
      {ROUTES_FAMILLES.map((r) => (
        <Route key={r.path} path={r.path} element={r.element} />
      ))}
      <Route element={<Coquille />}>
        {ROUTES_ECOLE.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route path="*" element={<Navigate to={profil.accueil} replace />} />
      </Route>
    </Routes>
  )
}

/** Défile en haut de page à chaque changement d'écran. */
function RemonteEnHaut() {
  const loc = useLocation()
  useEffect(() => {
    document.getElementById('contenu')?.scrollTo({ top: 0 })
  }, [loc.pathname])
  return null
}

/** Flux d'événements simulés (touche L) : paiements, journal de la crèche, portail. */
function FluxSimule() {
  const actif = useStore((s) => s.ui.fluxActif)
  const connecte = useStore((s) => s.session.connecte)
  const tick = useStore((s) => s.tickFlux)
  useEffect(() => {
    if (!actif || !connecte) return
    let t: ReturnType<typeof setTimeout>
    const boucle = () => {
      t = setTimeout(() => {
        tick()
        boucle()
      }, 9000 + Math.random() * 9000)
    }
    boucle()
    return () => clearTimeout(t)
  }, [actif, connecte, tick])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <RemonteEnHaut />
      <FluxSimule />
      <Routes>
        {ROUTES_PUBLIQUES.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route path="*" element={<Protege />} />
      </Routes>
      <Presentation />
      <Toasts />
    </HashRouter>
  )
}
