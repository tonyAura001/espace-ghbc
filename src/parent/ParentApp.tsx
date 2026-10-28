/**
 * Espace parent (application mobile de la famille fil rouge).
 * Navigation par l'état du store (session.parent.ecran) : le même composant s'affiche dans
 * le cadre de téléphone de la vue double et en plein écran sur un vrai téléphone.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { House, Baby, BookOpen, Wallet, MessageCircle, Bell, ChevronLeft } from 'lucide-react'
import { useStore, type EcranParent } from '../store'
import { CONFIG } from '../config'
import { cx } from '../ui/base'
import { AdaptateurMobile } from './mobile'
import { famille, enfants, prenomParent, ecranDeLien, allerParent } from './donnees'
import { relatif, maintenant } from '../lib/temps'
import AccueilParent from './ecrans/AccueilParent'
import CrecheParent from './ecrans/CrecheParent'
import NotesParent from './ecrans/NotesParent'
import BulletinParent from './ecrans/BulletinParent'
import AbsencesParent from './ecrans/AbsencesParent'
import { PaiementsParent, PayerParent, RecuParent } from './ecrans/PaiementsParent'
import { MessagesParent, ConversationParent } from './ecrans/MessagesParent'
import AutorisationsParent from './ecrans/AutorisationsParent'

const ONGLETS: { id: EcranParent; libelle: string; icone: typeof House }[] = [
  { id: 'accueil', libelle: 'Accueil', icone: House },
  { id: 'creche', libelle: 'Journée', icone: Baby },
  { id: 'notes', libelle: 'Notes', icone: BookOpen },
  { id: 'paiements', libelle: 'Paiements', icone: Wallet },
  { id: 'messages', libelle: 'Messages', icone: MessageCircle },
]

const TITRES: Record<EcranParent, string> = {
  accueil: CONFIG.NOM_PLATEFORME,
  creche: 'Journée de Mariama',
  notes: 'Notes et bulletins',
  bulletin: 'Bulletin',
  absences: 'Absences',
  paiements: 'Paiements',
  payer: 'Payer',
  recu: 'Reçu',
  messages: 'Messages',
  conversation: 'Conversation',
  autorisations: 'Autorisations',
}

/** Écran parent de rattachement d'un sous-écran, pour l'onglet actif. */
const ONGLET_DE: Partial<Record<EcranParent, EcranParent>> = { bulletin: 'notes', payer: 'paiements', recu: 'paiements', conversation: 'messages', absences: 'accueil', autorisations: 'accueil' }

export function ParentApp() {
  return (
    <AdaptateurMobile>
      <Application />
    </AdaptateurMobile>
  )
}

