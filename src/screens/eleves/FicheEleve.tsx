/** Fiche élève à onglets : identité, famille, scolarité, notes, présences, santé (accès journalisé), finance, carte, documents, historique. */
import { Fragment, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, HeartPulse, Lock, Phone, Wallet, FileText, Printer, ShieldCheck, IdCard, RefreshCcw, CheckCircle2 } from 'lucide-react'
import { useStore, type Etat } from '../../store'
import {
  indexClasses, indexEleves, indexFamilles, enfantsParFamille, echeancesParFamille, situationFamille, resultatsClasse, statsClasse,
  tauxPresenceEleve, carteActive, nomPersonnel, LIBELLE_STATUT_ECHEANCE, type StatutEcheance, matiere, elevesParClasse,
} from '../../store/selecteurs'
import { peut, profilParId } from '../../store/profils'
import { CYCLES, STRUCTURE, COMPETENCES_MATERNELLE, LIBELLE_COMPETENCE, MATIERES_COLLEGE, MATIERES_PRIMAIRE, NOM_CYCLE, LIBELLE_MODE, DOMAINES_PRIMAIRE } from '../../data/referentiel'
import type { Eleve, NiveauCompetence } from '../../data/types'
import { Alerte, Avatar, Badge, Bloc, Bouton, EnTetePage, Jauge, Ligne, Liste, Modale, Onglets, PastilleCycle, Squelette, Vide, Zone, cx, type Ton } from '../../ui/base'
import { ApercuImpression, EnTeteDocument, Signatures } from '../../ui/documents'
import { useAction, useChargement } from '../../ui/hooks'
import { JOUR_DEMO, TRIMESTRE_COURANT, ageLisible, dateCourte, dateLongue, dateMoyenne, heureFr, relatif } from '../../lib/temps'
import { money, note, nombre, numeroRecu, pct } from '../../lib/format'
import { lienCarte } from '../../lib/verif'
import { CarteEleveAjustee } from './CarteEleve'
import { CONFIG, NOM_DIRECTION } from '../../config'

type IdOnglet = 'identite' | 'famille' | 'scolarite' | 'notes' | 'presences' | 'sante' | 'finance' | 'carte' | 'documents' | 'historique'

export default function FicheEleve() {
  const { id = '', onglet = 'identite' } = useParams()
  const nav = useNavigate()
  const s = useStore()
  const pret = useChargement(360)
  const e = indexEleves(s.eleves)[id]
  if (!e) {
    return (
      <Vide titre="Cet élève n’existe pas ou plus" texte="Le lien est peut-être ancien. Retrouvez l’élève dans la liste." action={<Bouton onClick={() => nav('/eleves')}>Revenir à la liste des élèves</Bouton>} />
    )
  }
  const c = indexClasses(s.classes)[e.classeId]
  const sit = situationFamille(s, e.familleId)
  const pr = s.presences[e.id]
  const role = profilParId(s.session.profilId).role
  const voitFinance = ['promoteur', 'direction', 'comptable', 'caissier', 'secretariat'].includes(role)
  const libNotes = c.cycle === 'creche' ? 'Développement' : c.cycle === 'maternelle' ? 'Compétences' : 'Notes'
  const onglets: { id: IdOnglet; libelle: string }[] = [
    { id: 'identite', libelle: 'Identité' },
    { id: 'famille', libelle: 'Famille' },
    { id: 'scolarite', libelle: 'Scolarité' },
    { id: 'notes', libelle: libNotes },
    { id: 'presences', libelle: 'Présences' },
    { id: 'sante', libelle: 'Santé' },
    ...(voitFinance ? [{ id: 'finance' as const, libelle: 'Finance' }] : []),
    { id: 'carte', libelle: 'Carte' },
    { id: 'documents', libelle: 'Documents' },
    { id: 'historique', libelle: 'Historique' },
  ]
  const actif = (onglets.find((o) => o.id === onglet)?.id ?? 'identite') as IdOnglet

  return (
    <div>
      <EnTetePage
        retour={<Link to={`/eleves?classe=${c.id}`} className="inline-flex items-center gap-1 text-bleu font-semibold mb-2 hover:underline"><ChevronLeft className="size-4" /> {c.nom}</Link>}
        titre={
          <span className="flex items-center gap-4">
            <Avatar prenom={e.prenom} nom={e.nom} taille={56} />
            <span>
              {e.prenom} {e.nom}
              <span className="flex flex-wrap items-center gap-2 mt-1.5 text-base font-normal text-encre-2 font-[family-name:var(--font-texte)]">
                <PastilleCycle cycle={c.cycle} libelle={c.nom} />
                <span>·</span>
                <span className="tabulaire">{e.matricule}</span>
                <span>·</span>
                <span>{ageLisible(e.naissance)}</span>
                {e.nouveau && <Badge ton="bleu">Nouveau</Badge>}
                {e.redoublant && <Badge>Redoublant</Badge>}
                {e.bourse > 0 && <Badge ton="vert">Boursier {e.bourse}&nbsp;%</Badge>}
                {e.statut === 'radie' && <Badge ton="rouge">Radié</Badge>}
                {voitFinance && sit && (sit.statut === 'en_retard' ? <Badge ton="rouge" point>Famille en retard</Badge> : sit.statut === 'partiel' ? <Badge ton="ambre" point>Paiement partiel</Badge> : <Badge ton="vert" point>Famille à jour</Badge>)}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            <span className="text-encre-2 mr-2">
              {pr?.depart ? `Parti${e.sexe === 'F' ? 'e' : ''} à ${heureFr(pr.depart)}` : pr?.arrivee ? <span className="text-vert-texte font-semibold">Présent{e.sexe === 'F' ? 'e' : ''} depuis {heureFr(pr.arrivee)}</span> : <span className="text-ambre font-semibold">Absent{e.sexe === 'F' ? 'e' : ''} aujourd’hui</span>}
            </span>
            {['caissier', 'comptable'].includes(role) && <Bouton onClick={() => nav(`/caisse?famille=${e.familleId}`)} icone={<Wallet className="size-4" />}>Encaisser</Bouton>}
          </>
        }
      />
      <Onglets onglets={onglets} actif={actif} onChange={(o) => nav(`/eleves/${e.id}/${o}`, { replace: true })} className="mb-5" />
      {!pret ? (
        <div className="grid grid-cols-2 gap-5"><Squelette className="h-64 rounded-xl" /><Squelette className="h-64 rounded-xl" /></div>
      ) : (
        <div className="animate-entree" key={actif}>
          {actif === 'identite' && <OngletIdentite e={e} s={s} />}
          {actif === 'famille' && <OngletFamille e={e} s={s} />}
          {actif === 'scolarite' && <OngletScolarite e={e} s={s} />}
          {actif === 'notes' && <OngletNotes e={e} s={s} />}
          {actif === 'presences' && <OngletPresences e={e} s={s} />}
          {actif === 'sante' && <OngletSante e={e} s={s} />}
          {actif === 'finance' && <OngletFinance e={e} s={s} />}
          {actif === 'carte' && <OngletCarte e={e} s={s} />}
          {actif === 'documents' && <OngletDocuments e={e} s={s} />}
          {actif === 'historique' && <OngletHistorique e={e} s={s} />}
        </div>
      )}
    </div>
  )
}

