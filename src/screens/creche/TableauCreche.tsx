/** Tableau du jour de la crèche : présents, encadrement en direct, journal et jalons. */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Tablet, DoorOpen, OctagonAlert, Users, Sprout } from 'lucide-react'
import { useStore } from '../../store'
import { crecheGroupes, journalParEleve, indexFamilles, nomPersonnel, indexPersonnel } from '../../store/selecteurs'
import type { Eleve } from '../../data/types'
import { Avatar, Badge, Bloc, Bouton, Case, EnTetePage, Jauge, Panneau, SqueletteTableau, COULEUR_CYCLE, cx, Alerte, Segments } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { ageLisible, ageEnMois, heureFr, dateCourte } from '../../lib/temps'
import { nombre } from '../../lib/format'
import { ACTION_PAR_TYPE } from './commun'

export default function TableauCreche() {
  const s = useStore()
  const pret = useChargement()
  const nav = useNavigate()
  const groupes = crecheGroupes(s)
  const journal = journalParEleve(s.journal)
  const [enfantId, setEnfantId] = useState<string | null>(null)
  const [groupeAdultes, setGroupeAdultes] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<string>('tous')

  const totaux = useMemo(() => {
    let presents = 0, attendus = 0, partis = 0, adultes = 0
    for (const g of groupes) {
      attendus += g.enfants.length
      presents += g.presents.length
      partis += g.enfants.filter((e) => s.presences[e.id]?.depart).length
      adultes += g.adultes.length
    }
    return { presents, attendus, partis, adultes }
  }, [groupes, s.presences])

  return (
    <div>
      <EnTetePage
        titre={<span className="flex items-center gap-2.5"><span className="size-3 rounded-full" style={{ background: COULEUR_CYCLE.creche }} />Crèche · tableau du jour</span>}
        sousTitre={`${nombre(totaux.presents)} enfants présents sur ${nombre(totaux.attendus)} inscrits · ${totaux.partis} déjà partis · ${totaux.adultes} adultes auprès des enfants`}
        actions={
          <>
            <Bouton variante="secondaire" icone={<DoorOpen className="size-4" />} onClick={() => nav('/creche/remise')}>Remise d’un enfant</Bouton>
            <Bouton icone={<Tablet className="size-4" />} onClick={() => nav('/creche/journal')}>Journal du jour sur tablette</Bouton>
          </>
        }
      />
      {groupes.some((g) => g.depasse) && (
        <div className="mb-4">
          <Alerte ton="rouge" icone={<OctagonAlert className="size-5" />} titre="Taux d’encadrement dépassé">
            {groupes.filter((g) => g.depasse).map((g) => `${g.classe.nom} : ${g.presents.length} enfants pour ${g.adultes.length} adulte${g.adultes.length > 1 ? 's' : ''} (maximum 1 pour ${g.ratioMax})`).join(' · ')}. Ajoutez un adulte au groupe ou regroupez les enfants.
          </Alerte>
        </div>
      )}
      {!pret ? (
        <div className="bg-white rounded-xl border border-ligne"><SqueletteTableau /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 min-[64rem]:grid-cols-3 gap-5 items-stretch">
            {groupes.map((g) => {
              const partis = g.enfants.filter((e) => s.presences[e.id]?.depart)
              const ratio = g.adultes.length ? g.presents.length / g.adultes.length : Infinity
              return (
                <Bloc
                  key={g.classe.id}
                  filet={COULEUR_CYCLE.creche}
                  titre={<span>{g.classe.nom} <span className="text-encre-3 font-normal text-base">· {g.classe.salle}</span></span>}
                  actions={<Badge ton={g.depasse ? 'rouge' : 'vert'} point>{g.adultes.length ? `1 pour ${ratio.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}` : 'Aucun adulte'}</Badge>}
                >
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Chiffre libelle="Présents" valeur={g.presents.length} />
                    <Chiffre libelle="Inscrits" valeur={g.enfants.length} />
                    <Chiffre libelle="Partis" valeur={partis.length} />
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-encre-2 mb-1">
                      <span>Encadrement en direct</span>
                      <span>maximum 1 adulte pour {g.ratioMax}</span>
                    </div>
                    <Jauge valeur={g.adultes.length ? Math.min(1, ratio / g.ratioMax) : 1} couleur={g.depasse ? 'var(--color-rouge)' : ratio / g.ratioMax > 0.85 ? 'var(--color-ambre)' : 'var(--color-vert)'} hauteur={8} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex -space-x-2">
                      {g.adultes.map((id) => {
                        const p = indexPersonnel(s.personnel)[id]
                        return p ? <span key={id} title={`${p.prenom} ${p.nom}`} className="ring-2 ring-white rounded-full"><Avatar prenom={p.prenom} nom={p.nom} taille={32} /></span> : null
                      })}
                    </div>
                    <Bouton variante="discret" taille="sm" icone={<Users className="size-4" />} onClick={() => setGroupeAdultes(g.classe.id)}>{g.adultes.length} adulte{g.adultes.length > 1 ? 's' : ''} présent{g.adultes.length > 1 ? 's' : ''}</Bouton>
                  </div>
                </Bloc>
              )
            })}
          </div>
          <Bloc className="mt-5" sansMarge titre="Les enfants aujourd’hui" actions={<Segments options={[{ id: 'tous', libelle: 'Tous' }, ...groupes.map((g) => ({ id: g.classe.id, libelle: g.classe.nom }))]} valeur={filtre} onChange={setFiltre} />}>
            {/* téléphone : une carte par enfant */}
            <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
              {groupes.filter((g) => filtre === 'tous' || g.classe.id === filtre).flatMap((g) => g.enfants.map((e) => ({ e, g }))).map(({ e, g }) => {
                const p = s.presences[e.id]
                const der = (journal[e.id] ?? []).at(-1)
                const A = der ? ACTION_PAR_TYPE[der.type] : null
                return (
                  <li key={e.id}>
                    <button onClick={() => setEnfantId(e.id)} className={cx('w-full text-left px-4 py-3 flex gap-3 active:bg-brume', !p?.arrivee && 'text-encre-3')}>
                      <Avatar prenom={e.prenom} nom={e.nom} taille={40} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold truncate">{e.prenom} {e.nom}</span>
                          <span className="text-sm tabulaire shrink-0">{p?.arrivee ? (p.depart ? `Parti${e.sexe === 'F' ? 'e' : ''} à ${heureFr(p.depart)}` : `Arrivé${e.sexe === 'F' ? 'e' : ''} à ${heureFr(p.arrivee)}`) : `Absent${e.sexe === 'F' ? 'e' : ''}`}</span>
                        </span>
                        <span className="block text-xs text-encre-2">{g.classe.nom} · {ageEnMois(e.naissance)} mois</span>
                        {der && A && (
                          <span className="flex items-start gap-1.5 text-sm mt-1">
                            <A.icone className="size-4 shrink-0 mt-0.5" style={{ color: A.couleur }} />
                            <span className="line-clamp-2">{heureFr(der.heure)} · {der.detail}</span>
                          </span>
                        )}
                        {e.sante.allergies.length > 0 && <Badge ton="rouge" point className="mt-1.5">Allergie : {e.sante.allergies.join(', ').toLowerCase()}</Badge>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto defilement">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Enfant</th>
                    <th>Groupe</th>
                    <th>Arrivée</th>
                    <th>Départ</th>
                    <th>Dernière entrée du journal</th>
                    <th>Santé</th>
                  </tr>
                </thead>
                <tbody>
                  {groupes.filter((g) => filtre === 'tous' || g.classe.id === filtre).flatMap((g) => g.enfants.map((e) => ({ e, g }))).map(({ e, g }) => {
                    const p = s.presences[e.id]
                    const der = (journal[e.id] ?? []).at(-1)
                    const A = der ? ACTION_PAR_TYPE[der.type] : null
                    return (
                      <tr key={e.id} className={cx('cliquable', !p?.arrivee && 'text-encre-3')} onClick={() => setEnfantId(e.id)} data-testid={`enfant-${e.id}`}>
                        <td>
                          <span className="flex items-center gap-2.5">
                            <Avatar prenom={e.prenom} nom={e.nom} taille={32} />
                            <span>
                              <span className="font-semibold block">{e.prenom} {e.nom}</span>
                              <span className="block text-xs text-encre-2">{ageEnMois(e.naissance)} mois</span>
                            </span>
                          </span>
                        </td>
                        <td>{g.classe.nom}</td>
                        <td className="tabulaire whitespace-nowrap">{p?.arrivee ? heureFr(p.arrivee) : <Badge>Absent{e.sexe === 'F' ? 'e' : ''}</Badge>}</td>
                        <td className="tabulaire whitespace-nowrap">{p?.depart ? heureFr(p.depart) : <span className="text-encre-3">—</span>}</td>
                        <td>
                          {der && A ? (
                            <span className="flex items-start gap-1.5">
                              <A.icone className="size-4 shrink-0 mt-0.5" style={{ color: A.couleur }} />
                              <span>{heureFr(der.heure)} · {der.detail}</span>
                            </span>
                          ) : (
                            <span className="text-encre-3">—</span>
                          )}
                        </td>
                        <td>{e.sante.allergies.length > 0 ? <Badge ton="rouge" point>Allergie : {e.sante.allergies.join(', ').toLowerCase()}</Badge> : <span className="text-encre-3">—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Bloc>
        </>
      )}
      <PanneauEnfant eleveId={enfantId} onFermer={() => setEnfantId(null)} />
      <PanneauAdultes classeId={groupeAdultes} onFermer={() => setGroupeAdultes(null)} />
    </div>
  )
}

function Chiffre({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <div className="rounded-lg bg-brume py-2">
      <div className="chiffre text-[1.8rem] leading-none">{valeur}</div>
      <div className="text-sm text-encre-2 mt-1">{libelle}</div>
    </div>
  )
}

function PanneauEnfant({ eleveId, onFermer }: { eleveId: string | null; onFermer: () => void }) {
  const s = useStore()
  const e: Eleve | undefined = eleveId ? s.eleves.find((x) => x.id === eleveId) : undefined
  const journal = eleveId ? journalParEleve(s.journal)[eleveId] ?? [] : []
  const jalons = eleveId ? s.jalons.filter((j) => j.eleveId === eleveId) : []
  const f = e ? indexFamilles(s.familles)[e.familleId] : null
  const domaines = [...new Set(jalons.map((j) => j.domaine))]
  return (
    <Panneau
      ouvert={!!e}
      onFermer={onFermer}
      titre={e ? `${e.prenom} ${e.nom}` : ''}
      sousTitre={e ? `${ageLisible(e.naissance)} · groupe des ${s.classes.find((c) => c.id === e.classeId)?.nom}` : ''}
      largeur="lg"
      pied={e && <Link to={`/eleves/${e.id}`} className="inline-flex items-center rounded-lg border border-bleu-ligne bg-white px-4 py-2.5 font-semibold text-bleu hover:bg-bleu-clair">Ouvrir la fiche complète</Link>}
    >
      {e && f && (
        <div className="space-y-6">
          {e.sante.allergies.length > 0 && (
            <Alerte ton="rouge" icone={<OctagonAlert className="size-5" />} titre={`Allergie : ${e.sante.allergies.join(', ')}`}>Repas préparé à part, signalé en cuisine.</Alerte>
          )}
          <section>
            <h3 className="text-[1.05rem] mb-2">Journal d’aujourd’hui</h3>
            {journal.length === 0 ? (
              <p className="text-encre-2">Aucune entrée aujourd’hui.</p>
            ) : (
              <ol className="border-l-2 border-ligne ml-2">
                {journal.map((j) => {
                  const A = ACTION_PAR_TYPE[j.type]
                  return (
                    <li key={j.id} className="relative pl-5 pb-3">
                      <span className="absolute -left-[0.55rem] top-0.5 size-4 rounded-full bg-white border-2" style={{ borderColor: A.couleur }} />
                      <div className="text-sm text-encre-2 tabulaire">{heureFr(j.heure)} · {A.libelle} · {nomPersonnel(s, j.auteurId)}</div>
                      <div>{j.detail}</div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
          <section>
            <h3 className="text-[1.05rem] mb-1 flex items-center gap-2"><Sprout className="size-[1.1rem] text-vert-texte" /> Jalons de développement</h3>
            <p className="text-sm text-encre-2 mb-3">Des repères observés par l’équipe, sans note ni comparaison.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {domaines.map((d) => (
                <div key={d} className="rounded-xl border border-ligne p-3.5">
                  <div className="font-semibold mb-2">{d}</div>
                  <ul className="space-y-1.5">
                    {jalons.filter((j) => j.domaine === d).map((j) => (
                      <li key={j.id} className="flex justify-between gap-3 text-[0.95rem]">
                        <span>{j.libelle}</span>
                        {j.date ? <span className="text-vert-texte whitespace-nowrap text-sm">depuis le {dateCourte(j.date)}</span> : <span className="text-encre-3 whitespace-nowrap text-sm">en observation</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-[1.05rem] mb-2">Adultes autorisés à le récupérer</h3>
            <ul className="space-y-2">
              {f.accompagnateurs.filter((a) => a.autorise).map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <Avatar prenom={a.prenom} nom={a.nom} taille={32} />
                  <span className="flex-1"><span className="font-semibold">{a.prenom} {a.nom}</span> <span className="text-encre-2">· {a.lien}</span></span>
                  <span className="text-encre-2 tabulaire text-sm">{a.tel}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Panneau>
  )
}

function PanneauAdultes({ classeId, onFermer }: { classeId: string | null; onFermer: () => void }) {
  const s = useStore()
  const [executer, enCours] = useAction()
  const educatrices = s.personnel.filter((p) => p.role === 'educatrice' && p.cycle === 'creche')
  const actuels = classeId ? s.adultesCreche[classeId] ?? [] : []
  const [choix, setChoix] = useState<string[] | null>(null)
  const sel = choix ?? actuels
  const classe = s.classes.find((c) => c.id === classeId)
  const groupe = crecheGroupes(s).find((g) => g.classe.id === classeId)
  const fermer = () => { setChoix(null); onFermer() }
  const ratio = groupe && sel.length ? groupe.presents.length / sel.length : Infinity
  return (
    <Panneau
      ouvert={!!classeId}
      onFermer={fermer}
      titre={`Adultes présents · ${classe?.nom ?? ''}`}
      sousTitre="Cochez les adultes effectivement auprès des enfants. Le taux d’encadrement se recalcule aussitôt."
      pied={
        <>
          <Bouton variante="secondaire" onClick={fermer}>Annuler</Bouton>
          <Bouton chargement={enCours} onClick={() => executer(() => { s.setAdultesCreche(classeId!, sel); s.toast({ titre: 'Encadrement mis à jour', texte: `${classe?.nom} : ${sel.length} adulte${sel.length > 1 ? 's' : ''}`, niveau: 'succes' }); fermer() })}>Enregistrer</Bouton>
        </>
      }
    >
      <ul className="space-y-2.5">
        {educatrices.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-lg border border-ligne px-3 py-2.5">
            <Case checked={sel.includes(p.id)} onChange={(v) => setChoix(v ? [...sel, p.id] : sel.filter((x) => x !== p.id))} libelle={<span className="flex items-center gap-2.5"><Avatar prenom={p.prenom} nom={p.nom} taille={30} /><span><span className="font-semibold block">{p.prenom} {p.nom}</span><span className="text-sm text-encre-2">{p.fonction}</span></span></span>} />
          </li>
        ))}
      </ul>
      {groupe && (
        <p className={cx('mt-4 font-semibold', ratio > groupe.ratioMax ? 'text-rouge' : 'text-vert-texte')}>
          {sel.length ? `1 adulte pour ${ratio.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} enfants présents (maximum ${groupe.ratioMax})` : 'Aucun adulte : le groupe ne peut pas accueillir d’enfants.'}
        </p>
      )}
    </Panneau>
  )
}
