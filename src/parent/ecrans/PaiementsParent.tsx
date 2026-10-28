/** Paiements de la famille : situation, paiement mobile money (scénario 7) et reçu avec QR. */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, ChevronRight, Lock, Smartphone, Receipt, ShieldCheck } from 'lucide-react'
import { useStore } from '../../store'
import { CONFIG } from '../../config'
import { Badge, Jauge, cx } from '../../ui/base'
import { QR } from '../../ui/qr'
import { BoutonM, CarteM, TitreM } from '../mobile'
import { enfants, famille, allerParent, jourMoisFr } from '../donnees'
import { echeancesParFamille, situationFamille, ventilationEncaisse, indexEleves, LIBELLE_STATUT_ECHEANCE, type LigneEcheance } from '../../store/selecteurs'
import { LIBELLE_MODE, MODES_MOBILE } from '../../data/referentiel'
import type { ModePaiement } from '../../data/types'
import { money, numeroRecu } from '../../lib/format'
import { JOUR_DEMO, ajouterJours, dateCourte, dateHeure, minutesEnHhmm, minutesDemo, moisAnnee } from '../../lib/temps'
import { lienRecu } from '../../lib/verif'
import { latence } from '../../ui/hooks'

/** Échéances présélectionnées quand on arrive sur l'écran « Payer ». */
let preselection: string[] | null = null

const prenomDe = (id: string) => indexEleves(useStore.getState().eleves)[id]?.prenom ?? ''

export function PaiementsParent() {
  const s = useStore()
  const f = famille(s)
  const sit = situationFamille(s, f.id)
  const lignes = echeancesParFamille(s.echeances, s.paiements)[f.id] ?? []
  const aRegler = lignes.filter((l) => l.reste > 0 && l.echeance <= JOUR_DEMO).sort((a, b) => rangStatut(a) - rangStatut(b) || a.echeance.localeCompare(b.echeance))
  const retard = aRegler.filter((l) => l.statut === 'en_retard')
  const prochaines = lignes.filter((l) => l.reste > 0 && l.echeance > JOUR_DEMO)
  const prochainMois = prochaines[0]?.mois ?? null
  const duMois = prochaines.filter((l) => l.mois === prochainMois)
  const recus = s.paiements.filter((p) => p.familleId === f.id).sort((a, b) => b.date.localeCompare(a.date))

  const payer = (ids: string[]) => {
    preselection = ids
    allerParent('payer')
  }
  const enfantsRetard = [...new Set(retard.map((l) => prenomDe(l.eleveId)))]

  return (
    <div>
      <CarteM>
        <div className="text-encre-2 text-[0.9rem]">Reste à payer à ce jour</div>
        <div className={cx('chiffre text-[2rem] leading-none mt-1', sit && sit.resteEchu > 0 ? (sit.enRetard > 0 ? 'text-rouge' : 'text-ambre') : 'text-vert-texte')} data-testid="reste-parent">{money(sit?.resteEchu ?? 0)}</div>
        {sit && sit.enRetard > 0 && <div className="text-rouge text-[0.9rem] mt-1 font-semibold">dont {money(sit.enRetard)} en retard de plus de 15 jours</div>}
        <div className="mt-3"><Jauge valeur={sit ? sit.payeAnnee / Math.max(1, sit.totalAnnee) : 0} hauteur={7} /></div>
        <div className="text-encre-2 text-[0.82rem] mt-1.5">{money(sit?.payeAnnee ?? 0)} payés sur {money(sit?.totalAnnee ?? 0)} pour l’année {CONFIG.ANNEE_SCOLAIRE}</div>
      </CarteM>

      {retard.length > 0 && (
        <div className="mt-3 rounded-2xl border border-rouge/30 bg-rouge-clair px-4 py-3.5">
          <div className="font-semibold text-rouge">Mensualité en retard{enfantsRetard.length ? ` · ${enfantsRetard.join(' et ')}` : ''}</div>
          <ul className="mt-1.5 space-y-0.5 text-[0.92rem]">
            {retard.map((l) => (
              <li key={l.id} className="flex justify-between gap-2"><span>{l.libelle}</span><span className="tabulaire font-semibold">{money(l.reste)}</span></li>
            ))}
          </ul>
          <BoutonM className="mt-3" onClick={() => payer(retard.map((l) => l.id))} testId="payer-echeance">Payer {money(retard.reduce((a, l) => a + l.reste, 0))}</BoutonM>
        </div>
      )}

      {aRegler.filter((l) => l.statut !== 'en_retard').length > 0 && (
        <>
          <TitreM>À régler</TitreM>
          <ListeEcheances lignes={aRegler.filter((l) => l.statut !== 'en_retard')} />
          <BoutonM variante="secondaire" className="mt-2" onClick={() => payer(aRegler.filter((l) => l.statut !== 'en_retard').map((l) => l.id))}>Régler ces échéances</BoutonM>
        </>
      )}

      {duMois.length > 0 && prochainMois && (
        <>
          <TitreM>Prochaine échéance · {jourMoisFr(duMois[0].echeance)}</TitreM>
          <ListeEcheances lignes={duMois} />
          <BoutonM variante="secondaire" className="mt-2" onClick={() => payer(duMois.map((l) => l.id))}>Payer {moisAnnee(prochainMois).split(' ')[0]} en avance</BoutonM>
        </>
      )}

      <TitreM>Mes reçus</TitreM>
      <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
        {recus.slice(0, 10).map((p) => (
          <button key={p.id} onClick={() => allerParent('recu', { paiementId: p.id })} className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-brume">
            <Receipt className="size-5 text-encre-3 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-tight">{money(p.montant)}</span>
              <span className="block text-encre-2 text-[0.82rem]">{numeroRecu(p.numero)} · {dateCourte(p.date.slice(0, 10))} · {LIBELLE_MODE[p.mode]}</span>
            </span>
            {p.statut === 'annule' && <Badge ton="rouge">Annulé</Badge>}
            {p.date.startsWith(JOUR_DEMO) && p.statut !== 'annule' && <Badge ton="vert">Aujourd’hui</Badge>}
            <ChevronRight className="size-4 text-encre-3" />
          </button>
        ))}
      </div>
    </div>
  )
}

