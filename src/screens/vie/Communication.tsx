/** Communication côté école : messagerie avec les familles, annonces, cahier de liaison, autorisations. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Search, Megaphone, Plus, PenLine, FileSignature, Check, MessageSquare, ChevronLeft } from 'lucide-react'
import { useStore } from '../../store'
import { Avatar, Badge, Bloc, Bouton, Case, Champ, EnTetePage, Jauge, Liste, Onglets, Panneau, Saisie, Vide, Zone, cx, SqueletteTableau } from '../../ui/base'
import { indexFamilles, indexClasses, elevesParClasse, nomPersonnel, nomEleve, indexEleves } from '../../store/selecteurs'
import { profilParId } from '../../store/profils'
import { NOM_CYCLE, CYCLES } from '../../data/referentiel'
import { relatif, heureFr, dateCourte, JOUR_DEMO, ajouterJours, dateLongueMaj, maintenant } from '../../lib/temps'
import { nombre, pct, sansAccents } from '../../lib/format'
import { useAction, useChargement } from '../../ui/hooks'
import type { Cycle } from '../../data/types'
import { ID } from '../../data/generer'

type Onglet = 'messages' | 'annonces' | 'liaison' | 'autorisations'

export default function Communication() {
  const [onglet, setOnglet] = useState<Onglet>('messages')
  const pret = useChargement()
  const messages = useStore((s) => s.messages)
  const nonLus = messages.filter((m) => m.auteur === 'parent' && !m.lu && m.date <= maintenant()).length
  return (
    <div>
      <EnTetePage titre="Communication" sousTitre="Messages des familles, annonces, cahier de liaison et autorisations parentales" />
      <Onglets
        className="mb-5"
        onglets={[
          { id: 'messages', libelle: 'Messages', compte: nonLus || undefined },
          { id: 'annonces', libelle: 'Annonces' },
          { id: 'liaison', libelle: 'Cahier de liaison' },
          { id: 'autorisations', libelle: 'Autorisations' },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />
      {!pret ? <div className="bg-white rounded-xl border border-ligne"><SqueletteTableau /></div> : (
        <>
          {onglet === 'messages' && <Messagerie />}
          {onglet === 'annonces' && <Annonces />}
          {onglet === 'liaison' && <CahierLiaison />}
          {onglet === 'autorisations' && <Autorisations />}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Messagerie */
