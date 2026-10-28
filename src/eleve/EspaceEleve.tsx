/** Espace élève (collège) : emploi du temps, devoirs, notes. Téléphone sur ordinateur, plein écran sur téléphone. */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { House, CalendarDays, NotebookPen, BookOpen, ChevronDown, Smartphone, LogOut } from 'lucide-react'
import { useStore } from '../store'
import { CONFIG } from '../config'
import { ID } from '../data/generer'
import { CadreTelephone, usePetitEcran, useLargeurMax } from '../ui/cadres'
import { AdaptateurMobile, CarteM, TitreM, Puces } from '../parent/mobile'
import { Badge, cx } from '../ui/base'
import { indexEleves, indexClasses, matiere, nomPersonnel, resultatsClasse, evaluationsParClasse, notesKey } from '../store/selecteurs'
import { MATIERES_COLLEGE } from '../data/referentiel'
import { JOUR_DEMO, NOMS_JOURS, jourSemaine, hhmmEnMinutes, heureFr, dateLongueMaj, jourMois, relatif, TRIMESTRE_COURANT } from '../lib/temps'
import { useMinutes } from '../ui/hooks'
import { note, noteFixe } from '../lib/format'
import type { Session } from '../store'

export default function EspaceEleve() {
  const petit = usePetitEcran()
  const s = useStore()
  const nav = useNavigate()
  const e = indexEleves(s.eleves)[ID.fatoumata]
  const empile = useLargeurMax(1023)
  if (petit) return <CadreTelephone><AdaptateurMobile><AppEleve /></AdaptateurMobile></CadreTelephone>
  const retour = (
    <button onClick={() => { s.changerProfil('direction'); nav('/accueil') }} className="inline-flex items-center gap-2 rounded-lg border border-bleu-ligne bg-white px-4 py-2.5 min-h-10 font-semibold text-bleu hover:bg-bleu-clair">
      <LogOut className="size-4" />Revenir au profil Direction
    </button>
  )
  if (empile) {
    // tablette : légende compacte au-dessus, téléphone centré
    return (
      <div className="min-h-dvh bg-brume flex flex-col items-center gap-4 px-5 py-5">
        <div className="w-full max-w-[34rem] flex flex-wrap items-center gap-x-4 gap-y-3">
          <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.ECOLE} className="h-10 w-auto" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-encre-2 text-sm"><Smartphone className="size-4" />Sur le téléphone de l’élève</div>
            <h1 className="text-[1.25rem] leading-tight">Espace élève de {e.prenom} {e.nom}</h1>
          </div>
          {retour}
        </div>
        <CadreTelephone hauteur="min(844px, calc(100dvh - 9.5rem))"><AdaptateurMobile><AppEleve /></AdaptateurMobile></CadreTelephone>
      </div>
    )
  }
  return (
    <div className="min-h-dvh bg-brume flex items-center justify-center gap-[clamp(2rem,6vw,7rem)] px-8 py-6">
      <div className="max-w-[24rem]">
        <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.ECOLE} className="h-14 w-auto" />
        <div className="flex items-center gap-2 text-encre-2 mt-8"><Smartphone className="size-5" />Sur le téléphone de l’élève</div>
        <h1 className="text-[2rem] mt-2 leading-tight">Espace élève de {e.prenom} {e.nom}</h1>
        <p className="text-encre-2 mt-3 leading-relaxed">Au collège, chaque élève consulte son emploi du temps, ses devoirs et ses notes. Les paiements et les absences restent dans l’espace des parents.</p>
        <div className="mt-8">{retour}</div>
      </div>
      <CadreTelephone><AdaptateurMobile><AppEleve /></AdaptateurMobile></CadreTelephone>
    </div>
  )
}

const ONGLETS: { id: Session['eleveEcran']; libelle: string; icone: typeof House }[] = [
  { id: 'accueil', libelle: 'Aujourd’hui', icone: House },
  { id: 'edt', libelle: 'Semaine', icone: CalendarDays },
  { id: 'devoirs', libelle: 'Devoirs', icone: NotebookPen },
  { id: 'notes', libelle: 'Notes', icone: BookOpen },
]

