/** Bulletins du trimestre : état par classe (brouillon, validé, publié, versions) et actions selon les droits. */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ShieldCheck, Send, Lock } from 'lucide-react'
import { useStore } from '../../store'
import { peut, profilParId } from '../../store/profils'
import { elevesParClasse, evaluationsParClasse, nomPersonnel, notesKey, resultatsClasse, statsClasse } from '../../store/selecteurs'
import type { Classe } from '../../data/types'
import { Avatar, Badge, Bloc, Bouton, Champ, EnTetePage, Liste, Modale, Panneau, PastilleCycle, Segments, SqueletteTableau, Jauge } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { TRIMESTRE_COURANT, dateHeure } from '../../lib/temps'
import { noteFixe, pct } from '../../lib/format'

const MOTIFS_VERSION = ['Correction d’une note après le conseil de classe', 'Erreur de saisie d’une absence', 'Ajout d’une note de composition rattrapée']

export default function Bulletins() {
  const s = useStore()
  const profil = profilParId(s.session.profilId)
  const changer = useStore((st) => st.changerStatutBulletin)
  const toast = useStore((st) => st.toast)
  const pret = useChargement(420)
  const [t, setT] = useState<1 | 2 | 3>(TRIMESTRE_COURANT)
  const [cycle, setCycle] = useState<'primaire' | 'college'>(profil.role === 'professeur' ? 'college' : 'primaire')
  const [ouverte, setOuverte] = useState<Classe | null>(null)
  const [version, setVersion] = useState<Classe | null>(null)
  const [motif, setMotif] = useState(MOTIFS_VERSION[0])
  const [executer, enCours] = useAction()
  const [action, setAction] = useState<string | null>(null)
  const peutPublier = peut(profil.role, 'publierBulletin')
  const classes = useMemo(() => s.classes.filter((c) => c.cycle === cycle), [s.classes, cycle])

  const lignes = classes.map((c) => {
    const eleves = elevesParClasse(s.eleves)[c.id] ?? []
    const evs = (evaluationsParClasse(s.evaluations)[c.id] ?? []).filter((e) => e.trimestre === t)
    let saisies = 0
    for (const ev of evs) for (const e of eleves) if (s.notes[notesKey(ev.id, e.id)]?.valeur !== null && s.notes[notesKey(ev.id, e.id)]?.valeur !== undefined) saisies++
    const attendues = evs.length * eleves.length
    const b = s.bulletins.find((x) => x.id === `${c.id}|${t}`)
    return { c, eleves, completude: attendues ? saisies / attendues : 0, stats: statsClasse(resultatsClasse(s, c.id, t)), b, statut: b?.statut ?? 'brouillon' }
  })

  const agir = async (c: Classe, statut: 'valide' | 'publie' | 'brouillon', m?: string) => {
    setAction(c.id + statut)
    await executer(() => changer(c.id, t, statut, m))
    toast({
      titre: statut === 'valide' ? 'Bulletins validés' : statut === 'publie' ? 'Bulletins publiés aux familles' : 'Bulletins rouverts',
      texte: `${c.nom} · ${t === 1 ? '1er' : t + 'e'} trimestre${statut === 'publie' ? ' · les parents sont prévenus' : ''}`,
      niveau: 'succes',
    })
  }

  const actions = (c: Classe, statut: string) => (
    <div className="inline-flex flex-wrap gap-2">
      {peutPublier ? (
        <>
          {statut === 'brouillon' && <Bouton taille="sm" variante="secondaire" icone={<ShieldCheck className="size-4" />} chargement={enCours && action === c.id + 'valide'} onClick={() => agir(c, 'valide')}>Valider</Bouton>}
          {statut === 'valide' && <Bouton taille="sm" icone={<Send className="size-4" />} chargement={enCours && action === c.id + 'publie'} onClick={() => agir(c, 'publie')}>Publier</Bouton>}
          {statut === 'publie' && <Bouton taille="sm" variante="secondaire" onClick={() => setVersion(c)}>Nouvelle version</Bouton>}
        </>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm text-encre-3"><Lock className="size-3.5" />Réservé à la Direction</span>
      )}
      <Bouton taille="sm" variante="discret" icone={<FileText className="size-4" />} onClick={() => setOuverte(c)}>Élèves</Bouton>
    </div>
  )
  const etat = (statut: string, nbVersions: number) =>
    statut === 'publie' ? <Badge ton="vert">Publié · version {nbVersions}</Badge> : statut === 'valide' ? <Badge ton="bleu">Validé, à publier</Badge> : <Badge>Brouillon</Badge>

  return (
    <div>
      <EnTetePage
        titre="Bulletins"
        sousTitre={peutPublier ? 'Vous validez puis publiez les bulletins. Toute correction après publication crée une nouvelle version.' : 'Les enseignants consultent les bulletins ; la Direction les valide et les publie.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Segments<'primaire' | 'college'> valeur={cycle} onChange={setCycle} options={[{ id: 'primaire', libelle: 'Primaire' }, { id: 'college', libelle: 'Collège' }]} />
            <Segments<'1' | '2' | '3'> valeur={String(t) as '1'} onChange={(v) => setT(Number(v) as 1 | 2 | 3)} options={[1, 2, 3].filter((x) => x <= TRIMESTRE_COURANT).map((x) => ({ id: String(x) as '1', libelle: x === 1 ? '1er trimestre' : `${x}e trimestre` }))} />
          </div>
        }
      />
      <Bloc sansMarge>
        {!pret ? (
          <SqueletteTableau lignes={8} />
        ) : (
          <>
          {/* téléphone et tablette en portrait : une carte par classe */}
          <ul className="md:hidden divide-y divide-ligne-2">
            {lignes.map(({ c, eleves, completude, stats, b, statut }) => (
              <li key={c.id} className="px-4 py-3.5">
                <button className="w-full text-left" onClick={() => setOuverte(c)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2"><PastilleCycle cycle={c.cycle} libelle={false} /><b>{c.nom}</b></span>
                    {etat(statut, b?.versions.length ?? 1)}
                  </div>
                  <div className="text-sm text-encre-2 mt-0.5">{nomPersonnel(s, c.titulaireId)} · {eleves.length} élèves · moyenne {noteFixe(stats.moyenne)}</div>
                  <div className="flex items-center gap-2 mt-2"><Jauge valeur={completude} couleur={completude > 0.95 ? 'var(--color-vert)' : 'var(--color-ambre)'} /><span className="tabulaire text-sm w-24 text-right text-encre-2">{pct(completude)} saisies</span></div>
                </button>
                <div className="mt-2.5">{actions(c, statut)}</div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto defilement">
            <table className="tableau min-w-[64rem]">
              <thead>
                <tr>
                  <th>Classe</th>
                  <th>{cycle === 'college' ? 'Professeur principal' : 'Titulaire'}</th>
                  <th className="text-center">Élèves</th>
                  <th className="w-56">Notes saisies</th>
                  <th className="text-center">Moyenne de classe</th>
                  <th>État</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(({ c, eleves, completude, stats, b, statut }) => (
                  <tr key={c.id} className="cliquable" onClick={() => setOuverte(c)}>
                    <td><span className="inline-flex items-center gap-2"><PastilleCycle cycle={c.cycle} libelle={false} /><b>{c.nom}</b></span></td>
                    <td className="text-encre-2">{nomPersonnel(s, c.titulaireId)}</td>
                    <td className="text-center tabulaire">{eleves.length}</td>
                    <td>
                      <div className="flex items-center gap-2"><Jauge valeur={completude} couleur={completude > 0.95 ? 'var(--color-vert)' : 'var(--color-ambre)'} /><span className="tabulaire text-sm w-12 text-right">{pct(completude)}</span></div>
                    </td>
                    <td className="text-center chiffre font-semibold">{noteFixe(stats.moyenne)}</td>
                    <td>{etat(statut, b?.versions.length ?? 1)}</td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      {actions(c, statut)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Bloc>

      <Panneau ouvert={!!ouverte} onFermer={() => setOuverte(null)} titre={ouverte ? `Bulletins · ${ouverte.nom}` : ''} sousTitre={ouverte ? `${t === 1 ? '1er' : t + 'e'} trimestre` : ''} largeur="lg">
        {ouverte && <ListeEleves classe={ouverte} t={t} />}
      </Panneau>

      <Modale
        ouvert={!!version}
        onFermer={() => setVersion(null)}
        titre="Publier une nouvelle version"
        pied={
          <>
            <Bouton variante="discret" onClick={() => setVersion(null)}>Annuler</Bouton>
            <Bouton chargement={enCours} onClick={async () => { if (version) { await agir(version, 'publie', motif); setVersion(null) } }}>Publier la version {((lignes.find((l) => l.c.id === version?.id)?.b?.versions.length) ?? 1) + 1}</Bouton>
          </>
        }
      >
        <p className="text-encre-2 mb-4">Les familles verront la nouvelle version ; la précédente reste consultable dans l’historique avec ce motif.</p>
        <Champ libelle="Motif">
          <Liste value={motif} onChange={(e) => setMotif(e.target.value)}>
            {MOTIFS_VERSION.map((m) => <option key={m}>{m}</option>)}
          </Liste>
        </Champ>
      </Modale>
    </div>
  )
}

function ListeEleves({ classe, t }: { classe: Classe; t: 1 | 2 | 3 }) {
  const s = useStore()
  const res = resultatsClasse(s, classe.id, t)
  const eleves = elevesParClasse(s.eleves)[classe.id] ?? []
  const b = s.bulletins.find((x) => x.id === `${classe.id}|${t}`)
  return (
    <div>
      {b && b.versions.length > 0 && (
        <div className="mb-4 rounded-xl border border-ligne p-4">
          <div className="font-semibold mb-2">Historique des versions</div>
          <ul className="space-y-1.5 text-[0.95rem]">
            {b.versions.map((v) => (
              <li key={v.numero} className="flex justify-between gap-3"><span>Version {v.numero} · {v.motif}</span><span className="text-encre-2 whitespace-nowrap">{dateHeure(v.date)} · {nomPersonnel(s, v.auteurId)}</span></li>
            ))}
          </ul>
        </div>
      )}
      <table className="tableau">
        <thead>
          <tr><th>Rang</th><th>Élève</th><th className="text-center">Moyenne</th><th /></tr>
        </thead>
        <tbody>
          {res
            .slice()
            .sort((a, b2) => (a.rang ?? 999) - (b2.rang ?? 999))
            .map((r) => {
              const e = eleves.find((x) => x.id === r.eleveId)!
              return (
                <tr key={r.eleveId}>
                  <td className="tabulaire text-encre-2 w-14">{r.rang ?? '—'}</td>
                  <td><span className="flex items-center gap-2"><Avatar prenom={e.prenom} nom={e.nom} taille={28} /><span><b>{e.nom}</b> {e.prenom}</span></span></td>
                  <td className="text-center chiffre font-semibold">{noteFixe(r.generale)}</td>
                  <td className="text-right"><Link className="text-bleu font-semibold hover:underline inline-flex items-center gap-1" to={`/bulletin/${e.id}?t=${t}`}><FileText className="size-4" />Aperçu</Link></td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