function Messagerie() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'non_lus'>('tous')
  const fam = indexFamilles(s.familles)
  const convs = useMemo(() => {
    const parConv: Record<string, typeof s.messages> = {}
    const t = maintenant()
    // les messages datés plus tard dans la journée de démo n'apparaissent qu'à leur heure
    for (const m of s.messages) if (m.date <= t) (parConv[m.conversationId] ??= []).push(m)
    return s.conversations
      .map((c) => ({ c, msgs: parConv[c.id] ?? [] }))
      .filter((x) => x.msgs.length)
      .sort((a, b) => b.msgs[b.msgs.length - 1].date.localeCompare(a.msgs[a.msgs.length - 1].date))
  }, [s.conversations, s.messages])
  const [selId, setSelId] = useState<string | null>(null)
  // sur téléphone : la liste, puis la conversation choisie (retour par le bouton « Conversations »)
  const [filMobile, setFilMobile] = useState(false)
  const visibles = convs.filter(({ c, msgs }) => {
    if (filtre === 'non_lus' && !msgs.some((m) => m.auteur === 'parent' && !m.lu)) return false
    if (!q.trim()) return true
    return sansAccents(`${fam[c.familleId]?.nom} ${c.sujet} ${c.interlocuteur}`).includes(sansAccents(q))
  })
  const sel = convs.find((x) => x.c.id === selId) ?? visibles[0]

  useEffect(() => {
    if (!sel) return
    const id = sel.c.id
    const t = setTimeout(() => useStore.setState((st) => ({ messages: st.messages.map((m) => (m.conversationId === id && m.auteur === 'parent' && !m.lu ? { ...m, lu: true } : m)) })), 900)
    return () => clearTimeout(t)
  }, [sel?.c.id, sel?.msgs.length])

  return (
    <div className="bg-white rounded-xl border border-ligne grid grid-cols-1 md:grid-cols-[minmax(15rem,22rem)_1fr] lg:grid-cols-[minmax(17rem,24rem)_1fr] min-h-[30rem] h-[calc(100dvh-15rem)] md:h-[calc(100dvh-17rem)] overflow-hidden">
      <div className={cx('md:border-r border-ligne flex-col min-h-0', filMobile ? 'hidden md:flex' : 'flex')}>
        <div className="p-3 space-y-2 border-b border-ligne">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
            <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Famille, objet…" className="pl-9 !py-2" />
          </div>
          <div className="flex gap-1.5">
            {(['tous', 'non_lus'] as const).map((f) => (
              <button key={f} onClick={() => setFiltre(f)} className={cx('rounded-full px-3.5 py-1.5 min-h-9 text-sm font-semibold', filtre === f ? 'bg-bleu text-white' : 'bg-ligne-2 text-encre-2')}>{f === 'tous' ? 'Toutes' : 'Non lues'}</button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto defilement">
          {visibles.length === 0 && <li className="p-5 text-encre-2">Aucune conversation ne correspond.</li>}
          {visibles.map(({ c, msgs }) => {
            const f = fam[c.familleId]
            const der = msgs[msgs.length - 1]
            const nl = msgs.filter((m) => m.auteur === 'parent' && !m.lu).length
            return (
              <li key={c.id}>
                <button onClick={() => { setSelId(c.id); setFilMobile(true) }} className={cx('w-full text-left flex gap-3 px-4 py-3 border-b border-ligne-2', sel?.c.id === c.id ? 'md:bg-bleu-clair' : 'hover:bg-brume')}>
                  <Avatar prenom={(f?.responsable === 'mere' ? f.mere : f?.pere)?.prenom ?? f?.nom ?? ''} nom={f?.nom ?? ''} taille={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2"><span className={cx('truncate', nl ? 'font-bold' : 'font-semibold')}>Famille {f?.nom}</span><span className="text-xs text-encre-3 shrink-0">{relatif(der.date)}</span></span>
                    <span className="block text-sm text-encre-2 truncate">{c.sujet}</span>
                    <span className={cx('block text-sm truncate', nl ? 'text-encre' : 'text-encre-3')}>{der.auteur === 'ecole' ? 'Vous : ' : ''}{der.texte}</span>
                  </span>
                  {nl > 0 && <span className="self-center min-w-5 h-5 rounded-full bg-bleu text-white text-xs font-bold flex items-center justify-center px-1">{nl}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className={cx('min-h-0 min-w-0 flex-col', filMobile ? 'flex' : 'hidden md:flex')}>
        <button onClick={() => setFilMobile(false)} className="md:hidden flex items-center gap-1.5 px-4 py-2.5 min-h-11 border-b border-ligne text-bleu font-semibold">
          <ChevronLeft className="size-4" />Conversations
        </button>
        {sel ? <FilConversation conversationId={sel.c.id} /> : <Vide icone={<MessageSquare className="size-8" />} titre="Aucune conversation" />}
      </div>
    </div>
  )
}

function FilConversation({ conversationId }: { conversationId: string }) {
  const s = useStore()
  const c = s.conversations.find((x) => x.id === conversationId)!
  const f = indexFamilles(s.familles)[c.familleId]
  const msgs = s.messages.filter((m) => m.conversationId === conversationId && m.date <= maintenant())
  const enfants = s.eleves.filter((e) => e.familleId === f.id && e.statut === 'actif')
  const ic = indexClasses(s.classes)
  const [texte, setTexte] = useState('')
  const [executer, enCours] = useAction()
  const fin = useRef<HTMLDivElement>(null)
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [msgs.length, conversationId])
  const reponses = ['Bien reçu, merci. Nous faisons le nécessaire.', 'Merci de passer au secrétariat avec le justificatif.', 'C’est noté, l’enseignant est informé.']
  const envoyer = () => {
    if (!texte.trim()) return
    const t = texte.trim()
    executer(() => {
      s.envoyerMessage(conversationId, t, 'ecole')
      setTexte('')
    }, [250, 450])
  }
  const parent = f.responsable === 'mere' ? f.mere : f.pere
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-4 sm:px-5 py-3 border-b border-ligne">
        <div className="font-semibold titre">{c.sujet}</div>
        <div className="text-sm text-encre-2">Famille {f.nom} · {parent ? `${parent.prenom} ${parent.nom}, ${parent.tel}` : ''} · {enfants.map((e) => `${e.prenom} (${ic[e.classeId].nom})`).join(', ')}</div>
      </div>
      <div className="flex-1 overflow-y-auto defilement px-3 sm:px-5 py-4 space-y-2.5 bg-brume/50">
        {msgs.map((m) => {
          const ecole = m.auteur === 'ecole'
          return (
            <div key={m.id} className={cx('flex', ecole ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5', ecole ? 'bg-bleu text-white rounded-br-md' : 'bg-white border border-ligne rounded-bl-md')}>
                <div className={cx('text-xs font-semibold mb-0.5', ecole ? 'text-white/80' : 'text-bleu')}>{m.auteurNom}</div>
                <div>{m.texte}</div>
                <div className={cx('text-[0.72rem] mt-1 text-right', ecole ? 'text-white/70' : 'text-encre-3')}>{m.date.startsWith(JOUR_DEMO) ? heureFr(m.date) : `${dateCourte(m.date.slice(0, 10))} à ${heureFr(m.date)}`}</div>
              </div>
            </div>
          )
        })}
        <div ref={fin} />
      </div>
      <div className="border-t border-ligne px-3 sm:px-5 py-3 space-y-2">
        <div className="flex sm:flex-wrap gap-1.5 overflow-x-auto defilement -mx-3 px-3 sm:mx-0 sm:px-0 pb-0.5">
          {reponses.map((r) => (
            <button key={r} onClick={() => setTexte(r)} className="shrink-0 whitespace-nowrap sm:whitespace-normal rounded-full border border-ligne px-3 py-1.5 min-h-9 text-sm text-encre-2 hover:border-bleu-ligne hover:text-bleu">{r}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); envoyer() }} className="flex gap-2">
          <Saisie value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={`Répondre à la famille ${f.nom}…`} />
          <Bouton type="submit" icone={<Send className="size-4" />} chargement={enCours} disabled={!texte.trim()} aria-label="Envoyer"><span className="hidden sm:inline">Envoyer</span></Bouton>
        </form>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Annonces */
function cibles(s: ReturnType<typeof useStore.getState>) {
  return [
    { id: 'Toute l’école', familles: new Set(s.eleves.filter((e) => e.statut === 'actif').map((e) => e.familleId)).size },
    ...CYCLES.map((c) => ({ id: NOM_CYCLE[c], familles: new Set(s.eleves.filter((e) => e.statut === 'actif' && indexClasses(s.classes)[e.classeId].cycle === c).map((e) => e.familleId)).size })),
    ...s.classes.filter((c) => c.cycle !== 'creche').map((c) => ({ id: c.nom, familles: new Set((elevesParClasse(s.eleves)[c.id] ?? []).map((e) => e.familleId)).size })),
  ]
}

function Annonces() {
  const s = useStore()
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Bouton icone={<Plus className="size-4" />} onClick={() => setOuvert(true)} className="max-sm:w-full">Nouvelle annonce</Bouton></div>
      {/* téléphone et tablette en portrait : une carte par annonce */}
      <ul className="md:hidden space-y-3">
        {s.annonces.map((a) => (
          <li key={a.id} className="bg-white rounded-xl border border-ligne p-4">
            <div className="font-semibold flex items-start gap-2"><Megaphone className="size-4 text-bleu shrink-0 mt-1" />{a.titre}</div>
            <p className="text-sm text-encre-2 mt-1">{a.texte}</p>
            <div className="flex flex-wrap gap-1 mt-2">{a.canaux.map((c) => <Badge key={c} ton="bleu">{c}</Badge>)}</div>
            <div className="text-sm text-encre-2 mt-2">{a.cible} · {nombre(a.destinataires)} familles · {relatif(a.date)} · {nomPersonnel(s, a.auteurId)}</div>
            <div className="flex items-center gap-2 mt-2"><Jauge valeur={a.destinataires ? a.lectures / a.destinataires : 0} /><span className="tabulaire text-sm whitespace-nowrap">lue à {pct(a.destinataires ? a.lectures / a.destinataires : 0)}</span></div>
          </li>
        ))}
      </ul>
      <Bloc sansMarge className="hidden md:block">
        <table className="tableau">
          <thead>
            <tr><th>Annonce</th><th>Destinataires</th><th>Canaux</th><th>Publiée</th><th className="w-56">Lue par</th></tr>
          </thead>
          <tbody>
            {s.annonces.map((a) => (
              <tr key={a.id}>
                <td className="max-w-[28rem]">
                  <div className="font-semibold flex items-center gap-2"><Megaphone className="size-4 text-bleu shrink-0" />{a.titre}</div>
                  <div className="text-sm text-encre-2 truncate">{a.texte}</div>
                </td>
                <td>{a.cible}<div className="text-sm text-encre-2">{nombre(a.destinataires)} familles</div></td>
                <td><div className="flex flex-wrap gap-1">{a.canaux.map((c) => <Badge key={c} ton="bleu">{c}</Badge>)}</div></td>
                <td className="whitespace-nowrap">{relatif(a.date)}<div className="text-sm text-encre-2">{nomPersonnel(s, a.auteurId)}</div></td>
                <td>
                  <div className="flex items-center gap-2"><Jauge valeur={a.destinataires ? a.lectures / a.destinataires : 0} /><span className="tabulaire text-sm w-12 text-right">{pct(a.destinataires ? a.lectures / a.destinataires : 0)}</span></div>
                  <div className="text-sm text-encre-2 mt-0.5">{nombre(a.lectures)} sur {nombre(a.destinataires)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloc>
      <NouvelleAnnonce ouvert={ouvert} onFermer={() => setOuvert(false)} />
    </div>
  )
}

function NouvelleAnnonce({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const s = useStore()
  const liste = useMemo(() => cibles(useStore.getState()), [s.eleves])
  const [titre, setTitre] = useState('')
  const [texte, setTexte] = useState('')
  const [cible, setCible] = useState('Toute l’école')
  const [canaux, setCanaux] = useState<string[]>(['Espace parent', 'WhatsApp'])
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const dest = liste.find((c) => c.id === cible)?.familles ?? 0
  const publier = () => {
    if (!titre.trim()) return setErreur('Donnez un titre à l’annonce.')
    if (!texte.trim()) return setErreur('Écrivez le texte de l’annonce.')
    if (!canaux.length) return setErreur('Choisissez au moins un canal d’envoi.')
    executer(() => {
      s.publierAnnonce({ titre: titre.trim(), texte: texte.trim(), cible, canaux, destinataires: dest })
      s.toast({ titre: 'Annonce publiée', texte: `${nombre(dest)} familles prévenues · ${canaux.join(', ')}`, niveau: 'succes' })
      setTitre(''); setTexte(''); onFermer()
    })
  }
  return (
    <Panneau ouvert={ouvert} onFermer={onFermer} titre="Nouvelle annonce" sousTitre="Envoyée aux familles concernées, et tracée" pied={<><Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton><Bouton onClick={publier} chargement={enCours}>Publier l’annonce</Bouton></>}>
      <div className="space-y-4">
        <Champ libelle="Titre"><Saisie value={titre} onChange={(e) => { setTitre(e.target.value); setErreur(null) }} placeholder="Ex. Fermeture exceptionnelle vendredi" /></Champ>
        <Champ libelle="Message"><Zone value={texte} onChange={(e) => { setTexte(e.target.value); setErreur(null) }} placeholder="Phrases courtes, l’essentiel en premier." /></Champ>
        <Champ libelle="Destinataires" aide={`${nombre(dest)} familles recevront l’annonce`}>
          <Liste value={cible} onChange={(e) => setCible(e.target.value)}>
            <optgroup label="École et cycles">{liste.slice(0, 5).map((c) => <option key={c.id}>{c.id}</option>)}</optgroup>
            <optgroup label="Classes">{liste.slice(5).map((c) => <option key={c.id}>{c.id}</option>)}</optgroup>
          </Liste>
        </Champ>
        <div>
          <div className="text-sm font-semibold text-encre-2 mb-2">Canaux</div>
          <div className="flex flex-col gap-2">
            {['Espace parent', 'WhatsApp', 'SMS'].map((c) => (
              <Case key={c} checked={canaux.includes(c)} onChange={(v) => { setCanaux((x) => (v ? [...x, c] : x.filter((y) => y !== c))); setErreur(null) }} libelle={c} />
            ))}
          </div>
        </div>
        {erreur && <p className="text-rouge text-sm">{erreur}</p>}
      </div>
    </Panneau>
  )
}

/* -------------------------------------------------------- Cahier de liaison */
function CahierLiaison() {
  const s = useStore()
  const role = profilParId(s.session.profilId).role
  const ic = indexClasses(s.classes)
  const ie = indexEleves(s.eleves)
  const classesNotees = s.classes.filter((c) => c.cycle !== 'creche')
  const defaut = role === 'enseignant' ? ID.classeIbrahima : role === 'professeur' ? ID.classeFatoumata : classesNotees[0].id
  const [classeId, setClasseId] = useState(classesNotees.some((c) => c.id === defaut) ? defaut : classesNotees[0].id)
  const [eleveId, setEleveId] = useState('')
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const eleves = elevesParClasse(s.eleves)[classeId] ?? []
  const ecrire = () => {
    if (!texte.trim()) return setErreur('Écrivez le mot destiné aux familles.')
    executer(() => {
      s.ajouterLiaison({ classeId, eleveId: eleveId || null, texte: texte.trim() })
      s.toast({ titre: 'Mot ajouté au cahier de liaison', texte: eleveId ? `Pour ${nomEleve(ie[eleveId])}` : `Toute la classe ${ic[classeId].nom}`, niveau: 'succes' })
      setTexte(''); setEleveId('')
    })
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_24rem] gap-5 items-start">
      <Bloc titre="Mots récents" sansMarge>
        <ul>
          {s.liaisons.map((l) => (
            <li key={l.id} className="flex flex-wrap sm:flex-nowrap gap-x-3 gap-y-1.5 px-4 sm:px-5 py-3 border-t border-ligne-2 first:border-t-0">
              <PenLine className="size-5 text-bleu shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-encre-2">{ic[l.classeId]?.nom}{l.eleveId ? ` · pour ${nomEleve(ie[l.eleveId])}` : ' · toute la classe'} · {nomPersonnel(s, l.auteurId)} · {relatif(l.date)}</div>
                <div className="mt-0.5">{l.texte}</div>
              </div>
              {l.signe ? <Badge ton="vert"><Check className="size-3.5" />Signé</Badge> : <Badge ton="ambre">À signer</Badge>}
            </li>
          ))}
        </ul>
      </Bloc>
      <Bloc titre="Écrire un mot">
        <div className="space-y-3">
          <Champ libelle="Classe"><Liste value={classeId} onChange={(e) => { setClasseId(e.target.value); setEleveId('') }}>{classesNotees.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</Liste></Champ>
          <Champ libelle="Destinataire"><Liste value={eleveId} onChange={(e) => setEleveId(e.target.value)}><option value="">Toute la classe ({eleves.length} familles)</option>{eleves.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}</Liste></Champ>
          <Champ libelle="Message"><Zone value={texte} onChange={(e) => { setTexte(e.target.value); setErreur(null) }} placeholder="Ex. Apporter une blouse pour l’atelier de sciences de jeudi." /></Champ>
          {erreur && <p className="text-rouge text-sm">{erreur}</p>}
          <Bouton className="w-full" onClick={ecrire} chargement={enCours}>Ajouter au cahier</Bouton>
        </div>
      </Bloc>
    </div>
  )
}

/* ---------------------------------------------------------- Autorisations */
function Autorisations() {
  const s = useStore()
  const ic = indexClasses(s.classes)
  const epc = elevesParClasse(s.eleves)
  const [sel, setSel] = useState(s.autorisations[0]?.id ?? '')
  const [ouvert, setOuvert] = useState(false)
  const [executer, enCours] = useAction()
  const a = s.autorisations.find((x) => x.id === sel)
  const stats = (id: string) => {
    const au = s.autorisations.find((x) => x.id === id)!
    const concernes = au.classeIds.flatMap((c) => epc[c] ?? [])
    const oui = concernes.filter((e) => au.reponses[e.id] === 'oui').length
    const non = concernes.filter((e) => au.reponses[e.id] === 'non').length
    return { total: concernes.length, oui, non, sans: concernes.length - oui - non }
  }
  const relancer = () => {
    if (!a) return
    const st = stats(a.id)
    executer(() => {
      s.journaliser('Autorisation', 'Relance des familles sans réponse', `${a.titre} · ${st.sans} familles`, null, null, { canal: 'SMS et espace parent' })
      s.toast({ titre: 'Relance envoyée', texte: `${nombre(st.sans)} familles sans réponse ont reçu un rappel.`, niveau: 'succes' })
    })
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[26rem_1fr] gap-5 items-start">
      <div className="space-y-2">
        <Bouton variante="secondaire" className="w-full" icone={<Plus className="size-4" />} onClick={() => setOuvert(true)}>Nouvelle autorisation</Bouton>
        {s.autorisations.map((x) => {
          const st = stats(x.id)
          return (
            <button key={x.id} onClick={() => setSel(x.id)} className={cx('w-full text-left bg-white rounded-xl border px-4 py-3', sel === x.id ? 'border-bleu ring-2 ring-bleu/15' : 'border-ligne hover:border-bleu-ligne')}>
              <div className="font-semibold flex items-center gap-2"><FileSignature className="size-4 text-bleu" />{x.titre}</div>
              <div className="text-sm text-encre-2 mt-0.5">{dateLongueMaj(x.date)} · réponse avant le {dateCourte(x.limite)}</div>
              <div className="flex items-center gap-2 mt-2"><Jauge valeur={st.total ? (st.oui + st.non) / st.total : 0} /><span className="text-sm tabulaire whitespace-nowrap">{pct(st.total ? (st.oui + st.non) / st.total : 0)} de réponses</span></div>
            </button>
          )
        })}
      </div>
      {a && (
        <Bloc titre={a.titre} actions={<Bouton variante="secondaire" taille="sm" onClick={relancer} chargement={enCours} className="max-sm:whitespace-normal">Relancer les familles sans réponse</Bouton>}>
          <p className="text-encre-2 mb-4">{a.description}</p>
          {(() => {
            const st = stats(a.id)
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[['Concernés', st.total, ''], ['Autorisent', st.oui, 'text-vert-texte'], ['Refusent', st.non, 'text-rouge'], ['Sans réponse', st.sans, 'text-ambre']].map(([l, v, c]) => (
                  <div key={l as string}><div className="text-encre-2 text-sm">{l}</div><div className={cx('chiffre text-[1.6rem]', c as string)}>{nombre(v as number)}</div></div>
                ))}
              </div>
            )
          })()}
          <ul className="md:hidden divide-y divide-ligne-2 -mx-4 border-t border-ligne-2">
            {a.classeIds.slice(0, 40).map((cid) => {
              const el = epc[cid] ?? []
              const oui = el.filter((e) => a.reponses[e.id] === 'oui').length
              const non = el.filter((e) => a.reponses[e.id] === 'non').length
              return (
                <li key={cid} className="px-4 py-2.5">
                  <div className="flex justify-between gap-2"><span className="font-semibold">{ic[cid]?.nom}</span><span className="text-sm tabulaire"><span className="text-vert-texte">{oui} oui</span> · <span className="text-rouge">{non} non</span> · <span className="text-ambre">{el.length - oui - non} sans réponse</span></span></div>
                  <div className="mt-1.5"><Jauge valeur={el.length ? (oui + non) / el.length : 0} /></div>
                </li>
              )
            })}
          </ul>
          <table className="tableau hidden md:table">
            <thead><tr><th>Classe</th><th>Élèves</th><th>Oui</th><th>Non</th><th>Sans réponse</th><th className="w-48">Taux de réponse</th></tr></thead>
            <tbody>
              {a.classeIds.slice(0, 40).map((cid) => {
                const el = epc[cid] ?? []
                const oui = el.filter((e) => a.reponses[e.id] === 'oui').length
                const non = el.filter((e) => a.reponses[e.id] === 'non').length
                return (
                  <tr key={cid}>
                    <td className="font-semibold">{ic[cid]?.nom}</td>
                    <td className="tabulaire">{el.length}</td>
                    <td className="tabulaire text-vert-texte">{oui}</td>
                    <td className="tabulaire text-rouge">{non}</td>
                    <td className="tabulaire text-ambre">{el.length - oui - non}</td>
                    <td><div className="flex items-center gap-2"><Jauge valeur={el.length ? (oui + non) / el.length : 0} /><span className="text-sm tabulaire w-11 text-right">{pct(el.length ? (oui + non) / el.length : 0)}</span></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Bloc>
      )}
      <NouvelleAutorisation ouvert={ouvert} onFermer={() => setOuvert(false)} onCree={setSel} />
    </div>
  )
}

function NouvelleAutorisation({ ouvert, onFermer, onCree }: { ouvert: boolean; onFermer: () => void; onCree: (id: string) => void }) {
  const s = useStore()
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(ajouterJours(JOUR_DEMO, 14))
  const [cycle, setCycle] = useState<Cycle | 'classe'>('primaire')
  const [classeId, setClasseId] = useState(s.classes.find((c) => c.cycle === 'primaire')!.id)
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const creer = () => {
    if (!titre.trim()) return setErreur('Donnez un titre, par exemple « Sortie au jardin botanique ».')
    if (date <= JOUR_DEMO) return setErreur('Choisissez une date postérieure à aujourd’hui.')
    executer(() => {
      const id = `AUT-R${Date.now().toString(36).toUpperCase()}`
      const classeIds = cycle === 'classe' ? [classeId] : s.classes.filter((c) => c.cycle === cycle).map((c) => c.id)
      useStore.setState((st) => ({ autorisations: [{ id, titre: titre.trim(), description: description.trim() || 'Merci de donner votre réponse depuis l’espace parent.', date, limite: ajouterJours(date, -3), classeIds, reponses: {} }, ...st.autorisations] }))
      s.journaliser('Autorisation', 'Demande d’autorisation envoyée', `${titre.trim()} · ${cycle === 'classe' ? indexClasses(s.classes)[classeId].nom : NOM_CYCLE[cycle]}`, null, null, { classes: classeIds.length })
      if (classeIds.some((c) => s.eleves.some((e) => e.familleId === ID.famille && e.classeId === c))) {
        useStore.setState((st) => ({ notifications: [{ id: `NOT-R${Date.now().toString(36)}`, date: `${JOUR_DEMO}T12:00:00`, titre: 'Autorisation à donner', texte: titre.trim(), cible: 'parent', niveau: 'info', lien: '/parent/autorisations', lu: false }, ...st.notifications] }))
      }
      s.toast({ titre: 'Demande envoyée aux familles', texte: titre.trim(), niveau: 'succes' })
      onCree(id)
      setTitre(''); setDescription(''); onFermer()
    })
  }
  return (
    <Panneau ouvert={ouvert} onFermer={onFermer} titre="Nouvelle autorisation parentale" pied={<><Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton><Bouton onClick={creer} chargement={enCours}>Envoyer aux familles</Bouton></>}>
      <div className="space-y-4">
        <Champ libelle="Objet"><Saisie value={titre} onChange={(e) => { setTitre(e.target.value); setErreur(null) }} placeholder="Ex. Sortie au jardin botanique" /></Champ>
        <Champ libelle="Détails pour les familles"><Zone value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Horaires, transport, tenue, goûter…" /></Champ>
        <Champ libelle="Date de l’événement"><Saisie type="date" value={date} onChange={(e) => { setDate(e.target.value); setErreur(null) }} /></Champ>
        <Champ libelle="Familles concernées">
          <Liste value={cycle} onChange={(e) => setCycle(e.target.value as Cycle | 'classe')}>
            {CYCLES.map((c) => <option key={c} value={c}>Tout le cycle : {NOM_CYCLE[c].toLowerCase()}</option>)}
            <option value="classe">Une seule classe</option>
          </Liste>
        </Champ>
        {cycle === 'classe' && (
          <Champ libelle="Classe"><Liste value={classeId} onChange={(e) => setClasseId(e.target.value)}>{s.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</Liste></Champ>
        )}
        {erreur && <p className="text-rouge text-sm">{erreur}</p>}
      </div>
    </Panneau>
  )
}