function AppEleve() {
  const ecran = useStore((s) => s.session.eleveEcran)
  const setEcran = useStore((s) => s.setEleveEcran)
  const s = useStore()
  const e = indexEleves(s.eleves)[ID.fatoumata]
  const c = indexClasses(s.classes)[e.classeId]
  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="bg-bleu text-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3.5 shrink-0 flex items-center gap-2.5">
        <img src={CONFIG.LOGO_BLANC} alt={CONFIG.SIGLE} className="h-8 w-auto" />
        <div className="min-w-0">
          <div className="text-white/75 text-[0.82rem] leading-tight">{c.nom} · {CONFIG.ANNEE_SCOLAIRE}</div>
          <div className="font-semibold titre leading-tight">Bonjour {e.prenom}</div>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto defilement px-4 pt-3 pb-6" key={ecran}>
        {ecran === 'accueil' && <Aujourdhui />}
        {ecran === 'edt' && <Semaine />}
        {ecran === 'devoirs' && <Devoirs />}
        {ecran === 'notes' && <NotesEleve />}
      </div>
      <nav className="shrink-0 bg-white border-t border-ligne grid grid-cols-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1.5">
        {ONGLETS.map((o) => (
          <button key={o.id} onClick={() => setEcran(o.id)} className={cx('flex flex-col items-center gap-0.5 py-1 text-[0.72rem] font-semibold', ecran === o.id ? 'text-bleu' : 'text-encre-3')}>
            <o.icone className="size-[1.35rem]" />
            {o.libelle}
          </button>
        ))}
      </nav>
    </div>
  )
}

function useCours(jour: number) {
  const s = useStore()
  const e = indexEleves(s.eleves)[ID.fatoumata]
  return s.creneaux.filter((c) => c.classeId === e.classeId && c.jour === jour).sort((a, b) => a.debut.localeCompare(b.debut))
}

function ListeCours({ jour, direct }: { jour: number; direct?: boolean }) {
  const s = useStore()
  const m = useMinutes()
  const cours = useCours(jour)
  if (!cours.length) return <CarteM><p className="text-encre-2">Pas de cours ce jour-là.</p></CarteM>
  return (
    <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
      {cours.map((c) => {
        const enCours = direct && hhmmEnMinutes(c.debut) <= m && m < hhmmEnMinutes(c.fin)
        const fini = direct && hhmmEnMinutes(c.fin) <= m
        return (
          <div key={c.id} className={cx('flex gap-3 px-4 py-2.5', enCours && 'bg-bleu-clair', fini && 'opacity-55')}>
            <div className="w-14 shrink-0 tabulaire text-[0.88rem] leading-tight">
              <div className="font-semibold">{heureFr(c.debut)}</div>
              <div className="text-encre-3">{heureFr(c.fin)}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{matiere(c.matiereId).nom}</div>
              <div className="text-encre-2 text-[0.85rem]">{nomPersonnel(s, c.profId)} · salle {c.salle}</div>
            </div>
            {enCours && <Badge ton="bleu">En cours</Badge>}
          </div>
        )
      })}
    </div>
  )
}

