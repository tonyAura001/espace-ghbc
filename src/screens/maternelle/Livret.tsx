/** Livret trimestriel de la maternelle (A4 imprimable) : compétences par domaine, appréciation, signatures. */
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Printer, Save } from 'lucide-react'
import { useStore } from '../../store'
import { indexClasses, indexEleves, nomPersonnel, tauxPresenceEleve } from '../../store/selecteurs'
import { COMPETENCES_MATERNELLE, LIBELLE_COMPETENCE } from '../../data/referentiel'
import { Avatar, Bloc, Bouton, EnTetePage, Segments, Vide, Zone, COULEUR_CYCLE } from '../../ui/base'
import { ApercuImpression, EnTeteDocument, FiletMarque, Signatures } from '../../ui/documents'
import { useAction } from '../../ui/hooks'
import { TRIMESTRE_COURANT, dateCourte, dateLongue, JOUR_DEMO } from '../../lib/temps'
import { CONFIG, NOM_DIRECTION } from '../../config'
import { pct } from '../../lib/format'
import { DOMAINES, Legende, Pastille, appreciationAuto, niveauDe, STYLE_NIVEAU } from './commun'

/** Appréciations enregistrées pendant la démo (par élève et trimestre). */
const appreciations = new Map<string, string>()

const libT = (t: number) => `${t === 1 ? '1er' : t + 'e'} trimestre`

