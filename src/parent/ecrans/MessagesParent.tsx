/** Messagerie avec l'école, annonces et cahier de liaison. */
import { useEffect, useRef, useState } from 'react'
import { Send, PenLine, Check, Megaphone, PlusCircle } from 'lucide-react'
import { useStore } from '../../store'
import { Avatar, Liste, Saisie, cx } from '../../ui/base'
import { BoutonM, CarteM, Puces } from '../mobile'
import { enfants, famille, allerParent, classeDe } from '../donnees'
import { nomPersonnel, indexClasses } from '../../store/selecteurs'
import { relatif, heureFr, dateCourte, JOUR_DEMO, maintenant } from '../../lib/temps'
import { useAction } from '../../ui/hooks'

type Onglet = 'conversations' | 'liaison' | 'annonces'

export function MessagesParent() {
  const s = useStore()
  const f = famille(s)
  const [onglet, setOnglet] = useState<Onglet>('conversations')
  const [nouvelle, setNouvelle] = useState(false)
  const liste = enfants(s)
  const convs = s.conversations.filter((c) => c.familleId === f.id)
  const derniers = (id: string) => s.messages.filter((m) => m.conversationId === id && m.date <= maintenant())
  const triees = [...convs].sort((a, b) => (derniers(b.id).at(-1)?.date ?? '').localeCompare(derniers(a.id).at(-1)?.date ?? ''))
  const mots = s.liaisons.filter((l) => liste.some((e) => e.classeId === l.classeId && (!l.eleveId || l.eleveId === e.id))).sort((a, b) => b.date.localeCompare(a.date))
  const nonSignes = mots.filter((m) => !m.signe).length
  const cycles = new Set(liste.map((e) => classeDe(s, e).cycle))
  const annonces = s.annonces.filter((a) => a.cible === 'Toute l’école' || [...cycles].some((c) => a.cible.toLowerCase() === { creche: 'crèche', maternelle: 'maternelle', primaire: 'primaire', college: 'collège' }[c]) || liste.some((e) => classeDe(s, e).nom === a.cible))

  return (
    <div>
      <Puces
        options={[
          { id: 'conversations', libelle: 'Conversations' },
          { id: 'liaison', libelle: <>Cahier de liaison{nonSignes > 0 && <span className="ml-1.5 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-rouge text-white text-[0.7rem] px-1">{nonSignes}</span>}</> },
          { id: 'annonces', libelle: 'Annonces' },
        ]}
        valeur={onglet}
        onChange={setOnglet}
      />

      {onglet === 'conversations' && (
        <div className="mt-3 space-y-2">
          {nouvelle ? <NouvelleConversation onFermer={() => setNouvelle(false)} /> : (
            <BoutonM variante="secondaire" onClick={() => setNouvelle(true)}><PlusCircle className="size-4" />Écrire à l’école</BoutonM>
          )}
          {triees.map((c) => {
            const msgs = derniers(c.id)
            const der = msgs.at(-1)
            const nonLus = msgs.filter((m) => m.auteur === 'ecole' && !m.lu).length
            const [p, n] = c.interlocuteur.split(' ')
            return (
              <CarteM key={c.id} onClick={() => allerParent('conversation', { conversationId: c.id })} className="flex gap-3">
                <Avatar prenom={p} nom={n ?? ''} taille={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="font-semibold truncate">{c.sujet}</span>
                    {der && <span className="text-encre-3 text-[0.75rem] shrink-0">{relatif(der.date)}</span>}
                  </span>
                  <span className="block text-encre-2 text-[0.82rem] truncate">{c.interlocuteur}</span>
                  {der && <span className={cx('block text-[0.88rem] truncate', nonLus ? 'font-semibold text-encre' : 'text-encre-2')}>{der.auteur === 'parent' ? 'Vous : ' : ''}{der.texte}</span>}
                </span>
                {nonLus > 0 && <span className="self-center min-w-5 h-5 rounded-full bg-bleu text-white text-[0.72rem] font-bold flex items-center justify-center px-1">{nonLus}</span>}
              </CarteM>
            )
          })}
        </div>
      )}

      {onglet === 'liaison' && (
        <div className="mt-3 space-y-2">
          {mots.map((m) => <MotLiaison key={m.id} id={m.id} />)}
          {mots.length === 0 && <p className="text-encre-2">Aucun mot dans le cahier de liaison.</p>}
        </div>
      )}

      {onglet === 'annonces' && (
        <div className="mt-3 space-y-2">
          {annonces.map((a) => (
            <CarteM key={a.id}>
              <div className="flex items-center gap-2 text-bleu text-[0.82rem] font-semibold"><Megaphone className="size-4" />{a.cible} · {relatif(a.date)}</div>
              <div className="font-semibold mt-1">{a.titre}</div>
              <p className="text-encre-2 text-[0.92rem] leading-snug mt-0.5">{a.texte}</p>
            </CarteM>
          ))}
        </div>
      )}
    </div>
  )
}

function MotLiaison({ id }: { id: string }) {
  const s = useStore()
  const m = s.liaisons.find((x) => x.id === id)!
  const [executer, enCours] = useAction()
  const c = indexClasses(s.classes)[m.classeId]
  const e = m.eleveId ? s.eleves.find((x) => x.id === m.eleveId) : null
  return (
    <CarteM className={cx(!m.signe && 'border-bleu-ligne')}>
      <div className="text-encre-2 text-[0.8rem]">{c.nom}{e ? ` · pour ${e.prenom}` : ' · toute la classe'} · {relatif(m.date)}</div>
      <div className="font-semibold text-[0.85rem] mt-0.5">{nomPersonnel(s, m.auteurId)}</div>
      <p className="mt-1 leading-snug">{m.texte}</p>
      {m.signe ? (
        <div className="mt-2 flex items-center gap-1.5 text-vert-texte text-[0.88rem] font-semibold"><Check className="size-4" />Lu et signé</div>
      ) : (
        <BoutonM className="mt-2.5 !py-2.5" onClick={() => executer(() => { useStore.getState().signerLiaison(m.id); useStore.getState().toast({ titre: 'Mot signé', texte: 'L’enseignant voit votre signature.', niveau: 'succes' }) })} chargement={enCours} testId="signer-liaison">
          <PenLine className="size-4" />Signer
        </BoutonM>
      )}
    </CarteM>
  )
}

function NouvelleConversation({ onFermer }: { onFermer: () => void }) {
  const s = useStore()
  const liste = enfants(s)
  const destinataires = [
    { id: 'Secrétariat', libelle: 'Secrétariat' },
    { id: 'Comptabilité', libelle: 'Comptabilité' },
    ...liste.map((e) => {
      const c = classeDe(s, e)
      const t = nomPersonnel(s, c.titulaireId)
      return { id: `${t} · ${c.cycle === 'creche' ? `groupe des ${c.nom}` : c.cycle === 'college' ? `professeur principal de ${c.nom}` : `${c.cycle === 'maternelle' ? 'maîtresse' : 'maître'} de ${c.nom}`}`, libelle: `${t} (${e.prenom})` }
    }),
  ]
  const [dest, setDest] = useState(destinataires[0].id)
  const [sujet, setSujet] = useState('')
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [executer, enCours] = useAction()
  const envoyer = () => {
    if (!sujet.trim()) return setErreur('Indiquez l’objet de votre message.')
    if (!texte.trim()) return setErreur('Écrivez votre message.')
    executer(() => {
      const id = `CONV-R${Date.now().toString(36).toUpperCase()}`
      useStore.setState((st) => ({ conversations: [...st.conversations, { id, familleId: famille(st).id, sujet: sujet.trim(), interlocuteur: dest }] }))
      useStore.getState().envoyerMessage(id, texte.trim(), 'parent')
      allerParent('conversation', { conversationId: id })
    })
  }
  return (
    <div className="bg-white rounded-2xl border border-bleu-ligne p-4 space-y-2.5">
      <div className="font-semibold">Nouveau message</div>
      <Liste value={dest} onChange={(e) => setDest(e.target.value)} aria-label="Destinataire">
        {destinataires.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
      </Liste>
      <Saisie placeholder="Objet" value={sujet} onChange={(e) => { setSujet(e.target.value); setErreur(null) }} />
      <textarea value={texte} onChange={(e) => { setTexte(e.target.value); setErreur(null) }} placeholder="Votre message" className="w-full min-h-20 rounded-lg border border-ligne px-3 py-2 focus:border-bleu focus:outline-none" />
      {erreur && <p className="text-rouge text-[0.88rem]">{erreur}</p>}
      <div className="grid grid-cols-2 gap-2">
        <BoutonM variante="secondaire" onClick={onFermer}>Annuler</BoutonM>
        <BoutonM onClick={envoyer} chargement={enCours}>Envoyer</BoutonM>
      </div>
    </div>
  )
}

export function ConversationParent() {
  const s = useStore()
  const id = s.session.parent.conversationId
  const c = s.conversations.find((x) => x.id === id)
  const msgs = s.messages.filter((m) => m.conversationId === id && m.date <= maintenant())
  const [texte, setTexte] = useState('')
  const [executer, enCours] = useAction()
  const fin = useRef<HTMLDivElement>(null)

  // les messages de l'école sont marqués lus à l'ouverture
  useEffect(() => {
    if (!id) return
    const t = setTimeout(() => useStore.setState((st) => ({ messages: st.messages.map((m) => (m.conversationId === id && m.auteur === 'ecole' && !m.lu ? { ...m, lu: true } : m)) })), 600)
    return () => clearTimeout(t)
  }, [id, msgs.length])
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  if (!c) return <p className="text-encre-2 mt-6">Conversation introuvable.</p>
  const envoyer = () => {
    if (!texte.trim()) return
    const t = texte.trim()
    setTexte('')
    executer(() => useStore.getState().envoyerMessage(c.id, t, 'parent'), [250, 450])
  }
  let dernierJour = ''
  return (
    <div className="flex flex-col min-h-full">
      <div className="text-center">
        <div className="font-semibold">{c.sujet}</div>
        <div className="text-encre-2 text-[0.85rem]">{c.interlocuteur}</div>
      </div>
      <div className="mt-3 space-y-2 flex-1">
        {msgs.map((m) => {
          const jour = m.date.slice(0, 10)
          const sep = jour !== dernierJour
          dernierJour = jour
          const moi = m.auteur === 'parent'
          return (
            <div key={m.id}>
              {sep && <div className="text-center text-encre-3 text-[0.75rem] my-2">{jour === JOUR_DEMO ? 'Aujourd’hui' : dateCourte(jour)}</div>}
              <div className={cx('flex', moi ? 'justify-end' : 'justify-start')}>
                <div className={cx('max-w-[82%] rounded-2xl px-3.5 py-2 text-[0.95rem] leading-snug', moi ? 'bg-bleu text-white rounded-br-md' : 'bg-white border border-ligne rounded-bl-md')}>
                  {!moi && <div className="text-[0.75rem] font-semibold text-bleu mb-0.5">{m.auteurNom}</div>}
                  {m.texte}
                  <div className={cx('text-[0.7rem] mt-0.5 text-right', moi ? 'text-white/70' : 'text-encre-3')}>{heureFr(m.date)}</div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={fin} />
      </div>
      <div className="h-3" />
      <form onSubmit={(e) => { e.preventDefault(); envoyer() }} className="sticky bottom-0 -mx-4 px-4 py-2 bg-brume/95 backdrop-blur border-t border-ligne flex gap-2">
        <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Votre message" className="flex-1 rounded-full border border-ligne bg-white px-4 py-2.5 focus:border-bleu focus:outline-none" aria-label="Votre message" />
        <button type="submit" disabled={!texte.trim() || enCours} className="size-11 rounded-full bg-bleu text-white flex items-center justify-center disabled:opacity-50" aria-label="Envoyer"><Send className="size-5" /></button>
      </form>
    </div>
  )
}