function rangStatut(l: LigneEcheance) {
  return { en_retard: 0, due: 1, partielle: 2, a_venir: 3, payee: 4 }[l.statut]
}

function ListeEcheances({ lignes }: { lignes: LigneEcheance[] }) {
  return (
    <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
      {lignes.map((l) => (
        <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-tight">{prenomDe(l.eleveId)} · {l.libelle.split(' · ')[0]}</span>
            <span className="block text-encre-2 text-[0.82rem]">{l.mois ? moisAnnee(l.mois) : `Échéance du ${dateCourte(l.echeance)}`}{l.remise ? ` · ${l.motifRemise}` : ''}</span>
          </span>
          <span className="text-right">
            <span className="block tabulaire font-semibold">{money(l.reste)}</span>
            {l.statut !== 'a_venir' && <span className={cx('block text-[0.75rem] font-semibold', l.statut === 'en_retard' ? 'text-rouge' : 'text-ambre')}>{LIBELLE_STATUT_ECHEANCE[l.statut]}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- Payer */
type Etape = 'selection' | 'code' | 'traitement' | 'succes'

export function PayerParent() {
  const s = useStore()
  const f = famille(s)
  const lignes = (echeancesParFamille(s.echeances, s.paiements)[f.id] ?? []).filter((l) => l.reste > 0)
  const ordonnees = useMemo(() => [...lignes].sort((a, b) => rangStatut(a) - rangStatut(b) || a.echeance.localeCompare(b.echeance)), [lignes])
  const [choix, setChoix] = useState<string[]>(() => preselection ?? ordonnees.filter((l) => l.echeance <= JOUR_DEMO).map((l) => l.id))
  const [toutes, setToutes] = useState(false)
  const [mode, setMode] = useState<ModePaiement>(MODES_MOBILE[0])
  const parent = f.responsable === 'mere' ? f.mere : f.pere
  const [numero, setNumero] = useState(parent?.tel ?? '')
  const [code, setCode] = useState('')
  const [etape, setEtape] = useState<Etape>('selection')
  const [erreur, setErreur] = useState<string | null>(null)
  const [paiementId, setPaiementId] = useState<string | null>(null)
  const visibles = toutes ? ordonnees : ordonnees.filter((l) => l.echeance <= ajouterJours(JOUR_DEMO, 20) || choix.includes(l.id))
  const total = ordonnees.filter((l) => choix.includes(l.id)).reduce((a, l) => a + l.reste, 0)
  const nomMode = LIBELLE_MODE[mode]

  const continuer = () => {
    if (!choix.length) return setErreur('Choisissez au moins une échéance à payer.')
    if (numero.replace(/\D/g, '').length < 9) return setErreur(`Saisissez le numéro ${nomMode} complet.`)
    setErreur(null)
    setEtape('code')
  }
  const confirmer = async () => {
    if (!/^\d{4}$/.test(code)) return setErreur(`Saisissez les 4 chiffres de votre code secret ${nomMode}.`)
    setErreur(null)
    setEtape('traitement')
    await latence(1400, 1700)
    const st = useStore.getState()
    const sel = ordonnees.filter((l) => choix.includes(l.id))
    const ref = `${mode === 'orange_money' ? 'MP' : mode === 'wave' ? 'T_' : 'MM'}${JOUR_DEMO.slice(2).replace(/-/g, '')}.${minutesEnHhmm(minutesDemo()).replace(':', '')}.${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const p = st.encaisser({ familleId: f.id, lignes: sel.map((l) => ({ echeanceId: l.id, montant: l.reste })), mode, reference: ref, payeur: parent ? `${parent.prenom} ${parent.nom}` : `Famille ${f.nom}`, canal: 'parent' })
    preselection = null
    if (p) {
      setPaiementId(p.id)
      setEtape('succes')
    } else {
      setEtape('selection')
      setErreur('Ces échéances sont déjà réglées. Actualisez la liste.')
    }
  }

  if (etape === 'traitement') {
    return (
      <div className="flex flex-col items-center text-center pt-20" data-testid="paiement-en-cours">
        <span className="size-14 rounded-full border-4 border-bleu-clair border-t-bleu animate-spin" aria-hidden />
        <div className="font-semibold text-lg mt-6">Validation en cours</div>
        <p className="text-encre-2 mt-1 max-w-[17rem]">{nomMode} confirme le paiement de {money(total)} à {CONFIG.SIGLE}.</p>
      </div>
    )
  }

  if (etape === 'succes') {
    const p = s.paiements.find((x) => x.id === paiementId)
    return (
      <div className="flex flex-col items-center text-center pt-10" data-testid="paiement-reussi">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
          <CheckCircle2 className="size-20 text-vert" strokeWidth={1.6} />
        </motion.div>
        <div className="font-semibold text-xl mt-4 titre">Paiement encaissé</div>
        <div className="chiffre text-[2rem] mt-2">{money(p?.montant ?? total)}</div>
        <p className="text-encre-2 mt-1">Reçu {p ? numeroRecu(p.numero) : ''} envoyé à l’école et disponible ici.</p>
        <div className="w-full space-y-2 mt-8">
          <BoutonM onClick={() => p && allerParent('recu', { paiementId: p.id })} testId="voir-recu">Voir le reçu</BoutonM>
          <BoutonM variante="secondaire" onClick={() => allerParent('accueil')}>Retour à l’accueil</BoutonM>
        </div>
      </div>
    )
  }

  if (etape === 'code') {
    return (
      <div>
        <div className="rounded-2xl bg-[#FF7900] text-white px-4 py-4" style={{ background: mode === 'orange_money' ? '#E86A00' : mode === 'mtn_momo' ? '#F2C200' : '#1DC8F2', color: mode === 'mtn_momo' ? '#1B1B1B' : '#fff' }}>
          <div className="text-[0.85rem] opacity-90">{nomMode} · paiement marchand</div>
          <div className="chiffre text-[1.9rem] mt-1">{money(total)}</div>
          <div className="text-[0.9rem] mt-1 opacity-95">Bénéficiaire : {CONFIG.ECOLE}</div>
          <div className="text-[0.9rem] opacity-95">Depuis le {numero}</div>
        </div>
        <label className="block mt-5">
          <span className="font-semibold flex items-center gap-2"><Lock className="size-4 text-encre-2" />Code secret {nomMode}</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setErreur(null) }}
            data-testid="code-secret"
            className="mt-2 w-full text-center chiffre text-[2rem] tracking-[0.6em] rounded-xl border border-ligne bg-white py-3 focus:border-bleu focus:outline-none focus:ring-3 focus:ring-bleu/15"
            autoFocus
            aria-label="Code secret à 4 chiffres"
          />
        </label>
        <p className="text-encre-3 text-[0.82rem] mt-2">Votre code n’est jamais transmis à l’école.</p>
        {erreur && <p className="text-rouge text-[0.9rem] mt-2">{erreur}</p>}
        <div className="space-y-2 mt-5">
          <BoutonM onClick={confirmer} testId="confirmer-paiement">Confirmer le paiement</BoutonM>
          <BoutonM variante="secondaire" onClick={() => { setEtape('selection'); setCode('') }}>Modifier</BoutonM>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TitreM>Échéances à payer</TitreM>
      <div className="bg-white rounded-2xl border border-ligne divide-y divide-ligne-2">
        {visibles.map((l) => {
          const coche = choix.includes(l.id)
          return (
            <label key={l.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer active:bg-brume">
              <input type="checkbox" checked={coche} onChange={() => { setChoix((c) => (coche ? c.filter((x) => x !== l.id) : [...c, l.id])); setErreur(null) }} className="size-5 accent-[#0249A2]" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-tight">{prenomDe(l.eleveId)} · {l.libelle.split(' · ')[0]}</span>
                <span className={cx('block text-[0.8rem]', l.statut === 'en_retard' ? 'text-rouge font-semibold' : 'text-encre-2')}>{l.mois ? moisAnnee(l.mois) : dateCourte(l.echeance)}{l.statut !== 'a_venir' ? ` · ${LIBELLE_STATUT_ECHEANCE[l.statut]}` : ''}</span>
              </span>
              <span className="tabulaire font-semibold">{money(l.reste)}</span>
            </label>
          )
        })}
      </div>
      {!toutes && ordonnees.length > visibles.length && (
        <button className="mt-2 text-bleu font-semibold text-[0.92rem]" onClick={() => setToutes(true)}>Afficher les {ordonnees.length - visibles.length} autres échéances de l’année</button>
      )}

      <TitreM>Moyen de paiement</TitreM>
      <div className="grid grid-cols-2 gap-2">
        {MODES_MOBILE.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            data-testid={m === 'orange_money' ? 'mode-orange' : `mode-${m}`}
            className={cx('rounded-xl border px-3 py-3 text-left flex items-center gap-2.5', mode === m ? 'border-bleu ring-2 ring-bleu/20 bg-white' : 'border-ligne bg-white')}
          >
            <span className="size-8 rounded-lg flex items-center justify-center text-white text-[0.7rem] font-bold" style={{ background: m === 'orange_money' ? '#E86A00' : m === 'mtn_momo' ? '#F2C200' : '#1DC8F2', color: m === 'mtn_momo' ? '#1B1B1B' : '#fff' }}>
              <Smartphone className="size-4" />
            </span>
            <span className="font-semibold text-[0.95rem] leading-tight">{LIBELLE_MODE[m]}</span>
          </button>
        ))}
      </div>
      <label className="block mt-3">
        <span className="text-[0.88rem] font-semibold text-encre-2">Numéro {nomMode}</span>
        <input value={numero} onChange={(e) => { setNumero(e.target.value); setErreur(null) }} inputMode="tel" className="mt-1 w-full rounded-xl border border-ligne bg-white px-3 py-2.5 tabulaire focus:border-bleu focus:outline-none" />
      </label>
      {erreur && <p className="text-rouge text-[0.9rem] mt-2">{erreur}</p>}

      <div className="sticky bottom-0 -mx-4 mt-5 px-4 pt-3 pb-1 bg-brume/95 backdrop-blur border-t border-ligne">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-encre-2">{choix.length} échéance{choix.length > 1 ? 's' : ''}</span>
          <span className="chiffre text-[1.4rem]">{money(total)}</span>
        </div>
        <BoutonM onClick={continuer} testId="continuer-paiement">Continuer</BoutonM>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Reçu */
export function RecuParent() {
  const s = useStore()
  const f = famille(s)
  const id = s.session.parent.paiementId
  const p = s.paiements.find((x) => x.id === id) ?? s.paiements.filter((x) => x.familleId === f.id).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!p) return <p className="text-encre-2 mt-6">Aucun reçu pour l’instant.</p>
  const lignes = ventilationEncaisse(s, p)
  const enf = enfants(s)
  return (
    <div>
      <div className="bg-white rounded-2xl border border-ligne overflow-hidden" data-testid="recu-parent">
        <div className="px-4 pt-4 pb-3 border-b-2 flex items-center gap-3" style={{ borderColor: CONFIG.BLEU_MARQUE }}>
          <img src={CONFIG.LOGO_COULEUR} alt="" className="h-10 w-auto" />
          <div className="leading-tight min-w-0">
            <div className="font-semibold text-[0.92rem]" style={{ color: CONFIG.BLEU_MARQUE }}>{CONFIG.ECOLE}</div>
            <div className="text-encre-2 text-[0.78rem]">{CONFIG.VILLE} · {CONFIG.TELEPHONE_ECOLE}</div>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-encre-2 text-[0.82rem]">Reçu de paiement</div>
              <div className="titre font-semibold text-[1.15rem] tabulaire">{numeroRecu(p.numero)}</div>
            </div>
            {p.statut === 'annule' ? <Badge ton="rouge">Annulé</Badge> : p.statut === 'annulation_demandee' ? <Badge ton="ambre">Annulation en cours</Badge> : <Badge ton="vert">Valide</Badge>}
          </div>
          <div className="chiffre text-[2rem] mt-2">{money(p.montant)}</div>
          <dl className="mt-2 text-[0.9rem] space-y-1">
            <div className="flex justify-between gap-3"><dt className="text-encre-2">Date</dt><dd>{dateHeure(p.date)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-encre-2">Payé par</dt><dd className="text-right">{p.payeur}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-encre-2">Moyen</dt><dd>{LIBELLE_MODE[p.mode]}</dd></div>
            {p.reference && <div className="flex justify-between gap-3"><dt className="text-encre-2">Référence</dt><dd className="tabulaire text-right break-all">{p.reference}</dd></div>}
          </dl>
          <div className="mt-3 border-t border-dashed border-ligne pt-2">
            {lignes.map((l, i) => (
              <div key={i} className="flex justify-between gap-3 py-1 text-[0.9rem]">
                <span>{enf.find((e) => e.id === l.echeance?.eleveId)?.prenom ?? indexEleves(s.eleves)[l.echeance?.eleveId ?? '']?.prenom} · {l.echeance?.libelle}</span>
                <span className="tabulaire">{money(l.montant)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-brume/70 border-t border-ligne px-4 py-4 flex items-center gap-4">
          <div className="bg-white p-2 rounded-lg border border-ligne"><QR valeur={lienRecu(s, p)} taille={140} /></div>
          <div className="text-[0.85rem] text-encre-2 leading-snug">
            <div className="flex items-center gap-1.5 font-semibold text-vert-texte"><ShieldCheck className="size-4" />Reçu vérifiable</div>
            Scannez ce code pour confirmer que le reçu est authentique. Un reçu numéroté ne peut pas être supprimé.
          </div>
        </div>
      </div>
      {p.statut === 'annule' && p.annulation && <p className="text-rouge text-[0.88rem] mt-2">Annulé le {dateHeure(p.annulation.dateValidation ?? p.annulation.date)} · {p.annulation.motif}</p>}
      <BoutonM variante="secondaire" className="mt-4" onClick={() => allerParent('paiements')}>Retour aux paiements</BoutonM>
    </div>
  )
}
