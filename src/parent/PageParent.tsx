/** Route /parent : l'espace parent dans un cadre de téléphone (ordinateur) ou en plein écran (téléphone). */
import { Smartphone, ChevronDown } from 'lucide-react'
import { useStore } from '../store'
import { CONFIG } from '../config'
import { CadreTelephone, usePetitEcran, useLargeurMax } from '../ui/cadres'
import { ParentApp } from './ParentApp'
import { famille } from './donnees'
import { PROFILS } from '../store/profils'
import { nomPersonnel } from '../store/selecteurs'
import { useNavigate } from 'react-router-dom'

export default function PageParent() {
  const petit = usePetitEcran()
  if (petit) {
    return (
      <CadreTelephone>
        <ParentApp />
      </CadreTelephone>
    )
  }
  return <PageOrdinateur />
}

function PageOrdinateur() {
  const s = useStore()
  const f = famille(s)
  const nav = useNavigate()
  const parent = f.responsable === 'mere' ? f.mere : f.pere
  const empile = useLargeurMax(1023)
  const selecteur = (
    <div className="relative">
      <select
        aria-label="Changer de profil de démonstration"
        className="w-full appearance-none rounded-lg border border-ligne bg-white px-3 py-2.5 pr-9 cursor-pointer min-h-10"
        value="parent"
        onChange={(e) => {
          const p = PROFILS.find((x) => x.id === e.target.value)!
          s.changerProfil(p.id)
          nav(p.accueil)
        }}
      >
        {PROFILS.map((p) => (
          <option key={p.id} value={p.id}>{nomPersonnel(s, p.userId)} · {p.libelle}</option>
        ))}
      </select>
      <ChevronDown className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-encre-3 pointer-events-none" />
    </div>
  )
  if (empile) {
    // tablette : légende compacte au-dessus, téléphone centré
    return (
      <div className="min-h-dvh bg-brume flex flex-col items-center gap-4 px-5 py-5">
        <div className="w-full max-w-[34rem] flex flex-wrap items-center gap-x-4 gap-y-3">
          <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.ECOLE} className="h-10 w-auto" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-encre-2 text-sm"><Smartphone className="size-4" />Sur le téléphone de la famille</div>
            <h1 className="text-[1.25rem] leading-tight">Espace parent de {parent?.prenom} {parent?.nom}</h1>
          </div>
          <div className="w-full sm:w-[15rem]">{selecteur}</div>
        </div>
        <CadreTelephone hauteur="min(844px, calc(100dvh - 9.5rem))">
          <ParentApp />
        </CadreTelephone>
      </div>
    )
  }
  return (
    <div className="min-h-dvh bg-brume flex items-center justify-center gap-[clamp(2rem,6vw,7rem)] px-8 py-6">
      <div className="max-w-[24rem]">
        <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.ECOLE} className="h-14 w-auto" />
        <div className="flex items-center gap-2 text-encre-2 mt-8"><Smartphone className="size-5" />Sur le téléphone de la famille</div>
        <h1 className="text-[2rem] mt-2 leading-tight">Espace parent de {parent?.prenom} {parent?.nom}</h1>
        <p className="text-encre-2 mt-3 leading-relaxed">Trois enfants, une seule application : la journée de la crèche en direct, les notes et bulletins, les absences, les paiements par mobile money et les messages de l’école.</p>
        <div className="mt-8">
          <span className="text-sm font-semibold text-encre-2">Changer de profil de démonstration</span>
          <div className="mt-1.5">{selecteur}</div>
        </div>
      </div>
      <CadreTelephone>
        <ParentApp />
      </CadreTelephone>
    </div>
  )
}
