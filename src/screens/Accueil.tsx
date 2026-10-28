/** Accueil direction « Aujourd'hui à GHBC » : la vue vivante de l'école. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, OctagonAlert, ChevronRight, Wallet, UserCheck, Baby, Receipt, ShieldCheck, ScrollText } from 'lucide-react'
import { useStore } from '../store'
import {
  presentsParCycle, encaisseJour, paiementsDuJour, recouvrementDetail, familleEnRetard, alertesDirection, crecheGroupes,
  tauxPresenceAnnee, encaissementsParJour, paiementsComptes, estMobileMoney, indexFamilles,
} from '../store/selecteurs'
import { CYCLES, NOM_CYCLE } from '../data/referentiel'
import { COULEUR_CYCLE, CompteurAnime, Jauge, cx, Bloc, Badge } from '../ui/base'
import { money, moneyCompact, nombre, pct, numeroRecu } from '../lib/format'
import { JOUR_DEMO, dateLongueMaj, heureFr, hhmmEnMinutes, minutesEnHhmm, joursOuvres, ajouterJours, jourMois } from '../lib/temps'
import { useMinutes, useChargement } from '../ui/hooks'
import { Squelette } from '../ui/base'
import { CONFIG } from '../config'
import { FluxActions } from './commun/FluxActions'

export default function Accueil() {
  const s = useStore()
  const pret = useChargement(420)
  const m = useMinutes()
  const pr = presentsParCycle(s)
  const encaisse = encaisseJour(s)
  const pjour = paiementsDuJour(s).filter(paiementsComptes)
  const mobile = pjour.filter((p) => estMobileMoney(p.mode)).reduce((a, p) => a + p.montant, 0)
  const rec = recouvrementDetail(s)
  const retard = familleEnRetard(s)
  const alertes = alertesDirection(s)
  const presenceAnnee = tauxPresenceAnnee(s.absences, s.eleves)

  if (!pret) return <SqueletteAccueil />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[2rem] leading-tight">Aujourd’hui à {CONFIG.SIGLE}</h1>
          <p className="text-encre-2 mt-1">
            <span>{dateLongueMaj(JOUR_DEMO)}</span> · {heureFr(minutesEnHhmm(m))}
            <span className="inline-flex items-center gap-1.5 ml-3 text-vert-texte font-semibold">
              <span className="size-2 rounded-full bg-vert pouls" /> En direct
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/validations" className="inline-flex items-center gap-2 rounded-lg border border-bleu-ligne bg-white px-3.5 py-2 font-semibold text-bleu hover:bg-bleu-clair">
            <ShieldCheck className="size-4" /> Validations
            {s.validations.some((v) => v.statut === 'en_attente') && <Badge ton="ambre">{s.validations.filter((v) => v.statut === 'en_attente').length}</Badge>}
          </Link>
          <Link to="/audit" className="inline-flex items-center gap-2 rounded-lg border border-bleu-ligne bg-white px-3.5 py-2 font-semibold text-bleu hover:bg-bleu-clair">
            <ScrollText className="size-4" /> Journal d’audit
          </Link>
        </div>
      </div>

      {/* Bandeau principal : quatre chiffres, une seule surface */}
      <section className={cx('rounded-2xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-1 md:grid-cols-2 [&>*]:bg-white', s.ui.vueDouble ? '2xl:grid-cols-[1.25fr_1.15fr_1fr_0.85fr]' : 'xl:grid-cols-[1.25fr_1.15fr_1fr_0.85fr]')}>
        <div className="p-6">
          <div className="flex items-center gap-2 text-encre-2"><UserCheck className="size-[1.1rem]" /> Présents en ce moment</div>
          <div className="chiffre text-[3rem] font-medium leading-none mt-2" data-testid="presents">
            <CompteurAnime valeur={pr.presents.total} format={nombre} />
            <span className="text-encre-3 text-[1.4rem] ml-2">/ {nombre(pr.effectif.total)}</span>
          </div>
          <div className="mt-4 space-y-2">
            {CYCLES.map((c) => (
              <div key={c} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-[0.95rem]">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: COULEUR_CYCLE[c] }} />{NOM_CYCLE[c]}</span>
                <Jauge valeur={pr.effectif[c] ? pr.presents[c] / pr.effectif[c] : 0} couleur={COULEUR_CYCLE[c]} hauteur={7} />
                <span className="text-right tabulaire"><b>{pr.presents[c]}</b><span className="text-encre-3"> / {pr.effectif[c]}</span></span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-encre-2"><Wallet className="size-[1.1rem]" /> Encaissé depuis 8 h</div>
          <div className="chiffre text-[2.6rem] font-medium leading-none mt-2 text-vert-texte" data-testid="encaisse">
            <CompteurAnime valeur={encaisse} format={money} />
          </div>
          <div className="text-encre-2 mt-2">
            {nombre(pjour.length)} reçu{pjour.length > 1 ? 's' : ''} · dont {money(mobile)} par mobile money
          </div>
          <CourbeJour paiements={pjour.map((p) => ({ h: p.date.slice(11, 16), v: p.montant }))} minutes={m} />
        </div>
        <div className="p-6">
          <div className="text-encre-2">Recouvrement à date</div>
          <div className="chiffre text-[2.6rem] font-medium leading-none mt-2"><CompteurAnime valeur={rec.taux * 100} format={(n) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`} /></div>
          <div className="mt-3"><Jauge valeur={rec.taux} hauteur={8} /></div>
          <div className="text-encre-2 mt-2.5 text-[0.95rem]">{moneyCompact(rec.paye)} encaissés sur {moneyCompact(rec.du)} échus</div>
          <div className="text-encre-2 text-[0.95rem]">Présence depuis la rentrée : <b className="text-encre">{pct(presenceAnnee, 1)}</b></div>
        </div>
        <Link to="/impayes" className="p-6 hover:!bg-brume block group">
          <div className="text-encre-2">Familles en retard</div>
          <div className="chiffre text-[2.6rem] font-medium leading-none mt-2 text-ambre"><CompteurAnime valeur={retard.length} format={nombre} /></div>
          <div className="text-encre-2 mt-2.5 text-[0.95rem]">{moneyCompact(retard.reduce((a, f) => a + f.enRetard, 0))} en retard de plus de 15 jours</div>
          <div className="mt-3 text-bleu font-semibold inline-flex items-center gap-1 group-hover:underline">Voir les impayés <ChevronRight className="size-4" /></div>
        </Link>
      </section>

      <LigneDuJour />

      <div className={cx('grid grid-cols-1 gap-5 items-start', s.ui.vueDouble ? '2xl:grid-cols-[1.35fr_1fr]' : 'xl:grid-cols-[1.35fr_1fr]')}>
        <div className="space-y-5">
          <Bloc titre={<span className="flex items-center gap-2">Points d’attention <span className="text-encre-3 font-normal text-base">{alertes.length}</span></span>} sansMarge>
            <ul data-testid="alertes">
              {alertes.length === 0 && <li className="px-5 pb-5 text-encre-2">Rien ne demande votre attention pour l’instant.</li>}
              {alertes.map((a) => (
                <li key={a.id} className="border-t border-ligne-2 first:border-t-0">
                  <Link to={a.lien} className={cx('flex items-start gap-3 px-5 py-3 hover:bg-brume', a.niveau === 'alerte' && 'bg-rouge-clair/50')}>
                    {a.niveau === 'alerte' ? <OctagonAlert className="size-5 text-rouge shrink-0 mt-0.5" /> : <AlertTriangle className="size-5 text-ambre shrink-0 mt-0.5" />}
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{a.titre}</span>
                      <span className="block text-encre-2 text-[0.95rem] truncate">{a.detail}</span>
                    </span>
                    <ChevronRight className="size-4 text-encre-3 mt-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </Bloc>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CrecheDirect />
            <Encaissements10Jours />
          </div>
        </div>
        <Bloc titre={<span className="flex items-center gap-2"><span className="size-2 rounded-full bg-vert pouls" />Dernières actions</span>} actions={<Link to="/audit" className="text-bleu font-semibold text-sm hover:underline">Tout le journal</Link>} sansMarge>
          <FluxActions limite={11} />
        </Bloc>
      </div>
    </div>
  )
}

/* Courbe cumulée de l'encaissé depuis 7 h 30 */
function CourbeJour({ paiements, minutes }: { paiements: { h: string; v: number }[]; minutes: number }) {
  const debut = 7 * 60 + 30
  const fin = Math.max(minutes, debut + 60)
  const pts = useMemo(() => {
    const tri = [...paiements].sort((a, b) => a.h.localeCompare(b.h))
    let cumul = 0
    const res: [number, number][] = [[debut, 0]]
    for (const p of tri) {
      cumul += p.v
      res.push([hhmmEnMinutes(p.h), cumul])
    }
    res.push([fin, cumul])
    return res
  }, [paiements, fin, debut])
  const max = Math.max(1, pts[pts.length - 1][1])
  const W = 300, H = 54
  const x = (t: number) => ((t - debut) / (fin - debut)) * W
  const y = (v: number) => H - 3 - (v / max) * (H - 8)
  let d = `M${x(pts[0][0])},${y(0)}`
  for (let i = 1; i < pts.length; i++) d += ` H${x(pts[i][0]).toFixed(1)} V${y(pts[i][1]).toFixed(1)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14 mt-3" preserveAspectRatio="none" aria-hidden>
      <path d={d + ` V${H} H0 Z`} fill="var(--color-vert-clair)" />
      <path d={d} fill="none" stroke="var(--color-vert-texte)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* La ligne du jour : arrivées, paiements, alertes, de 7 h à 18 h, avec le repère « maintenant ». */
function LigneDuJour() {
  const s = useStore()
  const m = useMinutes()
  const [survol, setSurvol] = useState<string | null>(null)
  const defile = useRef<HTMLDivElement>(null)
  const debut = 7 * 60, fin = 18 * 60
  useEffect(() => {
    const el = defile.current
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = Math.max(0, ((m - debut) / (fin - debut)) * el.scrollWidth - el.clientWidth * 0.6)
    // uniquement à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pos = (t: number) => `${((t - debut) / (fin - debut)) * 100}%`
  const arrivees = useMemo(() => {
    const b: number[] = new Array(Math.ceil((fin - debut) / 10)).fill(0)
    for (const p of Object.values(s.presences)) if (p.arrivee) b[Math.floor((hhmmEnMinutes(p.arrivee) - debut) / 10)]++
    return b
  }, [s.presences, debut, fin])
  const maxA = Math.max(1, ...arrivees)
  const pj = paiementsDuJour(s).filter(paiementsComptes)
  const fam = indexFamilles(s.familles)
  const alertes = s.scans.filter((x) => x.date.startsWith(JOUR_DEMO) && x.resultat !== 'autorise')
  const reperes = [
    { t: 8 * 60, l: 'Début des cours' },
    { t: 10 * 60, l: 'Récréation' },
    { t: 12 * 60 + 15, l: 'Cantine' },
    { t: 13 * 60, l: 'Sieste à la crèche' },
    { t: 14 * 60, l: 'Reprise' },
    { t: 16 * 60 + 30, l: 'Sortie des classes' },
  ]
  return (
    <section className="bg-white rounded-2xl border border-ligne px-4 sm:px-6 pt-4 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-3">
        <h2 className="text-[1.08rem]">La journée en direct</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-encre-2">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-2 rounded-sm bg-bleu/70" /> Arrivées au portail</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-vert" /> Paiements</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rotate-45 bg-rouge" /> Alertes</span>
        </div>
      </div>
      {/* sur téléphone, la journée défile horizontalement et s'ouvre sur l'heure actuelle */}
      <div ref={defile} className="overflow-x-auto defilement -mx-4 px-4 sm:mx-0 sm:px-0 pt-6 -mt-6">
      <div className="relative h-[7.5rem] select-none min-w-[44rem] md:min-w-0 mx-3">
        <div className="absolute top-0 bottom-3 right-0 bg-brume/80 rounded-r" style={{ left: pos(m) }} aria-hidden />
        {/* arrivées */}
        <div className="absolute inset-x-0 top-0 h-14 flex items-end">
          {arrivees.map((n, i) => (
 <div key={i} className="flex-1 px-[1px] h-full flex items-end" title={n ? `${n} arrivées entre ${minutesEnHhmm(debut + i * 10).replace(':', ' h ')} et ${minutesEnHhmm(debut + i * 10 + 10).replace(':', ' h ')}` : undefined}>
              <div className="w-full rounded-t-sm bg-bleu/70" style={{ height: `${(n / maxA) * 100}%` }} />
            </div>
          ))}
        </div>
        {/* axe */}
        <div className="absolute inset-x-0 top-14 h-px bg-ligne" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="absolute top-14 h-2 w-px bg-ligne" style={{ left: pos(debut + i * 60) }}>
            <span className="absolute top-2 -translate-x-1/2 text-xs text-encre-3 tabulaire">{7 + i}&nbsp;h</span>
          </div>
        ))}
        {/* paiements */}
        <div className="absolute inset-x-0 top-[4.6rem] h-6">
          {pj.map((p) => {
            const t = hhmmEnMinutes(p.date.slice(11, 16))
            const r = 6 + Math.min(8, Math.sqrt(p.montant / 300_000) * 2)
            return (
              <button
                key={p.id}
                onMouseEnter={() => setSurvol(p.id)}
                onMouseLeave={() => setSurvol(null)}
                className="absolute -translate-x-1/2 rounded-full bg-vert/80 border border-white hover:bg-vert-texte"
                style={{ left: pos(t), width: r, height: r, top: 12 - r / 2 }}
                aria-label={`${numeroRecu(p.numero)} ${money(p.montant)}`}
              >
                {survol === p.id && (
                  <span className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-encre text-white text-xs px-2 py-1 z-10">
                    {heureFr(p.date)} · {money(p.montant)} · famille {fam[p.familleId]?.nom}
                  </span>
                )}
              </button>
            )
          })}
          {alertes.map((a) => (
            <span key={a.id} className="absolute -translate-x-1/2 size-3 rotate-45 bg-rouge border border-white" style={{ left: pos(hhmmEnMinutes(a.date.slice(11, 16))), top: 6 }} title={`${heureFr(a.date)} · ${a.motif}`} />
          ))}
        </div>
        {/* repères */}
        <div className="absolute inset-x-0 top-[6.3rem] h-5">
          {reperes.map((r) => (
            <span key={r.l} className={cx('absolute -translate-x-1/2 text-[0.72rem] whitespace-nowrap hidden xl:block', r.t <= m ? 'text-encre-3' : 'text-encre-2')} style={{ left: pos(r.t) }}>
              {r.l}
            </span>
          ))}
        </div>
        {/* maintenant */}
        <div className="absolute top-0 bottom-3 w-0.5 bg-bleu transition-[left] duration-1000" style={{ left: pos(m) }}>
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-bleu text-white text-xs font-semibold px-1.5 py-0.5 whitespace-nowrap tabulaire">{heureFr(minutesEnHhmm(m))}</span>
        </div>
      </div>
      </div>
    </section>
  )
}

function CrecheDirect() {
  const s = useStore()
  const groupes = crecheGroupes(s)
  return (
    <Bloc titre={<span className="flex items-center gap-2"><Baby className="size-[1.1rem] text-creche" /> Crèche en direct</span>} actions={<Link to="/creche" className="text-bleu font-semibold text-sm hover:underline">Ouvrir</Link>} filet={COULEUR_CYCLE.creche}>
      <ul className="space-y-3">
        {groupes.map((g) => (
          <li key={g.classe.id} className="flex items-center justify-between gap-3">
            <span>
              <span className="font-semibold">{g.classe.nom}</span>
              <span className="text-encre-2 ml-2">{g.presents.length} enfants · {g.adultes.length} adultes</span>
            </span>
            <Badge ton={g.depasse ? 'rouge' : 'vert'}>1 pour {g.adultes.length ? (g.presents.length / g.adultes.length).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}</Badge>
          </li>
        ))}
      </ul>
      <p className="text-sm text-encre-2 mt-3">Taux d’encadrement maximum : 1 adulte pour 4 bébés, 6 trotteurs ou 8 grands.</p>
    </Bloc>
  )
}

function Encaissements10Jours() {
  const s = useStore()
  const parJour = encaissementsParJour(s.paiements)
  const jours = joursOuvres(ajouterJours(JOUR_DEMO, -16), JOUR_DEMO).slice(-10)
  const max = Math.max(1, ...jours.map((j) => parJour[j] ?? 0))
  return (
    <Bloc titre={<span className="flex items-center gap-2"><Receipt className="size-[1.1rem] text-vert-texte" /> Encaissé ces 10 derniers jours</span>} actions={<Link to="/finance" className="text-bleu font-semibold text-sm hover:underline">Finance</Link>}>
      <div className="flex items-end gap-1.5 h-28">
        {jours.map((j) => {
          const v = parJour[j] ?? 0
          return (
            <div key={j} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
              <span className="absolute -top-6 hidden group-hover:block whitespace-nowrap rounded bg-encre text-white text-xs px-1.5 py-0.5 z-10">{moneyCompact(v)}</span>
              <div className={cx('w-full rounded-t', j === JOUR_DEMO ? 'bg-vert' : 'bg-bleu/60')} style={{ height: `${(v / max) * 100}%`, minHeight: 2 }} />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {jours.map((j) => (
          <span key={j} className="flex-1 text-center text-[0.7rem] text-encre-3 truncate">{j === JOUR_DEMO ? 'Auj.' : jourMois(j).split(' ')[0]}</span>
        ))}
      </div>
    </Bloc>
  )
}

function SqueletteAccueil() {
  return (
    <div className="space-y-5" aria-busy>
      <Squelette className="h-10 w-80" />
      <Squelette className="h-56 w-full rounded-2xl" />
      <Squelette className="h-36 w-full rounded-2xl" />
      <div className="grid grid-cols-[1.35fr_1fr] gap-5">
        <Squelette className="h-72 rounded-2xl" />
        <Squelette className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}
