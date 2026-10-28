/** Appel du cours sur le téléphone du professeur : un toucher = absent, deux = en retard, trois = présent. */
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, MapPin, Users, MessageSquareText, ChevronLeft } from 'lucide-react'
import { useStore } from '../../store'
import { profilParId } from '../../store/profils'
import { coursEnCours, elevesParClasse, indexClasses, matiere, nomPersonnel } from '../../store/selecteurs'
import { ID } from '../../data/generer'
import type { Creneau } from '../../data/types'
import { Avatar, Badge, EnTetePage, cx } from '../../ui/base'
import { CadreTelephone, useLargeurMax } from '../../ui/cadres'
import { useAction, useMinutes } from '../../ui/hooks'
import { heureFr, hhmmEnMinutes, JOUR_DEMO, NOMS_JOURS, jourSemaine } from '../../lib/temps'

type Statut = 'present' | 'absent' | 'retard'

export default function Appel() {
  const s = useStore()
  const profil = profilParId(s.session.profilId)
  const profId = profil.role === 'professeur' ? profil.userId : ID.profMaths
  const m = useMinutes()
  const petit = useLargeurMax(900)
  const { cours, enCours, prochain } = coursEnCours(s, profId)
  const coursAffiches = cours.length ? cours : s.creneaux.filter((c) => c.profId === profId && c.jour === 1).sort((a, b) => a.debut.localeCompare(b.debut))
  const parDefaut = useMemo(() => {
    if (enCours) return enCours
    const passes = coursAffiches.filter((c) => hhmmEnMinutes(c.debut) <= m)
    const nonFait = passes.find((c) => !s.appels.some((a) => a.id === `${c.id}|${JOUR_DEMO}`))
    return nonFait ?? prochain ?? passes[passes.length - 1] ?? coursAffiches[0]
  }, [profId])
  const [creneauId, setCreneauId] = useState<string | undefined>(parDefaut?.id)
  const cr = coursAffiches.find((c) => c.id === creneauId) ?? parDefaut

  const telephone = cr ? <TelephoneAppel creneau={cr} key={cr.id + s.ui.version} /> : <div className="p-6 text-encre-2">Aucun cours prévu aujourd’hui.</div>
  const fait = (c: Creneau) => s.appels.find((a) => a.id === `${c.id}|${JOUR_DEMO}`)

  // téléphone ou tablette en portrait : l'appel s'affiche directement dans la page, sous les cours du jour
  if (petit)
    return (
      <div className="-mx-1">
        <h1 className="text-[1.45rem] mb-2">Appel</h1>
        <div className="flex gap-2 overflow-x-auto defilement pb-2 -mx-1 px-1">
          {coursAffiches.map((c) => {
            const actif = c.id === cr?.id
            return (
              <button key={c.id} onClick={() => setCreneauId(c.id)} className={cx('shrink-0 rounded-lg border px-3 py-2 text-left min-h-11', actif ? 'border-bleu bg-bleu-clair/60' : 'border-ligne bg-white')}>
                <span className="block tabulaire font-semibold text-sm whitespace-nowrap">{heureFr(c.debut)} – {heureFr(c.fin)}</span>
                <span className="block text-xs text-encre-2 whitespace-nowrap">{indexClasses(s.classes)[c.classeId].nom}{fait(c) ? ' · fait' : ''}</span>
              </button>
            )
          })}
        </div>
        <div className="rounded-2xl border border-ligne overflow-hidden h-[calc(100dvh-12.5rem)] min-h-[30rem]">{telephone}</div>
      </div>
    )

  return (
    <div>
      <EnTetePage titre="Appel" sousTitre={`${nomPersonnel(s, profId)} · ${NOMS_JOURS[jourSemaine(JOUR_DEMO)]} · ${coursAffiches.length} cours aujourd’hui`} />
      <div className="flex flex-wrap gap-8 items-start justify-center">
        <div className="w-[min(29rem,100%)] space-y-4">
          <div className="bg-white rounded-xl border border-ligne p-5">
            <h2 className="text-lg">Cours de la journée</h2>
            <p className="text-encre-2 text-[0.95rem] mt-1">Le professeur fait l’appel depuis son téléphone, en classe. Les absences arrivent aussitôt chez le surveillant général et les familles sont prévenues par SMS.</p>
            <ul className="mt-4 space-y-1.5">
              {coursAffiches.map((c) => {
                const a = fait(c)
                const actif = c.id === cr?.id
                const maintenant = hhmmEnMinutes(c.debut) <= m && m < hhmmEnMinutes(c.fin)
                return (
                  <li key={c.id}>
                    <button onClick={() => setCreneauId(c.id)} className={cx('w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left', actif ? 'border-bleu bg-bleu-clair/50' : 'border-ligne hover:bg-brume')}>
                      <span className="tabulaire font-semibold w-[8.4rem] shrink-0 whitespace-nowrap">{heureFr(c.debut)} – {heureFr(c.fin)}</span>
                      <span className="flex-1 min-w-0 truncate">{indexClasses(s.classes)[c.classeId].nom} · {matiere(c.matiereId).abrev}</span>
                      {a ? <Badge ton="vert">Fait</Badge> : maintenant ? <Badge ton="bleu" point>En cours</Badge> : hhmmEnMinutes(c.debut) > m ? <Badge>À venir</Badge> : <Badge ton="ambre">À faire</Badge>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="text-sm text-encre-2 px-1">Un toucher : absent. Deux : en retard. Trois : de nouveau présent. Les élèves non passés au portail ce matin sont déjà marqués absents.</div>
        </div>
        <CadreTelephone hauteur="min(800px, calc(100dvh - 12rem))">{telephone}</CadreTelephone>
      </div>
    </div>
  )
}

function TelephoneAppel({ creneau: cr }: { creneau: Creneau }) {
  const s = useStore()
  const faireAppel = useStore((st) => st.faireAppel)
  const toast = useStore((st) => st.toast)
  const eleves = elevesParClasse(s.eleves)[cr.classeId] ?? []
  const classe = indexClasses(s.classes)[cr.classeId]
  const existant = s.appels.find((a) => a.id === `${cr.id}|${JOUR_DEMO}`)
  const initial = (): Record<string, Statut> => {
    const r: Record<string, Statut> = {}
    for (const e of eleves) {
      if (existant) r[e.id] = existant.absents.includes(e.id) ? 'absent' : existant.retards.includes(e.id) ? 'retard' : 'present'
      else r[e.id] = s.presences[e.id]?.arrivee ? 'present' : 'absent'
    }
    return r
  }
  const [statuts, setStatuts] = useState<Record<string, Statut>>(initial)
  const [valide, setValide] = useState(!!existant)
  const [executer, enCours] = useAction()
  useEffect(() => setValide(!!existant), [existant])

  const absents = eleves.filter((e) => statuts[e.id] === 'absent')
  const retards = eleves.filter((e) => statuts[e.id] === 'retard')
  const basculer = (id: string) => setStatuts((x) => ({ ...x, [id]: x[id] === 'present' ? 'absent' : x[id] === 'absent' ? 'retard' : 'present' }))

  const valider = async () => {
    await executer(() => faireAppel(cr.id, absents.map((e) => e.id), retards.map((e) => e.id)), [450, 750])
    setValide(true)
    toast({ titre: 'Appel transmis', texte: `${classe.nom} · ${absents.length} absent${absents.length > 1 ? 's' : ''}, ${retards.length} retard${retards.length > 1 ? 's' : ''}. Familles prévenues par SMS.`, niveau: 'succes' })
  }

  return (
    <div className="h-full flex flex-col bg-brume" data-testid="telephone-appel">
      <div className="bg-bleu text-white px-5 pt-4 pb-4">
        <div className="text-white/75 text-sm">Appel · {heureFr(cr.debut)} – {heureFr(cr.fin)}</div>
        <div className="titre text-[1.35rem] leading-tight mt-0.5">{matiere(cr.matiereId).nom}</div>
        <div className="flex items-center gap-3 text-white/85 text-sm mt-1.5">
          <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{classe.nom}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />Salle {cr.salle}</span>
        </div>
      </div>
      {valide ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <CheckCircle2 className="size-16 text-vert-texte" />
          <div className="titre text-xl">Appel transmis</div>
          <div className="text-encre-2">{eleves.length - absents.length} présents · {absents.length} absent{absents.length > 1 ? 's' : ''} · {retards.length} retard{retards.length > 1 ? 's' : ''}</div>
          {absents.length > 0 && (
            <div className="rounded-xl bg-white border border-ligne px-4 py-3 text-left w-full">
              <div className="flex items-center gap-2 font-semibold text-[0.95rem]"><MessageSquareText className="size-4 text-bleu" /> Familles prévenues par SMS</div>
              <ul className="text-sm text-encre-2 mt-1.5 space-y-0.5">
                {absents.slice(0, 5).map((e) => <li key={e.id}>{e.prenom} {e.nom}</li>)}
                {absents.length > 5 && <li>et {absents.length - 5} autres</li>}
              </ul>
            </div>
          )}
          <div className="text-sm text-encre-3">Le surveillant général voit déjà ces absences.</div>
          <button onClick={() => setValide(false)} className="mt-2 inline-flex items-center gap-1 text-bleu font-semibold"><ChevronLeft className="size-4" />Modifier l’appel</button>
        </div>
      ) : (
        <>
          <div className="flex justify-around bg-white border-b border-ligne py-2.5 text-center">
            <div><div className="chiffre text-xl text-vert-texte">{eleves.length - absents.length - retards.length}</div><div className="text-xs text-encre-2">présents</div></div>
            <div><div className="chiffre text-xl text-rouge">{absents.length}</div><div className="text-xs text-encre-2">absents</div></div>
            <div><div className="chiffre text-xl text-ambre">{retards.length}</div><div className="text-xs text-encre-2">retards</div></div>
          </div>
          <ul className="flex-1 overflow-y-auto defilement px-3 py-2 space-y-1.5">
            {eleves.map((e) => {
              const st = statuts[e.id]
              const pasPortail = !s.presences[e.id]?.arrivee
              return (
                <li key={e.id}>
                  <button
                    data-testid={`eleve-appel-${e.id}`}
                    onClick={() => basculer(e.id)}
                    className={cx(
                      'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left border transition-colors active:scale-[0.99]',
                      st === 'present' && 'bg-white border-ligne',
                      st === 'absent' && 'bg-rouge-clair border-rouge/30',
                      st === 'retard' && 'bg-ambre-clair border-ambre/30',
                    )}
                  >
                    <Avatar prenom={e.prenom} nom={e.nom} taille={34} />
                    <span className="flex-1 min-w-0 leading-tight">
                      <span className="block font-semibold truncate">{e.prenom} {e.nom}</span>
                      {pasPortail && <span className="block text-xs text-encre-3">Pas passé au portail ce matin</span>}
                    </span>
                    <span className={cx('text-sm font-semibold rounded-full px-2.5 py-1 shrink-0', st === 'present' && 'text-vert-texte bg-vert-clair', st === 'absent' && 'text-white bg-rouge', st === 'retard' && 'text-white bg-ambre')}>
                      {st === 'present' ? 'Présent' : st === 'absent' ? 'Absent' : 'Retard'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="bg-white border-t border-ligne px-4 pt-3 pb-6">
            <button data-testid="valider-appel" onClick={valider} disabled={enCours} className="w-full rounded-xl bg-bleu text-white font-semibold py-3.5 text-[1.05rem] disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {enCours ? <><Loader2 className="size-4 animate-spin" />Transmission…</> : `Valider l’appel · ${absents.length} absent${absents.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
