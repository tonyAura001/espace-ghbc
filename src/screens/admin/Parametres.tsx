/** Paramètres : année scolaire, grille tarifaire, règles, matrice des rôles. Chaque changement est journalisé. */
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useStore } from '../../store'
import { DROITS, PROFILS, type Droit } from '../../store/profils'
import { LIBELLE_ROLE } from '../../data/referentiel'
import { CONFIG, PAYS_DATA } from '../../config'
import { Bloc, Bouton, EnTetePage, Interrupteur, Ligne, Onglets, Saisie, cx } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { money, nombre } from '../../lib/format'
import { DEBUT_ANNEE, FIN_ANNEE, dateMoyenne, moisAnnee, MOIS_ECHEANCIER } from '../../lib/temps'
import type { Role } from '../../data/types'

const LIBELLE_DROIT: Record<Droit, string> = {
  encaisser: 'Encaisser un paiement',
  demanderAnnulation: 'Demander l’annulation d’un reçu',
  validerAnnulation: 'Valider une annulation de reçu',
  validerRemise: 'Valider une remise exceptionnelle',
  saisirNotes: 'Saisir des notes',
  publierBulletin: 'Publier les bulletins',
  inscrire: 'Inscrire un élève',
  cartes: 'Émettre et désactiver des cartes',
  relancer: 'Relancer les familles',
  cloturerCaisse: 'Clôturer la caisse',
  ficheSante: 'Ouvrir une fiche santé',
  depenses: 'Enregistrer des dépenses',
  parametres: 'Modifier les paramètres',
}

const LIBELLE_TARIF: Record<string, string> = {
  inscription: 'Inscription', reinscription: 'Réinscription', creche: 'Crèche, par mois', maternelle: 'Maternelle, par mois',
  primaire: 'Primaire, par mois', college: 'Collège, par mois', cantine: 'Cantine, par mois', transport: 'Transport, par mois',
  tenue: 'Tenue', examen: 'Frais d’examen',
}

export default function Parametres() {
  const [onglet, setOnglet] = useState<'annee' | 'tarifs' | 'regles' | 'roles'>('annee')
  return (
    <div>
      <EnTetePage titre="Paramètres" sousTitre="Toute modification est inscrite au journal d’audit, avec l’ancienne et la nouvelle valeur." />
      <Onglets className="mb-5" actif={onglet} onChange={setOnglet} onglets={[{ id: 'annee', libelle: 'Année scolaire' }, { id: 'tarifs', libelle: 'Grille tarifaire' }, { id: 'regles', libelle: 'Règles' }, { id: 'roles', libelle: 'Rôles et droits' }]} />
      {onglet === 'annee' && <Annee />}
      {onglet === 'tarifs' && <Tarifs />}
      {onglet === 'regles' && <Regles />}
      {onglet === 'roles' && <Roles />}
    </div>
  )
}

function Annee() {
  const s = useStore()
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Bloc titre="Établissement">
        <Ligne libelle="Nom">{CONFIG.ECOLE}</Ligne>
        <Ligne libelle="Sigle">{CONFIG.SIGLE}</Ligne>
        <Ligne libelle="Adresse">{CONFIG.ADRESSE}, {CONFIG.VILLE}</Ligne>
        <Ligne libelle="Pays et monnaie">{CONFIG.PAYS} · {PAYS_DATA.devise === 'XOF' ? 'FCFA' : 'franc guinéen (GNF)'}</Ligne>
        <Ligne libelle="Cycles">Crèche, maternelle, primaire, collège</Ligne>
        <Ligne libelle="Classes">{s.classes.length}</Ligne>
      </Bloc>
      <Bloc titre={`Année ${CONFIG.ANNEE_SCOLAIRE}`}>
        <Ligne libelle="Rentrée">{dateMoyenne(DEBUT_ANNEE)}</Ligne>
        <Ligne libelle="Fin des cours">{dateMoyenne(FIN_ANNEE)}</Ligne>
        <Ligne libelle="1er trimestre">octobre à décembre</Ligne>
        <Ligne libelle="2e trimestre">janvier à mars</Ligne>
        <Ligne libelle="3e trimestre">avril à juin</Ligne>
        <Ligne libelle="Échéancier">{MOIS_ECHEANCIER.length} mensualités, de {moisAnnee(MOIS_ECHEANCIER[0])} à {moisAnnee(MOIS_ECHEANCIER[MOIS_ECHEANCIER.length - 1])}</Ligne>
        <Ligne libelle="Examens de fin de cycle">{PAYS_DATA.examenPrimaire} · {PAYS_DATA.examenCollege}</Ligne>
      </Bloc>
    </div>
  )
}