type P = { e: Eleve; s: Etat }

/* ----------------------------------------------------------- Identité */
function OngletIdentite({ e, s }: P) {
  const c = indexClasses(s.classes)[e.classeId]
  const f = indexFamilles(s.familles)[e.familleId]
  const circuit = s.circuits.find((x) => x.id === e.circuitId)
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Bloc titre="État civil">
        <Ligne libelle="Prénom">{e.prenom}</Ligne>
        <Ligne libelle="Nom">{e.nom}</Ligne>
        <Ligne libelle="Sexe">{e.sexe === 'F' ? 'Féminin' : 'Masculin'}</Ligne>
        <Ligne libelle="Date de naissance">{dateLongue(e.naissance)} · {ageLisible(e.naissance)}</Ligne>
        <Ligne libelle="Matricule"><span className="tabulaire font-semibold">{e.matricule}</span> <span className="text-encre-3 text-sm">(conservé à vie)</span></Ligne>
        <Ligne libelle="Adresse">{f.quartier}, {CONFIG.VILLE}</Ligne>
      </Bloc>
      <Bloc titre="Inscription 2026-2027">
        <Ligne libelle="Classe"><PastilleCycle cycle={c.cycle} libelle={c.nom} /></Ligne>
        <Ligne libelle="Titulaire">{nomPersonnel(s, c.titulaireId)}</Ligne>
        <Ligne libelle="Salle">{c.salle}</Ligne>
        <Ligne libelle="Inscrit le">{dateMoyenne(e.dateInscription)}</Ligne>
        <Ligne libelle="Cantine">{e.cantine ? 'Oui' : c.cycle === 'creche' ? 'Repas compris à la crèche' : 'Non'}</Ligne>
        <Ligne libelle="Transport">{circuit ? circuit.nom : 'Non'}</Ligne>
        <Ligne libelle="Garderie du soir">{e.garderie ? 'Oui' : 'Non'}</Ligne>
      </Bloc>
    </div>
  )
}

