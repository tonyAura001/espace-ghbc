/** La journée de l'enfant à la crèche, en direct (moment 6). */
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LogIn, LogOut, Utensils, Moon, Baby, HeartPulse, AlertTriangle, Palette, ShieldAlert, ShieldCheck, UserPlus, Check, Sprout } from 'lucide-react'
import { useStore } from '../../store'
import type { TypeJournal } from '../../data/types'
import { Avatar, Saisie, Liste, cx } from '../../ui/base'
import { BoutonM, CarteM, TitreM, Puces } from '../mobile'
import { enfants, classeDe, famille, choisirEnfant, allerParent } from '../donnees'
import { journalParEleve, nomPersonnel } from '../../store/selecteurs'
import { JOUR_DEMO, heureFr, ageLisible } from '../../lib/temps'
import { useAction } from '../../ui/hooks'

const STYLE: Record<TypeJournal, { icone: typeof LogIn; couleur: string; libelle: string }> = {
  arrivee: { icone: LogIn, couleur: '#00782A', libelle: 'Arrivée' },
  repas: { icone: Utensils, couleur: '#B26A00', libelle: 'Repas' },
  sieste: { icone: Moon, couleur: '#5B3F9A', libelle: 'Sieste' },
  change: { icone: Baby, couleur: '#1F6A73', libelle: 'Change' },
  soin: { icone: HeartPulse, couleur: '#C0262D', libelle: 'Soin' },
  incident: { icone: AlertTriangle, couleur: '#C0262D', libelle: 'Incident' },
  activite: { icone: Palette, couleur: '#0249A2', libelle: 'Activité' },
  depart: { icone: LogOut, couleur: '#46526B', libelle: 'Départ' },
}

