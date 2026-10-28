/** Reçu imprimable (A5 ou ticket 80 mm) avec vrai QR code de vérification. Réutilisable (caisse, espace parent). */
import { useStore } from '../../store'
import type { Paiement } from '../../data/types'
import { indexEleves, indexFamilles, indexClasses, ventilationEncaisse, nomPersonnel } from '../../store/selecteurs'
import { LIBELLE_MODE } from '../../data/referentiel'
import { money, numeroRecu } from '../../lib/format'
import { dateCourte, heureFr } from '../../lib/temps'
import { lienRecu } from '../../lib/verif'
import { QR } from '../../ui/qr'
import { EnTeteDocument, FiletMarque } from '../../ui/documents'
import { CONFIG } from '../../config'

/** Reste dû (échu à la date du paiement) et reste sur l'année, juste après ce paiement. */
export function resteApres(s: ReturnType<typeof useStore.getState>, p: Paiement) {
  const jour = p.date.slice(0, 10)
  const ech = s.echeances.filter((e) => e.familleId === p.familleId)
  const paye = new Map<string, number>()
  for (const x of s.paiements) {
    if (x.familleId !== p.familleId || x.statut === 'annule' || x.date > p.date) continue
    for (const l of x.lignes) paye.set(l.echeanceId, (paye.get(l.echeanceId) ?? 0) + l.montant)
  }
  let echu = 0
  let annee = 0
  for (const e of ech) {
    const r = Math.max(0, e.montant - (paye.get(e.id) ?? 0))
    annee += r
    if (e.echeance <= jour) echu += r
  }
  return { echu, annee }
}

