/** Page publique ouverte par le QR d'une carte : « Carte authentique » ou « Carte non reconnue ». */
import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ShieldCheck, ShieldX, ShieldAlert, Phone } from 'lucide-react'
import { useStore } from '../store'
import { lireCarte } from '../lib/verif'
import { CONFIG } from '../config'
import { dateCourte, dateLongueMaj, JOUR_DEMO, heureFr, heureDemo } from '../lib/temps'
import { initiales } from '../lib/format'
import { cx } from '../ui/base'

const TYPE = { eleve: 'Carte élève', accompagnateur: 'Carte accompagnateur', personnel: 'Carte personnel' } as const

export default function VerifCarte() {
  const { jeton = '' } = useParams()
  const donnees = lireCarte(jeton)
  const carte = useStore((s) => (donnees ? s.cartes.find((c) => c.id === donnees.id) : undefined))
  const journalise = useRef(false)

  // chaque vérification est journalisée (ajout seul)
  useEffect(() => {
    if (journalise.current) return
    journalise.current = true
    const st = useStore.getState()
    useStore.setState({
      audit: [
        ...st.audit,
        {
          id: `AUD-R${Date.now().toString(36).toUpperCase()}V`, date: `${JOUR_DEMO}T${heureDemo()}:00`, userId: 'SYS', userNom: 'Vérification publique', role: 'QR code de carte',
          type: 'Carte', action: donnees ? 'Carte vérifiée par QR code' : 'QR code de carte non reconnu', objet: donnees ? `${donnees.n} · ${TYPE[donnees.t]}` : 'Jeton invalide', eleveId: donnees?.t === 'eleve' && carte ? carte.titulaireId : null, avant: null, apres: null,
        },
      ],
    })
  }, [donnees, carte])

  const desactivee = carte?.statut === 'desactivee'
  const etat: 'ok' | 'desactivee' | 'inconnue' = !donnees ? 'inconnue' : desactivee ? 'desactivee' : 'ok'
  const [prenom, ...reste] = (donnees?.n ?? '').split(' ')

  return (
    <div className="min-h-dvh bg-brume flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-[26rem]">
        <header className="flex items-center gap-3">
          <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.ECOLE} className="h-12 w-auto" />
          <div className="leading-tight">
            <div className="font-semibold text-bleu">{CONFIG.NOM_PLATEFORME}</div>
            <div className="text-sm text-encre-2">Vérification d’une carte</div>
          </div>
        </header>

        <div className={cx('mt-6 rounded-2xl p-5 text-white', etat === 'ok' ? 'bg-vert-texte' : 'bg-rouge')} data-testid={`verif-carte-${etat}`}>
          {etat === 'ok' ? <ShieldCheck className="size-10" /> : etat === 'desactivee' ? <ShieldAlert className="size-10" /> : <ShieldX className="size-10" />}
          <h1 className="text-[1.75rem] mt-2 leading-tight">{etat === 'ok' ? 'Carte authentique' : etat === 'desactivee' ? 'Carte désactivée' : 'Carte non reconnue'}</h1>
          <p className="text-white/90 mt-1">
            {etat === 'ok'
              ? `Émise par le ${CONFIG.ECOLE}, valable pour l’année ${CONFIG.ANNEE_SCOLAIRE}.`
              : etat === 'desactivee'
                ? `${carte?.motifDesactivation ?? 'Carte retirée'}. Ne pas l’accepter : une nouvelle carte a été remise à son titulaire.`
                : 'Ce QR code n’a pas été émis par l’école ou il a été modifié.'}
          </p>
        </div>

        {donnees ? (
          <section className="mt-4 bg-white rounded-2xl border border-ligne p-5">
            <div className="flex items-center gap-4">
              <span className="size-16 rounded-full bg-bleu-clair text-bleu flex items-center justify-center titre text-xl font-semibold shrink-0">{initiales(prenom ?? '', reste.join(' ')).toUpperCase()}</span>
              <div className="min-w-0">
                <div className="text-encre-2 text-sm">{TYPE[donnees.t]}</div>
                <div className="titre text-xl leading-tight">{donnees.n}</div>
                <div className="text-encre-2">{donnees.c}</div>
              </div>
            </div>
            <dl className="mt-4 divide-y divide-ligne-2">
              {donnees.mat && <Info l="Matricule" v={donnees.mat} />}
              {donnees.enf && donnees.enf.length > 0 && <Info l="Peut récupérer" v={donnees.enf.join(', ')} />}
              <Info l="Émise le" v={dateCourte(donnees.em)} />
              <Info l="Statut" v={etat === 'ok' ? 'Active' : 'Désactivée'} ton={etat === 'ok' ? 'vert' : 'rouge'} />
              <Info l="Vérifiée le" v={`${dateLongueMaj(JOUR_DEMO)} à ${heureFr(heureDemo())}`} />
            </dl>
          </section>
        ) : (
          <section className="mt-4 bg-white rounded-2xl border border-ligne p-5">
            <h2 className="text-lg">Que faire ?</h2>
            <ul className="mt-2 space-y-2 text-encre">
              <li>Ne remettez aucun enfant sur la foi de cette carte.</li>
              <li>Demandez une pièce d’identité et faites patienter la personne.</li>
              <li>Prévenez le secrétariat de l’école.</li>
            </ul>
          </section>
        )}

        <div className="mt-4 flex items-center gap-3 bg-white rounded-2xl border border-ligne px-5 py-4">
          <Phone className="size-5 text-bleu shrink-0" />
          <div>
            <div className="text-sm text-encre-2">Secrétariat de l’école</div>
            <div className="font-semibold tabulaire">{CONFIG.TELEPHONE_ECOLE}</div>
          </div>
        </div>
        <p className="text-center text-xs text-encre-3 mt-5">Le QR code ne contient qu’un jeton de vérification signé. Chaque vérification est inscrite au journal de l’école.</p>
      </div>
    </div>
  )
}

function Info({ l, v, ton }: { l: string; v: string; ton?: 'vert' | 'rouge' }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-encre-2">{l}</dt>
      <dd className={cx('text-right font-semibold', ton === 'vert' && 'text-vert-texte', ton === 'rouge' && 'text-rouge')}>{v}</dd>
    </div>
  )
}
