/** Écran de mot de passe (simulation côté client, voir README). */
import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useStore } from '../store'
import { CONFIG } from '../config'
import { Bouton, Saisie } from '../ui/base'
import { latence } from '../ui/hooks'

export default function Verrou() {
  const deverrouiller = useStore((s) => s.deverrouiller)
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const valider = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnCours(true)
    await latence(350, 600)
    setEnCours(false)
    if (mdp.trim() === CONFIG.MOT_DE_PASSE_DEMO) deverrouiller()
    else setErreur('Mot de passe incorrect. Vérifiez les minuscules et les chiffres, puis réessayez.')
  }
  return (
    <div className="min-h-dvh flex items-center justify-center bg-brume px-4">
      <form onSubmit={valider} className="w-full max-w-[25rem] bg-white rounded-2xl border border-ligne p-6 sm:p-8 shadow-[0_20px_50px_-30px_rgba(1,42,94,0.4)]">
        <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.ECOLE} className="h-20 w-auto mx-auto" />
        <h1 className="text-center text-xl mt-5">{CONFIG.NOM_PLATEFORME}</h1>
        <p className="text-center text-encre-2 mt-1">Accès réservé à la présentation</p>
        <label className="block mt-6">
          <span className="text-sm font-semibold text-encre-2">Mot de passe</span>
          <div className="relative mt-1.5">
            <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
            <Saisie type="password" autoFocus value={mdp} onChange={(e) => { setMdp(e.target.value); setErreur(null) }} className="pl-9" aria-invalid={!!erreur} />
          </div>
        </label>
        {erreur && <p className="text-rouge text-sm mt-2">{erreur}</p>}
        <Bouton type="submit" className="w-full mt-5" taille="lg" chargement={enCours}>Entrer</Bouton>
      </form>
    </div>
  )
}
