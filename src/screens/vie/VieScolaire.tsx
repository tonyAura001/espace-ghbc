/** Vie scolaire : absences du jour en direct, appels du collège, discipline graduée. */
import { useMemo, useState } from 'react'
import { MessageSquareText, Plus, FileCheck2, BellRing, Paperclip } from 'lucide-react'
import { useStore } from '../../store'
import { profilParId } from '../../store/profils'
import { absentsDuJour, indexClasses, indexEleves, indexFamilles, matiere, nomPersonnel, elevesParClasse } from '../../store/selecteurs'
import type { Absence, Incident } from '../../data/types'
import { Avatar, Badge, Bloc, Bouton, Case, Champ, EnTetePage, Liste, Modale, Onglets, Panneau, PastilleCycle, Saisie, Segments, SqueletteTableau, Vide, Zone, cx, Indicateur } from '../../ui/base'
import { useAction, useChargement, useMinutes } from '../../ui/hooks'
import { JOUR_DEMO, dateCourte, heureFr, hhmmEnMinutes, jourSemaine, maintenant } from '../../lib/temps'
import { CONFIG } from '../../config'

const GRAVITES: Record<number, { libelle: string; sanction: string; ton: 'neutre' | 'ambre' | 'rouge' }> = {
  1: { libelle: 'Niveau 1 · manquement léger', sanction: 'Observation écrite', ton: 'neutre' },
  2: { libelle: 'Niveau 2 · manquement répété', sanction: 'Avertissement de conduite et convocation des parents', ton: 'ambre' },
  3: { libelle: 'Niveau 3 · faute grave', sanction: 'Exclusion temporaire d’un à trois jours', ton: 'rouge' },
  4: { libelle: 'Niveau 4 · faute très grave', sanction: 'Conseil de discipline, décision de la Direction', ton: 'rouge' },
}
const MOTIFS_ABS = ['Maladie', 'Rendez-vous médical', 'Événement familial', 'Voyage familial', 'Retard de transport', 'Autre motif']

export default function VieScolaire() {
  const [onglet, setOnglet] = useState<'absences' | 'appels' | 'discipline'>('absences')
  const s = useStore()
  const pret = useChargement(400)
  const abs = absentsDuJour(s)
  const appelsJour = s.appels.filter((a) => a.date === JOUR_DEMO)
  const retards = appelsJour.reduce((n, a) => n + a.retards.length, 0)
  const m = useMinutes()
  const attendus = s.creneaux.filter((c) => c.jour === jourSemaine(JOUR_DEMO) && hhmmEnMinutes(c.debut) + 10 <= m)
  const faits = attendus.filter((c) => appelsJour.some((a) => a.creneauId === c.id))
  return (
    <div>
      <EnTetePage titre="Vie scolaire" sousTitre="Absences en direct, appels des professeurs et discipline graduée" />
      <section className="rounded-xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 md:grid-cols-3 lg:grid-cols-5 [&>*]:bg-white mb-5">
        <div className="p-5"><Indicateur libelle="Absents à la journée" valeur={abs.filter((a) => a.periode !== 'cours').length} /></div>
        <div className="p-5"><Indicateur libelle="Absences en cours" valeur={abs.filter((a) => a.periode === 'cours').length} detail="signalées à l’appel" /></div>
        <div className="p-5"><Indicateur libelle="Non justifiées" valeur={abs.filter((a) => !a.justifiee).length} ton="ambre" /></div>
        <div className="p-5"><Indicateur libelle="Retards" valeur={retards} /></div>
        <div className="p-5 max-md:col-span-2"><Indicateur libelle="Appels effectués" valeur={`${faits.length} / ${attendus.length}`} ton={faits.length < attendus.length ? 'ambre' : 'vert'} detail="cours déjà commencés" /></div>
      </section>
      <Onglets
        className="mb-4"
        actif={onglet}
        onChange={setOnglet}
        onglets={[
          { id: 'absences', libelle: 'Absences du jour', compte: abs.length },
          { id: 'appels', libelle: 'Appels du collège', compte: attendus.length },
          { id: 'discipline', libelle: 'Discipline', compte: s.incidents.length },
        ]}
      />
      {!pret ? <div className="bg-white rounded-xl border border-ligne"><SqueletteTableau /></div> : onglet === 'absences' ? <AbsencesJour absences={abs} /> : onglet === 'appels' ? <AppelsJour /> : <Discipline />}
    </div>
  )
}