export default function CrecheParent() {
  const s = useStore()
  const liste = enfants(s)
  const petits = liste.filter((e) => classeDe(s, e).cycle === 'creche')
  const e = petits.find((x) => x.id === s.session.parent.enfantId) ?? petits[0]
  const [rassure, setRassure] = useState<string[]>([])
  const [ajout, setAjout] = useState(false)
  const [executer, enCours] = useAction()

  if (!e) {
    return <p className="text-encre-2 mt-6">Aucun de vos enfants n’est inscrit à la crèche cette année.</p>
  }
  const c = classeDe(s, e)
  const f = famille(s)
  const p = s.presences[e.id]
  const journal = [...(journalParEleve(s.journal)[e.id] ?? [])].filter((j) => j.date === JOUR_DEMO).reverse()
  const alertes = s.scans.filter((x) => x.resultat === 'alerte' && x.eleveId === e.id && x.date.startsWith(JOUR_DEMO))
  const fille = e.sexe === 'F'
  const jalonsAtteints = s.jalons.filter((j) => j.eleveId === e.id && j.date).length

  const confirmer = (scanId: string) =>
    executer(() => {
      setRassure((r) => [...r, scanId])
      useStore.getState().journaliser('Portail', 'Alerte de sortie confirmée par la famille', `${e.prenom} ${e.nom} · la famille n’a envoyé personne`, e.id, null, null)
      useStore.getState().toast({ titre: 'Merci, l’école est informée', texte: 'La direction garde la trace de votre confirmation.', niveau: 'succes' })
    })

  return (
    <div>
      {petits.length > 1 && <Puces options={petits.map((x) => ({ id: x.id, libelle: x.prenom }))} valeur={e.id} onChange={choisirEnfant} />}

      {alertes.map((a) => (
        <div key={a.id} className="mt-1 mb-3 rounded-2xl bg-rouge-clair border border-rouge/30 px-4 py-3.5">
          <div className="flex gap-3">
            <ShieldAlert className="size-6 text-rouge shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-rouge">Sortie refusée à {heureFr(a.date)}</div>
              <p className="text-encre text-[0.92rem] leading-snug mt-0.5">{a.motif}. L’agent du portail a refusé la sortie et prévenu la direction. {e.prenom} est {fille ? 'restée' : 'resté'} avec son éducatrice.</p>
            </div>
          </div>
          {rassure.includes(a.id) ? (
            <div className="mt-3 flex items-center gap-2 text-vert-texte font-semibold text-[0.92rem]"><Check className="size-4" /> Vous avez confirmé : vous n’avez envoyé personne.</div>
          ) : (
            <BoutonM variante="danger" className="mt-3 !py-2.5" onClick={() => confirmer(a.id)} chargement={enCours}>Je n’ai envoyé personne</BoutonM>
          )}
        </div>
      ))}

      <CarteM>
        <div className="flex items-center gap-3">
          <Avatar prenom={e.prenom} nom={e.nom} taille={48} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[1.08rem] leading-tight">{e.prenom}</div>
            <div className="text-encre-2 text-[0.88rem]">{ageLisible(e.naissance)} · groupe des {c.nom}</div>
            <div className="text-encre-2 text-[0.88rem]">Éducatrice : {nomPersonnel(s, c.titulaireId)}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[0.95rem]">
          {p?.depart ? (
            <span className="font-semibold text-encre-2">{fille ? 'Partie' : 'Parti'} à {heureFr(p.depart)}</span>
          ) : p?.arrivee ? (
            <><span className="size-2 rounded-full bg-vert pouls" /><span className="font-semibold text-vert-texte">À la crèche depuis {heureFr(p.arrivee)}</span></>
          ) : (
            <span className="font-semibold text-ambre">Pas encore {fille ? 'arrivée' : 'arrivé'}</span>
          )}
        </div>
      </CarteM>

      {e.sante.allergies.length > 0 && (
        <div className="mt-2.5 rounded-xl bg-ambre-clair text-ambre px-4 py-2.5 text-[0.92rem]">
          <b>Allergie : {e.sante.allergies.join(', ').toLowerCase()}.</b> <span className="text-encre">L’équipe et la cuisine en sont informées ; ses repas sont préparés à part.</span>
        </div>
      )}

      <TitreM action={<span className="text-[0.8rem] text-vert-texte font-semibold flex items-center gap-1.5"><span className="size-2 rounded-full bg-vert pouls" />En direct</span>}>Sa journée</TitreM>
      {journal.length === 0 ? (
        <CarteM><p className="text-encre-2">La journée de {e.prenom} commencera à son arrivée.</p></CarteM>
      ) : (
        <ol className="relative bg-white rounded-2xl border border-ligne px-4 py-2" data-testid="journal-parent">
          <AnimatePresence initial={false}>
            {journal.map((j, i) => {
              const st = STYLE[j.type]
              return (
                <motion.li
                  key={j.id}
                  layout
                  initial={{ opacity: 0, y: -10, backgroundColor: 'rgba(2,167,58,0.16)' }}
                  animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(2,167,58,0)' }}
                  transition={{ duration: 0.5, backgroundColor: { duration: 2.4 } }}
                  className="relative flex gap-3 py-2.5 -mx-2 px-2 rounded-lg"
                >
                  {i < journal.length - 1 && <span className="absolute left-[1.55rem] top-11 bottom-0 w-px bg-ligne" aria-hidden />}
                  <span className="size-9 rounded-full flex items-center justify-center shrink-0" style={{ background: st.couleur + '18', color: st.couleur }}>
                    <st.icone className="size-[1.1rem]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{st.libelle}</span>
                      <span className="text-encre-3 text-[0.82rem] tabulaire">{heureFr(j.heure)}</span>
                    </span>
                    <span className="block text-encre-2 text-[0.92rem] leading-snug">{j.detail}</span>
                  </span>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}

      <CarteM className="mt-3 flex items-center gap-3" onClick={() => allerParent('notes', { enfantId: e.id })}>
        <Sprout className="size-5 text-vert-texte shrink-0" />
        <span className="flex-1">
          <span className="block font-semibold">Ses progrès</span>
          <span className="block text-encre-2 text-[0.88rem]">{jalonsAtteints} étapes de développement atteintes</span>
        </span>
      </CarteM>

      <TitreM>Personnes autorisées à {fille ? 'la' : 'le'} récupérer</TitreM>
      <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
        {f.accompagnateurs.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar prenom={a.prenom} nom={a.nom} taille={34} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{a.prenom} {a.nom}</div>
              <div className="text-encre-2 text-[0.85rem]">{a.lien}</div>
            </div>
            {a.autorise ? (
              <span className="flex items-center gap-1 text-vert-texte text-[0.82rem] font-semibold"><ShieldCheck className="size-4" />Carte active</span>
            ) : (
              <span className="text-ambre text-[0.82rem] font-semibold text-right leading-tight">En attente<br />de l’école</span>
            )}
          </div>
        ))}
      </div>
      {ajout ? <AjoutAccompagnateur onFermer={() => setAjout(false)} /> : (
        <BoutonM variante="secondaire" className="mt-2.5" onClick={() => setAjout(true)}><UserPlus className="size-4" /> Ajouter une personne</BoutonM>
      )}
      <p className="text-encre-3 text-[0.82rem] mt-2 leading-snug">Seules ces personnes peuvent récupérer {e.prenom}, sur présentation de leur carte au portail.</p>
    </div>
  )
}

function AjoutAccompagnateur({ onFermer }: { onFermer: () => void }) {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [lien, setLien] = useState('Tante')
  const [tel, setTel] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const valider = () => {
    if (!prenom.trim() || !nom.trim()) return setErreur('Indiquez le prénom et le nom de la personne.')
    if (tel.replace(/\D/g, '').length < 9) return setErreur('Indiquez un numéro de téléphone complet, par exemple +224 620 00 00 00.')
    executer(() => {
      const f = famille(useStore.getState())
      useStore.setState((st) => ({
        familles: st.familles.map((x) => (x.id === f.id ? { ...x, accompagnateurs: [...x.accompagnateurs, { id: `A-R${Date.now().toString(36).toUpperCase()}`, prenom: prenom.trim(), nom: nom.trim(), lien, tel: tel.trim(), autorise: false }] } : x)),
      }))
      useStore.getState().journaliser('Carte', 'Demande d’ajout d’un accompagnateur', `${prenom.trim()} ${nom.trim()} (${lien.toLowerCase()}) · famille ${f.nom} · à valider par le secrétariat`, null, null, { autorise: 'en attente' })
      useStore.getState().toast({ titre: 'Demande envoyée', texte: 'Le secrétariat vérifiera l’identité avant d’activer la carte.', niveau: 'succes' })
      onFermer()
    })
  }
  return (
    <div className="mt-2.5 bg-white rounded-2xl border border-bleu-ligne p-4 space-y-2.5">
      <div className="font-semibold">Nouvelle personne autorisée</div>
      <div className="grid grid-cols-2 gap-2">
        <Saisie placeholder="Prénom" value={prenom} onChange={(e) => { setPrenom(e.target.value); setErreur(null) }} />
        <Saisie placeholder="Nom" value={nom} onChange={(e) => { setNom(e.target.value); setErreur(null) }} />
      </div>
      <Liste value={lien} onChange={(e) => setLien(e.target.value)}>
        {['Tante', 'Oncle', 'Grand-mère', 'Grand-père', 'Grand frère', 'Grande sœur', 'Voisine', 'Chauffeur de la famille'].map((l) => <option key={l}>{l}</option>)}
      </Liste>
      <Saisie placeholder="Téléphone" inputMode="tel" value={tel} onChange={(e) => { setTel(e.target.value); setErreur(null) }} />
      {erreur && <p className="text-rouge text-[0.88rem]">{erreur}</p>}
      <p className={cx('text-encre-3 text-[0.82rem]')}>La personne devra présenter une pièce d’identité au secrétariat pour recevoir sa carte.</p>
      <div className="grid grid-cols-2 gap-2">
        <BoutonM variante="secondaire" onClick={onFermer}>Annuler</BoutonM>
        <BoutonM onClick={valider} chargement={enCours}>Envoyer</BoutonM>
      </div>
    </div>
  )
}
