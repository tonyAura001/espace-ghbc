/** Accueil de l'espace parent : les enfants aujourd'hui, ce qui reste à faire, les dernières nouvelles. */
import { useMemo } from 'react'
import { ShieldAlert, ChevronRight, CalendarX, FileSignature, PenLine, Wallet } from 'lucide-react'
import { useStore } from '../../store'
import { Avatar, PastilleCycle, cx } from '../../ui/base'
import { CarteM, TitreM } from '../mobile'
import { enfants, classeDe, famille, allerParent, ecranDeLien, jourMoisFr } from '../donnees'
import { journalParEleve, echeancesParFamille, evaluationsParClasse, notesKey, matiere, LIBELLE_STATUT_ECHEANCE } from '../../store/selecteurs'
import { JOUR_DEMO, heureFr, relatif, dateLongueMaj } from '../../lib/temps'
import { money, note } from '../../lib/format'
import type { Eleve } from '../../data/types'

export default function AccueilParent() {
  const s = useStore()
  const liste = enfants(s)
  const f = famille(s)
  const ids = liste.map((e) => e.id)
  const alertes = s.scans.filter((x) => x.resultat === 'alerte' && x.date.startsWith(JOUR_DEMO) && x.eleveId && ids.includes(x.eleveId))
  const absences = s.absences.filter((a) => ids.includes(a.eleveId) && !a.justifiee)
  const autorisations = s.autorisations.filter((a) => a.date >= JOUR_DEMO && liste.some((e) => a.classeIds.includes(e.classeId) && !a.reponses[e.id]))
  const mots = s.liaisons.filter((l) => !l.signe && liste.some((e) => e.classeId === l.classeId && (!l.eleveId || l.eleveId === e.id)))
  const echeances = echeancesParFamille(s.echeances, s.paiements)[f.id] ?? []
  const enRetard = echeances.filter((e) => e.statut === 'en_retard' || e.statut === 'due')
  const notifs = useMemo(() => s.notifications.filter((n) => n.cible === 'parent').slice(0, 4), [s.notifications])

  return (
    <div>
      <p className="text-encre-2 text-[0.92rem]">{dateLongueMaj(JOUR_DEMO)}</p>

      {alertes.map((a) => {
        const e = liste.find((x) => x.id === a.eleveId)!
        return (
          <button key={a.id} onClick={() => allerParent('creche', { enfantId: e.id })} className="mt-3 w-full text-left rounded-2xl bg-rouge text-white px-4 py-3.5 flex gap-3 shadow-sm" data-testid="alerte-securite">
            <ShieldAlert className="size-6 shrink-0 mt-0.5" />
            <span className="min-w-0">
              <span className="block font-semibold">Sortie refusée à {heureFr(a.date)}</span>
              <span className="block text-white/90 text-[0.92rem] leading-snug">{a.motif}. {e.prenom} est en sécurité avec son éducatrice.</span>
              <span className="block mt-1.5 font-semibold underline underline-offset-2 text-[0.92rem]">Voir le détail</span>
            </span>
          </button>
        )
      })}

      <TitreM>Mes enfants aujourd’hui</TitreM>
      <div className="space-y-2.5">
        {liste.map((e) => (
          <CarteEnfant key={e.id} eleve={e} />
        ))}
      </div>

      {(absences.length > 0 || autorisations.length > 0 || mots.length > 0 || enRetard.length > 0) && (
        <>
          <TitreM>À faire</TitreM>
          <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2 overflow-hidden">
            {enRetard.length > 0 && (
              <Tache icone={<Wallet className="size-5 text-rouge" />} titre={`${enRetard.length} échéance${enRetard.length > 1 ? 's' : ''} à régler`} detail={money(enRetard.reduce((a, x) => a + x.reste, 0))} onClick={() => allerParent('paiements')} />
            )}
            {absences.length > 0 && <Tache icone={<CalendarX className="size-5 text-ambre" />} titre={`${absences.length} absence${absences.length > 1 ? 's' : ''} à justifier`} detail="Un motif suffit, la pièce est facultative" onClick={() => allerParent('absences')} />}
            {autorisations.length > 0 && <Tache icone={<FileSignature className="size-5 text-bleu" />} titre={`${autorisations.length} autorisation${autorisations.length > 1 ? 's' : ''} à donner`} detail={autorisations[0].titre} onClick={() => allerParent('autorisations')} />}
            {mots.length > 0 && <Tache icone={<PenLine className="size-5 text-bleu" />} titre={`${mots.length} mot${mots.length > 1 ? 's' : ''} à signer`} detail="Cahier de liaison" onClick={() => allerParent('messages')} />}
          </div>
        </>
      )}

      <TitreM>Dernières nouvelles</TitreM>
      <div className="space-y-2">
        {notifs.map((n) => (
          <CarteM key={n.id} onClick={() => allerParent(ecranDeLien(n.lien))} className="flex gap-3">
            <span className={cx('mt-1.5 size-2.5 rounded-full shrink-0', n.niveau === 'alerte' ? 'bg-rouge' : n.niveau === 'attention' ? 'bg-ambre' : n.niveau === 'succes' ? 'bg-vert' : 'bg-bleu')} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-snug">{n.titre}</span>
              <span className="block text-encre-2 text-[0.9rem] leading-snug">{n.texte}</span>
              <span className="block text-encre-3 text-[0.78rem] mt-0.5">{relatif(n.date)}</span>
            </span>
          </CarteM>
        ))}
      </div>
    </div>
  )
}