function AbsencesJour({ absences }: { absences: Absence[] }) {
  const s = useStore()
  const justifier = useStore((st) => st.justifierAbsence)
  const toast = useStore((st) => st.toast)
  const journaliser = useStore((st) => st.journaliser)
  const [filtre, setFiltre] = useState<'toutes' | 'non' | 'cours'>('toutes')
  const [cible, setCible] = useState<Absence | null>(null)
  const [motif, setMotif] = useState(MOTIFS_ABS[0])
  const [piece, setPiece] = useState(true)
  const [relance, setRelance] = useState<Absence[] | null>(null)
  const [executer, enCours] = useAction()
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)
  const ifa = indexFamilles(s.familles)
  const ordre = Object.fromEntries(s.classes.map((c, i) => [c.id, i]))
  const liste = absences
    .filter((a) => (filtre === 'non' ? !a.justifiee : filtre === 'cours' ? a.periode === 'cours' : true))
    .sort((a, b) => Number(b.id.startsWith('ABS-R')) - Number(a.id.startsWith('ABS-R')) || ordre[ie[a.eleveId].classeId] - ordre[ie[b.eleveId].classeId] || ie[a.eleveId].nom.localeCompare(ie[b.eleveId].nom, 'fr'))
  const nonJustifiees = absences.filter((a) => !a.justifiee)

  const valider = async () => {
    if (!cible) return
    await executer(() => justifier(cible.id, motif, piece ? 'justificatif-scanne.jpg' : null))
    toast({ titre: 'Absence justifiée', texte: `${ie[cible.eleveId].prenom} ${ie[cible.eleveId].nom} · ${motif}`, niveau: 'succes' })
    setCible(null)
  }
  const envoyer = async () => {
    if (!relance) return
    await executer(() => journaliser('Absence', 'Familles prévenues par SMS', `${relance.length} famille${relance.length > 1 ? 's' : ''} · absences non justifiées du ${dateCourte(JOUR_DEMO)}`, relance.length === 1 ? relance[0].eleveId : null, null, { canal: 'SMS', familles: relance.length }))
    toast({ titre: 'SMS envoyés', texte: `${relance.length} famille${relance.length > 1 ? 's' : ''} prévenue${relance.length > 1 ? 's' : ''}. L’envoi est tracé dans le journal.`, niveau: 'succes' })
    setRelance(null)
  }
  const exemple = relance?.[0]
  const fEx = exemple ? ifa[ie[exemple.eleveId].familleId] : null
  const pEx = fEx ? (fEx.responsable === 'mere' ? fEx.mere : fEx.pere) : null

  return (
    <Bloc
      sansMarge
      titre={
        <Segments<'toutes' | 'non' | 'cours'> valeur={filtre} onChange={setFiltre} options={[{ id: 'toutes', libelle: 'Toutes' }, { id: 'non', libelle: 'Non justifiées' }, { id: 'cours', libelle: 'Absences en cours' }]} />
      }
      actions={nonJustifiees.length > 0 && <Bouton variante="secondaire" icone={<MessageSquareText className="size-4" />} onClick={() => setRelance(nonJustifiees)}>Prévenir les familles ({nonJustifiees.length})</Bouton>}
    >
      {liste.length === 0 ? (
        <Vide titre="Aucune absence dans ce filtre" texte="Les absences signalées par le portail et par les appels des professeurs s’affichent ici en direct." />
      ) : (
        <>
        <ul className="lg:hidden divide-y divide-ligne-2 border-t border-ligne-2">
          {liste.map((a) => {
            const e = ie[a.eleveId]
            const c = ic[e.classeId]
            const cr = a.creneauId ? s.creneaux.find((x) => x.id === a.creneauId) : null
            return (
              <li key={a.id} className={cx('px-4 py-3', a.id.startsWith('ABS-R') && 'flash')}>
                <div className="flex items-start gap-3">
                  <Avatar prenom={e.prenom} nom={e.nom} taille={34} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{e.prenom} {e.nom}</div>
                    <div className="text-sm text-encre-2"><PastilleCycle cycle={c.cycle} libelle={c.nom} /> · {a.periode === 'journee' ? 'toute la journée' : a.periode === 'matin' ? 'matinée' : a.periode === 'apres-midi' ? 'après-midi' : cr ? `${matiere(cr.matiereId).nom.toLowerCase()} à ${heureFr(cr.debut)}` : 'un cours'}</div>
                    <div className="mt-1.5">{a.justifiee ? <Badge ton="vert">Justifiée · {a.motif}</Badge> : <Badge ton="ambre">Non justifiée</Badge>}</div>
                  </div>
                </div>
                {!a.justifiee && (
                  <div className="flex gap-2 mt-2.5 pl-[2.9rem]">
                    <Bouton taille="sm" variante="secondaire" icone={<FileCheck2 className="size-4" />} onClick={() => { setCible(a); setMotif(MOTIFS_ABS[0]); setPiece(true) }}>Justifier</Bouton>
                    <Bouton taille="sm" variante="discret" icone={<BellRing className="size-4" />} onClick={() => setRelance([a])}>Prévenir</Bouton>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <div className="hidden lg:block overflow-x-auto defilement">
          <table className="tableau min-w-[60rem]">
            <thead>
              <tr><th>Élève</th><th>Classe</th><th>Absence</th><th>Signalée par</th><th>État</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {liste.map((a) => {
                const e = ie[a.eleveId]
                const c = ic[e.classeId]
                const cr = a.creneauId ? s.creneaux.find((x) => x.id === a.creneauId) : null
                const appel = cr ? s.appels.find((x) => x.creneauId === cr.id && x.date === JOUR_DEMO) : null
                const nouveau = a.id.startsWith('ABS-R')
                return (
                  <tr key={a.id} className={cx(nouveau && 'flash')} data-testid={`absence-${a.eleveId}`}>
                    <td><span className="flex items-center gap-2.5"><Avatar prenom={e.prenom} nom={e.nom} taille={30} /><span><b>{e.nom}</b> {e.prenom}</span>{nouveau && <Badge ton="bleu">Nouveau</Badge>}</span></td>
                    <td><PastilleCycle cycle={c.cycle} libelle={c.nom} /></td>
                    <td>{a.periode === 'journee' ? 'Toute la journée' : a.periode === 'matin' ? 'Matinée' : a.periode === 'apres-midi' ? 'Après-midi' : cr ? `Cours de ${matiere(cr.matiereId).nom.toLowerCase()} · ${heureFr(cr.debut)}` : 'Un cours'}</td>
                    <td className="text-encre-2">{a.source === 'appel' && appel ? `Appel de ${nomPersonnel(s, appel.faitPar)} à ${heureFr(appel.heure)}` : a.source === 'portail' ? 'Portail, pas d’entrée à 8 h 30' : 'Secrétariat'}</td>
                    <td>{a.justifiee ? <Badge ton="vert">Justifiée · {a.motif}</Badge> : <Badge ton="ambre">Non justifiée</Badge>}</td>
                    <td className="text-right whitespace-nowrap">
                      {!a.justifiee && (
                        <div className="inline-flex gap-2">
                          <Bouton taille="sm" variante="secondaire" icone={<FileCheck2 className="size-4" />} onClick={() => { setCible(a); setMotif(MOTIFS_ABS[0]); setPiece(true) }}>Justifier</Bouton>
                          <Bouton taille="sm" variante="discret" icone={<BellRing className="size-4" />} onClick={() => setRelance([a])}>Prévenir</Bouton>
                        </div>
                      )}
                      {a.justifiee && a.justificatif && <span className="inline-flex items-center gap-1 text-sm text-encre-2"><Paperclip className="size-3.5" />Pièce jointe</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      <Modale ouvert={!!cible} onFermer={() => setCible(null)} titre="Justifier l’absence" pied={<><Bouton variante="discret" onClick={() => setCible(null)}>Annuler</Bouton><Bouton onClick={valider} chargement={enCours}>Enregistrer la justification</Bouton></>}>
        {cible && (
          <div className="space-y-4">
            <p className="text-encre-2">{ie[cible.eleveId].prenom} {ie[cible.eleveId].nom} · {dateCourte(cible.date)}</p>
            <Champ libelle="Motif"><Liste value={motif} onChange={(e) => setMotif(e.target.value)}>{MOTIFS_ABS.map((m) => <option key={m}>{m}</option>)}</Liste></Champ>
            <Case checked={piece} onChange={setPiece} libelle="Justificatif reçu (certificat médical ou mot des parents), scanné et joint" />
          </div>
        )}
      </Modale>

      <Modale ouvert={!!relance} onFermer={() => setRelance(null)} titre="Prévenir les familles par SMS" pied={<><Bouton variante="discret" onClick={() => setRelance(null)}>Annuler</Bouton><Bouton onClick={envoyer} chargement={enCours}>Envoyer {relance && relance.length > 1 ? `${relance.length} SMS` : 'le SMS'}</Bouton></>}>
        {exemple && pEx && (
          <div className="space-y-3">
            <p className="text-encre-2">Aperçu du message reçu par {pEx.prenom} {pEx.nom} ({pEx.tel}) :</p>
            <div className="rounded-2xl rounded-bl-sm bg-brume border border-ligne px-4 py-3 max-w-sm">
              {CONFIG.SIGLE} : bonjour, {ie[exemple.eleveId].prenom} est absent{ie[exemple.eleveId].sexe === 'F' ? 'e' : ''} aujourd’hui ({dateCourte(JOUR_DEMO)}). Merci de justifier l’absence depuis votre espace parent ou en répondant à ce message.
            </div>
            {relance && relance.length > 1 && <p className="text-sm text-encre-2">Le même message, personnalisé, part vers {relance.length} familles. Chaque envoi est tracé.</p>}
          </div>
        )}
      </Modale>
    </Bloc>
  )
}

function AppelsJour() {
  const s = useStore()
  const journaliser = useStore((st) => st.journaliser)
  const toast = useStore((st) => st.toast)
  const m = useMinutes()
  const [executer] = useAction()
  const ic = indexClasses(s.classes)
  const jour = jourSemaine(JOUR_DEMO)
  const cours = useMemo(() => s.creneaux.filter((c) => c.jour === jour).sort((a, b) => a.debut.localeCompare(b.debut) || ic[a.classeId].nom.localeCompare(ic[b.classeId].nom)), [s.creneaux, jour, ic])
  const commences = cours.filter((c) => hhmmEnMinutes(c.debut) <= m)
  if (!commences.length) return <Bloc><Vide titre="Aucun cours commencé pour l’instant" texte="Les appels apparaissent ici dès le début de chaque cours." /></Bloc>
  return (
    <Bloc sansMarge>
      <ul className="lg:hidden divide-y divide-ligne-2">
        {commences.map((c) => {
          const a = s.appels.find((x) => x.creneauId === c.id && x.date === JOUR_DEMO)
          const enRetard = !a && hhmmEnMinutes(c.debut) + 10 <= m
          return (
            <li key={c.id} className="px-4 py-3">
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{ic[c.classeId].nom} · {matiere(c.matiereId).nom}</span>
                <span className="tabulaire text-sm text-encre-2 whitespace-nowrap">{heureFr(c.debut)}</span>
              </div>
              <div className="text-sm text-encre-2">{nomPersonnel(s, c.profId)}</div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {a ? <Badge ton="vert">Fait à {heureFr(a.heure)} · {a.absents.length} absent{a.absents.length > 1 ? 's' : ''}</Badge> : enRetard ? <Badge ton="ambre">Pas encore fait</Badge> : <Badge ton="bleu">Cours en cours</Badge>}
                {!a && enRetard && (
                  <Bouton taille="sm" variante="discret" icone={<BellRing className="size-4" />} onClick={async () => {
                    await executer(() => journaliser('Appel', 'Rappel envoyé au professeur', `${matiere(c.matiereId).nom} · ${ic[c.classeId].nom} · ${nomPersonnel(s, c.profId)}`))
                    toast({ titre: 'Rappel envoyé', texte: `${nomPersonnel(s, c.profId)} reçoit une notification sur son téléphone.`, niveau: 'info' })
                  }}>Rappeler</Bouton>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="hidden lg:block overflow-x-auto defilement">
        <table className="tableau min-w-[56rem]">
          <thead><tr><th>Horaire</th><th>Classe</th><th>Matière</th><th>Professeur</th><th>Appel</th><th className="text-right" /></tr></thead>
          <tbody>
            {commences.map((c) => {
              const a = s.appels.find((x) => x.creneauId === c.id && x.date === JOUR_DEMO)
              const enRetard = !a && hhmmEnMinutes(c.debut) + 10 <= m
              return (
                <tr key={c.id} className={cx(a?.faitPar && a.heure && hhmmEnMinutes(a.heure) >= m - 2 && 'flash')}>
                  <td className="tabulaire">{heureFr(c.debut)} – {heureFr(c.fin)}</td>
                  <td><PastilleCycle cycle="college" libelle={ic[c.classeId].nom} /></td>
                  <td>{matiere(c.matiereId).nom}</td>
                  <td className="text-encre-2">{nomPersonnel(s, c.profId)}</td>
                  <td>{a ? <Badge ton="vert">Fait à {heureFr(a.heure)} · {a.absents.length} absent{a.absents.length > 1 ? 's' : ''}{a.retards.length ? `, ${a.retards.length} retard${a.retards.length > 1 ? 's' : ''}` : ''}</Badge> : enRetard ? <Badge ton="ambre">Pas encore fait</Badge> : <Badge ton="bleu">Cours en cours</Badge>}</td>
                  <td className="text-right">
                    {!a && enRetard && (
                      <Bouton taille="sm" variante="discret" icone={<BellRing className="size-4" />} onClick={async () => {
                        await executer(() => journaliser('Appel', 'Rappel envoyé au professeur', `${matiere(c.matiereId).nom} · ${ic[c.classeId].nom} · ${nomPersonnel(s, c.profId)}`))
                        toast({ titre: 'Rappel envoyé', texte: `${nomPersonnel(s, c.profId)} reçoit une notification sur son téléphone.`, niveau: 'info' })
                      }}>Rappeler</Bouton>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Bloc>
  )
}

function Discipline() {
  const s = useStore()
  const ajouter = useStore((st) => st.ajouterIncident)
  const toast = useStore((st) => st.toast)
  const [ouvert, setOuvert] = useState(false)
  const [executer, enCours] = useAction()
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)
  const classesCo = s.classes.filter((c) => c.cycle === 'college')
  const [classeId, setClasseId] = useState(classesCo[0].id)
  const eleves = elevesParClasse(s.eleves)[classeId] ?? []
  const [eleveId, setEleveId] = useState('')
  const [type, setType] = useState('Retards répétés')
  const [gravite, setGravite] = useState<Incident['gravite']>(1)
  const [description, setDescription] = useState('')
  const [sanction, setSanction] = useState(GRAVITES[1].sanction)
  const [prevenus, setPrevenus] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const parGravite = [1, 2, 3, 4].map((g) => s.incidents.filter((i) => i.gravite === g).length)
  const valider = async () => {
    const id = eleveId || eleves[0]?.id
    if (!id) return
    if (!description.trim()) return setErreur('Décrivez les faits en une phrase : ce qui s’est passé, où et quand.')
    await executer(() => {
      ajouter({ eleveId: id, type, gravite, description: description.trim(), sanction, parentsPrevenus: prevenus })
      if (gravite === 4) {
        const st = useStore.getState()
        useStore.setState({
          validations: [...st.validations, { id: `VAL-R${Date.now().toString(36).toUpperCase()}`, type: 'radiation', objetId: id, libelle: `Conseil de discipline · ${ie[id].prenom} ${ie[id].nom}`, motif: `${type} : ${description.trim()}`, demandeurId: profilParId(st.session.profilId).userId, date: maintenant(), statut: 'en_attente', valideurId: null, dateDecision: null }],
        })
        st.journaliser('Validation', 'Demande de validation', `Conseil de discipline · ${ie[id].prenom} ${ie[id].nom}`, id, null, { motif: type })
      }
    })
    toast({ titre: 'Incident enregistré', texte: `${ie[id].prenom} ${ie[id].nom} · ${GRAVITES[gravite].libelle}${prevenus ? ' · famille prévenue' : ''}`, niveau: 'succes' })
    setOuvert(false)
    setDescription('')
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((g) => (
          <div key={g} className="bg-white rounded-xl border border-ligne px-4 py-3">
            <div className="text-sm text-encre-2">{GRAVITES[g].libelle}</div>
            <div className="chiffre text-2xl mt-1">{parGravite[g - 1]}</div>
            <div className="text-xs text-encre-3 mt-0.5">{GRAVITES[g].sanction}</div>
          </div>
        ))}
      </div>
      <Bloc sansMarge actions={<Bouton icone={<Plus className="size-4" />} onClick={() => { setOuvert(true); setErreur(null) }}>Nouvel incident</Bouton>} titre="Incidents du collège">
        <ul className="lg:hidden divide-y divide-ligne-2 border-t border-ligne-2">
          {s.incidents.map((i) => {
            const e = ie[i.eleveId]
            return (
              <li key={i.id} className="px-4 py-3">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{e.prenom} {e.nom} <span className="font-normal text-sm text-encre-2">· {ic[e.classeId].nom}</span></span>
                  <Badge ton={GRAVITES[i.gravite].ton}>Niveau {i.gravite}</Badge>
                </div>
                <div className="mt-1"><b>{i.type}</b> <span className="text-encre-2">· {i.description}</span></div>
                <div className="text-sm text-encre-2 mt-1">{i.date === JOUR_DEMO ? 'Aujourd’hui' : dateCourte(i.date)} · {i.sanction} · {nomPersonnel(s, i.auteurId)}</div>
              </li>
            )
          })}
        </ul>
        <div className="hidden lg:block overflow-x-auto defilement">
          <table className="tableau min-w-[60rem]">
            <thead><tr><th>Date</th><th>Élève</th><th>Faits</th><th>Gravité</th><th>Sanction</th><th>Signalé par</th></tr></thead>
            <tbody>
              {s.incidents.map((i) => {
                const e = ie[i.eleveId]
                return (
                  <tr key={i.id}>
                    <td className="tabulaire whitespace-nowrap">{i.date === JOUR_DEMO ? 'Aujourd’hui' : dateCourte(i.date)}</td>
                    <td><span className="block font-semibold">{e.prenom} {e.nom}</span><span className="text-sm text-encre-2">{ic[e.classeId].nom}</span></td>
                    <td><span className="block font-semibold">{i.type}</span><span className="text-sm text-encre-2">{i.description}</span></td>
                    <td><Badge ton={GRAVITES[i.gravite].ton}>Niveau {i.gravite}</Badge></td>
                    <td className="text-[0.95rem]">{i.sanction}{i.parentsPrevenus && <span className="block text-xs text-encre-3">Famille prévenue</span>}</td>
                    <td className="text-encre-2 text-sm">{nomPersonnel(s, i.auteurId)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Bloc>
      <Panneau
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        titre="Nouvel incident"
        sousTitre="La sanction proposée suit le règlement intérieur ; vous pouvez l’ajuster."
        pied={<><Bouton variante="discret" onClick={() => setOuvert(false)}>Annuler</Bouton><Bouton onClick={valider} chargement={enCours}>Enregistrer l’incident</Bouton></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Champ libelle="Classe"><Liste value={classeId} onChange={(e) => { setClasseId(e.target.value); setEleveId('') }}>{classesCo.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</Liste></Champ>
            <Champ libelle="Élève"><Liste value={eleveId || eleves[0]?.id} onChange={(e) => setEleveId(e.target.value)}>{eleves.map((e) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</Liste></Champ>
          </div>
          <Champ libelle="Type de faits">
            <Liste value={type} onChange={(e) => setType(e.target.value)}>
              {['Retards répétés', 'Téléphone en classe', 'Bavardages répétés', 'Devoir non rendu', 'Insolence envers un professeur', 'Bagarre dans la cour', 'Dégradation de matériel', 'Sortie sans autorisation'].map((t) => <option key={t}>{t}</option>)}
            </Liste>
          </Champ>
          <div>
            <div className="text-sm font-semibold text-encre-2 mb-1.5">Gravité</div>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2, 3, 4] as const).map((g) => (
                <button key={g} onClick={() => { setGravite(g); setSanction(GRAVITES[g].sanction) }} className={cx('rounded-lg border px-3 py-2 text-left text-sm', gravite === g ? 'border-bleu bg-bleu-clair/50 font-semibold' : 'border-ligne hover:bg-brume')}>{GRAVITES[g].libelle}</button>
              ))}
            </div>
          </div>
          <Champ libelle="Description des faits" erreur={erreur}><Zone value={description} onChange={(e) => { setDescription(e.target.value); setErreur(null) }} placeholder="Par exemple : a quitté la salle sans autorisation pendant le cours d’anglais." /></Champ>
          <Champ libelle="Sanction proposée"><Saisie value={sanction} onChange={(e) => setSanction(e.target.value)} /></Champ>
          {gravite === 4 && <p className="text-sm text-ambre">Un conseil de discipline nécessite la décision de la Direction : une demande de validation lui sera présentée.</p>}
          <Case checked={prevenus} onChange={setPrevenus} libelle="Prévenir la famille par SMS" />
          <p className="text-xs text-encre-3">L’incident est horodaté et tracé dans le journal d’audit.</p>
        </div>
      </Panneau>
    </>
  )
}