export function DocumentRecu({ paiement, format = 'A5' }: { paiement: Paiement; format?: 'A5' | 'ticket' }) {
  const s = useStore()
  const p = s.paiements.find((x) => x.id === paiement.id) ?? paiement
  const f = indexFamilles(s.familles)[p.familleId]
  const ie = indexEleves(s.eleves)
  const ic = indexClasses(s.classes)
  const lignes = ventilationEncaisse(s, p)
  const parEleve = new Map<string, typeof lignes>()
  for (const l of lignes) {
    const k = l.echeance?.eleveId ?? '—'
    parEleve.set(k, [...(parEleve.get(k) ?? []), l])
  }
  const reste = resteApres(s, p)
  const lien = lienRecu(s, p)
  const annule = p.statut === 'annule'
  const caissier = p.caissierId ? nomPersonnel(s, p.caissierId) : p.canal === 'parent' ? 'Paiement mobile en ligne' : 'Virement bancaire'

  if (format === 'ticket') {
    return (
      <div className="ticket-80 relative text-[9pt] leading-snug text-encre">
        {annule && <Filigrane petit />}
        <div className="text-center">
          <img src={CONFIG.LOGO_COULEUR} alt="" className="h-[14mm] w-auto mx-auto" />
          <div className="font-semibold mt-1">{CONFIG.ECOLE}</div>
          <div className="text-[7.5pt]">{CONFIG.ADRESSE}, {CONFIG.VILLE}</div>
          <div className="text-[7.5pt]">{CONFIG.TELEPHONE_ECOLE}</div>
        </div>
        <div className="border-t border-dashed border-encre/50 my-2" />
        <div className="text-center font-semibold text-[11pt]">REÇU {numeroRecu(p.numero)}</div>
        <div className="text-center">{dateCourte(p.date.slice(0, 10))} à {heureFr(p.date)}</div>
        <div className="border-t border-dashed border-encre/50 my-2" />
        <div>Famille {f?.nom} · payé par {p.payeur}</div>
        {[...parEleve.entries()].map(([eid, ls]) => (
          <div key={eid} className="mt-1.5">
            <div className="font-semibold">{ie[eid] ? `${ie[eid].prenom} ${ie[eid].nom} · ${ic[ie[eid].classeId]?.nom}` : '—'}</div>
            {ls.map((l) => (
              <div key={l.echeanceId} className="flex justify-between gap-2">
                <span className="truncate">{l.echeance?.libelle}</span>
                <span className="tabulaire whitespace-nowrap">{money(l.montant)}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="border-t border-dashed border-encre/50 my-2" />
        <div className="flex justify-between font-semibold text-[11pt]"><span>TOTAL</span><span className="tabulaire">{money(p.montant)}</span></div>
        <div>Mode : {LIBELLE_MODE[p.mode]}</div>
        {p.reference && <div className="break-all">Réf. : {p.reference}</div>}
        <div>Reste dû à ce jour : {money(reste.echu)}</div>
        <div>Caisse : {caissier}</div>
        <div className="border-t border-dashed border-encre/50 my-2" />
        <div className="flex flex-col items-center gap-1">
          <QR valeur={lien} taille={110} />
          <div className="text-center font-semibold">Reçu authentique : scannez le QR code</div>
          <div className="text-[6.5pt] text-encre-2 text-center break-all">{lien.length > 90 ? lien.slice(0, 60) + '…' : lien}</div>
        </div>
        <div className="text-center text-[7.5pt] mt-2">Merci de votre confiance. Conservez ce reçu.</div>
      </div>
    )
  }

  return (
    <div className="feuille-a5 relative text-[9.5pt] text-encre flex flex-col">
      {annule && <Filigrane />}
      <EnTeteDocument titre="Reçu de paiement" sousTitre={numeroRecu(p.numero)} />
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <div className="text-encre-2 text-[8pt]">Famille</div>
          <div className="font-semibold">Famille {f?.nom}</div>
          <div>Payé par {p.payeur}</div>
          <div className="text-encre-2">{f?.quartier}, {CONFIG.VILLE}</div>
        </div>
        <div className="text-right">
          <div className="text-encre-2 text-[8pt]">Date et heure</div>
          <div className="font-semibold">{dateCourte(p.date.slice(0, 10))} à {heureFr(p.date)}</div>
          <div>Année scolaire {CONFIG.ANNEE_SCOLAIRE}</div>
        </div>
      </div>
      <table className="w-full mt-4 text-[9pt]">
        <thead>
          <tr className="border-b border-encre/30 text-left text-encre-2">
            <th className="py-1 font-semibold">Élève</th>
            <th className="py-1 font-semibold">Échéance</th>
            <th className="py-1 font-semibold text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {[...parEleve.entries()].flatMap(([eid, ls]) =>
            ls.map((l, i) => (
              <tr key={l.echeanceId} className="border-b border-ligne-2">
                <td className="py-1 align-top">{i === 0 && ie[eid] ? <><b>{ie[eid].prenom} {ie[eid].nom}</b><div className="text-encre-2 text-[8pt]">{ic[ie[eid].classeId]?.nom} · {ie[eid].matricule}</div></> : ''}</td>
                <td className="py-1">{l.echeance?.libelle}{l.echeance && l.montant < l.echeance.montant ? <span className="text-encre-2"> (partiel)</span> : null}</td>
                <td className="py-1 text-right tabulaire whitespace-nowrap">{money(l.montant)}</td>
              </tr>
            )),
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="pt-2 font-semibold text-[11pt]">Total reçu</td>
            <td className="pt-2 text-right font-semibold text-[11pt] tabulaire whitespace-nowrap">{money(p.montant)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="grid grid-cols-[1fr_auto] gap-5 mt-4 items-end">
        <div className="space-y-0.5">
          <div>Mode de paiement : <b>{LIBELLE_MODE[p.mode]}</b></div>
          {p.reference && <div className="break-all">Référence : {p.reference}</div>}
          <div>Reste dû à ce jour : <b>{money(reste.echu)}</b></div>
          <div>Reste sur l’année : {money(reste.annee)}</div>
          <div>Encaissé par : {caissier}</div>
          {annule && p.annulation && <div className="text-rouge font-semibold mt-1">Reçu annulé le {dateCourte(p.annulation.dateValidation?.slice(0, 10) ?? p.annulation.date.slice(0, 10))} · {p.annulation.motif}</div>}
        </div>
        <div className="flex flex-col items-center gap-1">
          <QR valeur={lien} taille={104} />
          <div className="text-[7.5pt] font-semibold text-center max-w-[34mm]">Reçu authentique : scannez le QR code</div>
        </div>
      </div>
      <div className="flex-1" />
      <div className="mt-4">
        <FiletMarque />
        <div className="text-[7pt] text-encre-2 mt-1.5 break-all">Vérification : {lien}</div>
        <div className="text-[7pt] text-encre-2">Reçu numéroté sans interruption. Un reçu ne peut pas être supprimé ; toute annulation est validée par la Direction et reste visible.</div>
      </div>
    </div>
  )
}

function Filigrane({ petit }: { petit?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" aria-hidden>
      <span className={`font-bold text-rouge/25 border-4 border-rouge/25 rounded-lg px-4 rotate-[-24deg] titre ${petit ? 'text-[26pt]' : 'text-[48pt]'}`}>ANNULÉ</span>
    </div>
  )
}
