/** Flux des dernières actions (journal d'audit), les plus récentes en haut, mises en valeur à l'arrivée. */
import { Wallet, UserPlus, DoorOpen, BookOpenCheck, ShieldCheck, Baby, MessageSquare, IdCard, Lock, LogIn, ClipboardCheck, ScrollText, type LucideIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../../store'
import { heureFr, relatif, JOUR_DEMO } from '../../lib/temps'
import { cx } from '../../ui/base'

const ICONES: Record<string, LucideIcon> = {
  Paiement: Wallet, Inscription: UserPlus, Portail: DoorOpen, Note: BookOpenCheck, Validation: ShieldCheck, Crèche: Baby,
  Message: MessageSquare, Carte: IdCard, Caisse: Lock, Connexion: LogIn, Appel: ClipboardCheck, Bulletin: BookOpenCheck,
}

export function FluxActions({ limite = 10 }: { limite?: number }) {
  const audit = useStore((s) => s.audit)
  const recents = useStore((s) => s.ui.derniereActivite)
  const lignes = audit.slice(-limite).reverse()
  return (
    <ul className="relative">
      <AnimatePresence initial={false}>
        {lignes.map((a) => {
          const I = ICONES[a.type] ?? ScrollText
          const alerte = a.action.includes('refus') || a.action.includes('Sortie refusée')
          return (
            <motion.li
              key={a.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cx('flex gap-3 px-5 py-2.5 border-t border-ligne-2 first:border-t-0', recents.includes(a.id) && 'flash')}
            >
              <span className={cx('mt-0.5 size-8 rounded-full flex items-center justify-center shrink-0', alerte ? 'bg-rouge-clair text-rouge' : a.type === 'Paiement' ? 'bg-vert-clair text-vert-texte' : 'bg-bleu-clair text-bleu')}>
                <I className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug">{a.action}</span>
                <span className="block text-encre-2 text-[0.92rem] truncate">{a.objet}</span>
                <span className="block text-encre-3 text-[0.8rem]">{a.userNom} · {a.date.startsWith(JOUR_DEMO) ? heureFr(a.date) : relatif(a.date)}</span>
              </span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