function Tache({ icone, titre, detail, onClick }: { icone: React.ReactNode; titre: string; detail: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-center gap-3 px-4 py-3 active:bg-brume">
      {icone}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{titre}</span>
        <span className="block text-encre-2 text-[0.88rem] truncate">{detail}</span>
      </span>
      <ChevronRight className="size-4 text-encre-3" />
    </button>
  )
}

function CarteEnfant({ eleve: e }: { eleve: Eleve }) {
  const s = useStore()
  const c = classeDe(s, e)
  const p = s.presences[e.id]
  const fille = e.sexe === 'F'
  const f = famille(s)
  let etat: React.ReactNode
  if (p?.depart) {
    const a = f.accompagnateurs.find((x) => x.id === p.recupereParId)
    etat = <span className="text-encre-2">{fille ? 'Partie' : 'Parti'} à {heureFr(p.depart)}{a ? ` avec ${a.prenom} (${a.lien.toLowerCase()})` : ''}</span>
  } else if (p?.arrivee) {
    etat = <span className="text-vert-texte font-semibold">{fille ? 'Arrivée' : 'Arrivé'} à {heureFr(p.arrivee)}</span>
  } else {
    etat = <span className="text-ambre font-semibold">Pas encore {fille ? 'arrivée' : 'arrivé'}</span>
  }

  let detail: React.ReactNode = null
  if (c.cycle === 'creche') {
    const j = (journalParEleve(s.journal)[e.id] ?? []).filter((x) => x.date === JOUR_DEMO)
    const der = j[j.length - 1]
    if (der) detail = <>{heureFr(der.heure)} · {der.detail}</>
  } else {
    const evs = (evaluationsParClasse(s.evaluations)[e.classeId] ?? []).filter((x) => x.publiee && s.notes[notesKey(x.id, e.id)]?.valeur != null)
    const der = evs[evs.length - 1]
    if (der) detail = <>Dernière note : {matiere(der.matiereId).nom} · <b>{note(s.notes[notesKey(der.id, e.id)].valeur)}/{der.sur}</b></>
  }

  const ech = (echeancesParFamille(s.echeances, s.paiements)[f.id] ?? []).filter((x) => x.eleveId === e.id && x.reste > 0)
  const retard = ech.find((x) => x.statut === 'en_retard' || x.statut === 'due')
  const prochaine = ech.find((x) => x.echeance > JOUR_DEMO)

  return (
    <CarteM onClick={() => allerParent(c.cycle === 'creche' ? 'creche' : 'notes', { enfantId: e.id })} testId={`enfant-${e.prenom}`}>
      <div className="flex items-center gap-3">
        <Avatar prenom={e.prenom} nom={e.nom} taille={44} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[1.05rem] leading-tight">{e.prenom}</div>
          <div className="text-encre-2 text-[0.88rem] flex items-center gap-2"><PastilleCycle cycle={c.cycle} libelle={c.cycle === 'creche' ? `Crèche · ${c.nom}` : c.nom} /></div>
        </div>
        <ChevronRight className="size-4 text-encre-3" />
      </div>
      <div className="mt-2.5 text-[0.92rem] space-y-0.5">
        <div>{etat}</div>
        {detail && <div className="text-encre-2 leading-snug">{detail}</div>}
        {retard ? (
          <div className="text-rouge font-semibold">{LIBELLE_STATUT_ECHEANCE[retard.statut]} : {retard.libelle} · {money(retard.reste)}</div>
        ) : prochaine ? (
          <div className="text-encre-2">Prochaine échéance le {jourMoisFr(prochaine.echeance)} · {money(prochaine.reste)}</div>
        ) : null}
      </div>
    </CarteM>
  )
}
