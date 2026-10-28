/** Page publique de pré-inscription aux couleurs de GHBC (mobile d'abord, sans mot de passe). */
import { useState } from 'react'
import { CheckCircle2, Baby, Shapes, BookOpen, GraduationCap, Phone, MapPin } from 'lucide-react'
import { useStore } from '../store'
import { CONFIG, PAYS_DATA } from '../config'
import { STRUCTURE, NOM_CYCLE } from '../data/referentiel'
import type { Cycle } from '../data/types'
import { Bouton, Champ, Liste, Saisie, Segments, cx } from '../ui/base'
import { latence } from '../ui/hooks'
import { JOUR_DEMO } from '../lib/temps'
import { SaisieDate } from '../screens/eleves/SaisieDate'

const ICONE: Record<Cycle, typeof Baby> = { creche: Baby, maternelle: Shapes, primaire: BookOpen, college: GraduationCap }

export default function PreInscription() {
  const ajouterDemande = useStore((s) => s.ajouterDemande)
  const [cycle, setCycle] = useState<Cycle>('maternelle')
  const [f, setF] = useState({ prenom: '', nom: '', sexe: 'F' as 'F' | 'M', naissance: '', niveau: STRUCTURE.maternelle.niveaux[0], parentNom: '', parentTel: '', quartier: '', ecole: '' })
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [envoi, setEnvoi] = useState(false)
  const [dossier, setDossier] = useState<string | null>(null)

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.prenom.trim() || !f.nom.trim()) er.enfant = 'Indiquez le prénom et le nom de l’enfant.'
    if (!f.naissance) er.naissance = 'Indiquez la date de naissance au format JJ/MM/AAAA.'
    if (!f.parentNom.trim()) er.parent = 'Indiquez votre prénom et votre nom.'
    if (f.parentTel.replace(/\D/g, '').length < 9) er.tel = `Indiquez un numéro joignable, par exemple ${PAYS_DATA.indicatif} ${CONFIG.PAYS === 'Sénégal' ? '77 123 45 67' : '622 12 34 56'}.`
    setErreurs(er)
    if (Object.keys(er).length) return
    setEnvoi(true)
    await latence(600, 900)
    const id = ajouterDemande({
      enfantPrenom: f.prenom.trim(), enfantNom: f.nom.trim(), naissance: f.naissance, sexe: f.sexe, niveauSouhaite: f.niveau, cycle,
      parentNom: f.parentNom.trim(), parentTel: f.parentTel.trim(), quartier: f.quartier.trim() || 'Non précisé', ecoleActuelle: f.ecole.trim() || 'Non précisée',
    })
    setEnvoi(false)
    setDossier(id)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-dvh bg-brume">
      <header className="bg-white border-b border-ligne">
        <div className="max-w-[46rem] mx-auto px-5 py-4 flex items-center gap-4">
          <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.SIGLE} className="h-11 w-auto shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="font-semibold text-bleu leading-snug">{CONFIG.ECOLE}</div>
            <div className="text-sm text-encre-2">Crèche · Maternelle · Primaire · Collège · {CONFIG.VILLE}</div>
          </div>
        </div>
        <div className="flex h-1"><div className="flex-[3] bg-bleu" /><div className="flex-1 bg-vert" /></div>
      </header>

      <main className="max-w-[46rem] mx-auto px-5 py-8">
        {dossier ? (
          <div className="bg-white rounded-2xl border border-ligne p-7 text-center animate-entree">
            <CheckCircle2 className="size-14 text-vert-texte mx-auto" />
            <h1 className="text-2xl mt-4">Demande bien reçue</h1>
            <p className="text-encre-2 mt-2">Merci. Le secrétariat vous appelle sous 48 heures pour fixer un rendez-vous.</p>
            <div className="mt-6 rounded-xl bg-bleu-clair px-5 py-4 inline-block">
              <div className="text-sm text-encre-2">Numéro de dossier</div>
              <div className="chiffre text-[1.9rem] font-medium text-bleu">{dossier}</div>
            </div>
            <p className="text-sm text-encre-2 mt-5">Conservez ce numéro. Pour toute question : {CONFIG.TELEPHONE_ECOLE}.</p>
            <Bouton variante="secondaire" className="mt-6" onClick={() => { setDossier(null); setF({ ...f, prenom: '', naissance: '' }) }}>Inscrire un autre enfant</Bouton>
          </div>
        ) : (
          <>
            <h1 className="text-[1.8rem] leading-tight">Pré-inscription {CONFIG.ANNEE_SCOLAIRE}</h1>
            <p className="text-encre-2 mt-2">Quelques informations suffisent. Nous vous rappelons pour la visite de l’école et l’inscription définitive.</p>

            <form onSubmit={envoyer} className="mt-6 space-y-6">
              <section className="bg-white rounded-2xl border border-ligne p-5 space-y-4">
                <h2 className="text-lg">Le cycle souhaité</h2>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STRUCTURE) as Cycle[]).map((c) => {
                    const I = ICONE[c]
                    return (
                      <button type="button" key={c} onClick={() => { setCycle(c); setF({ ...f, niveau: STRUCTURE[c].niveaux[0] }) }} className={cx('flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-semibold', cycle === c ? 'border-bleu bg-bleu-clair text-bleu' : 'border-ligne')}>
                        <I className="size-5 shrink-0" /> {NOM_CYCLE[c]}
                      </button>
                    )
                  })}
                </div>
                <Champ libelle={cycle === 'creche' ? 'Groupe' : 'Classe'}>
                  <Liste value={f.niveau} onChange={(e) => setF({ ...f, niveau: e.target.value })}>
                    {STRUCTURE[cycle].niveaux.map((n) => <option key={n}>{n}</option>)}
                  </Liste>
                </Champ>
              </section>

              <section className="bg-white rounded-2xl border border-ligne p-5 space-y-4">
                <h2 className="text-lg">L’enfant</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Champ libelle="Prénom"><Saisie value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} autoComplete="off" /></Champ>
                  <Champ libelle="Nom"><Saisie value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} autoComplete="off" /></Champ>
                </div>
                {erreurs.enfant && <p className="text-rouge text-sm">{erreurs.enfant}</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                  <Champ libelle="Date de naissance" erreur={erreurs.naissance}><SaisieDate max={JOUR_DEMO} valeur={f.naissance} onChange={(v) => setF({ ...f, naissance: v })} /></Champ>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-encre-2">Sexe</span>
                    <Segments className="self-start" options={[{ id: 'F', libelle: 'Fille' }, { id: 'M', libelle: 'Garçon' }]} valeur={f.sexe} onChange={(v) => setF({ ...f, sexe: v as 'F' | 'M' })} />
                  </div>
                </div>
                <Champ libelle="École ou garde actuelle (facultatif)"><Saisie value={f.ecole} onChange={(e) => setF({ ...f, ecole: e.target.value })} /></Champ>
              </section>

              <section className="bg-white rounded-2xl border border-ligne p-5 space-y-4">
                <h2 className="text-lg">Vous</h2>
                <Champ libelle="Prénom et nom" erreur={erreurs.parent}><Saisie value={f.parentNom} onChange={(e) => setF({ ...f, parentNom: e.target.value })} autoComplete="name" /></Champ>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Champ libelle="Téléphone" erreur={erreurs.tel}>
                    <div className="relative"><Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" /><Saisie value={f.parentTel} onChange={(e) => setF({ ...f, parentTel: e.target.value })} inputMode="tel" placeholder={`${PAYS_DATA.indicatif} …`} className="pl-9" autoComplete="tel" /></div>
                  </Champ>
                  <Champ libelle="Quartier">
                    <div className="relative"><MapPin className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" /><Saisie value={f.quartier} onChange={(e) => setF({ ...f, quartier: e.target.value })} className="pl-9" /></div>
                  </Champ>
                </div>
              </section>

              <Bouton type="submit" taille="lg" className="w-full" chargement={envoi}>Envoyer la demande</Bouton>
              <p className="text-sm text-encre-3 text-center">Vos informations servent uniquement à traiter votre demande d’inscription.</p>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
