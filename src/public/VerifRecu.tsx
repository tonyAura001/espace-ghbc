/** Page publique ouverte par le QR code d'un reçu : « Reçu authentique ». */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BadgeCheck, OctagonX, ShieldQuestion, Phone, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { lireRecu } from '../lib/verif'
import { LIBELLE_MODE } from '../data/referentiel'
import { money, numeroRecu } from '../lib/format'
import { dateLongueMaj, heureFr } from '../lib/temps'
import { CONFIG } from '../config'
import type { ModePaiement } from '../data/types'

export default function VerifRecu() {
  const { jeton = '' } = useParams()
  const d = lireRecu(jeton)
  const p = useStore((s) => (d ? s.paiements.find((x) => x.id === d.id && x.numero === d.n) : undefined))
  const [verifie, setVerifie] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVerifie(true), 650)
    return () => clearTimeout(t)
  }, [])
  const annule = p?.statut === 'annule'

  return (
    <div className="min-h-dvh bg-brume flex flex-col items-center px-4 py-6">
      <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.ECOLE} className="h-14 w-auto" />
      <div className="text-encre-2 text-sm mt-2 text-center">{CONFIG.ECOLE}</div>
      <main className="w-full max-w-[26rem] mt-5 bg-white rounded-3xl border border-ligne overflow-hidden shadow-[0_20px_50px_-30px_rgba(1,42,94,0.4)]">
        {!verifie ? (
          <div className="flex flex-col items-center py-16 text-encre-2">
            <Loader2 className="size-8 animate-spin text-bleu" />
            <p className="mt-3">Vérification du reçu…</p>
          </div>
        ) : !d ? (
          <div className="p-7 text-center">
            <ShieldQuestion className="size-16 mx-auto text-ambre" />
            <h1 className="text-2xl mt-3">Reçu non reconnu</h1>
            <p className="text-encre-2 mt-2">Ce QR code n’a pas été émis par {CONFIG.SIGLE}, ou il a été modifié. Ne vous fiez pas à ce document.</p>
            <a href={`tel:${CONFIG.TELEPHONE_ECOLE.replace(/\s/g, '')}`} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-bleu text-white font-semibold px-4 py-2.5"><Phone className="size-4" /> Appeler l’école</a>
            <p className="text-sm text-encre-3 mt-2">{CONFIG.TELEPHONE_ECOLE}</p>
          </div>
        ) : (
          <>
            <div className={annule ? 'bg-rouge text-white px-6 py-7 text-center' : 'bg-vert-texte text-white px-6 py-7 text-center'}>
              <div className="mx-auto size-24 rounded-full bg-white/15 flex items-center justify-center ring-4 ring-white/30">
                {annule ? <OctagonX className="size-14" /> : <BadgeCheck className="size-14" />}
              </div>
              <h1 className="text-[1.8rem] mt-3 text-white">{annule ? 'Reçu annulé' : 'Reçu authentique'}</h1>
              <p className="text-white/85 mt-1">{annule ? 'Ce reçu a été annulé par la Direction. Il ne vaut plus paiement.' : `Ce reçu a bien été émis par ${CONFIG.SIGLE}.`}</p>
            </div>
            <dl className="px-6 py-5 divide-y divide-ligne-2">
              <Ligne t="Numéro" v={<span className="chiffre">{numeroRecu(d.n)}</span>} />
              <Ligne t="Montant" v={<span className={annule ? 'chiffre text-xl line-through text-encre-3' : 'chiffre text-xl text-vert-texte'}>{money(d.m)}</span>} />
              <Ligne t="Date" v={`${dateLongueMaj(d.d.slice(0, 10))} à ${heureFr(d.d)}`} />
              <Ligne t="Famille" v={d.f} />
              <Ligne t="Payé par" v={d.p} />
              {d.e.length > 0 && <Ligne t={d.e.length > 1 ? 'Élèves' : 'Élève'} v={d.e.join(', ')} />}
              <Ligne t="Mode" v={LIBELLE_MODE[d.mo as ModePaiement] ?? d.mo} />
              {annule && p?.annulation && <Ligne t="Motif d’annulation" v={p.annulation.motif} />}
            </dl>
            <p className="px-6 pb-6 text-sm text-encre-2">Le QR code contient un jeton signé : toute modification du reçu le rend invalide. En cas de doute, appelez l’école au {CONFIG.TELEPHONE_ECOLE}.</p>
          </>
        )}
      </main>
      <p className="text-xs text-encre-3 mt-6">{CONFIG.NOM_PLATEFORME} · vérification des documents</p>
    </div>
  )
}

function Ligne({ t, v }: { t: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-encre-2 shrink-0">{t}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  )
}
