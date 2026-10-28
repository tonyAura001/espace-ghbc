/** Clôture de caisse : comptage par billets et pièces, écart justifié, journée verrouillée. */
import { useMemo, useState } from 'react'
import { Lock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useStore } from '../../store'
import { profilParId, peut } from '../../store/profils'
import { especesAttendues, paiementsDuJour, paiementsComptes, nomPersonnel } from '../../store/selecteurs'
import { COUPURES } from '../../data/referentiel'
import { Badge, Bloc, Bouton, Case, Champ, EnTetePage, Zone, Alerte, cx, SqueletteTableau } from '../../ui/base'
import { useAction, useChargement } from '../../ui/hooks'
import { money, nombre } from '../../lib/format'
import { JOUR_DEMO, dateCourte, dateLongueMaj, heureFr } from '../../lib/temps'
import { LIBELLE_MODE } from '../../data/referentiel'

export default function Cloture() {
  const s = useStore()
  const pret = useChargement()
  const cloturer = useStore((st) => st.cloturerCaisse)
  const toast = useStore((st) => st.toast)
  const role = profilParId(s.session.profilId).role
  const [executer, enCours] = useAction()
  const attendu = especesAttendues(s)
  const cloture = s.clotures.find((c) => c.date === JOUR_DEMO)
  const [comptage, setComptage] = useState<Record<string, number>>(() => Object.fromEntries(COUPURES.map((c) => [String(c), 0])))
  const [justif, setJustif] = useState('')
  const [controle, setControle] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const compte = Object.entries(comptage).reduce((a, [c, n]) => a + Number(c) * n, 0)
  const ecart = compte - attendu
  const parMode = useMemo(() => {
    const r: Record<string, { n: number; m: number }> = {}
    for (const p of paiementsDuJour(s).filter(paiementsComptes)) {
      r[p.mode] ??= { n: 0, m: 0 }
      r[p.mode].n++
      r[p.mode].m += p.montant
    }
    return r
  }, [s])

  const proposer = () => {
    // remplit le comptage à partir des espèces attendues (billets les plus gros d'abord)
    let reste = attendu
    const r: Record<string, number> = {}
    for (const c of COUPURES) {
      r[String(c)] = Math.floor(reste / c)
      reste -= r[String(c)] * c
    }
    setComptage(r)
  }

  const valider = async () => {
    if (compte === 0 && attendu > 0) return setErreur('Saisissez le nombre de billets et de pièces comptés dans le tiroir.')
    if (ecart !== 0 && justif.trim().length < 6) return setErreur('Un écart doit être justifié avant de clôturer (ex. : erreur de rendu de monnaie).')
    if (!controle) return setErreur('Cochez le double contrôle : un second agent a recompté la caisse.')
    await executer(() => cloturer(comptage, attendu, justif.trim()))
    toast({ titre: 'Caisse clôturée', texte: ecart === 0 ? 'Aucun écart. La journée est verrouillée.' : `Écart de ${money(ecart)} justifié. La journée est verrouillée.`, niveau: ecart === 0 ? 'succes' : 'attention' })
  }

  if (!pret) return <SqueletteTableau />

  return (
    <div>
      <EnTetePage titre="Clôture de caisse" sousTitre={`${dateLongueMaj(JOUR_DEMO)} · guichet principal`} />
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 items-start">
        {cloture ? (
          <Bloc titre={<span className="flex items-center gap-2"><Lock className="size-5 text-vert-texte" /> Journée clôturée et verrouillée</span>}>
            <p className="text-encre-2">Clôturée à {heureFr(cloture.heure)} par {nomPersonnel(s, cloture.caissierId)}. Plus aucun encaissement au guichet n’est possible pour cette journée.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div><div className="text-encre-2 text-sm">Attendu</div><div className="chiffre text-xl">{money(cloture.attenduEspeces)}</div></div>
              <div><div className="text-encre-2 text-sm">Compté</div><div className="chiffre text-xl">{money(cloture.compte)}</div></div>
              <div><div className="text-encre-2 text-sm">Écart</div><div className={cx('chiffre text-xl', cloture.ecart ? 'text-ambre' : 'text-vert-texte')}>{money(cloture.ecart)}</div></div>
            </div>
            {cloture.justification && <p className="mt-3">Justification : {cloture.justification}</p>}
          </Bloc>
        ) : (
          <Bloc titre="Comptage du tiroir-caisse" actions={<Bouton variante="discret" taille="sm" onClick={proposer}>Pré-remplir avec l’attendu</Bouton>}>
            {/* téléphone : grille de comptage tactile */}
            <div className="md:hidden grid grid-cols-2 gap-2.5">
              {COUPURES.map((c) => (
                <label key={c} className="rounded-xl border border-ligne p-3 flex flex-col gap-1.5">
                  <span className="font-semibold tabulaire leading-tight">{money(c)}</span>
                  <span className="text-encre-3 text-xs -mt-1">{c >= 1000 ? 'billet' : 'pièce'} · {money(c * (comptage[String(c)] || 0))}</span>
                  <input
                    inputMode="numeric"
                    value={comptage[String(c)] || ''}
                    placeholder="0"
                    onChange={(e) => { setComptage((x) => ({ ...x, [String(c)]: Number(e.target.value.replace(/\D/g, '') || 0) })); setErreur(null) }}
                    className="h-11 text-center text-lg tabulaire rounded-lg border border-ligne px-2"
                    aria-label={`Nombre de ${money(c)}`}
                  />
                </label>
              ))}
            </div>
            <table className="tableau hidden md:table">
              <thead>
                <tr><th>Coupure</th><th className="text-center">Nombre</th><th className="text-right">Sous-total</th></tr>
              </thead>
              <tbody>
                {COUPURES.map((c) => (
                  <tr key={c}>
                    <td className="font-semibold tabulaire">{money(c)} <span className="text-encre-3 font-normal text-sm">{c >= 1000 ? 'billet' : 'pièce'}</span></td>
                    <td className="text-center">
                      <input
                        inputMode="numeric"
                        value={comptage[String(c)] || ''}
                        placeholder="0"
                        onChange={(e) => { setComptage((x) => ({ ...x, [String(c)]: Number(e.target.value.replace(/\D/g, '') || 0) })); setErreur(null) }}
                        className="w-24 text-center tabulaire rounded-md border border-ligne px-2 py-1.5"
                        aria-label={`Nombre de ${money(c)}`}
                      />
                    </td>
                    <td className="text-right tabulaire">{money(c * (comptage[String(c)] || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 [&_.chiffre]:max-sm:text-[1.05rem]">
              <div><div className="text-encre-2 text-sm">Attendu</div><div className="chiffre text-2xl">{money(attendu)}</div></div>
              <div><div className="text-encre-2 text-sm">Compté</div><div className="chiffre text-2xl">{money(compte)}</div></div>
              <div><div className="text-encre-2 text-sm">Écart</div><div className={cx('chiffre text-2xl', compte === 0 ? 'text-encre-3' : ecart === 0 ? 'text-vert-texte' : 'text-ambre')} data-testid="ecart">{compte === 0 ? '—' : `${ecart > 0 ? '+' : ''}${money(ecart)}`}</div></div>
            </div>
            {ecart !== 0 && compte > 0 && (
              <div className="mt-4">
                <Alerte ton="ambre" icone={<AlertTriangle className="size-5" />} titre={ecart < 0 ? `Il manque ${money(-ecart)} dans la caisse` : `Excédent de ${money(ecart)}`}>Recomptez, puis justifiez l’écart : il sera visible par la Direction et inscrit au journal.</Alerte>
              </div>
            )}
            <Champ libelle="Justification de l’écart" className="mt-4" erreur={null} aide={ecart === 0 ? 'Facultative quand il n’y a pas d’écart.' : 'Obligatoire.'}>
              <Zone value={justif} onChange={(e) => { setJustif(e.target.value); setErreur(null) }} placeholder="Ex. : erreur de rendu de monnaie au reçu de 10 h 20." className="min-h-16" />
            </Champ>
            <div className="mt-3"><Case checked={controle} onChange={(v) => { setControle(v); setErreur(null) }} libelle="Double contrôle : un second agent a recompté la caisse avec moi" /></div>
            {erreur && <p className="text-rouge text-sm mt-2">{erreur}</p>}
            <Bouton className="mt-4 max-sm:w-full" taille="lg" icone={<Lock className="size-4" />} onClick={valider} chargement={enCours} disabled={!peut(role, 'cloturerCaisse')} data-testid="cloturer">
              Clôturer la journée
            </Bouton>
            {!peut(role, 'cloturerCaisse') && <p className="text-sm text-encre-2 mt-2">Seul le caissier clôture sa caisse ; vous pouvez consulter le comptage.</p>}
          </Bloc>
        )}

        <div className="space-y-5">
          <Bloc titre="Encaissements du jour par mode">
            <ul className="divide-y divide-ligne-2">
              {Object.entries(parMode).map(([m, v]) => (
                <li key={m} className="flex justify-between py-2">
                  <span>{LIBELLE_MODE[m as keyof typeof LIBELLE_MODE]} <span className="text-encre-3">· {nombre(v.n)} reçu{v.n > 1 ? 's' : ''}</span></span>
                  <span className="tabulaire font-semibold">{money(v.m)}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-encre-2 mt-2 flex gap-1.5"><ShieldCheck className="size-4 shrink-0 mt-0.5" /> Seules les espèces sont comptées ; le mobile money se rapproche avec le relevé de l’opérateur.</p>
          </Bloc>
          <Bloc titre="Clôtures précédentes" sansMarge>
            <ul className="md:hidden divide-y divide-ligne-2 border-t border-ligne-2">
              {[...s.clotures].filter((c) => c.date !== JOUR_DEMO).reverse().slice(0, 10).map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{dateCourte(c.date)}</span>
                    {c.ecart === 0 ? <Badge ton="vert"><CheckCircle2 className="size-3.5" /> Aucun écart</Badge> : <Badge ton="ambre">Écart {money(c.ecart)}</Badge>}
                  </div>
                  <div className="text-sm text-encre-2 mt-0.5">Attendu {money(c.attenduEspeces)} · compté {money(c.compte)}</div>
                  {c.justification && <div className="text-sm text-encre-2">{c.justification}</div>}
                </li>
              ))}
            </ul>
            <table className="tableau hidden md:table">
              <thead><tr><th>Journée</th><th className="text-right">Attendu</th><th className="text-right">Compté</th><th>Écart</th></tr></thead>
              <tbody>
                {[...s.clotures].filter((c) => c.date !== JOUR_DEMO).reverse().slice(0, 10).map((c) => (
                  <tr key={c.id} title={c.justification || undefined}>
                    <td className="whitespace-nowrap">{dateCourte(c.date)}</td>
                    <td className="text-right tabulaire">{money(c.attenduEspeces)}</td>
                    <td className="text-right tabulaire">{money(c.compte)}</td>
                    <td>{c.ecart === 0 ? <Badge ton="vert"><CheckCircle2 className="size-3.5" /> Aucun</Badge> : <span><Badge ton="ambre">{money(c.ecart)}</Badge> <span className="text-sm text-encre-2">{c.justification}</span></span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Bloc>
        </div>
      </div>
      {!cloture && (
        <div className="md:hidden sticky bottom-0 -mx-[clamp(1rem,2.2vw,2.5rem)] mt-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-ligne grid grid-cols-3 gap-2 z-10">
          <div><div className="text-encre-2 text-xs">Attendu</div><div className="chiffre text-[1rem]">{money(attendu)}</div></div>
          <div><div className="text-encre-2 text-xs">Compté</div><div className="chiffre text-[1rem]">{money(compte)}</div></div>
          <div><div className="text-encre-2 text-xs">Écart</div><div className={cx('chiffre text-[1rem]', compte === 0 ? 'text-encre-3' : ecart === 0 ? 'text-vert-texte' : 'text-ambre')}>{compte === 0 ? '—' : `${ecart > 0 ? '+' : ''}${money(ecart)}`}</div></div>
        </div>
      )}
    </div>
  )
}
