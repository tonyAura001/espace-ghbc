/** Recherche globale instantanée (Ctrl/⌘ K) : élèves, familles, personnel, reçus, classes, écrans. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, Users, Receipt, School, LayoutGrid, BriefcaseBusiness, CornerDownLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../store'
import { indexClasses } from '../store/selecteurs'
import { profilParId } from '../store/profils'
import { navigationPour } from './navigation'
import { sansAccents, numeroRecu, money } from '../lib/format'
import { cx, PastilleCycle } from '../ui/base'
import { dateCourte } from '../lib/temps'

interface Resultat {
  id: string
  type: 'Élève' | 'Famille' | 'Personnel' | 'Reçu' | 'Classe' | 'Écran'
  titre: string
  detail: string
  route: string
  cycle?: import('../data/types').Cycle
}

const ICONES = { Élève: User, Famille: Users, Personnel: BriefcaseBusiness, Reçu: Receipt, Classe: School, Écran: LayoutGrid }

export function Recherche() {
  const ouverte = useStore((s) => s.ui.rechercheOuverte)
  const setUi = useStore((s) => s.setUi)
  const fermer = () => setUi({ rechercheOuverte: false })
  return <AnimatePresence>{ouverte && <Palette onFermer={fermer} />}</AnimatePresence>
}

function Palette({ onFermer }: { onFermer: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const nav = useNavigate()
  const eleves = useStore((s) => s.eleves)
  const familles = useStore((s) => s.familles)
  const personnel = useStore((s) => s.personnel)
  const paiements = useStore((s) => s.paiements)
  const classes = useStore((s) => s.classes)
  const role = useStore((s) => profilParId(s.session.profilId).role)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [])

  const resultats = useMemo<Resultat[]>(() => {
    const t = sansAccents(q.trim())
    const ic = indexClasses(classes)
    const ecrans = navigationPour(role).flatMap((g) => g.elements).map<Resultat>((e) => ({ id: 'nav' + e.route, type: 'Écran', titre: e.libelle, detail: 'Ouvrir l’écran', route: e.route }))
    if (!t) return ecrans.slice(0, 8)
    const mots = t.split(/\s+/)
    const ok = (s: string) => {
      const n = sansAccents(s)
      return mots.every((m) => n.includes(m))
    }
    const res: Resultat[] = []
    for (const e of eleves) {
      if (res.length > 40) break
      if (ok(`${e.prenom} ${e.nom} ${e.matricule}`)) {
        const c = ic[e.classeId]
        res.push({ id: e.id, type: 'Élève', titre: `${e.prenom} ${e.nom}`, detail: `${c.nom} · ${e.matricule}`, route: `/eleves/${e.id}`, cycle: c.cycle })
      }
    }
    for (const f of familles) {
      const tels = [f.pere?.tel, f.mere?.tel].filter(Boolean).join(' ').replace(/\s/g, '')
      if (ok(`famille ${f.nom} ${f.mere?.prenom ?? ''} ${f.mere?.nom ?? ''} ${f.pere?.prenom ?? ''}`) || (t.replace(/\s/g, '').length >= 4 && tels.includes(t.replace(/\s/g, '')))) {
        const enfant = eleves.find((e) => e.familleId === f.id)
        res.push({ id: f.id, type: 'Famille', titre: `Famille ${f.nom}`, detail: [f.mere && `${f.mere.prenom} ${f.mere.nom}`, f.pere && `${f.pere.prenom} ${f.pere.nom}`].filter(Boolean).join(' et '), route: enfant ? `/eleves/${enfant.id}/famille` : '/eleves' })
      }
      if (res.length > 60) break
    }
    for (const p of personnel) if (ok(`${p.prenom} ${p.nom} ${p.fonction}`)) res.push({ id: p.id, type: 'Personnel', titre: `${p.prenom} ${p.nom}`, detail: p.fonction, route: `/personnel?id=${p.id}` })
    const num = t.replace(/\D/g, '')
    if (num.length >= 3) {
      for (const p of paiements) {
        if (String(p.numero).includes(num) || numeroRecu(p.numero).replace(/\D/g, '').endsWith(num)) {
          res.push({ id: p.id, type: 'Reçu', titre: numeroRecu(p.numero), detail: `${money(p.montant)} · ${dateCourte(p.date.slice(0, 10))}`, route: `/caisse/recu/${p.id}` })
          if (res.filter((r) => r.type === 'Reçu').length > 5) break
        }
      }
    }
    for (const c of classes) if (ok(c.nom)) res.push({ id: c.id, type: 'Classe', titre: c.nom, detail: 'Liste de la classe', route: `/eleves?classe=${c.id}`, cycle: c.cycle })
    for (const e of ecrans) if (ok(e.titre)) res.push(e)
    return res.slice(0, 30)
  }, [q, eleves, familles, personnel, paiements, classes, role])

  useEffect(() => setSel(0), [q])

  const ouvrir = (r: Resultat) => {
    nav(r.route)
    onFermer()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4">
      <motion.div className="absolute inset-0 bg-bleu-nuit/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer} />
      <motion.div
        className="relative w-full max-w-[40rem] bg-white rounded-2xl shadow-panneau overflow-hidden"
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-label="Recherche"
      >
        <div className="flex items-center gap-3 px-5 border-b border-ligne">
          <Search className="size-5 text-encre-3" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((x) => Math.min(x + 1, resultats.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((x) => Math.max(x - 1, 0)) }
              if (e.key === 'Enter' && resultats[sel]) ouvrir(resultats[sel])
              if (e.key === 'Escape') onFermer()
            }}
            placeholder="Élève, famille, téléphone, n° de reçu, classe…"
            className="flex-1 py-4 text-lg outline-none bg-transparent placeholder:text-encre-3"
          />
          <kbd className="text-xs text-encre-3 border border-ligne rounded px-1.5 py-0.5">Échap</kbd>
        </div>
        <ul className="max-h-[55vh] overflow-y-auto defilement py-2">
          {resultats.length === 0 && <li className="px-5 py-6 text-encre-2">Aucun résultat pour « {q} ». Essayez un prénom, un matricule ou un numéro de téléphone.</li>}
          {resultats.map((r, i) => {
            const I = ICONES[r.type]
            return (
              <li key={r.type + r.id}>
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => ouvrir(r)}
                  className={cx('w-full flex items-center gap-3 px-5 py-2.5 text-left', i === sel && 'bg-bleu-clair')}
                >
                  <I className="size-[1.1rem] text-encre-3 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{r.titre}</span>
                    <span className="text-encre-2 ml-2 inline-flex items-center gap-2">{r.cycle && <PastilleCycle cycle={r.cycle} libelle={false} />}{r.detail}</span>
                  </span>
                  <span className="text-xs text-encre-3">{r.type}</span>
                  {i === sel && <CornerDownLeft className="size-4 text-bleu" />}
                </button>
              </li>
            )
          })}
        </ul>
      </motion.div>
    </div>
  )
}