function Aujourdhui() {
  const s = useStore()
  const e = indexEleves(s.eleves)[ID.fatoumata]
  const devoirs = s.liaisons.filter((l) => l.classeId === e.classeId && (!l.eleveId || l.eleveId === e.id)).slice(0, 2)
  const evs = (evaluationsParClasse(s.evaluations)[e.classeId] ?? []).filter((x) => x.publiee).slice(-3).reverse()
  return (
    <div>
      <p className="text-encre-2 text-[0.92rem]">{dateLongueMaj(JOUR_DEMO)}</p>
      <TitreM>Mes cours aujourd’hui</TitreM>
      <ListeCours jour={jourSemaine(JOUR_DEMO)} direct />
      <TitreM>À faire</TitreM>
      <div className="space-y-2">
        {devoirs.map((d) => (
          <CarteM key={d.id}>
            <div className="text-encre-2 text-[0.8rem]">{nomPersonnel(s, d.auteurId)} · {relatif(d.date)}</div>
            <p className="leading-snug mt-0.5">{d.texte}</p>
          </CarteM>
        ))}
      </div>
      <TitreM>Dernières notes</TitreM>
      <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
        {evs.map((ev) => {
          const n = s.notes[notesKey(ev.id, e.id)]
          return (
            <div key={ev.id} className="flex justify-between gap-3 px-4 py-2.5">
              <span><span className="font-semibold">{matiere(ev.matiereId).nom}</span><span className="block text-encre-2 text-[0.82rem]">{ev.titre} · {jourMois(ev.date)}</span></span>
              <span className="chiffre text-[1.1rem]">{n?.valeur == null ? '—' : `${note(n.valeur)}/${ev.sur}`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Semaine() {
  const [jour, setJour] = useState(String(Math.min(5, jourSemaine(JOUR_DEMO))))
  return (
    <div>
      <Puces options={[1, 2, 3, 4, 5].map((j) => ({ id: String(j), libelle: NOMS_JOURS[j] }))} valeur={jour} onChange={setJour} />
      <div className="mt-3"><ListeCours jour={Number(jour)} direct={Number(jour) === jourSemaine(JOUR_DEMO)} /></div>
    </div>
  )
}

function Devoirs() {
  const s = useStore()
  const e = indexEleves(s.eleves)[ID.fatoumata]
  const devoirs = s.liaisons.filter((l) => l.classeId === e.classeId && (!l.eleveId || l.eleveId === e.id)).sort((a, b) => b.date.localeCompare(a.date))
  const [faits, setFaits] = useState<string[]>([])
  return (
    <div>
      <TitreM>Cahier de textes</TitreM>
      {devoirs.length === 0 && <p className="text-encre-2">Aucun devoir pour le moment.</p>}
      <div className="space-y-2">
        {devoirs.map((d) => {
          const fait = faits.includes(d.id)
          return (
            <CarteM key={d.id}>
              <div className="text-encre-2 text-[0.8rem]">{nomPersonnel(s, d.auteurId)} · {relatif(d.date)}</div>
              <p className={cx('leading-snug mt-0.5', fait && 'line-through text-encre-3')}>{d.texte}</p>
              <label className="mt-2 flex items-center gap-2 text-[0.9rem] cursor-pointer">
                <input type="checkbox" checked={fait} onChange={() => setFaits((f) => (fait ? f.filter((x) => x !== d.id) : [...f, d.id]))} className="size-4 accent-[#0249A2]" />
                Fait
              </label>
            </CarteM>
          )
        })}
      </div>
    </div>
  )
}

function NotesEleve() {
  const s = useStore()
  const e = indexEleves(s.eleves)[ID.fatoumata]
  const [ouverte, setOuverte] = useState<string | null>(null)
  const res = resultatsClasse(s, e.classeId, TRIMESTRE_COURANT).find((r) => r.eleveId === e.id)
  const evs = (evaluationsParClasse(s.evaluations)[e.classeId] ?? []).filter((x) => x.publiee && x.trimestre === TRIMESTRE_COURANT)
  return (
    <div>
      <CarteM>
        <div className="text-encre-2 text-[0.9rem]">Moyenne générale provisoire</div>
        <div className="chiffre text-[2.1rem] leading-none mt-1">{noteFixe(res?.generale ?? null)}<span className="text-encre-3 text-[1.1rem]"> / 20</span></div>
      </CarteM>
      <TitreM>Par matière</TitreM>
      <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2 overflow-hidden">
        {MATIERES_COLLEGE.map((m) => {
          const o = ouverte === m.id
          const mes = evs.filter((x) => x.matiereId === m.id)
          return (
            <div key={m.id}>
              <button onClick={() => setOuverte(o ? null : m.id)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                <span className="flex-1 font-semibold">{m.nom}<span className="block text-encre-3 text-[0.78rem] font-normal">coefficient {m.coef}</span></span>
                <span className="chiffre text-[1.1rem]">{note(res?.matieres[m.id] ?? null)}</span>
                <ChevronDown className={cx('size-4 text-encre-3', o && 'rotate-180')} />
              </button>
              {o && (
                <div className="px-4 pb-3 space-y-1.5">
                  {mes.map((ev) => {
                    const n = s.notes[notesKey(ev.id, e.id)]
                    return (
                      <div key={ev.id} className="flex justify-between text-[0.9rem] bg-brume rounded-lg px-3 py-1.5">
                        <span>{ev.titre} · {jourMois(ev.date)}{n && n.versions.length > 1 ? ' · corrigée' : ''}</span>
                        <span className="font-semibold tabulaire">{n?.valeur == null ? 'Non noté' : `${note(n.valeur)}/20`}</span>
                      </div>
                    )
                  })}
                  {mes.length === 0 && <p className="text-encre-2 text-[0.9rem]">Pas encore de note ce trimestre.</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