function Tarifs() {
  const s = useStore()
  const maj = useStore((st) => st.majParametres)
  const toast = useStore((st) => st.toast)
  const [valeurs, setValeurs] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(s.parametres.tarifs).map(([k, v]) => [k, String(v)])))
  const [executer, enCours] = useAction()
  const modifies = Object.entries(valeurs).filter(([k, v]) => Number(v.replace(/\s/g, '')) !== (s.parametres.tarifs as Record<string, number>)[k])
  return (
    <Bloc titre="Grille tarifaire 2026-2027" actions={<span className="text-encre-2 text-sm">S’applique aux nouvelles inscriptions ; les contrats signés ne changent pas.</span>} sansMarge className="overflow-hidden">
      <ul className="md:hidden">
        {Object.entries(s.parametres.tarifs).map(([k, v]) => (
          <li key={k} className="px-4 py-3 border-t border-ligne-2 first:border-t-0">
            <div className="flex justify-between gap-3"><span className="font-semibold">{LIBELLE_TARIF[k]}</span><span className="text-encre-2 tabulaire text-sm">actuel : {money(v)}</span></div>
            <Saisie inputMode="numeric" aria-label={`Nouveau montant · ${LIBELLE_TARIF[k]}`} value={valeurs[k]} onChange={(e) => setValeurs({ ...valeurs, [k]: e.target.value.replace(/[^\d\s]/g, '') })} className="mt-2 tabulaire py-2" />
          </li>
        ))}
      </ul>
      <table className="tableau hidden md:table">
        <thead><tr><th>Frais</th><th>Montant actuel</th><th>Nouveau montant ({PAYS_DATA.devise === 'XOF' ? 'FCFA' : 'GNF'})</th></tr></thead>
        <tbody>
          {Object.entries(s.parametres.tarifs).map(([k, v]) => (
            <tr key={k}>
              <td className="font-semibold">{LIBELLE_TARIF[k]}</td>
              <td className="tabulaire">{money(v)}</td>
              <td><Saisie inputMode="numeric" value={valeurs[k]} onChange={(e) => setValeurs({ ...valeurs, [k]: e.target.value.replace(/[^\d\s]/g, '') })} className="max-w-[12rem] tabulaire py-1.5" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap justify-end gap-2 p-4 border-t border-ligne-2 md:border-0">
        <Bouton variante="secondaire" className="max-sm:flex-1" disabled={!modifies.length} onClick={() => setValeurs(Object.fromEntries(Object.entries(s.parametres.tarifs).map(([k, v]) => [k, String(v)])))}>Annuler les changements</Bouton>
        <Bouton chargement={enCours} className="max-sm:flex-1" disabled={!modifies.length} onClick={() => executer(() => {
          maj({ tarifs: { ...s.parametres.tarifs, ...Object.fromEntries(modifies.map(([k, v]) => [k, Number(v.replace(/\s/g, ''))])) } })
          toast({ titre: 'Grille tarifaire enregistrée', texte: `${modifies.length} tarif${modifies.length > 1 ? 's' : ''} modifié${modifies.length > 1 ? 's' : ''}`, niveau: 'succes' })
        })}>Enregistrer la grille</Bouton>
      </div>
    </Bloc>
  )
}

function Regles() {
  const s = useStore()
  const maj = useStore((st) => st.majParametres)
  const p = s.parametres
  return (
    <Bloc titre="Règles de fonctionnement">
      <div className="space-y-5 max-w-3xl">
        <Interrupteur actif={p.afficherRang} onChange={(v) => maj({ afficherRang: v })} libelle={<span><b>Afficher le rang</b> sur les bulletins du primaire et du collège</span>} />
        <Interrupteur actif={p.doubleValidation} onChange={(v) => maj({ doubleValidation: v })} libelle={<span><b>Double validation</b> pour les annulations de reçu, remises exceptionnelles, corrections après conseil et radiations</span>} />
        <Interrupteur actif={p.relanceAuto} onChange={(v) => maj({ relanceAuto: v })} libelle={<span><b>Préparer les relances automatiquement</b> chaque lundi (l’envoi reste décidé par la comptabilité)</span>} />
        <div className="flex flex-wrap items-center gap-3">
          <span><b>Délai de grâce</b> avant qu’une échéance passe « en retard »</span>
          <span className="chiffre text-xl">{nombre(p.delaiGrace)} jours</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span><b>Remise fratrie</b> à partir du 2e enfant</span>
          <span className="chiffre text-xl">{nombre(p.remiseFratrie)}&nbsp;%</span>
        </div>
      </div>
    </Bloc>
  )
}

function Roles() {
  const roles = [...new Set(PROFILS.map((p) => p.role))].filter((r) => r !== 'parent' && r !== 'eleve') as Role[]
  return (
    <Bloc titre="Matrice des rôles" actions={<span className="text-encre-2 text-sm">Séparation des tâches : celui qui encaisse n’annule pas ; celui qui note ne publie pas.</span>} sansMarge className="overflow-hidden">
      <div className="overflow-x-auto defilement">
        <table className="tableau">
          <thead>
            <tr>
              <th className="sticky left-0 z-[2] bg-white shadow-[1px_0_0_var(--color-ligne)]">Action</th>
              {roles.map((r) => <th key={r} className="text-center !whitespace-normal min-w-[6.5rem] leading-tight">{LIBELLE_ROLE[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(DROITS) as Droit[]).map((d) => (
              <tr key={d}>
                <td className="font-semibold sticky left-0 z-[1] bg-white shadow-[1px_0_0_var(--color-ligne)] min-w-[11rem] max-sm:whitespace-normal sm:whitespace-nowrap">{LIBELLE_DROIT[d]}</td>
                {roles.map((r) => {
                  const ok = (DROITS[d] as Role[]).includes(r)
                  return (
                    <td key={r} className="text-center">
                      <span className={cx('inline-flex size-6 rounded-full items-center justify-center', ok ? 'bg-vert-clair text-vert-texte' : 'text-ligne')}>
                        {ok ? <Check className="size-4" /> : <X className="size-3.5" />}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Bloc>
  )
}