/* ------------------------------------------------------------ Famille */
function OngletFamille({ e, s }: P) {
  const f = indexFamilles(s.familles)[e.familleId]
  const fratrie = (enfantsParFamille(s.eleves)[e.familleId] ?? []).filter((x) => x.id !== e.id)
  const ic = indexClasses(s.classes)
  const parents = [f.mere && { ...f.mere, lien: 'Mère', resp: f.responsable === 'mere' }, f.pere && { ...f.pere, lien: 'Père', resp: f.responsable === 'pere' }].filter(Boolean) as { prenom: string; nom: string; tel: string; profession: string; lien: string; resp: boolean }[]
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-5 items-start">
      <div className="space-y-5">
        <Bloc titre={`Famille ${f.nom}`}>
          <div className="grid sm:grid-cols-2 gap-4">
            {parents.map((p) => (
              <div key={p.lien} className="rounded-xl border border-ligne p-4">
                <div className="flex items-center gap-3">
                  <Avatar prenom={p.prenom} nom={p.nom} taille={40} />
                  <div>
                    <div className="font-semibold">{p.prenom} {p.nom}</div>
                    <div className="text-encre-2 text-sm">{p.lien} · {p.profession}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 tabulaire"><Phone className="size-4 text-encre-3" /> {p.tel}</div>
                {p.resp && <Badge ton="bleu" className="mt-2">Responsable du compte et des paiements</Badge>}
              </div>
            ))}
          </div>
        </Bloc>
        <Bloc titre="Adultes autorisés à récupérer l’enfant">
          <p className="text-encre-2 mb-3">Seules ces personnes, munies de leur carte accompagnateur, peuvent repartir avec {e.prenom}.</p>
          <ul className="divide-y divide-ligne-2">
            {f.accompagnateurs.map((a) => {
              const carte = carteActive(s, 'accompagnateur', `${f.id}:${a.id}`)
              return (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <Avatar prenom={a.prenom} nom={a.nom} taille={34} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold">{a.prenom} {a.nom}</span>
                    <span className="block text-encre-2 text-sm">{a.lien} · <span className="tabulaire">{a.tel}</span></span>
                  </span>
                  {carte ? <Badge ton="vert" point>Carte active</Badge> : <Badge ton="ambre">Sans carte</Badge>}
                </li>
              )
            })}
          </ul>
        </Bloc>
      </div>
      <Bloc titre="Fratrie à GHBC">
        {fratrie.length === 0 ? (
          <p className="text-encre-2">{e.prenom} est le seul enfant de la famille inscrit à l’école.</p>
        ) : (
          <ul className="space-y-2">
            {fratrie.map((x) => (
              <li key={x.id}>
                <Link to={`/eleves/${x.id}`} className="flex items-center gap-3 rounded-lg border border-ligne px-3 py-2.5 hover:border-bleu-ligne">
                  <Avatar prenom={x.prenom} nom={x.nom} taille={34} />
                  <span className="flex-1">
                    <span className="block font-semibold">{x.prenom} {x.nom}</span>
                    <span className="block text-sm text-encre-2"><PastilleCycle cycle={ic[x.classeId].cycle} libelle={ic[x.classeId].nom} /></span>
                  </span>
                  <span className="text-sm text-encre-2">{ageLisible(x.naissance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {fratrie.length > 0 && <p className="text-sm text-encre-2 mt-3">Remise fratrie de {s.parametres.remiseFratrie}&nbsp;% appliquée dès le deuxième enfant.</p>}
      </Bloc>
    </div>
  )
}

/* ---------------------------------------------------------- Scolarité */
function OngletScolarite({ e, s }: P) {
  const c = indexClasses(s.classes)[e.classeId]
  const anneeEntree = Number(e.matricule.slice(0, 4))
  const tous = CYCLES.flatMap((cy) => STRUCTURE[cy].niveaux)
  const cur = tous.indexOf(c.niveau)
  const lignes: { annee: string; classe: string; redouble: boolean }[] = []
  for (let a = anneeEntree; a < 2026; a++) {
    const k = 2026 - a
    const idx = e.redoublant ? cur - (k - 1) : cur - k
    lignes.push({ annee: `${a}-${a + 1}`, classe: tous[Math.max(0, idx)], redouble: e.redoublant && k === 1 })
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
      <Bloc titre="Parcours à GHBC">
        <ol className="relative border-l-2 border-ligne ml-2 space-y-4">
          {lignes.map((l, i) => (
            <li key={l.annee} className="pl-5 relative">
              <span className="absolute -left-[7px] top-1.5 size-3 rounded-full bg-ligne" />
              <div className="font-semibold">{l.annee}</div>
              <div className="text-encre-2">{l.classe}{l.redouble ? ' · redoublement décidé en conseil de classe' : i === lignes.length - 1 && e.redoublant ? ' · admis en classe supérieure' : ' · admis en classe supérieure'}</div>
            </li>
          ))}
          <li className="pl-5 relative">
            <span className="absolute -left-[8px] top-1.5 size-3.5 rounded-full bg-bleu" />
            <div className="font-semibold">2026-2027 · en cours</div>
            <div className="text-encre-2">{c.nom}{e.redoublant ? ' · redoublant' : ''}</div>
          </li>
        </ol>
        {lignes.length === 0 && <p className="text-encre-2 mt-3">Première année à GHBC.</p>}
      </Bloc>
      <Bloc titre="Classe actuelle">
        <Ligne libelle="Classe"><PastilleCycle cycle={c.cycle} libelle={c.nom} /></Ligne>
        <Ligne libelle="Cycle">{NOM_CYCLE[c.cycle]}</Ligne>
        <Ligne libelle="Titulaire">{nomPersonnel(s, c.titulaireId)}</Ligne>
        <Ligne libelle="Effectif de la classe">{nombre((elevesParClasse(s.eleves)[c.id] ?? []).length)} élèves</Ligne>
        <Ligne libelle="Trimestre en cours">{TRIMESTRE_COURANT === 1 ? '1er' : `${TRIMESTRE_COURANT}e`} trimestre</Ligne>
      </Bloc>
    </div>
  )
}

/* -------------------------------------------------- Notes, compétences */
function OngletNotes({ e, s }: P) {
  const c = indexClasses(s.classes)[e.classeId]
  const nav = useNavigate()
  if (c.cycle === 'creche') {
    const jalons = s.jalons.filter((j) => j.eleveId === e.id)
    const domaines = [...new Set(jalons.map((j) => j.domaine))]
    return (
      <Bloc titre="Jalons de développement" actions={<span className="text-encre-2 text-sm">À la crèche, pas de note : on observe.</span>}>
        <div className="grid md:grid-cols-2 gap-5">
          {domaines.map((d) => (
            <div key={d}>
              <div className="font-semibold mb-2">{d}</div>
              <ul className="space-y-1.5">
                {jalons.filter((j) => j.domaine === d).map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3">
                    <span className={cx(!j.date && 'text-encre-2')}>{j.libelle}</span>
                    {j.date ? <Badge ton="vert">Atteint · {dateMoyenne(j.date)}</Badge> : <Badge>En observation</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Bloc>
    )
  }
  if (c.cycle === 'maternelle') {
    const domaines = [...new Set(COMPETENCES_MATERNELLE.map((x) => x.domaine))]
    const ton: Record<NiveauCompetence, Ton> = { A: 'vert', EC: 'bleu', PE: 'ambre', NE: 'neutre' }
    return (
      <Bloc titre={`Compétences · ${TRIMESTRE_COURANT === 1 ? '1er' : TRIMESTRE_COURANT + 'e'} trimestre`} actions={<Bouton variante="secondaire" taille="sm" onClick={() => nav(`/maternelle/livret/${e.id}`)}>Ouvrir le livret</Bouton>}>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
          {domaines.map((d) => (
            <div key={d}>
              <div className="font-semibold mb-2">{d}</div>
              <ul className="space-y-1.5">
                {COMPETENCES_MATERNELLE.filter((x) => x.domaine === d).map((x) => {
                  const v = s.competences[`${e.id}|${x.id}|${TRIMESTRE_COURANT}`] ?? 'NE'
                  return (
                    <li key={x.id} className="flex items-center justify-between gap-3">
                      <span>{x.libelle}</span>
                      <Badge ton={ton[v]}>{LIBELLE_COMPETENCE[v]}</Badge>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </Bloc>
    )
  }
  const res = resultatsClasse(s, c.id, TRIMESTRE_COURANT)
  const moi = res.find((r) => r.eleveId === e.id)
  const stats = statsClasse(res)
  const mats = c.cycle === 'college' ? MATIERES_COLLEGE : MATIERES_PRIMAIRE
  const sur = c.cycle === 'college' ? 20 : 10
  const moyClasse = (mid: string) => {
    const v = res.map((r) => r.matieres[mid]).filter((x): x is number => x !== null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const evals = s.evaluations.filter((x) => x.classeId === c.id && x.trimestre === TRIMESTRE_COURANT && x.publiee).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5 items-start">
      <Bloc titre={`Moyennes du ${TRIMESTRE_COURANT === 1 ? '1er' : TRIMESTRE_COURANT + 'e'} trimestre`} actions={<Bouton variante="secondaire" taille="sm" icone={<FileText className="size-4" />} onClick={() => nav(`/bulletin/${e.id}`)}>Voir le bulletin</Bouton>} sansMarge>
        <table className="tableau">
          <thead>
            <tr><th>{c.cycle === 'primaire' ? 'Discipline' : 'Matière'}</th><th className="!text-right">Coef.</th><th className="!text-right">Moyenne</th><th className="!text-right">Classe</th></tr>
          </thead>
          <tbody>
            {(c.cycle === 'primaire' ? DOMAINES_PRIMAIRE : [null]).map((d) => (
              <Fragment key={d ?? 'tout'}>
                {d && (
                  <tr>
                    <td className="font-semibold bg-brume">{d}</td><td className="bg-brume" />
                    <td className="text-right font-semibold bg-brume tabulaire">{note(moi?.domaines[d])}</td><td className="bg-brume" />
                  </tr>
                )}
                {mats.filter((m) => !d || m.domaine === d).map((m) => (
                  <tr key={m.id}>
                    <td className={cx(d && 'pl-6')}>{m.nom}</td>
                    <td className="text-right text-encre-2 tabulaire">{m.coef}</td>
                    <td className="text-right font-semibold tabulaire">{note(moi?.matieres[m.id])}</td>
                    <td className="text-right text-encre-2 tabulaire">{note(moyClasse(m.id))}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-encre-3 px-5 py-3">Une case vide n’est jamais un zéro : elle n’entre pas dans la moyenne.{c.cycle === 'college' && ' Moyenne de matière = (moyenne des devoirs + composition) ÷ 2.'}</p>
      </Bloc>
      <div className="space-y-5">
        <Bloc titre="Moyenne générale">
          <div className="chiffre text-[2.6rem] font-medium leading-none">{note(moi?.generale)}<span className="text-encre-3 text-xl"> / {sur}</span></div>
          <div className="mt-3"><Jauge valeur={(moi?.generale ?? 0) / sur} couleur={CONFIG.BLEU_MARQUE} hauteur={8} /></div>
          <div className="mt-3 text-encre-2">
            Moyenne de la classe : <b className="text-encre">{note(stats.moyenne)}</b> · plus haute {note(stats.max)} · plus basse {note(stats.min)}
          </div>
          {s.parametres.afficherRang && moi?.rang && <div className="mt-1 text-encre-2">Rang : <b className="text-encre">{moi.rang}{moi.rang === 1 ? 'er' : 'e'}</b> sur {res.filter((r) => r.generale !== null).length}</div>}
        </Bloc>
        <Bloc titre="Dernières évaluations">
          <ul className="divide-y divide-ligne-2">
            {evals.slice(0, 8).map((ev) => {
              const n = s.notes[`${ev.id}|${e.id}`]
              return (
                <li key={ev.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block font-semibold truncate">{matiere(ev.matiereId).nom}</span>
                    <span className="block text-sm text-encre-2">{ev.titre} · {dateMoyenne(ev.date)}{n && n.versions.length > 1 && <> · <span className="text-ambre">corrigée (version {n.versions.length})</span></>}</span>
                  </span>
                  <span className="chiffre font-medium tabulaire">{n?.valeur === null || n === undefined ? <span className="text-encre-3 text-sm">Absent</span> : `${note(n.valeur)} / ${ev.sur}`}</span>
                </li>
              )
            })}
            {evals.length === 0 && <li className="text-encre-2 py-2">Aucune évaluation publiée ce trimestre.</li>}
          </ul>
        </Bloc>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Présences */
function OngletPresences({ e, s }: P) {
  const { taux, absences, jours } = tauxPresenceEleve(s, e.id)
  const triees = [...absences].sort((a, b) => b.date.localeCompare(a.date))
  const nonJ = absences.filter((a) => !a.justifiee).length
  const cr = Object.fromEntries(s.creneaux.map((x) => [x.id, x]))
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.6fr] gap-5 items-start">
      <Bloc titre="Depuis la rentrée">
        <div className="chiffre text-[2.6rem] font-medium leading-none text-vert-texte">{pct(taux, 1)}</div>
        <div className="mt-3"><Jauge valeur={taux} hauteur={8} /></div>
        <div className="mt-3 text-encre-2">{nombre(jours)} jours de classe · {nombre(absences.length)} absence{absences.length > 1 ? 's' : ''} dont {nombre(nonJ)} non justifiée{nonJ > 1 ? 's' : ''}</div>
        {nonJ >= 3 && <div className="mt-3"><Alerte ton="ambre" titre="Absences répétées">La famille sera convoquée par la vie scolaire si la situation continue.</Alerte></div>}
      </Bloc>
      <Bloc titre="Absences et retards" sansMarge>
        {triees.length === 0 ? (
          <p className="px-5 pb-5 text-encre-2">Aucune absence depuis la rentrée.</p>
        ) : (
          <table className="tableau">
            <thead><tr><th>Date</th><th>Période</th><th>Motif</th><th>Statut</th></tr></thead>
            <tbody>
              {triees.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">{dateCourte(a.date)}{a.date === JOUR_DEMO && <span className="text-encre-3"> · aujourd’hui</span>}</td>
                  <td>{a.periode === 'journee' ? 'Journée' : a.periode === 'matin' ? 'Matinée' : a.periode === 'apres-midi' ? 'Après-midi' : `Cours de ${a.creneauId && cr[a.creneauId] ? matiere(cr[a.creneauId].matiereId).nom.toLowerCase() : 'la journée'}`}</td>
                  <td className="text-encre-2">{a.motif ?? '—'}{a.justificatif && <span className="text-encre-3"> · justificatif joint</span>}</td>
                  <td>{a.justifiee ? <Badge ton="vert">Justifiée</Badge> : <Badge ton="ambre">À justifier</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Bloc>
    </div>
  )
}

/* ----------------------------------------------------------------- Santé */
function OngletSante({ e, s }: P) {
  const role = profilParId(s.session.profilId).role
  const [ouverte, setOuverte] = useState(false)
  const [executer, enCours] = useAction()
  const consulter = useStore((st) => st.consulterSante)
  if (!peut(role, 'ficheSante')) {
    return (
      <Bloc>
        <div className="flex gap-4 items-start pt-5">
          <Lock className="size-6 text-encre-3 shrink-0" />
          <div>
            <div className="font-semibold">La fiche santé est réservée</div>
            <p className="text-encre-2 mt-1">Seuls l’infirmerie, la direction, la vie scolaire, le secrétariat et les éducatrices y ont accès. Chaque consultation est enregistrée dans le journal d’audit.</p>
          </div>
        </div>
      </Bloc>
    )
  }
  if (!ouverte) {
    return (
      <Bloc>
        <div className="flex flex-wrap gap-4 items-center justify-between pt-5">
          <div className="flex gap-4 items-start">
            <HeartPulse className="size-6 text-rouge shrink-0" />
            <div>
              <div className="font-semibold">Données de santé protégées</div>
              <p className="text-encre-2 mt-1 max-w-xl">L’ouverture de la fiche santé de {e.prenom} est enregistrée dans le journal d’audit, avec votre nom et l’heure.</p>
            </div>
          </div>
          <Bouton chargement={enCours} icone={<ShieldCheck className="size-4" />} onClick={() => executer(() => { consulter(e.id); setOuverte(true) })} data-testid="ouvrir-sante">Ouvrir la fiche santé</Bouton>
        </div>
      </Bloc>
    )
  }
  const visites = s.visites.filter((v) => v.eleveId === e.id)
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
      <Bloc titre="Fiche santé" actions={<Badge ton="bleu">Consultation enregistrée</Badge>}>
        <Ligne libelle="Groupe sanguin"><b>{e.sante.groupeSanguin}</b></Ligne>
        <Ligne libelle="Allergies">{e.sante.allergies.length ? <span className="flex flex-wrap gap-1.5 justify-end">{e.sante.allergies.map((a) => <Badge key={a} ton="rouge">{a}</Badge>)}</span> : 'Aucune connue'}</Ligne>
        <Ligne libelle="Traitements">{e.sante.traitements.length ? e.sante.traitements.join(' ; ') : 'Aucun'}</Ligne>
        <Ligne libelle="Vaccins">{e.sante.vaccinsAJour ? <Badge ton="vert">À jour</Badge> : <Badge ton="ambre">Carnet à vérifier</Badge>}</Ligne>
        <Ligne libelle="Remarques">{e.sante.remarques || '—'}</Ligne>
      </Bloc>
      <Bloc titre="Passages à l’infirmerie">
        {visites.length === 0 ? <p className="text-encre-2">Aucun passage cette année.</p> : (
          <ul className="divide-y divide-ligne-2">
            {visites.map((v) => (
              <li key={v.id} className="py-2.5">
                <div className="font-semibold">{v.motif}</div>
                <div className="text-encre-2 text-sm">{relatif(v.date)} · {v.soin} · {v.suite}</div>
              </li>
            ))}
          </ul>
        )}
      </Bloc>
    </div>
  )
}

/* --------------------------------------------------------------- Finance */
const TON_STATUT: Record<StatutEcheance, Ton> = { payee: 'vert', partielle: 'ambre', a_venir: 'neutre', due: 'bleu', en_retard: 'rouge' }

function OngletFinance({ e, s }: P) {
  const nav = useNavigate()
  const role = profilParId(s.session.profilId).role
  const lignes = echeancesParFamille(s.echeances, s.paiements)[e.familleId] ?? []
  const sit = situationFamille(s, e.familleId)
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)
  const paiements = s.paiements.filter((p) => p.familleId === e.familleId).sort((a, b) => b.date.localeCompare(a.date))
  const [tous, setTous] = useState(false)
  const visibles = tous ? lignes : lignes.filter((l) => l.echeance <= '2027-01-05' || l.statut !== 'a_venir')
  const f = indexFamilles(s.familles)[e.familleId]
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-ligne overflow-hidden grid gap-px bg-ligne grid-cols-2 lg:grid-cols-4 [&>*]:bg-white">
        <Chiffre libelle="Total de l’année" valeur={money(sit?.totalAnnee ?? 0)} />
        <Chiffre libelle="Déjà payé" valeur={money(sit?.payeAnnee ?? 0)} ton="vert" />
        <Chiffre libelle="Reste échu à ce jour" valeur={money(sit?.resteEchu ?? 0)} ton={sit && sit.resteEchu > 0 ? 'ambre' : undefined} />
        <Chiffre libelle="En retard (plus de 15 jours)" valeur={money(sit?.enRetard ?? 0)} ton={sit && sit.enRetard > 0 ? 'rouge' : undefined} />
      </section>
      <div className="grid grid-cols-1 2xl:grid-cols-[1.6fr_1fr] gap-5 items-start">
        <Bloc
          titre={`Échéancier de la famille ${f.nom}`}
          actions={
            <>
              <Bouton variante="discret" taille="sm" onClick={() => setTous(!tous)}>{tous ? 'Masquer les mois à venir' : 'Afficher toute l’année'}</Bouton>
              {['caissier', 'comptable'].includes(role) && <Bouton taille="sm" icone={<Wallet className="size-4" />} onClick={() => nav(`/caisse?famille=${e.familleId}`)}>Encaisser</Bouton>}
            </>
          }
          sansMarge
        >
          <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
            {visibles.map((l) => {
              const el = ie[l.eleveId]
              return (
                <li key={l.id} className={cx('px-4 py-3', l.eleveId === e.id ? '' : 'text-encre-2')}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-encre">{l.libelle}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-sm mt-0.5">
                        {el && <PastilleCycle cycle={ic[el.classeId].cycle} libelle={el.prenom} />}
                        <span className="tabulaire">· avant le {dateCourte(l.echeance)}</span>
                      </span>
                      {l.motifRemise && <span className="block text-xs text-vert-texte mt-0.5">{l.motifRemise} · −{money(l.remise)}</span>}
                    </span>
                    <Badge ton={TON_STATUT[l.statut]}>{LIBELLE_STATUT_ECHEANCE[l.statut]}</Badge>
                  </div>
                  <div className="flex justify-between gap-3 mt-1.5 text-sm tabulaire">
                    <span>Montant <b className="text-encre">{money(l.montant)}</b></span>
                    <span>Reste <b className={l.reste ? 'text-encre' : ''}>{l.reste ? money(l.reste) : '—'}</b></span>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="tableau">
              <thead><tr><th>Échéance</th><th>Enfant</th><th>Date limite</th><th className="!text-right">Montant</th><th className="!text-right">Payé</th><th className="!text-right">Reste</th><th>Statut</th></tr></thead>
              <tbody>
                {visibles.map((l) => {
                  const el = ie[l.eleveId]
                  return (
                    <tr key={l.id} className={cx(l.eleveId === e.id ? '' : 'text-encre-2')}>
                      <td>
                        {l.libelle}
                        {l.motifRemise && <span className="block text-xs text-vert-texte">{l.motifRemise} · −{money(l.remise)}</span>}
                      </td>
                      <td className="whitespace-nowrap">{el ? <PastilleCycle cycle={ic[el.classeId].cycle} libelle={el.prenom} /> : '—'}</td>
                      <td className="whitespace-nowrap tabulaire">{dateCourte(l.echeance)}</td>
                      <td className="text-right tabulaire whitespace-nowrap">{money(l.montant)}</td>
                      <td className="text-right tabulaire whitespace-nowrap">{l.paye ? money(Math.min(l.paye, l.montant)) : '—'}</td>
                      <td className="text-right tabulaire whitespace-nowrap font-semibold">{l.reste ? money(l.reste) : '—'}</td>
                      <td><Badge ton={TON_STATUT[l.statut]}>{LIBELLE_STATUT_ECHEANCE[l.statut]}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Bloc>
        <Bloc titre="Reçus de la famille" sansMarge>
          {paiements.length === 0 ? <p className="px-5 pb-5 text-encre-2">Aucun paiement enregistré.</p> : (
            <ul>
              {paiements.map((p) => (
                <li key={p.id} className="border-t border-ligne-2 first:border-t-0">
                  <Link to={`/caisse/recu/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-brume">
                    <span className="min-w-0">
                      <span className="block font-semibold tabulaire">{numeroRecu(p.numero)}</span>
                      <span className="block text-sm text-encre-2">{dateCourte(p.date.slice(0, 10))} · {LIBELLE_MODE[p.mode]}</span>
                    </span>
                    <span className="text-right">
                      <span className={cx('block font-semibold tabulaire', p.statut === 'annule' && 'line-through text-encre-3')}>{money(p.montant)}</span>
                      {p.statut === 'annule' ? <Badge ton="rouge">Annulé</Badge> : p.statut === 'annulation_demandee' ? <Badge ton="ambre">Annulation demandée</Badge> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloc>
      </div>
    </div>
  )
}

function Chiffre({ libelle, valeur, ton }: { libelle: string; valeur: string; ton?: 'vert' | 'ambre' | 'rouge' }) {
  return (
    <div className="p-4 sm:p-5 min-w-0">
      <div className="text-encre-2 text-[0.9rem] sm:text-[0.95rem]">{libelle}</div>
      <div className={cx('chiffre text-[clamp(1.1rem,4.4vw,1.6rem)] font-medium mt-1 leading-tight', ton === 'vert' && 'text-vert-texte', ton === 'ambre' && 'text-ambre', ton === 'rouge' && 'text-rouge')}>{valeur}</div>
    </div>
  )
}

/* ----------------------------------------------------------------- Carte */
function OngletCarte({ e, s }: P) {
  const c = indexClasses(s.classes)[e.classeId]
  const carte = carteActive(s, 'eleve', e.id)
  const anciennes = s.cartes.filter((x) => x.type === 'eleve' && x.titulaireId === e.id && x.statut === 'desactivee')
  const scans = s.scans.filter((x) => x.eleveId === e.id).slice(-8).reverse()
  const role = profilParId(s.session.profilId).role
  const desactiver = useStore((st) => st.desactiverCarte)
  const toast = useStore((st) => st.toast)
  const nav = useNavigate()
  const [modale, setModale] = useState(false)
  const [motif, setMotif] = useState('Carte perdue, déclarée par les parents')
  const [precision, setPrecision] = useState('')
  const [executer, enCours] = useAction()
  const peutGerer = peut(role, 'cartes')
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5 items-start">
      <Bloc titre="Carte d’élève" className="min-w-0 lg:w-[30rem]">
        {carte ? (
          <div className="space-y-4">
            <CarteEleveAjustee eleve={e} classe={c} carte={carte} lien={lienCarte(s, carte)} echelle={1.25} />
            <div className="flex flex-wrap items-center gap-2">
              <Badge ton="vert" point>Active</Badge>
              {carte.imprimee ? <Badge>Imprimée</Badge> : <Badge ton="ambre">En attente d’impression</Badge>}
              <span className="text-sm text-encre-2">Émise le {dateCourte(carte.emiseLe)}</span>
            </div>
            <p className="text-sm text-encre-2 max-w-md">Le QR code ne contient qu’un jeton chiffré : aucune donnée personnelle n’est lisible sans l’application.</p>
            {peutGerer && (
              <div className="flex flex-wrap gap-2">
                <Bouton variante="secondaire" icone={<Printer className="size-4" />} onClick={() => nav(`/cartes?carte=${carte.id}`)}>Ouvrir dans le studio</Bouton>
                <Bouton variante="danger" icone={<RefreshCcw className="size-4" />} onClick={() => setModale(true)}>Désactiver et remplacer</Bouton>
              </div>
            )}
          </div>
        ) : (
          <p className="text-encre-2">Aucune carte active.</p>
        )}
      </Bloc>
      <div className="space-y-5">
        <Bloc titre="Derniers passages au portail" sansMarge>
          {scans.length === 0 ? <p className="px-5 pb-5 text-encre-2">Aucun passage enregistré.</p> : (
            <ul>
              {scans.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 px-5 py-2.5 border-t border-ligne-2 first:border-t-0">
                  <span>
                    <span className="block font-semibold">{x.sens === 'entree' ? 'Entrée' : 'Sortie'} · {x.lieu}</span>
                    <span className="block text-sm text-encre-2">{relatif(x.date)} · {x.motif}</span>
                  </span>
                  {x.resultat === 'autorise' ? <Badge ton="vert">Autorisé</Badge> : <Badge ton="rouge">{x.resultat === 'alerte' ? 'Alerte' : 'Refusé'}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Bloc>
        {anciennes.length > 0 && (
          <Bloc titre="Cartes désactivées">
            <ul className="space-y-1.5">
              {anciennes.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3">
                  <span className="text-encre-2">Émise le {dateCourte(x.emiseLe)} · {x.motifDesactivation}</span>
                  <Badge ton="rouge">Désactivée</Badge>
                </li>
              ))}
            </ul>
            <p className="text-sm text-encre-2 mt-3">Une carte désactivée est refusée au portail et le passage est signalé.</p>
          </Bloc>
        )}
      </div>
      <Modale
        ouvert={modale}
        onFermer={() => setModale(false)}
        titre="Désactiver et remplacer la carte"
        pied={
          <>
            <Bouton variante="discret" onClick={() => setModale(false)}>Annuler</Bouton>
            <Bouton
              variante="danger"
              chargement={enCours}
              onClick={() =>
                executer(() => {
                  desactiver(carte!.id, precision ? `${motif} · ${precision}` : motif)
                  setModale(false)
                  toast({ titre: 'Carte désactivée', texte: `Une nouvelle carte pour ${e.prenom} attend l’impression.`, niveau: 'succes' })
                })
              }
            >
              Désactiver la carte
            </Bouton>
          </>
        }
      >
        <p className="text-encre-2 mb-4">L’ancienne carte sera refusée au portail dès maintenant. Une nouvelle carte est créée avec un nouveau jeton.</p>
        <label className="block mb-3">
          <span className="text-sm font-semibold text-encre-2">Motif</span>
          <Liste value={motif} onChange={(ev) => setMotif(ev.target.value)} className="mt-1.5">
            <option>Carte perdue, déclarée par les parents</option>
            <option>Carte volée</option>
            <option>Carte abîmée</option>
            <option>Changement de classe</option>
          </Liste>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-encre-2">Précision (facultatif)</span>
          <Zone value={precision} onChange={(ev) => setPrecision(ev.target.value)} className="mt-1.5 min-h-16" placeholder="Ex. perdue dans le minibus du circuit 2" />
        </label>
      </Modale>
    </div>
  )
}

/* ------------------------------------------------------------- Documents */
function OngletDocuments({ e, s }: P) {
  const [doc, setDoc] = useState<'certificat' | 'attestation' | null>(null)
  const c = indexClasses(s.classes)[e.classeId]
  const f = indexFamilles(s.familles)[e.familleId]
  const sit = situationFamille(s, e.familleId)
  const exporter = useStore((st) => st.exporter)
  const ref = `${e.matricule}/${JOUR_DEMO.replace(/-/g, '').slice(2)}`
  const paiements = s.paiements.filter((p) => p.familleId === e.familleId && p.statut !== 'annule')
  const responsable = f.responsable === 'mere' ? f.mere : f.pere
  const docs = [
    { id: 'certificat' as const, titre: 'Certificat de scolarité', texte: `Atteste que ${e.prenom} est inscrit${e.sexe === 'F' ? 'e' : ''} en ${c.nom} pour l’année 2026-2027.` },
    { id: 'attestation' as const, titre: 'Attestation de paiement', texte: `Récapitulatif des sommes versées par la famille ${f.nom} cette année.` },
  ]
  return (
    <>
      <div className="grid md:grid-cols-2 gap-5">
        {docs.map((d) => (
          <Bloc key={d.id}>
            <div className="flex gap-4 pt-5">
              <span className="size-12 rounded-xl bg-bleu-clair text-bleu flex items-center justify-center shrink-0"><FileText className="size-6" /></span>
              <div className="flex-1">
                <div className="font-semibold text-lg titre">{d.titre}</div>
                <p className="text-encre-2 mt-1">{d.texte}</p>
                <Bouton className="mt-3" variante="secondaire" icone={<Printer className="size-4" />} onClick={() => setDoc(d.id)}>Aperçu et impression</Bouton>
              </div>
            </div>
          </Bloc>
        ))}
      </div>
      <ApercuImpression ouvert={doc !== null} onFermer={() => setDoc(null)} titre={doc === 'certificat' ? 'Certificat de scolarité' : 'Attestation de paiement'} onImprimer={() => exporter(`${doc === 'certificat' ? 'Certificat de scolarité' : 'Attestation de paiement'} · ${e.prenom} ${e.nom}`)}>
        <div className="feuille-a4 text-[10.5pt] leading-relaxed">
          <EnTeteDocument titre={doc === 'certificat' ? 'Certificat de scolarité' : 'Attestation de paiement'} sousTitre={`Réf. ${ref}`} />
          {doc === 'certificat' ? (
            <div className="mt-14 space-y-5">
              <p>Je soussigné{CONFIG.NOM_DIRECTION ? '' : '(e)'}, {NOM_DIRECTION === 'la Direction' ? 'la Direction générale' : NOM_DIRECTION} du {CONFIG.ECOLE}, certifie que :</p>
              <div className="rounded-lg border border-ligne p-5 bg-brume/50">
                <div className="titre text-[14pt] font-medium">{e.prenom} {e.nom.toUpperCase()}</div>
                <div className="mt-1">Né{e.sexe === 'F' ? 'e' : ''} le {dateLongue(e.naissance)}</div>
                <div>Matricule {e.matricule}</div>
              </div>
              <p>est régulièrement inscrit{e.sexe === 'F' ? 'e' : ''} dans notre établissement en <b>{c.nom}</b> ({NOM_CYCLE[c.cycle].toLowerCase()}) au titre de l’année scolaire <b>2026-2027</b>, depuis le {dateLongue(e.dateInscription)}.</p>
              <p>Le présent certificat est délivré à la demande de l’intéressé{e.sexe === 'F' ? 'e' : ''} pour servir et valoir ce que de droit.</p>
              <p className="text-right">Fait à {CONFIG.VILLE}, le {dateLongue(JOUR_DEMO)}</p>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              <p>{NOM_DIRECTION === 'la Direction' ? 'La Direction' : NOM_DIRECTION} du {CONFIG.ECOLE} atteste que la famille <b>{f.nom}</b>{responsable && <>, représentée par {responsable.prenom} {responsable.nom}</>}, a versé les sommes suivantes pour l’année scolaire 2026-2027 :</p>
              <table className="w-full text-[9.5pt] border-collapse">
                <thead><tr className="border-b-2 border-encre text-left"><th className="py-1.5">Reçu</th><th>Date</th><th>Mode</th><th className="text-right">Montant</th></tr></thead>
                <tbody>
                  {paiements.map((p) => (
                    <tr key={p.id} className="border-b border-ligne">
                      <td className="py-1 tabulaire">{numeroRecu(p.numero)}</td><td>{dateCourte(p.date.slice(0, 10))}</td><td>{LIBELLE_MODE[p.mode]}</td><td className="text-right tabulaire">{money(p.montant)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3} className="pt-2 font-semibold">Total versé</td><td className="pt-2 text-right font-semibold tabulaire">{money(paiements.reduce((a, p) => a + p.montant, 0))}</td></tr></tfoot>
              </table>
              <p>Situation au {dateCourte(JOUR_DEMO)} : reste échu <b>{money(sit?.resteEchu ?? 0)}</b> ; reste à payer sur l’année <b>{money(sit?.resteAnnee ?? 0)}</b>.</p>
              <p className="text-right">Fait à {CONFIG.VILLE}, le {dateLongue(JOUR_DEMO)}</p>
            </div>
          )}
          <Signatures gauche="Le secrétariat" droite={NOM_DIRECTION === 'la Direction' ? 'La Direction' : NOM_DIRECTION} />
        </div>
      </ApercuImpression>
    </>
  )
}

/* ------------------------------------------------------------ Historique */
function OngletHistorique({ e, s }: P) {
  const lignes = s.audit.filter((a) => a.eleveId === e.id).slice().reverse()
  return (
    <Bloc titre="Historique des actions" actions={<span className="text-sm text-encre-2">Journal en ajout seul : rien ne s’efface</span>} sansMarge>
      {lignes.length === 0 ? (
        <p className="px-5 pb-5 text-encre-2">Aucune action enregistrée sur ce dossier pour l’instant.</p>
      ) : (
        <>
        <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
          {lignes.map((a) => (
            <li key={a.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-vert-texte shrink-0" />{a.action}</span>
                <span className="text-sm text-encre-2 whitespace-nowrap">{relatif(a.date)}</span>
              </div>
              <div className="text-sm text-encre-2 mt-0.5">{a.userNom} · {a.role}</div>
              <div className="text-encre-2 mt-1">{a.objet}</div>
              {a.avant && a.apres && (
                <div className="text-sm mt-1 flex flex-wrap gap-x-3">
                  {Object.keys(a.apres).map((k) => (
                    <span key={k}>{k} : <span className="line-through text-encre-3">{String((a.avant as Record<string, unknown>)[k] ?? '—')}</span> <b className="text-encre">{String((a.apres as Record<string, unknown>)[k])}</b></span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <table className="tableau hidden md:table">
          <thead><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Détail</th></tr></thead>
          <tbody>
            {lignes.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">{relatif(a.date)}</td>
                <td><span className="block font-semibold">{a.userNom}</span><span className="text-sm text-encre-2">{a.role}</span></td>
                <td className="font-semibold"><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-vert-texte" />{a.action}</span></td>
                <td className="text-encre-2">
                  {a.objet}
                  {a.avant && a.apres && (
                    <span className="block text-sm">
                      {Object.keys(a.apres).map((k) => (
                        <span key={k} className="mr-3">{k} : <span className="line-through text-encre-3">{String((a.avant as Record<string, unknown>)[k] ?? '—')}</span> <b className="text-encre">{String((a.apres as Record<string, unknown>)[k])}</b></span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
      <div className="px-5 py-3 text-sm text-encre-3 flex items-center gap-2"><IdCard className="size-4" /> Les consultations de la fiche santé apparaissent ici.</div>
    </Bloc>
  )
}
