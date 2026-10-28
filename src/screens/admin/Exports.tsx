/** Exports : fichiers tableur (CSV, séparateur « ; », compatible Excel) générés depuis le store. */
import { FileSpreadsheet, Download } from 'lucide-react'
import { useStore } from '../../store'
import { elevesActifs, indexClasses, indexFamilles, situationsFamilles, nomPersonnel, paiementsComptes } from '../../store/selecteurs'
import { LIBELLE_MODE } from '../../data/referentiel'
import { Bloc, Bouton, EnTetePage } from '../../ui/base'
import { useAction } from '../../ui/hooks'
import { JOUR_DEMO, dateCourte } from '../../lib/temps'
import { numeroRecu } from '../../lib/format'
import type { Donnees } from '../../data/generer'

type Ligne = (string | number)[]

function csv(lignes: Ligne[]): string {
  return '﻿' + lignes.map((l) => l.map((c) => {
    const v = String(c)
    return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  }).join(';')).join('\r\n')
}

function telecharger(nom: string, contenu: string) {
  const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nom
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 500)
}

const EXPORTS: { id: string; titre: string; detail: string; fichier: string; lignes: (s: Donnees) => Ligne[] }[] = [
  {
    id: 'eleves', titre: 'Liste des élèves', detail: 'Matricule, identité, classe, responsable et téléphone', fichier: `eleves-${JOUR_DEMO}.csv`,
    lignes: (s) => {
      const ic = indexClasses(s.classes)
      const ifa = indexFamilles(s.familles)
      return [['Matricule', 'Nom', 'Prénom', 'Sexe', 'Naissance', 'Classe', 'Responsable', 'Téléphone'], ...elevesActifs(s.eleves).map((e) => {
        const f = ifa[e.familleId]
        const r = f.responsable === 'mere' ? f.mere : f.pere
        return [e.matricule, e.nom, e.prenom, e.sexe, dateCourte(e.naissance), ic[e.classeId].nom, r ? `${r.prenom} ${r.nom}` : '', r?.tel ?? '']
      })]
    },
  },
  {
    id: 'situations', titre: 'Situation financière des familles', detail: 'Dû à ce jour, payé, reste, retard', fichier: `situations-familles-${JOUR_DEMO}.csv`,
    lignes: (s) => {
      const sit = situationsFamilles(s.echeances, s.paiements)
      return [['Famille', 'Dû à ce jour', 'Payé', 'Reste dû', 'En retard', 'Statut'], ...s.familles.map((f) => {
        const x = sit[f.id]
        return [f.nom, x?.du ?? 0, x?.paye ?? 0, x?.resteEchu ?? 0, x?.enRetard ?? 0, x?.statut === 'en_retard' ? 'En retard' : x?.statut === 'partiel' ? 'Partiel' : 'À jour']
      })]
    },
  },
  {
    id: 'caisse', titre: 'Journal de caisse du jour', detail: 'Tous les reçus du jour, y compris annulés', fichier: `journal-caisse-${JOUR_DEMO}.csv`,
    lignes: (s) => {
      const ifa = indexFamilles(s.familles)
      return [['Reçu', 'Heure', 'Famille', 'Payeur', 'Mode', 'Référence', 'Montant', 'Statut', 'Saisi par'], ...s.paiements.filter((p) => p.date.startsWith(JOUR_DEMO)).map((p) => [numeroRecu(p.numero), p.date.slice(11, 16), ifa[p.familleId]?.nom ?? '', p.payeur, LIBELLE_MODE[p.mode], p.reference ?? '', p.montant, paiementsComptes(p) ? 'Valide' : 'Annulé', nomPersonnel(s, p.caissierId)])]
    },
  },
  {
    id: 'absences', titre: 'Absences depuis la rentrée', detail: 'Date, élève, classe, justification', fichier: `absences-${JOUR_DEMO}.csv`,
    lignes: (s) => {
      const ic = indexClasses(s.classes)
      const ie = Object.fromEntries(s.eleves.map((e) => [e.id, e]))
      return [['Date', 'Élève', 'Classe', 'Période', 'Justifiée', 'Motif'], ...s.absences.map((a) => [dateCourte(a.date), `${ie[a.eleveId]?.prenom} ${ie[a.eleveId]?.nom}`, ic[ie[a.eleveId]?.classeId]?.nom ?? '', a.periode, a.justifiee ? 'Oui' : 'Non', a.motif ?? ''])]
    },
  },
  {
    id: 'audit', titre: 'Journal d’audit', detail: 'Qui, quand, quoi, avant et après', fichier: `journal-audit-${JOUR_DEMO}.csv`,
    lignes: (s) => [['Date', 'Utilisateur', 'Rôle', 'Type', 'Action', 'Objet', 'Avant', 'Après'], ...s.audit.map((a) => [a.date.replace('T', ' '), a.userNom, a.role, a.type, a.action, a.objet, a.avant ? JSON.stringify(a.avant) : '', a.apres ? JSON.stringify(a.apres) : ''])],
  },
]

export default function Exports() {
  const s = useStore()
  const exporter = useStore((st) => st.exporter)
  const toast = useStore((st) => st.toast)
  const [executer, enCours] = useAction()
  return (
    <div>
      <EnTetePage titre="Exports" sousTitre="Fichiers tableur ouverts directement dans Excel. Chaque export est journalisé." />
      <Bloc sansMarge>
        <ul>
          {EXPORTS.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 sm:px-5 py-4 border-t border-ligne-2 first:border-t-0">
              <FileSpreadsheet className="size-6 text-vert-texte" />
              <div className="flex-1 min-w-[14rem]">
                <div className="font-semibold">{x.titre}</div>
                <div className="text-encre-2">{x.detail} · {Math.max(0, x.lignes(s).length - 1)} lignes</div>
              </div>
              <Bouton variante="secondaire" className="max-sm:w-full" icone={<Download className="size-4" />} disabled={enCours} onClick={() => executer(() => {
                telecharger(x.fichier, csv(x.lignes(s)))
                exporter(x.titre)
                toast({ titre: 'Export prêt', texte: x.fichier, niveau: 'succes' })
              })}>Télécharger</Bouton>
            </li>
          ))}
        </ul>
      </Bloc>
    </div>
  )
}