export default function Livret() {
  const { eleveId } = useParams()
  const [params] = useSearchParams()
  const s = useStore()
  const [trimestre, setTrimestre] = useState<number>(Number(params.get('t')) || TRIMESTRE_COURANT)
  const [apercu, setApercu] = useState(false)
  const [executer, enCours] = useAction()
  const e = eleveId ? indexEleves(s.eleves)[eleveId] : undefined
  const cle = `${eleveId}|${trimestre}`
  const [texte, setTexte] = useState<string | null>(null)

  if (!e || indexClasses(s.classes)[e.classeId]?.cycle !== 'maternelle') return <Vide titre="Livret réservé à la maternelle" texte="Revenez à la grille des compétences et choisissez un élève de maternelle." action={<Link to="/maternelle" className="text-bleu font-semibold">Grille des compétences</Link>} />
  const classe = indexClasses(s.classes)[e.classeId]
  const appreciation = texte ?? appreciations.get(cle) ?? appreciationAuto(e, s.competences, trimestre)
  const presence = tauxPresenceEleve(s, e.id)
  const enseignant = nomPersonnel(s, classe.titulaireId)

  const enregistrer = () =>
    executer(() => {
      appreciations.set(cle, appreciation)
      s.journaliser('Compétence', 'Appréciation du livret enregistrée', `${e.prenom} ${e.nom} · ${libT(trimestre)}`, e.id, null, { appreciation })
      s.toast({ titre: 'Appréciation enregistrée', texte: `Livret de ${e.prenom}, ${libT(trimestre)}`, niveau: 'succes' })
      setTexte(null)
    })

  const document = (
    <div className="feuille-a4 text-[10pt] flex flex-col">
      <EnTeteDocument titre="Livret de compétences" sousTitre={`${libT(trimestre)} · année ${CONFIG.ANNEE_SCOLAIRE}`} />
      <div className="mt-5 grid grid-cols-[1fr_auto] gap-6 items-start">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          <div><span className="text-encre-2">Élève : </span><b>{e.prenom} {e.nom}</b></div>
          <div><span className="text-encre-2">Matricule : </span>{e.matricule}</div>
          <div><span className="text-encre-2">Né{e.sexe === 'F' ? 'e' : ''} le : </span>{dateCourte(e.naissance)}</div>
          <div><span className="text-encre-2">Classe : </span>{classe.nom}</div>
          <div><span className="text-encre-2">Enseignante : </span>{enseignant}</div>
          <div><span className="text-encre-2">Présence : </span>{pct(Math.max(0, presence.taux))} depuis la rentrée</div>
        </div>
        <div className="flex items-center gap-2 text-[8.5pt] text-encre-2 border border-ligne rounded-lg px-3 py-2">
          <span className="size-2.5 rounded-full" style={{ background: COULEUR_CYCLE.maternelle }} /> Maternelle
        </div>
      </div>
      <div className="mt-5 space-y-3.5">
        {DOMAINES.map((d) => (
          <section key={d} className="break-inside-avoid">
            <div className="font-semibold text-[10.5pt] pb-1 border-b" style={{ color: CONFIG.BLEU_MARQUE, borderColor: '#DCE3EC' }}>{d}</div>
            <table className="w-full">
              <tbody>
                {COMPETENCES_MATERNELLE.filter((c) => c.domaine === d).map((c) => {
                  const v = niveauDe(s.competences, e.id, c.id, trimestre)
                  return (
                    <tr key={c.id} className="border-b border-ligne-2">
                      <td className="py-1.5">{c.libelle}</td>
                      <td className="py-1.5 w-[42mm]">
                        <span className="inline-flex items-center gap-2"><Pastille niveau={v} taille={13} /><span style={{ color: STYLE_NIVEAU[v].texte }}>{LIBELLE_COMPETENCE[v]}</span></span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <div className="mt-4 text-[8.5pt]"><Legende /></div>
      <section className="mt-4 rounded-lg border border-ligne p-3">
        <div className="font-semibold mb-1">Appréciation de l’enseignante</div>
        <p className="leading-relaxed">{appreciation}</p>
      </section>
      <Signatures gauche={`L’enseignante, ${enseignant}`} droite={NOM_DIRECTION.charAt(0).toUpperCase() + NOM_DIRECTION.slice(1)} />
      <div className="flex-1" />
      <div className="mt-6">
        <FiletMarque />
        <div className="flex justify-between text-[7.5pt] text-encre-3 mt-1.5">
          <span>À la maternelle, ni note ni rang : chaque enfant progresse à son rythme.</span>
          <span>Édité le {dateLongue(JOUR_DEMO)}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <EnTetePage
        retour={<Link to={`/maternelle?classe=${classe.id}`} className="inline-flex items-center gap-1 text-bleu font-semibold hover:underline mb-1"><ChevronLeft className="size-4" /> Grille · {classe.nom}</Link>}
        titre={<span className="flex items-center gap-3"><Avatar prenom={e.prenom} nom={e.nom} taille={40} />Livret de {e.prenom} {e.nom}</span>}
        sousTitre={`${classe.nom} · ${libT(trimestre)}`}
        actions={
          <>
            <Segments options={[1, 2, 3].filter((t) => t <= TRIMESTRE_COURANT).map((t) => ({ id: String(t), libelle: libT(t) }))} valeur={String(trimestre)} onChange={(v) => { setTrimestre(Number(v)); setTexte(null) }} />
            <Bouton icone={<Printer className="size-4" />} onClick={() => setApercu(true)}>Aperçu et impression</Bouton>
          </>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_24rem] gap-5 items-start">
        <Bloc titre="Compétences du trimestre" filet={COULEUR_CYCLE.maternelle}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {DOMAINES.map((d) => (
              <div key={d}>
                <div className="font-semibold mb-1.5">{d}</div>
                <ul>
                  {COMPETENCES_MATERNELLE.filter((c) => c.domaine === d).map((c) => {
                    const v = niveauDe(s.competences, e.id, c.id, trimestre)
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-ligne-2">
                        <span>{c.libelle}</span>
                        <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap" style={{ color: STYLE_NIVEAU[v].texte }}><Pastille niveau={v} taille={16} />{LIBELLE_COMPETENCE[v]}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Bloc>
        <Bloc titre="Appréciation">
          <Zone value={appreciation} onChange={(ev) => setTexte(ev.target.value)} className="min-h-40" aria-label="Appréciation du livret" />
          <p className="text-sm text-encre-2 mt-2">Proposée à partir des observations ; l’enseignante la relit et l’ajuste.</p>
          <div className="mt-3 flex gap-2">
            <Bouton icone={<Save className="size-4" />} chargement={enCours} onClick={enregistrer}>Enregistrer l’appréciation</Bouton>
          </div>
        </Bloc>
      </div>
      <ApercuImpression
        ouvert={apercu}
        onFermer={() => setApercu(false)}
        titre={`Livret de ${e.prenom} ${e.nom} · ${libT(trimestre)}`}
        onImprimer={() => s.journaliser('Impression', 'Livret imprimé', `${e.prenom} ${e.nom} · ${libT(trimestre)}`, e.id)}
      >
        {document}
      </ApercuImpression>
    </div>
  )
}