function Application() {
  const ecran = useStore((s) => s.session.parent.ecran)
  const historique = useStore((s) => s.session.parent.historique)
  const retour = useStore((s) => s.retourParent)
  const notifications = useStore((s) => s.notifications)
  const messages = useStore((s) => s.messages)
  const conversations = useStore((s) => s.conversations)
  const liaisons = useStore((s) => s.liaisons)
  const s = useStore.getState()
  const [cloche, setCloche] = useState(false)
  const defile = useRef<HTMLDivElement>(null)

  const notifsParent = useMemo(() => notifications.filter((n) => n.cible === 'parent'), [notifications])
  const nonLues = notifsParent.filter((n) => !n.lu).length
  const messagesNonLus = useMemo(() => {
    const ids = new Set(conversations.filter((c) => c.familleId === famille(s).id).map((c) => c.id))
    return messages.filter((m) => ids.has(m.conversationId) && m.auteur === 'ecole' && !m.lu && m.date <= maintenant()).length + liaisons.filter((l) => !l.signe && enfants(s).some((e) => e.classeId === l.classeId && (!l.eleveId || l.eleveId === e.id))).length
  }, [messages, conversations, liaisons, s])

  useEffect(() => {
    defile.current?.scrollTo({ top: 0 })
  }, [ecran])

  const ongletActif = ONGLET_DE[ecran] ?? ecran
  const racine = ONGLETS.some((o) => o.id === ecran)

  return (
    <div className="flex flex-col h-full min-h-0 relative" data-testid="app-parent">
      {/* En-tête */}
      <header className="bg-bleu text-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3.5 shrink-0">
        <div className="flex items-center gap-2 min-h-10">
          {!racine && historique.length > 0 ? (
            <button onClick={retour} className="-ml-2 p-2 rounded-full active:bg-white/15" aria-label="Retour">
              <ChevronLeft className="size-6" />
            </button>
          ) : (
            <img src={CONFIG.LOGO_BLANC} alt={CONFIG.SIGLE} className="h-8 w-auto" />
          )}
          <div className="min-w-0 flex-1">
            {ecran === 'accueil' ? (
              <>
                <div className="text-white/75 text-[0.82rem] leading-tight">{CONFIG.NOM_PLATEFORME}</div>
                <div className="font-semibold titre leading-tight truncate">Bonjour {prenomParent(s)}</div>
              </>
            ) : (
              <div className="font-semibold titre text-[1.08rem] truncate">{TITRES[ecran]}</div>
            )}
          </div>
          <button onClick={() => { setCloche(!cloche); if (!cloche) setTimeout(() => useStore.getState().lireNotifications('parent'), 1200) }} className="relative p-2.5 -mr-1 rounded-full active:bg-white/15" aria-label={`Notifications, ${nonLues} non lues`} data-testid="cloche-parent">
            <Bell className="size-[1.35rem]" />
            {nonLues > 0 && <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-[#FFC94D] text-bleu-nuit text-[0.68rem] font-bold flex items-center justify-center px-1">{nonLues}</span>}
          </button>
        </div>
      </header>

      {/* Contenu */}
      <div ref={defile} className="flex-1 min-h-0 overflow-y-auto defilement">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={ecran} initial={{ opacity: 0, x: racine ? 0 : 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="px-4 pt-3 pb-6">
            <Ecran ecran={ecran} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Barre d'onglets */}
      <nav className="shrink-0 bg-white border-t border-ligne grid grid-cols-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1.5" aria-label="Navigation de l’espace parent">
        {ONGLETS.map((o) => {
          const actif = ongletActif === o.id
          return (
            <button key={o.id} onClick={() => allerParent(o.id)} className={cx('flex flex-col items-center gap-0.5 py-1 min-h-11 text-[0.72rem] font-semibold relative', actif ? 'text-bleu' : 'text-encre-3')} data-testid={`onglet-${o.id}`}>
              <o.icone className="size-[1.35rem]" strokeWidth={actif ? 2.4 : 2} />
              {o.libelle}
              {o.id === 'messages' && messagesNonLus > 0 && <span className="absolute top-0 right-[22%] min-w-4 h-4 rounded-full bg-rouge text-white text-[0.62rem] flex items-center justify-center px-1">{messagesNonLus}</span>}
            </button>
          )
        })}
      </nav>

      {/* Notifications */}
      <AnimatePresence>
        {cloche && (
          <motion.div className="absolute inset-0 z-30 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-bleu-nuit/30" onClick={() => setCloche(false)} aria-label="Fermer les notifications" />
            <motion.div initial={{ y: -12 }} animate={{ y: 0 }} className="relative mt-16 mx-3 bg-white rounded-2xl shadow-panneau overflow-hidden max-h-[70%] flex flex-col">
              <div className="px-4 py-3 border-b border-ligne font-semibold">Notifications</div>
              <ul className="overflow-y-auto defilement">
                {notifsParent.length === 0 && <li className="px-4 py-5 text-encre-2">Aucune notification.</li>}
                {notifsParent.slice(0, 12).map((n) => (
                  <li key={n.id}>
                    <button onClick={() => { setCloche(false); allerParent(ecranDeLien(n.lien)) }} className={cx('w-full text-left px-4 py-3 border-b border-ligne-2 flex gap-3', !n.lu && 'bg-bleu-clair/50')}>
                      <span className={cx('mt-1.5 size-2.5 rounded-full shrink-0', n.niveau === 'alerte' ? 'bg-rouge' : n.niveau === 'attention' ? 'bg-ambre' : n.niveau === 'succes' ? 'bg-vert' : 'bg-bleu')} />
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug">{n.titre}</span>
                        <span className="block text-encre-2 text-[0.9rem] leading-snug">{n.texte}</span>
                        <span className="block text-encre-3 text-[0.78rem] mt-0.5">{relatif(n.date)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Ecran({ ecran }: { ecran: EcranParent }) {
  switch (ecran) {
    case 'accueil': return <AccueilParent />
    case 'creche': return <CrecheParent />
    case 'notes': return <NotesParent />
    case 'bulletin': return <BulletinParent />
    case 'absences': return <AbsencesParent />
    case 'paiements': return <PaiementsParent />
    case 'payer': return <PayerParent />
    case 'recu': return <RecuParent />
    case 'messages': return <MessagesParent />
    case 'conversation': return <ConversationParent />
    case 'autorisations': return <AutorisationsParent />
  }
}
